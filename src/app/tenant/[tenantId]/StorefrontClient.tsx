"use client";

import { useState, useCallback, useMemo, useEffect, type ReactElement } from 'react';
import toast from 'react-hot-toast';
import { Package } from 'lucide-react';

import {
  getCatalogoPublico,
  crearPedidoPublico,
  getMetodosPagoPublico,
  getEmpresaInfoPublico,
  getTasasPublico,
  crearSesionStripe,
  type PublicProducto,
  type PublicOrderItemRequest,
  type PublicMetodoPago,
  type PublicTasaMoneda,
} from '@/services/publicCatalogService';

import StorefrontHero from './storefront/StorefrontHero';
import ProductGrid from './storefront/ProductGrid';
import CartDrawer from './storefront/CartDrawer';
import CheckoutModal from './storefront/CheckoutModal';
import FloatingCartButton from './storefront/FloatingCartButton';

interface ItemCarrito {
  producto: PublicProducto;
  cantidad: number;
}

interface StorefrontClientProps {
  subdominio: string;
  /** Catálogo pre-cargado en el servidor (ver page.tsx) para ISR/SEO. */
  productosIniciales: PublicProducto[];
}

/**
 * Orquestador del storefront: retiene todo el estado y la lógica de negocio
 * (carrito, checkout, monedas) y delega la presentación a `./storefront/*`
 * -- mismo patrón que el split del Dashboard del panel admin.
 */
export default function StorefrontClient({ subdominio, productosIniciales }: StorefrontClientProps): ReactElement {
  // Estados interactivos
  const [productos, setProductos] = useState<PublicProducto[]>(productosIniciales);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [checkoutAbierto, setCheckoutAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [direccionCliente, setDireccionCliente] = useState('');
  const [metodosPago, setMetodosPago] = useState<PublicMetodoPago[]>([]);
  const [metodoPagoId, setMetodoPagoId] = useState<number | null>(null);
  const [referenciaPago, setReferenciaPago] = useState('');
  const [telefonoNegocio, setTelefonoNegocio] = useState<string | null>(null);
  const [nombreComercial, setNombreComercial] = useState<string | null>(null);
  const [tasas, setTasas] = useState<Record<string, PublicTasaMoneda>>({});

  // Nombre real de la tienda para el navbar/hero: mejor primera impresión
  // que el slug crudo del subdominio ("mi-tienda-2" -> "MI TIENDA 2").
  const nombreTienda = nombreComercial || subdominio.replace('-', ' ');

  // Métodos de pago manuales (Pago Móvil/Zelle) y teléfono de contacto real
  // del negocio: se cargan una vez, no dependen del carrito. Si el tenant no
  // configuró métodos de pago, el checkout simplemente no muestra esa
  // sección (compatible con el flujo anterior).
  useEffect(() => {
    getMetodosPagoPublico(subdominio)
      .then(setMetodosPago)
      .catch(() => setMetodosPago([]));
    getEmpresaInfoPublico(subdominio)
      .then((info) => {
        setTelefonoNegocio(info.telefono);
        setNombreComercial(info.nombre_comercial || null);
      })
      .catch(() => {
        setTelefonoNegocio(null);
        setNombreComercial(null);
      });
    getTasasPublico(subdominio)
      .then(setTasas)
      .catch(() => setTasas({}));
  }, [subdominio]);

  // El catálogo mostraba "$" fijo sin importar la moneda base real del
  // tenant (podía ser Bs. para uno de Venezuela) -- ahora usa el símbolo
  // real de la moneda base, con "$" solo como último recurso si aún no
  // cargaron las tasas.
  const monedaBase = useMemo(() => Object.values(tasas).find((m) => m.es_base), [tasas]);
  const monedaBaseSimbolo = monedaBase?.simbolo || monedaBase?.codigo || '$';

  // Cada producto puede estar cargado en una moneda distinta (`moneda_codigo`
  // -- ver `Producto.moneda` en el backend): antes el catálogo asumía que
  // TODO producto estaba en la moneda base del tenant, así que un producto
  // cargado en $ en un tenant con base Bs. se mostraba (mal) como si el
  // número tecleado fuera Bs. Ahora cada producto muestra su propia moneda,
  // y el "equivalente" se calcula pasando primero a la base y de ahí a la
  // otra moneda (tasa = "1 unidad de esa moneda = tasa unidades de base").
  const aMonedaBase = useCallback(
    (monto: number, codigoOrigen: string | null | undefined): number => {
      const codigo = codigoOrigen || monedaBase?.codigo;
      if (!codigo) return monto;
      const info = tasas[codigo];
      if (!info || info.es_base) return monto;
      const tasa = info.tasa ? parseFloat(info.tasa) : null;
      return tasa ? monto * tasa : monto;
    },
    [tasas, monedaBase],
  );

  const simboloProducto = useCallback(
    (producto: PublicProducto): string => producto.moneda_simbolo || monedaBaseSimbolo,
    [monedaBaseSimbolo],
  );

  // "La otra moneda" a mostrar como equivalente: la primera que no sea la
  // del propio producto (normalmente la moneda no-base con tasa cargada).
  const formatearEquivalenteProducto = useCallback(
    (producto: PublicProducto, precio: number): string | null => {
      const codigoProducto = producto.moneda_codigo || monedaBase?.codigo;
      const otra = Object.values(tasas).find((m) => m.codigo !== codigoProducto && m.tasa);
      if (!otra) return null;
      const enBase = aMonedaBase(precio, codigoProducto);
      const equivalente = otra.es_base ? enBase : enBase / parseFloat(otra.tasa as string);
      if (!Number.isFinite(equivalente)) return null;
      return `${otra.simbolo || otra.codigo} ${equivalente.toFixed(2)}`;
    },
    [tasas, monedaBase, aMonedaBase],
  );
  // Equivalente del TOTAL del carrito, que ya está consolidado en moneda
  // base (ver `totalCarrito`) -- se muestra en la otra moneda disponible.
  const formatearEquivalenteBase = useCallback(
    (montoBase: number): string | null => {
      const otra = Object.values(tasas).find((m) => !m.es_base && m.tasa);
      if (!otra?.tasa) return null;
      const equivalente = montoBase / parseFloat(otra.tasa);
      if (!Number.isFinite(equivalente)) return null;
      return `${otra.simbolo || otra.codigo} ${equivalente.toFixed(2)}`;
    },
    [tasas],
  );

  // Refresca el catálogo (botón "Reintentar" y después de un pedido exitoso,
  // para reflejar el stock recién descontado sin recargar la página).
  const cargarCatalogo = useCallback(async (): Promise<void> => {
    setCargando(true);
    setError(null);
    try {
      const data = await getCatalogoPublico(subdominio);
      const lista = (data.results || []).filter(p => parseFloat(p.precio_venta) > 0);
      setProductos(lista);
    } catch (err) {
      console.error('Error cargando catálogo público:', err);
      setError('No se pudo cargar el catálogo. Asegúrate de que el comercio esté activo.');
    } finally {
      setCargando(false);
    }
  }, [subdominio]);

  // Lógica del carrito (nunca deja agregar más de lo que hay realmente disponible)
  const agregarAlCarrito = useCallback((producto: PublicProducto): void => {
    if (producto.stock_disponible <= 0) return;
    setCarrito(prev => {
      const existe = prev.find(item => item.producto.id === producto.id);
      if (existe) {
        const nuevaCantidad = Math.min(existe.cantidad + 1, producto.stock_disponible);
        return prev.map(item => (item.producto.id === producto.id ? { ...item, cantidad: nuevaCantidad } : item));
      }
      return [...prev, { producto, cantidad: 1 }];
    });
    setCarritoAbierto(true);
  }, []);

  const modificarCantidad = useCallback((id: number, delta: number): void => {
    setCarrito(prev =>
      prev.map(item => {
        if (item.producto.id === id) {
          const nueva = Math.min(item.cantidad + delta, item.producto.stock_disponible);
          return nueva > 0 ? { ...item, cantidad: nueva } : item;
        }
        return item;
      }),
    );
  }, []);

  const eliminarItem = useCallback((id: number): void => {
    setCarrito(prev => prev.filter(item => item.producto.id !== id));
  }, []);

  // Totales -- consolidados en la moneda BASE del tenant, convirtiendo cada
  // línea desde la moneda propia de su producto: antes se sumaba el precio
  // crudo de cada producto sin importar en qué moneda estaba cargado, así
  // que un carrito con productos en monedas distintas (o solo en una
  // distinta a la base) daba un total sin sentido.
  const totalCarrito = useMemo(
    () =>
      carrito.reduce(
        (sum, item) => sum + aMonedaBase(parseFloat(item.producto.precio_venta), item.producto.moneda_codigo) * item.cantidad,
        0,
      ),
    [carrito, aMonedaBase],
  );
  const totalItems = useMemo(() => carrito.reduce((sum, item) => sum + item.cantidad, 0), [carrito]);
  // Desglose fiscal del carrito -- antes solo se veía el total final, sin
  // mostrarle al cliente cuánto de eso es base imponible vs. IVA.
  const ivaTotalCarrito = useMemo(
    () =>
      carrito.reduce(
        (sum, item) => sum + aMonedaBase(parseFloat(item.producto.iva_monto || '0'), item.producto.moneda_codigo) * item.cantidad,
        0,
      ),
    [carrito, aMonedaBase],
  );
  const baseImponibleCarrito = totalCarrito - ivaTotalCarrito;

  // Filtrado
  const productosFiltrados = useMemo(
    () => productos.filter(p => p.nombre.toLowerCase().includes(filtro.toLowerCase())),
    [productos, filtro],
  );

  // Enviar pedido a la API pública
  const enviarPedido = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setEnviando(true);
    try {
      const items: PublicOrderItemRequest[] = carrito.map(item => ({
        producto_id: item.producto.id,
        cantidad: item.cantidad,
      }));
      const metodoElegido = metodosPago.find((m) => m.id === metodoPagoId);
      const resultado = await crearPedidoPublico(subdominio, {
        cliente_nombre: nombreCliente,
        cliente_telefono: telefonoCliente,
        cliente_direccion: direccionCliente,
        items,
        metodo_pago_config_id: metodoPagoId,
        referencia_pago: referenciaPago || undefined,
      });

      // Stripe: el pedido ya quedó registrado como 'pendiente'; ahora se
      // redirige a Stripe Checkout para que el cliente pague con tarjeta.
      // Al volver (éxito o cancelado), el webhook ya habrá confirmado el
      // pago en el backend -- esta pestaña no necesita hacer nada más.
      if (metodoElegido?.es_stripe && resultado.factura_id) {
        try {
          const { checkout_url } = await crearSesionStripe(subdominio, resultado.factura_id as number);
          window.location.href = checkout_url;
          return;
        } catch (stripeErr) {
          // El pedido YA se registró (solo falló iniciar el cobro con
          // tarjeta) -- no se debe decir "no se pudo registrar el pedido",
          // eso sería falso y confundiría al cliente.
          console.error('Error iniciando el pago con Stripe:', stripeErr);
          toast.error('Tu pedido quedó registrado, pero no pudimos iniciar el pago con tarjeta. Te contactaremos para coordinar el pago.');
          setExito(true);
          setCarrito([]);
          setCarritoAbierto(false);
          cargarCatalogo();
          return;
        }
      }

      setExito(true);
      setCarrito([]);
      setCarritoAbierto(false);
      setCheckoutAbierto(false);
      setMetodoPagoId(null);
      setReferenciaPago('');
      // El pedido ya descontó stock en el backend: refresca en segundo plano
      // para que el catálogo no siga mostrando cantidades desactualizadas.
      cargarCatalogo();
    } catch (err) {
      console.error('Error enviando pedido:', err);
      toast.error('No se pudo registrar el pedido. Revisa que el comercio esté activo.');
    } finally {
      setEnviando(false);
    }
  };

  // Generar orden por WhatsApp como respaldo
  const enviarPedidoWhatsApp = (): void => {
    if (!telefonoNegocio) {
      toast.error('Esta tienda no tiene un número de WhatsApp configurado.');
      return;
    }
    // El backend guarda el teléfono en cualquier formato (con o sin '+',
    // espacios, guiones); wa.me solo acepta dígitos.
    const telefonoVendedor = telefonoNegocio.replace(/\D/g, '');
    let mensaje = `👋 Hola *${nombreTienda.toUpperCase()}*, quisiera realizar el siguiente pedido:\n\n`;
    carrito.forEach((item, index) => {
      const simbolo = simboloProducto(item.producto);
      const precio = parseFloat(item.producto.precio_venta);
      mensaje += `*${index + 1}.* ${item.producto.nombre}\n`;
      mensaje += `   Cantidad: ${item.cantidad} x ${simbolo}${precio.toFixed(2)}\n`;
      mensaje += `   _Subtotal: ${simbolo}${(item.cantidad * precio).toFixed(2)}_\n\n`;
    });
    mensaje += `🛒 *TOTAL: ${monedaBaseSimbolo}${totalCarrito.toFixed(2)}*\n\n`;
    mensaje += `Por favor confirmen disponibilidad y métodos de pago. ¡Gracias!`;
    window.open(`https://wa.me/${telefonoVendedor}?text=${encodeURIComponent(mensaje)}`, '_blank');
    setCarrito([]);
    setCarritoAbierto(false);
  };

  // Solo bloquea toda la página si no hay NADA que mostrar (primera carga
  // fallida en el servidor, sin datos de respaldo del cliente).
  if (error && productos.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <Package size={48} className="text-slate-300" />
        <h2 className="mt-4 text-xl font-bold text-slate-700">Catálogo no disponible</h2>
        <p className="mt-2 text-sm text-slate-500 max-w-sm">{error}</p>
        <button
          onClick={cargarCatalogo}
          className="mt-6 bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden relative">
      <StorefrontHero
        nombreTienda={nombreTienda}
        totalItems={totalItems}
        onCartClick={() => setCarritoAbierto(true)}
        filtro={filtro}
        onFiltroChange={setFiltro}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-slate-800">Todos los productos</h3>
          <span className="text-sm font-medium text-slate-500">{productosFiltrados.length} resultados</span>
        </div>

        <ProductGrid
          productos={productosFiltrados}
          cargando={cargando}
          simbolo={simboloProducto}
          equivalente={formatearEquivalenteProducto}
          onAdd={agregarAlCarrito}
        />
      </main>

      <CartDrawer
        abierto={carritoAbierto}
        onClose={() => setCarritoAbierto(false)}
        carrito={carrito}
        onModificarCantidad={modificarCantidad}
        onEliminarItem={eliminarItem}
        simboloProducto={simboloProducto}
        totalItems={totalItems}
        totalCarrito={totalCarrito}
        ivaTotalCarrito={ivaTotalCarrito}
        baseImponibleCarrito={baseImponibleCarrito}
        monedaBaseSimbolo={monedaBaseSimbolo}
        formatearEquivalenteBase={formatearEquivalenteBase}
        onCheckout={() => { setCheckoutAbierto(true); setCarritoAbierto(false); }}
        onPedidoWhatsApp={enviarPedidoWhatsApp}
      />

      <CheckoutModal
        abierto={checkoutAbierto}
        onClose={() => setCheckoutAbierto(false)}
        exito={exito}
        onSeguirComprando={() => { setExito(false); setCheckoutAbierto(false); }}
        onSubmit={enviarPedido}
        nombreCliente={nombreCliente}
        onNombreChange={setNombreCliente}
        telefonoCliente={telefonoCliente}
        onTelefonoChange={setTelefonoCliente}
        direccionCliente={direccionCliente}
        onDireccionChange={setDireccionCliente}
        metodosPago={metodosPago}
        metodoPagoId={metodoPagoId}
        onMetodoPagoChange={setMetodoPagoId}
        referenciaPago={referenciaPago}
        onReferenciaChange={setReferenciaPago}
        monedaBaseSimbolo={monedaBaseSimbolo}
        totalCarrito={totalCarrito}
        formatearEquivalenteBase={formatearEquivalenteBase}
        enviando={enviando}
      />

      <FloatingCartButton
        visible={!carritoAbierto && totalItems > 0}
        totalItems={totalItems}
        onClick={() => setCarritoAbierto(true)}
      />
    </div>
  );
}
