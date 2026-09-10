/**
 * @file Contenedor principal del Punto de Venta (POS).
 * Orquesta: catálogo, clientes, monedas, tasas de cambio, estrategia fiscal,
 * motor de cálculo en tiempo real y el flujo de facturación + pago.
 */
"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { Search, Loader2, Barcode, PlusCircle, CheckCircle2, X } from 'lucide-react';
import { useNotify } from '@/hooks/useNotify';
import { getProductos } from '@/services/inventoryService';
import { getClientes } from '@/services/clientesService';
import { createFactura, registrarPago } from '@/services/facturacionService';
import {
  getMonedas,
  getTasasCambioActual,
  getTaxStrategy,
  type TasaCambioActual,
} from '@/services/configuracionService';
import { getIvas } from '@/services/configService';
import { Producto, Cliente, Moneda, Iva, FacturaRequest, Factura } from '@/types/api';
import { parseDecimal } from '@/utils/helpers';
import { toastApiError } from '@/utils/errors';
import { calcularTotales, type ItemCalculo, type TotalesCalculo } from '@/utils/taxCalculator';

import SaleCart, { CartItem } from './components/SaleCart';
import PaymentModal from './components/PaymentModal';
import ClientModal from './components/ClientModal';

interface PosViewProps {
  tenantId: string;
}

interface VentaExitosa {
  correlativo?: string | null;
  numero_control?: string | null;
  total: string;
  moneda: string;
}

/**
 * Vista principal del POS. Dinámicamente importada con `ssr: false`.
 */
export default function PosView({ tenantId }: PosViewProps): ReactElement {
  const notify = useNotify();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Producto[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Producto[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);

  // Multi-moneda + fiscal
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [tasasActuales, setTasasActuales] = useState<Record<string, TasaCambioActual>>({});
  const [ivas, setIvas] = useState<Iva[]>([]);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState('');
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const [retencionPct, setRetencionPct] = useState(0);
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [ventaExitosa, setVentaExitosa] = useState<VentaExitosa | null>(null);

  // useCallback: carga inicial de todos los datos maestros.
  const fetchProducts = useCallback(async () => {
    try {
      const [productsData, clientsData, monedasData, tasasData, ivasData] = await Promise.all([
        getProductos(),
        getClientes(),
        getMonedas(),
        getTasasCambioActual(),
        getIvas(),
      ]);
      setProducts(productsData);
      setFilteredProducts(productsData);
      setClients(clientsData);
      setMonedas(monedasData);
      setTasasActuales(tasasData);
      setIvas(ivasData);

      // Seleccionamos la moneda base por defecto.
      if (!selectedCurrencyCode) {
        const base = monedasData.find(m => m.es_predeterminada) ?? monedasData[0];
        if (base) setSelectedCurrencyCode(base.codigo);
      }
      // Estrategia fiscal: la cargamos para tener contexto de tasas/país.
      getTaxStrategy('VE').catch(() => {/* opcional */});
    } catch (error) {
      console.error("Error al cargar datos iniciales:", error);
      toastApiError(error, "No se pudieron cargar los productos, clientes o configuración fiscal.");
    } finally {
      setLoading(false);
    }
  }, [selectedCurrencyCode]);

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
      precio_final_unitario: parseDecimal(item.precio),
      tasa_iva: item.configuracion_iva ? (ivaMap[item.configuracion_iva] ?? 0) : 0,
      descuento_pct: parseDecimal(item.descuento),
    }));

    return calcularTotales({
      lineas,
      descuento_global: descuentoGlobal,
      retencion_pct: retencionPct,
      moneda: { codigo: selectedCurrencyCode, tasa, es_base: esBase },
    });
  }, [cartItems, ivaMap, monedas, tasasActuales, selectedCurrencyCode, descuentoGlobal, retencionPct]);

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

  // useCallback: finaliza la venta (crea factura + pago) y muestra correlativo/numero_control.
  const handleFinalizeSale = useCallback(async (paymentMethodId: number): Promise<boolean> => {
    // El modal maneja su propio cierre tras la animación de éxito; no lo cerramos antes.
    const monedaSel = monedas.find(m => m.codigo === selectedCurrencyCode);

    const facturaPayload: FacturaRequest = {
      fecha_operacion: new Date().toISOString(),
      cliente: selectedClient?.id,
      estado: 'borrador',
      metodo_pago: paymentMethodId,
      moneda: monedaSel?.id ?? null,
      tasa_cambio: totales.tasa_cambio > 0 ? totales.tasa_cambio.toFixed(6) : null,
      descuento_global: descuentoGlobal > 0 ? descuentoGlobal.toFixed(2) : null,
      detalles_para_crear: cartItems.map(item => ({
        producto: item.id,
        cantidad: item.quantity,
        precio_unitario: item.precio || '0',
      })),
    };

    let toastId = '';
    try {
      toastId = notify.loading("Creando factura...");
      const nuevaFactura: Factura = await createFactura(facturaPayload);
      notify.dismiss(toastId);

      const pagoToastId = notify.loading("Registrando pago y actualizando stock...");
      await registrarPago(nuevaFactura.id, paymentMethodId, totales.total.toFixed(2));
      notify.success("Venta completada con éxito.");

      // Limpia el carrito y muestra el correlativo y número de control generados.
      setVentaExitosa({
        correlativo: nuevaFactura.correlativo,
        numero_control: nuevaFactura.numero_control,
        total: totales.total.toFixed(2),
        moneda: selectedCurrencyCode,
      });
      setCartItems([]);
      setSelectedClient(null);
      await fetchProducts();
      notify.dismiss(pagoToastId);

      // El modal espera true para mostrar la animación de "pago completado".
      return true;
    } catch (error) {
      console.error("Error al finalizar la venta:", error);
      if (toastId) notify.dismiss(toastId);
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
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-8rem)]">
      {/* Listado de Productos y Búsqueda */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
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
        <div className="flex-grow overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              <Loader2 size={32} className="animate-spin mr-3" />
              Cargando productos...
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleAddToCart(product)}
                  className="group border rounded-xl p-3 text-left hover:border-primary-500 hover:bg-primary-50 transition-all flex flex-col"
                >
                  <div className="flex-grow">
                    <p className="font-bold text-sm text-slate-800 group-hover:text-primary-700">{product.nombre}</p>
                    <p className="text-xs text-slate-400">SKU: {product.sku || 'N/A'}</p>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-black text-slate-900">
                      {selectedCurrencyCode} {parseFloat(product.precio || '0').toFixed(2)}
                    </span>
                    <PlusCircle className="text-primary-500 group-hover:text-primary-700" size={20} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Carrito de Venta */}
      <div className="lg:col-span-1">
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
          totales={totales}
        />
      </div>

      {/* Banner de venta exitosa con correlativo y número de control */}
      {ventaExitosa && (
        <div className="fixed inset-x-4 bottom-4 z-[90] flex justify-center pointer-events-none">
          <div className="pointer-events-auto bg-emerald-600 text-white rounded-2xl shadow-2xl p-5 max-w-md w-full flex items-start gap-4 animate-scale-in">
            <CheckCircle2 className="shrink-0 mt-0.5" size={28} />
            <div className="flex-grow">
              <h4 className="font-black text-lg">Venta Registrada</h4>
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
      />
    </div>
  );
}
