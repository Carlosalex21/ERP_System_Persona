/**
 * @file Contenedor principal del Punto de Venta (POS).
 * Orquesta: catálogo, clientes, monedas, tasas de cambio, estrategia fiscal,
 * motor de cálculo en tiempo real y el flujo de facturación + pago.
 */
"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { Search, Barcode, PlusCircle, CheckCircle2, X, WifiOff, RefreshCw, CloudUpload, FileText, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui';
import { useNotify } from '@/hooks/useNotify';
import { getProductos } from '@/services/inventoryService';
import { getClientes } from '@/services/clientesService';
import { createFactura, registrarPago, getMetodosDePago, obtenerLinkCompartirFactura } from '@/services/facturacionService';
import { getConfiguracionEmpresa } from '@/services/configuracionService';
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
import { construirLinkWhatsapp } from '@/utils/whatsapp';
import { encolarVenta } from '@/utils/offlineDb';
import { usePinAutorizacion } from '@/hooks/usePinAutorizacion';
import PinAutorizacionModal from '@/components/PinAutorizacionModal';

import SaleCart, { CartItem } from './components/SaleCart';
import PaymentModal, { PagoLinea } from './components/PaymentModal';
import CajaWidget from './components/CajaWidget';
import ClientModal from './components/ClientModal';
import ProductVariantModal from './components/ProductVariantModal';
import FacturaPdfModal from '@/components/facturacion/FacturaPdfModal';

/** Identidad de una línea del carrito: el mismo producto con distinta variante/presentación es una línea distinta. */
const armarCartKey = (productoId: number, varianteId?: number | null, presentacionId?: number | null): string =>
  `${productoId}-${varianteId ?? 'x'}-${presentacionId ?? 'x'}`;

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
  /** Capturados de `selectedClient` en el momento de la venta -- ya para cuando esto se renderiza, `selectedClient` se limpió para la próxima venta. */
  clienteNombre?: string | null;
  clienteTelefono?: string | null;
}

/**
 * Vista principal del POS. Dinámicamente importada con `ssr: false`.
 */
export default function PosView({ tenantId }: PosViewProps): ReactElement {
  const notify = useNotify();
  const { tenant } = useTenant();
  // Si el admin activó "Exigir PIN para eliminar renglones" (ver Datos de
  // la Empresa), quitar un ítem del carrito pide antes el PIN de un
  // encargado -- si no lo activó, `pinAuth.solicitar` ejecuta la acción
  // directo, sin pedir nada.
  const pinAuth = usePinAutorizacion();

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
  // Link de WhatsApp de la última venta -- se arma de forma asíncrona
  // (necesita pedirle al backend el link firmado al PDF y la plantilla de
  // mensaje configurada) apenas se conoce el facturaId, no en cada render.
  const [linkWhatsappVenta, setLinkWhatsappVenta] = useState<string | null>(null);
  // Producto con variantes/presentaciones que el cajero acaba de tocar --
  // mientras esto no sea null, se muestra el selector antes de agregarlo de
  // verdad al carrito (un producto simple sin ninguna de las dos se agrega
  // directo, sin pasar por aquí).
  const [productoParaVariante, setProductoParaVariante] = useState<Producto | null>(null);
  // Condición de pago y vendedor: por defecto "contado" y sin vendedor
  // explícito (el backend le atribuye la venta a quien está logueado). El
  // selector de vendedor es para cuando un vendedor cerró la venta en la
  // calle y otra persona (ej. un admin) la está tipeando en el sistema.
  // 'nota_entrega': entrega la mercancía YA (descuenta stock al crearse,
  // ver `NotasEntregaPage`) pero sin factura fiscal todavía -- se convierte
  // en factura real después, cuando el cliente confirme o llegue la fecha.
  const [condicionPago, setCondicionPago] = useState<'contado' | 'credito' | 'nota_entrega'>('contado');
  const [generandoNotaEntrega, setGenerandoNotaEntrega] = useState(false);
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

  // Arma el mensaje de WhatsApp de la venta recién cerrada: la plantilla
  // configurable de la empresa (Ajustes > Empresa) + el link firmado al PDF
  // de la factura, que SIEMPRE se agrega al final -- nunca es opcional,
  // porque wa.me no permite adjuntar el archivo, solo el link deja que el
  // cliente en verdad reciba su factura.
  useEffect(() => {
    if (!ventaExitosa?.facturaId || !ventaExitosa?.clienteTelefono) {
      setLinkWhatsappVenta(null);
      return;
    }
    let cancelado = false;
    (async () => {
      try {
        const [empresa, linkPdf] = await Promise.all([
          getConfiguracionEmpresa(),
          obtenerLinkCompartirFactura(ventaExitosa.facturaId!),
        ]);
        const plantilla = empresa.mensaje_whatsapp_venta || 'Hola {cliente}, gracias por tu compra{factura}. Total: {moneda} {total}. ¡Que la disfrutes!';
        const texto = plantilla
          .replace(/\{cliente\}/g, ventaExitosa.clienteNombre || '')
          .replace(/\{factura\}/g, ventaExitosa.correlativo ? ` (${ventaExitosa.correlativo})` : '')
          .replace(/\{total\}/g, ventaExitosa.total)
          .replace(/\{moneda\}/g, ventaExitosa.moneda);
        const mensajeCompleto = `${texto}\n\n${linkPdf}`;
        const link = construirLinkWhatsapp(ventaExitosa.clienteTelefono!, mensajeCompleto, tenant?.pais_codigo);
        if (!cancelado) setLinkWhatsappVenta(link);
      } catch {
        if (!cancelado) setLinkWhatsappVenta(null);
      }
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventaExitosa?.facturaId]);

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
      precio_final_unitario: convertirPrecio(parseDecimal(item.precioLinea), item.moneda_codigo),
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
  const handleAddToCart = useCallback((product: Producto, opts?: { varianteId?: number; presentacionId?: number }) => {
    const varianteId = opts?.varianteId ?? null;
    const presentacionId = opts?.presentacionId ?? null;
    const variante = varianteId ? (product.variantes || []).find(v => v.id === varianteId) : null;
    const presentacion = presentacionId ? (product.presentaciones || []).find(p => p.id === presentacionId) : null;

    const cartKey = armarCartKey(product.id, varianteId, presentacionId);
    const nombreCarrito = variante
      ? `${product.nombre} (${variante.nombre})`
      : presentacion
        ? `${product.nombre} - ${presentacion.nombre}`
        : product.nombre;
    const precioLinea = variante
      ? (variante.precio ?? product.precio ?? '0')
      : presentacion
        ? (presentacion.precio ?? (parseFloat(product.precio || '0') * presentacion.factor_conversion).toFixed(2))
        : (product.precio ?? '0');
    // Tope de cantidad para ESTA línea: stock propio de la variante, o
    // cuántas unidades de la presentación caben en el stock base -- nunca
    // `product.cantidad` a secas (que para un producto 'variable' no
    // representa nada, el stock real vive en cada variante).
    const stockLinea = variante
      ? (variante.cantidad ?? 0)
      : presentacion
        ? Math.floor((product.cantidad || 0) / presentacion.factor_conversion)
        : (product.cantidad || 0);

    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.cartKey === cartKey);

      if (existingItem) {
        if (existingItem.quantity >= stockLinea) {
          notify.error(`No hay más stock para ${nombreCarrito}.`);
          return prevItems;
        }
        return prevItems.map(item =>
          item.cartKey === cartKey ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      if (stockLinea < 1) {
        notify.error(`${nombreCarrito} está agotado.`);
        return prevItems;
      }

      return [...prevItems, {
        ...product,
        quantity: 1,
        cartKey,
        varianteId,
        presentacionId,
        nombreCarrito,
        precioLinea: String(precioLinea),
        stockLinea,
      }];
    });
  }, [notify]);

  const handleRemoveFromCart = useCallback((cartKey: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.cartKey !== cartKey));
  }, []);

  const handleUpdateQuantity = useCallback((cartKey: string, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveFromCart(cartKey);
      return;
    }

    setCartItems(prevItems =>
      prevItems.map(item => {
        if (item.cartKey !== cartKey) return item;
        let cantidad = newQuantity;
        if (cantidad > item.stockLinea) {
          notify.error(`Solo hay ${item.stockLinea} unidades disponibles.`);
          cantidad = item.stockLinea;
        }
        return { ...item, quantity: cantidad };
      }),
    );
  }, [handleRemoveFromCart, notify]);

  const handleClearCart = useCallback(() => {
    setCartItems([]);
    setSelectedClient(null);
    setVentaExitosa(null);
  }, []);

  // Crea la nota de entrega directo (sin pasar por `PaymentModal`): el
  // backend descuenta el stock de inmediato al crearla con
  // `estado='nota_entrega'` (ver `perform_create` en `FacturaViewSet`) --
  // no hay pago que registrar todavía, eso pasa después al convertirla en
  // factura real desde "Notas de Entrega".
  const handleGenerarNotaEntrega = useCallback(async (): Promise<void> => {
    if (!selectedClient) return;
    setGenerandoNotaEntrega(true);
    const monedaSel = monedas.find(m => m.codigo === selectedCurrencyCode);
    const facturaPayload: FacturaRequest = {
      fecha_operacion: new Date().toISOString(),
      cliente: selectedClient.id,
      estado: 'nota_entrega',
      moneda: monedaSel?.id ?? null,
      tasa_cambio: totales.tasa_cambio > 0 ? totales.tasa_cambio.toFixed(6) : null,
      descuento_global: descuentoGlobal > 0 ? descuentoGlobal.toFixed(2) : null,
      condicion_pago: 'credito',
      vendedor: vendedorId ?? undefined,
      detalles_para_crear: cartItems.map(item => ({
        producto: item.id,
        variante: item.varianteId ?? undefined,
        presentacion: item.presentacionId ?? undefined,
        cantidad: item.quantity,
        precio_unitario: convertirPrecio(parseDecimal(item.precioLinea), item.moneda_codigo).toFixed(2),
      })),
    };
    try {
      const nuevaFactura = await createFactura(facturaPayload);
      notify.success('Nota de entrega generada: el stock ya se descontó. Factúrala luego desde "Notas de Entrega".');
      setVentaExitosa({
        facturaId: nuevaFactura.id,
        correlativo: null,
        numero_control: null,
        total: totales.total.toFixed(2),
        moneda: selectedCurrencyCode,
        clienteNombre: selectedClient?.nombre,
        clienteTelefono: selectedClient?.telefono,
      });
      setCartItems([]);
      setSelectedClient(null);
      setCondicionPago('contado');
      setVendedorId(null);
      await fetchProducts();
    } catch (error) {
      console.error('Error al generar la nota de entrega:', error);
      toastApiError(error, 'No se pudo generar la nota de entrega.');
    } finally {
      setGenerandoNotaEntrega(false);
    }
  }, [selectedClient, monedas, selectedCurrencyCode, totales, descuentoGlobal, vendedorId, cartItems, convertirPrecio, notify, fetchProducts]);

  const handleProceedToPayment = useCallback(() => {
    if (cartItems.length === 0) {
      notify.error("El carrito está vacío.");
      return;
    }
    if (!selectedClient) {
      notify.error("Por favor, seleccione un cliente para la venta.");
      return;
    }
    if (condicionPago === 'nota_entrega') {
      handleGenerarNotaEntrega();
      return;
    }
    setIsPaymentModalOpen(true);
  }, [cartItems.length, selectedClient, notify, condicionPago, handleGenerarNotaEntrega]);

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
      // `handleFinalizeSale` nunca corre con 'nota_entrega' (esa condición
      // se desvía a `handleGenerarNotaEntrega` antes de abrir este modal,
      // ver `handleProceedToPayment`) -- el fallback es solo para que el
      // tipo de `FacturaRequest.condicion_pago` (sin 'nota_entrega') cierre.
      condicion_pago: condicionPago === 'nota_entrega' ? 'credito' : condicionPago,
      vendedor: vendedorId ?? undefined,
      detalles_para_crear: cartItems.map(item => ({
        producto: item.id,
        variante: item.varianteId ?? undefined,
        presentacion: item.presentacionId ?? undefined,
        cantidad: item.quantity,
        // Convertido a la moneda de emisión seleccionada (ver `convertirPrecio`)
        // -- el backend espera `precio_unitario` YA en la moneda de la factura,
        // no en la moneda en la que se guardó el producto en inventario.
        precio_unitario: convertirPrecio(parseDecimal(item.precioLinea), item.moneda_codigo).toFixed(2),
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
        clienteNombre: selectedClient?.nombre,
        clienteTelefono: selectedClient?.telefono,
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
        clienteNombre: selectedClient?.nombre,
        clienteTelefono: selectedClient?.telefono,
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
                // Un producto 'variable' no lleva stock propio -- vive en
                // cada variante (ver `Variacionproducto.cantidad`); sumar
                // `product.cantidad` a secas mostraría "Agotado" siempre.
                const tieneVariantes = product.tipo === 'variable' && (product.variantes || []).length > 0;
                const presentacionesActivas = (product.presentaciones || []).filter(p => p.activo);
                const tienePresentaciones = presentacionesActivas.length > 0;
                const stock = tieneVariantes
                  ? (product.variantes || []).reduce((acc, v) => acc + (v.cantidad || 0), 0)
                  : (product.cantidad || 0);
                const agotado = stock <= 0;
                const bajoStock = !agotado && stock <= 5;
                const precioBase = parseFloat(product.precio || '0');
                const precioMostrado = tieneVariantes
                  ? Math.min(...(product.variantes || []).map(v => (v.precio ? parseFloat(v.precio) : precioBase)))
                  : precioBase;
                return (
                  <motion.button
                    key={product.id}
                    whileTap={agotado ? undefined : { scale: 0.96 }}
                    type="button"
                    onClick={() => {
                      if (tieneVariantes || tienePresentaciones) {
                        setProductoParaVariante(product);
                      } else {
                        handleAddToCart(product);
                      }
                    }}
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
                      <p className="text-xs text-slate-400">
                        SKU: {product.sku || 'N/A'}
                        {(tieneVariantes || tienePresentaciones) && (
                          <span className="ml-1.5 text-primary-500 font-bold">
                            {tieneVariantes ? '· Con variantes' : '· Con presentaciones'}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-black text-slate-900">
                        {tieneVariantes && 'Desde '}
                        {selectedCurrencyCode} {convertirPrecio(precioMostrado, product.moneda_codigo).toFixed(2)}
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
          onRemoveItem={(cartKey) => pinAuth.solicitar(() => handleRemoveFromCart(cartKey))}
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
          generandoNotaEntrega={generandoNotaEntrega}
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
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {ventaExitosa.facturaId && (
                  <button
                    type="button"
                    onClick={() => setFacturaPdfAbierta(true)}
                    className="inline-flex items-center gap-1.5 bg-white text-emerald-700 text-xs font-black px-3 py-2 rounded-lg transition-colors hover:bg-emerald-50 shadow"
                  >
                    <FileText size={14} /> Ver factura
                  </button>
                )}
                {linkWhatsappVenta && (
                  <a
                    href={linkWhatsappVenta}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-white text-emerald-700 text-xs font-black px-3 py-2 rounded-lg transition-colors hover:bg-emerald-50 shadow"
                  >
                    <MessageCircle size={14} /> Enviar por WhatsApp
                  </a>
                )}
              </div>
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

      {productoParaVariante && (
        <ProductVariantModal
          producto={productoParaVariante}
          onClose={() => setProductoParaVariante(null)}
          onSelectVariante={(varianteId) => {
            handleAddToCart(productoParaVariante, { varianteId });
            setProductoParaVariante(null);
          }}
          onSelectPresentacion={(presentacionId) => {
            handleAddToCart(productoParaVariante, { presentacionId });
            setProductoParaVariante(null);
          }}
        />
      )}

      <PinAutorizacionModal {...pinAuth.modalProps} />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onFinalize={handleFinalizeSale}
        totalAmount={totales.total}
        currencyCode={selectedCurrencyCode}
        totalBase={totales.total_base}
        baseCurrencyCode={baseCurrencyCode}
        // Este modal nunca se abre con condicionPago='nota_entrega' (ver
        // `handleProceedToPayment`, que desvía ese caso antes de llegar
        // aquí) -- el fallback es solo para que el tipo cierre.
        condicionPago={condicionPago === 'nota_entrega' ? 'credito' : condicionPago}
      />

      <FacturaPdfModal
        isOpen={facturaPdfAbierta}
        onClose={() => setFacturaPdfAbierta(false)}
        facturaId={ventaExitosa?.facturaId ?? null}
      />
    </div>
  );
}
