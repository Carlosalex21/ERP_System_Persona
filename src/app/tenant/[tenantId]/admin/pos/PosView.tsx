/**
 * @file Contenedor principal del Punto de Venta (POS).
 * Orquesta: catálogo, clientes, monedas, tasas de cambio, estrategia fiscal,
 * motor de cálculo en tiempo real y el flujo de facturación + pago.
 */
"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { Search, Barcode, PlusCircle, CheckCircle2, X, WifiOff, RefreshCw, CloudUpload, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui';
import { useNotify } from '@/hooks/useNotify';
import { getProductos } from '@/services/inventoryService';
import { getClientes } from '@/services/clientesService';
import { createFactura, registrarPago, getMetodosDePago } from '@/services/facturacionService';
import {
  getMonedas,
  getTasasCambioActual,
  getTaxStrategy,
  createTasaCambio,
  type TasaCambioActual,
} from '@/services/configuracionService';
import { getIvas } from '@/services/configService';
import { getVendedores, type Vendedor } from '@/services/usuariosService';
import { Producto, Cliente, Moneda, Iva, FacturaRequest, Factura, PagoRequestLinea } from '@/types/api';
import { parseDecimal } from '@/utils/helpers';
import { toastApiError } from '@/utils/errors';
import { calcularTotales, type ItemCalculo, type TotalesCalculo } from '@/utils/taxCalculator';
import { useTenant } from '@/hooks/useTenant';
import { usePendingSalesSync } from '@/hooks/usePendingSalesSync';
import { esErrorDeRed } from '@/utils/offlineCache';
import { encolarVenta } from '@/utils/offlineDb';

import SaleCart, { CartItem } from './components/SaleCart';
import PaymentModal, { PagoLinea } from './components/PaymentModal';
import CajaWidget from './components/CajaWidget';
import ClientModal from './components/ClientModal';
import FacturaPdfModal from '@/components/facturacion/FacturaPdfModal';

interface PosViewProps {
  tenantId: string;
}

interface VentaExitosa {
  facturaId?: number;
  correlativo?: string | null;
  numero_control?: string | null;
  total: string;
  moneda: string;
  pendienteSync?: boolean;
}

/**
 * Vista principal del POS. Dinámicamente importada con `ssr: false`.
 */
export default function PosView({ tenantId }: PosViewProps): ReactElement {
  const notify = useNotify();
  const { tenant } = useTenant();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Producto[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Producto[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [facturaPdfAbierta, setFacturaPdfAbierta] = useState(false);
  // Condición de pago y vendedor: por defecto "contado" y sin vendedor
  // explícito (el backend le atribuye la venta a quien está logueado). El
  // selector de vendedor es para cuando un vendedor cerró la venta en la
  // calle y otra persona (ej. un admin) la está tipeando en el sistema.
  const [condicionPago, setCondicionPago] = useState<'contado' | 'credito'>('contado');
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [vendedorId, setVendedorId] = useState<number | null>(null);

  // Multi-moneda + fiscal
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [tasasActuales, setTasasActuales] = useState<Record<string, TasaCambioActual>>({});
  const [ivas, setIvas] = useState<Iva[]>([]);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState('');
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const [retencionPct, setRetencionPct] = useState(0);
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [savingRate, setSavingRate] = useState(false);
  const [ventaExitosa, setVentaExitosa] = useState<VentaExitosa | null>(null);

  // useCallback: carga inicial de todos los datos maestros.
  // Promise.allSettled: si un solo dato (ej. tasas de cambio) falla, el resto
  // del POS igual debe quedar utilizable en vez de una pantalla en blanco.
  // Declarado ANTES de `usePendingSalesSync` (abajo) porque su callback lo
  // referencia -- si quedara después, `fetchProducts` no existiría todavía
  // en el scope en el momento en que ese hook arma su callback.
  const fetchProducts = useCallback(async () => {
    try {
      const [productsRes, clientsRes, monedasRes, tasasRes, ivasRes, vendedoresRes] = await Promise.allSettled([
        getProductos(),
        getClientes(),
        getMonedas(),
        getTasasCambioActual(),
        getIvas(),
        getVendedores(),
        // Se descarta el resultado aquí a propósito: solo nos interesa que
        // `conRespaldoOffline` deje los métodos de pago en caché. Si no se
        // precarga junto al resto, un corte de conexión ANTES de la primera
        // venta del turno deja el modal de cobro sin ningún método
        // seleccionable (no hay con qué caer de vuelta) y la venta offline
        // queda bloqueada -- PaymentModal ya la vuelve a pedir al abrirse.
        getMetodosDePago(),
      ]);

      let monedasData: Moneda[] = [];
      if (productsRes.status === 'fulfilled') {
        // Los insumos internos (materia prima -- ej. papas, un repuesto
        // genérico) se compran y se controlan como stock normal, pero no son
        // algo que se venda tal cual desde el mostrador -- no deben aparecer
        // en la grilla de venta del POS.
        const vendibles = productsRes.value.filter((p) => !p.es_insumo);
        setProducts(vendibles);
        setFilteredProducts(vendibles);
      }
      if (clientsRes.status === 'fulfilled') setClients(clientsRes.value);
      if (monedasRes.status === 'fulfilled') {
        monedasData = monedasRes.value;
        setMonedas(monedasData);
      }
      if (tasasRes.status === 'fulfilled') setTasasActuales(tasasRes.value);
      if (ivasRes.status === 'fulfilled') setIvas(ivasRes.value);
      if (vendedoresRes.status === 'fulfilled') setVendedores(vendedoresRes.value);

      // Seleccionamos la moneda base por defecto.
      if (!selectedCurrencyCode) {
        const base = monedasData.find(m => m.es_predeterminada) ?? monedasData[0];
        if (base) setSelectedCurrencyCode(base.codigo);
      }
      // Estrategia fiscal: la cargamos para tener contexto de tasas/país.
      // Usa el país real configurado del tenant (Fase 1 multi-país) en vez
      // de asumir Venezuela; el backend igual cae a su propio default si no
      // se pasa `country`, pero aquí sí lo conocemos vía el perfil del tenant.
      getTaxStrategy(tenant?.pais_codigo || undefined).catch(() => {/* opcional */});

      const fallos = [productsRes, clientsRes, monedasRes, tasasRes, ivasRes, vendedoresRes].filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );
      if (fallos.length > 0) {
        console.error("Error cargando datos del POS:", fallos.map(f => f.reason));
        toastApiError(fallos[0].reason, "Algunos datos no se pudieron cargar. Intenta actualizar la página.");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCurrencyCode, tenant?.pais_codigo]);

  // Modo offline: si se cae la conexión a mitad de una venta, la cola local
  // (IndexedDB) la guarda y la sincroniza sola en cuanto vuelve internet --
  // ver `usePendingSalesSync`/`offlineSyncService`.
  const { online, pendientes: ventasPendientes, sincronizando: sincronizandoVentas, sincronizarAhora } =
    usePendingSalesSync((exitosas, fallidas) => {
      if (exitosas > 0) {
        notify.success(`${exitosas} venta${exitosas === 1 ? '' : 's'} pendiente${exitosas === 1 ? '' : 's'} sincronizada${exitosas === 1 ? '' : 's'}.`);
        fetchProducts();
      }
      if (fallidas > 0) {
        notify.error(`${fallidas} venta${fallidas === 1 ? '' : 's'} no se pudo${fallidas === 1 ? '' : 'ieron'} sincronizar. Revisa la conexión.`);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = products.filter(product =>
      product.nombre.toLowerCase().includes(lowercasedQuery) ||
      product.codigo_barras?.toLowerCase().includes(lowercasedQuery) ||
      product.sku?.toLowerCase().includes(lowercasedQuery),
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  // useCallback: refresco de tasas. Al cambiar la divisa se llama de nuevo.
  const refreshRates = useCallback(async (): Promise<void> => {
    setRefreshingRates(true);
    try {
      const tasas = await getTasasCambioActual();
      setTasasActuales(tasas);
    } catch (error) {
      toastApiError(error, "No se pudieron actualizar las tasas de cambio.");
    } finally {
      setRefreshingRates(false);
    }
  }, []);

  // useCallback: cambio de moneda => recargar tasas y actualizar selección.
  const handleCurrencyChange = useCallback((code: string) => {
    setSelectedCurrencyCode(code);
    refreshRates();
  }, [refreshRates]);

  // Actualiza la tasa de HOY para la moneda seleccionada directamente desde
  // el POS -- antes solo se podía cambiar desde la pantalla de admin de
  // "Tasas de Cambio", y ni siquiera ahí se veía reflejada de inmediato
  // (faltaba invalidar el caché backend, ver `TasaCambioViewSet`).
  const guardarNuevaTasa = useCallback(async (tasa: string): Promise<void> => {
    const monedaSel = monedas.find(m => m.codigo === selectedCurrencyCode);
    if (!monedaSel) return;
    setSavingRate(true);
    try {
      await createTasaCambio({ moneda: monedaSel.id, tasa, fuente: 'Manual (POS)' });
      await refreshRates();
      notify.success(`Tasa de ${selectedCurrencyCode} actualizada.`);
    } catch (error) {
      toastApiError(error, 'No se pudo actualizar la tasa de cambio.');
    } finally {
      setSavingRate(false);
    }
  }, [monedas, selectedCurrencyCode, refreshRates, notify]);

  // Mapa de IVA id -> porcentaje para el motor de cálculo.
  const ivaMap = useMemo(() => {
    const map: Record<number, number> = {};
    for (const iva of ivas) {
      map[iva.id] = parseDecimal(iva.porcentaje_iva);
    }
    return map;
  }, [ivas]);

  // Moneda base del tenant.
  const baseCurrencyCode = useMemo(
    () => monedas.find(m => m.es_predeterminada)?.codigo ?? selectedCurrencyCode,
    [monedas, selectedCurrencyCode],
  );

  // Convierte el precio de UN producto (guardado en `item.moneda_codigo`,
  // ver `Producto.moneda`) a la moneda que el POS tiene seleccionada para
  // emitir la venta. Antes esto NO se hacía -- el precio crudo del producto
  // se usaba tal cual sin importar la moneda seleccionada, así que cambiar
  // de $ a Bs en el POS simplemente re-etiquetaba "20" como "Bs 20" en vez
  // de convertirlo de verdad.
  const convertirPrecio = useCallback(
    (monto: number, monedaOrigenCodigo?: string | null): number => {
      const origen = monedaOrigenCodigo || baseCurrencyCode;
      if (!origen || origen === selectedCurrencyCode) return monto;
      const infoOrigen = tasasActuales[origen];
      const infoDestino = tasasActuales[selectedCurrencyCode];
      const tasaOrigen = infoOrigen?.es_base ? 1 : (infoOrigen?.tasa ? parseDecimal(infoOrigen.tasa) : null);
      const tasaDestino = infoDestino?.es_base ? 1 : (infoDestino?.tasa ? parseDecimal(infoDestino.tasa) : null);
      // Sin tasa cargada para alguna de las dos monedas no hay forma segura
      // de convertir -- se deja el monto igual antes que inventar un número.
      if (tasaOrigen == null || tasaDestino == null || tasaDestino === 0) return monto;
      const enBase = monto * tasaOrigen;
      return enBase / tasaDestino;
    },
    [baseCurrencyCode, selectedCurrencyCode, tasasActuales],
  );

  // useMemo: motor de cálculo fiscal en tiempo real (escucha el carrito, moneda y tasas).
  const totales: TotalesCalculo = useMemo(() => {
    const monedaSel = monedas.find(m => m.codigo === selectedCurrencyCode);
    const tasaInfo = tasasActuales[selectedCurrencyCode];
    const esBase = tasaInfo?.es_base ?? monedaSel?.es_predeterminada ?? true;
    const tasa = esBase
      ? 1
      : tasaInfo?.tasa
        ? parseDecimal(tasaInfo.tasa)
        : 0;

    const lineas: ItemCalculo[] = cartItems.map(item => ({
      cantidad: item.quantity,
      precio_final_unitario: convertirPrecio(parseDecimal(item.precio), item.moneda_codigo),
      tasa_iva: item.configuracion_iva ? (ivaMap[item.configuracion_iva] ?? 0) : 0,
      descuento_pct: parseDecimal(item.descuento),
    }));

    return calcularTotales({
      lineas,
      descuento_global: descuentoGlobal,
      retencion_pct: retencionPct,
      moneda: { codigo: selectedCurrencyCode, tasa, es_base: esBase },
    });
  }, [cartItems, ivaMap, monedas, tasasActuales, selectedCurrencyCode, descuentoGlobal, retencionPct, convertirPrecio]);

  // useCallback: handlers del carrito.
  const handleAddToCart = useCallback((product: Producto) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      const stockDisponible = product.cantidad || 0;

      if (existingItem) {
        if (existingItem.quantity >= stockDisponible) {
          notify.error(`No hay más stock para ${product.nombre}.`);
          return prevItems;
        }
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      if (stockDisponible < 1) {
        notify.error(`El producto ${product.nombre} está agotado.`);
        return prevItems;
      }

      return [...prevItems, { ...product, quantity: 1 }];
    });
  }, [notify]);

  const handleRemoveFromCart = useCallback((productId: number) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  }, []);

  const handleUpdateQuantity = useCallback((productId: number, newQuantity: number) => {
    const productInCatalog = products.find(p => p.id === productId);
    if (!productInCatalog) return;

    const stockDisponible = productInCatalog.cantidad || 0;

    if (newQuantity < 1) {
      handleRemoveFromCart(productId);
      return;
    }

    if (newQuantity > stockDisponible) {
      notify.error(`Solo hay ${stockDisponible} unidades disponibles.`);
      newQuantity = stockDisponible;
    }

    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item,
      ),
    );
  }, [products, handleRemoveFromCart, notify]);

  const handleClearCart = useCallback(() => {
    setCartItems([]);
    setSelectedClient(null);
    setVentaExitosa(null);
  }, []);

  const handleProceedToPayment = useCallback(() => {
    if (cartItems.length === 0) {
      notify.error("El carrito está vacío.");
      return;
    }
    if (!selectedClient) {
      notify.error("Por favor, seleccione un cliente para la venta.");
      return;
    }
    setIsPaymentModalOpen(true);
  }, [cartItems.length, selectedClient, notify]);

  const handleClientCreated = useCallback((newClient: Cliente) => {
    setClients(prevClients => [...prevClients, newClient]);
    setSelectedClient(newClient);
    setIsClientModalOpen(false);
  }, []);

  // useCallback: finaliza la venta (crea factura + pago(s)) y muestra correlativo/numero_control.
  // `pagos` puede traer más de una línea (pago dividido entre métodos) y no
  // tiene por qué cubrir el total (abono a crédito) -- ver `PaymentModal`.
  const handleFinalizeSale = useCallback(async (pagos: PagoLinea[]): Promise<boolean> => {
    // El modal maneja su propio cierre tras la animación de éxito; no lo cerramos antes.
    const monedaSel = monedas.find(m => m.codigo === selectedCurrencyCode);
    const primerMetodoId = pagos[0]?.metodoPagoId ?? null;

    const facturaPayload: FacturaRequest = {
      fecha_operacion: new Date().toISOString(),
      cliente: selectedClient?.id,
      estado: 'borrador',
      metodo_pago: pagos.length === 1 ? primerMetodoId : null,
      moneda: monedaSel?.id ?? null,
      tasa_cambio: totales.tasa_cambio > 0 ? totales.tasa_cambio.toFixed(6) : null,
      descuento_global: descuentoGlobal > 0 ? descuentoGlobal.toFixed(2) : null,
      condicion_pago: condicionPago,
      vendedor: vendedorId ?? undefined,
      detalles_para_crear: cartItems.map(item => ({
        producto: item.id,
        cantidad: item.quantity,
        // Convertido a la moneda de emisión seleccionada (ver `convertirPrecio`)
        // -- el backend espera `precio_unitario` YA en la moneda de la factura,
        // no en la moneda en la que se guardó el producto en inventario.
        precio_unitario: convertirPrecio(parseDecimal(item.precio), item.moneda_codigo).toFixed(2),
      })),
    };

    const totalVenta = totales.total.toFixed(2);
    const pagosPayload: PagoRequestLinea[] = pagos.map(p => ({
      metodo_pago_id: p.metodoPagoId,
      monto: p.monto.toFixed(2),
      monto_recibido: p.montoRecibido.toFixed(2),
      referencia: p.referencia || undefined,
    }));

    // Guarda la venta en la cola local y la muestra como completada al
    // cajero -- desde su perspectiva la venta SÍ se hizo; la sincronización
    // real ocurre sola en cuanto vuelve la conexión (`usePendingSalesSync`).
    const encolarComoOffline = async (): Promise<boolean> => {
      await encolarVenta({
        id: crypto.randomUUID(),
        creadaEn: new Date().toISOString(),
        facturaPayload,
        pagos: pagosPayload,
        monedaCodigo: selectedCurrencyCode,
        total: totalVenta,
        estadoSync: 'pendiente',
      });
      notify.success('Sin conexión: la venta se guardó y se sincronizará sola cuando vuelva internet.');
      setVentaExitosa({
        correlativo: null,
        numero_control: null,
        total: totalVenta,
        moneda: selectedCurrencyCode,
        pendienteSync: true,
      });
      setCartItems([]);
      setSelectedClient(null);
      setCondicionPago('contado');
      setVendedorId(null);
      return true;
    };

    if (!online) {
      return encolarComoOffline();
    }

    let toastId = '';
    try {
      toastId = notify.loading("Creando factura...");
      const nuevaFactura: Factura = await createFactura(facturaPayload);
      notify.dismiss(toastId);

      const pagoToastId = notify.loading("Registrando pago y actualizando stock...");
      const resultado = await registrarPago(nuevaFactura.id, pagosPayload);
      const saldoPendiente = parseDecimal(resultado.saldo_pendiente || '0');
      if (saldoPendiente > 0.01) {
        notify.success(`Venta registrada. Queda un saldo pendiente de ${selectedCurrencyCode} ${saldoPendiente.toFixed(2)}.`);
      } else {
        notify.success("Venta completada con éxito.");
      }

      // Limpia el carrito y muestra el correlativo y número de control generados.
      setVentaExitosa({
        facturaId: nuevaFactura.id,
        correlativo: nuevaFactura.correlativo,
        numero_control: nuevaFactura.numero_control,
        total: totalVenta,
        moneda: selectedCurrencyCode,
      });
      setCartItems([]);
      setSelectedClient(null);
      setCondicionPago('contado');
      setVendedorId(null);
      await fetchProducts();
      notify.dismiss(pagoToastId);

      // El modal espera true para mostrar la animación de "pago completado".
      return true;
    } catch (error) {
      if (toastId) notify.dismiss(toastId);
      if (esErrorDeRed(error)) {
        return encolarComoOffline();
      }
      console.error("Error al finalizar la venta:", error);
      toastApiError(error, "Hubo un error al procesar la venta.");
      return false;
    }
  }, [
    cartItems,
    selectedClient,
    selectedCurrencyCode,
    monedas,
    totales,
    descuentoGlobal,
    notify,
    fetchProducts,
    online,
    convertirPrecio,
    condicionPago,
    vendedorId,
  ]);

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      <div className="flex justify-end">
        <CajaWidget monedas={monedas} />
      </div>

      {(!online || ventasPendientes.length > 0) && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm font-bold ${
            !online ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          <span className="flex items-center gap-2">
            {!online ? (
              <>
                <WifiOff size={16} /> Sin conexión -- puedes seguir vendiendo, las ventas se guardan y se sincronizan solas.
              </>
            ) : (
              <>
                <CloudUpload size={16} />
                {sincronizandoVentas
                  ? 'Sincronizando ventas pendientes...'
                  : `${ventasPendientes.length} venta${ventasPendientes.length === 1 ? '' : 's'} pendiente${ventasPendientes.length === 1 ? '' : 's'} de sincronizar.`}
              </>
            )}
          </span>
          {online && !sincronizandoVentas && ventasPendientes.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={sincronizarAhora}
              className="flex items-center gap-1.5 text-xs font-bold bg-white/70 hover:bg-white px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
            >
              <RefreshCw size={13} /> Sincronizar ahora
            </motion.button>
          )}
        </div>
      )}

      {/* `min-h-0` en el contenedor grid Y en cada columna: un grid item, igual
          que un flex item, por default no se encoge por debajo de la altura
          de su propio contenido (`min-height: auto`) -- sin esto en AMBAS
          columnas, la fila del grid terminaba tan alta como el contenido
          intrínseco de cualquiera de las dos, y entonces ninguno de los
          `overflow-y-auto` internos (ver SaleCart) llegaba a activarse: toda
          la página (el `<main>` del layout) era la que terminaba scrolleando. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
      {/* Listado de Productos y Búsqueda */}
      <div className="lg:col-span-2 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar producto por nombre, SKU o código de barras..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-primary-500"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center gap-1 text-xs font-mono">
              <Barcode size={16} />
              <span>SCAN</span>
            </div>
          </div>
        </div>
        <div className="flex-grow min-h-0 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-3 flex flex-col gap-3">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-1/3" />
                  <div className="flex justify-between items-center mt-1">
                    <Skeleton className="h-4 w-14" />
                    <Skeleton className="h-5 w-5 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {filteredProducts.map(product => {
                const stock = product.cantidad || 0;
                const agotado = stock <= 0;
                const bajoStock = !agotado && stock <= 5;
                return (
                  <motion.button
                    key={product.id}
                    whileTap={agotado ? undefined : { scale: 0.96 }}
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    disabled={agotado}
                    className={`group relative border rounded-xl p-3 text-left transition-all flex flex-col ${
                      agotado
                        ? 'opacity-50 cursor-not-allowed border-slate-200'
                        : 'hover:border-primary-500 hover:bg-primary-50 hover:shadow-md'
                    }`}
                  >
                    {(agotado || bajoStock) && (
                      <span
                        className={`absolute top-2 right-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                          agotado ? 'bg-red-100 text-red-600' : 'bg-accent-100 text-accent-700'
                        }`}
                      >
                        {agotado ? 'Agotado' : `${stock} und.`}
                      </span>
                    )}
                    <div className="flex-grow">
                      <p className="font-bold text-sm text-slate-800 group-hover:text-primary-700 pr-12">{product.nombre}</p>
                      <p className="text-xs text-slate-400">SKU: {product.sku || 'N/A'}</p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-black text-slate-900">
                        {selectedCurrencyCode} {convertirPrecio(parseFloat(product.precio || '0'), product.moneda_codigo).toFixed(2)}
                      </span>
                      {!agotado && <PlusCircle className="text-primary-500 group-hover:text-primary-700" size={20} />}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Carrito de Venta */}
      <div className="lg:col-span-1 min-h-0">
        <SaleCart
          cartItems={cartItems}
          onRemoveItem={handleRemoveFromCart}
          onUpdateQuantity={handleUpdateQuantity}
          onClearCart={handleClearCart}
          onProceedToPayment={handleProceedToPayment}
          clients={clients}
          selectedClient={selectedClient}
          onClientSelect={setSelectedClient}
          onNewClientClick={() => setIsClientModalOpen(true)}
          monedas={monedas}
          tasasActuales={tasasActuales}
          selectedCurrencyCode={selectedCurrencyCode}
          baseCurrencyCode={baseCurrencyCode}
          onCurrencyChange={handleCurrencyChange}
          onRefreshRates={refreshRates}
          refreshingRates={refreshingRates}
          onSaveRate={guardarNuevaTasa}
          savingRate={savingRate}
          totales={totales}
          convertirPrecio={convertirPrecio}
          condicionPago={condicionPago}
          onCondicionPagoChange={setCondicionPago}
          vendedores={vendedores}
          vendedorId={vendedorId}
          onVendedorChange={setVendedorId}
        />
      </div>
      </div>

      {/* Banner de venta exitosa con correlativo y número de control */}
      {ventaExitosa && (
        <div className="fixed inset-x-4 bottom-4 z-[90] flex justify-center pointer-events-none">
          <div className={`pointer-events-auto text-white rounded-2xl shadow-2xl p-5 max-w-md w-full flex items-start gap-4 animate-scale-in ${ventaExitosa.pendienteSync ? 'bg-amber-600' : 'bg-emerald-600'}`}>
            {ventaExitosa.pendienteSync ? <CloudUpload className="shrink-0 mt-0.5" size={28} /> : <CheckCircle2 className="shrink-0 mt-0.5" size={28} />}
            <div className="flex-grow">
              <h4 className="font-black text-lg">{ventaExitosa.pendienteSync ? 'Venta guardada (sin conexión)' : 'Venta Registrada'}</h4>
              {ventaExitosa.pendienteSync && (
                <p className="text-sm mt-1 text-amber-50">Se sincronizará automáticamente cuando vuelva la conexión.</p>
              )}
              {ventaExitosa.correlativo && (
                <p className="text-sm mt-1">
                  Correlativo: <span className="font-bold">{ventaExitosa.correlativo}</span>
                </p>
              )}
              {ventaExitosa.numero_control && (
                <p className="text-sm">
                  N° Control: <span className="font-bold">{ventaExitosa.numero_control}</span>
                </p>
              )}
              <p className="text-sm mt-1">
                Total: <span className="font-bold">{ventaExitosa.moneda} {ventaExitosa.total}</span>
              </p>
              {ventaExitosa.facturaId && (
                <button
                  type="button"
                  onClick={() => setFacturaPdfAbierta(true)}
                  className="mt-2 inline-flex items-center gap-1.5 bg-white text-emerald-700 text-xs font-black px-3 py-2 rounded-lg transition-colors hover:bg-emerald-50 shadow"
                >
                  <FileText size={14} /> Ver factura
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setVentaExitosa(null)}
              aria-label="Cerrar aviso"
              className="p-1 text-white/80 hover:text-white shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onClientCreated={handleClientCreated}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onFinalize={handleFinalizeSale}
        totalAmount={totales.total}
        currencyCode={selectedCurrencyCode}
        totalBase={totales.total_base}
        baseCurrencyCode={baseCurrencyCode}
        condicionPago={condicionPago}
      />

      <FacturaPdfModal
        isOpen={facturaPdfAbierta}
        onClose={() => setFacturaPdfAbierta(false)}
        facturaId={ventaExitosa?.facturaId ?? null}
      />
    </div>
  );
}
