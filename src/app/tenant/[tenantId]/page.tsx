"use client";

import { useState, useEffect, useCallback, useMemo, use, type ReactElement } from 'react';
import {
  ShoppingCart,
  Store,
  Plus,
  Minus,
  Trash2,
  X,
  ArrowRight,
  MessageCircle,
  Search,
  Loader2,
  Package,
  CheckCircle2,
} from 'lucide-react';

import {
  getCatalogoPublico,
  crearPedidoPublico,
  type PublicProducto,
  type PublicOrderItemRequest,
} from '@/services/publicCatalogService';

interface ItemCarrito {
  producto: PublicProducto;
  cantidad: number;
}

export default function TiendaPublica({ params }: { params: Promise<{ tenantId: string }> }): ReactElement {
  const { tenantId } = use(params);
  const subdominio = tenantId ?? '';

  // Estados interactivos
  const [productos, setProductos] = useState<PublicProducto[]>([]);
  const [cargando, setCargando] = useState(true);
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

  // Cargar catálogo real desde el backend
  const cargarCatalogo = useCallback(async (): Promise<void> => {
    setCargando(true);
    setError(null);
    try {
      const data = await getCatalogoPublico(subdominio);
      // Normaliza y filtra productos sin precio válido
      const lista = (data.results || []).filter(p => parseFloat(p.precio_venta) > 0);
      setProductos(lista);
    } catch (err) {
      console.error('Error cargando catálogo público:', err);
      setError('No se pudo cargar el catálogo. Asegúrate de que el comercio esté activo.');
    } finally {
      setCargando(false);
    }
  }, [subdominio]);

  useEffect(() => {
    cargarCatalogo();
  }, [cargarCatalogo]);

  // Lógica del carrito
  const agregarAlCarrito = useCallback((producto: PublicProducto): void => {
    setCarrito(prev => {
      const existe = prev.find(item => item.producto.id === producto.id);
      if (existe) {
        return prev.map(item =>
          item.producto.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item,
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
    setCarritoAbierto(true);
  }, []);

  const modificarCantidad = useCallback((id: number, delta: number): void => {
    setCarrito(prev =>
      prev.map(item => {
        if (item.producto.id === id) {
          const nueva = item.cantidad + delta;
          return nueva > 0 ? { ...item, cantidad: nueva } : item;
        }
        return item;
      }),
    );
  }, []);

  const eliminarItem = useCallback((id: number): void => {
    setCarrito(prev => prev.filter(item => item.producto.id !== id));
  }, []);

  // Totales (useMemo para evitar recálculos innecesarios)
  const totalCarrito = useMemo(
    () => carrito.reduce((sum, item) => sum + parseFloat(item.producto.precio_venta) * item.cantidad, 0),
    [carrito],
  );
  const totalItems = useMemo(() => carrito.reduce((sum, item) => sum + item.cantidad, 0), [carrito]);

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
        variacion_id: item.producto.id,
        cantidad: item.cantidad,
      }));
      await crearPedidoPublico(subdominio, {
        cliente_nombre: nombreCliente,
        cliente_telefono: telefonoCliente,
        cliente_direccion: direccionCliente,
        items,
      });
      setExito(true);
      setCarrito([]);
      setCarritoAbierto(false);
      setCheckoutAbierto(false);
    } catch (err) {
      console.error('Error enviando pedido:', err);
      alert('No se pudo registrar el pedido. Revisa que el comercio esté activo.');
    } finally {
      setEnviando(false);
    }
  };

  // Generar orden por WhatsApp como respaldo
  const enviarPedidoWhatsApp = (): void => {
    const telefonoVendedor = "584141172383";
    const nombreTienda = subdominio.toUpperCase();
    let mensaje = `👋 Hola *${nombreTienda}*, quisiera realizar el siguiente pedido:\n\n`;
    carrito.forEach((item, index) => {
      mensaje += `*${index + 1}.* ${item.producto.nombre}\n`;
      mensaje += `   Cantidad: ${item.cantidad} x $${parseFloat(item.producto.precio_venta).toFixed(2)}\n`;
      mensaje += `   _Subtotal: $${(item.cantidad * parseFloat(item.producto.precio_venta)).toFixed(2)}_\n\n`;
    });
    mensaje += `🛒 *TOTAL: $${totalCarrito.toFixed(2)}*\n\n`;
    mensaje += `Por favor confirmen disponibilidad y métodos de pago. ¡Gracias!`;
    window.open(`https://wa.me/${telefonoVendedor}?text=${encodeURIComponent(mensaje)}`, '_blank');
    setCarrito([]);
    setCarritoAbierto(false);
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={40} className="animate-spin text-primary-600" />
          <p className="font-semibold">Cargando catálogo...</p>
        </div>
      </div>
    );
  }

  if (error) {
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
      {/* 1. NAVBAR */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Store size={20} />
            </div>
            <h1 className="text-xl font-black tracking-tight uppercase text-slate-800">
              {subdominio.replace('-', ' ')}
            </h1>
          </div>
          <button
            onClick={() => setCarritoAbierto(true)}
            className="relative p-2 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
            aria-label="Abrir carrito"
          >
            <ShoppingCart size={24} />
            {totalItems > 0 && (
              <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-white shadow-sm">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 2. HERO + BÚSQUEDA */}
      <section className="bg-primary-900 text-white py-12 px-4 relative overflow-hidden">
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary-800 rounded-full blur-3xl opacity-50" />
        <div className="max-w-7xl mx-auto relative z-10 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-2">Bienvenido a nuestra tienda</h2>
            <p className="text-primary-200">Compra fácil y haz tu pedido en segundos.</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:bg-white focus:text-slate-900 focus:placeholder-slate-400 transition-all"
            />
          </div>
        </div>
      </section>

      {/* 3. GRID DE PRODUCTOS */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-slate-800">Todos los productos</h3>
          <span className="text-sm font-medium text-slate-500">{productosFiltrados.length} resultados</span>
        </div>

        {productosFiltrados.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <p>No se encontraron productos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {productosFiltrados.map(producto => (
              <div
                key={producto.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="h-48 bg-slate-50 flex items-center justify-center relative overflow-hidden">
                  {producto.imagen_url ? (
                    // Usamos un <img> estándar: el catálogo público de Next usa imágenes del backend
                    <img
                      src={producto.imagen_url}
                      alt={producto.nombre}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <Package size={56} className="text-slate-300" />
                  )}
                </div>
                <div className="p-5 flex flex-col flex-grow">
                  <h4 className="font-bold text-slate-800 text-lg leading-tight mb-1 group-hover:text-primary-600 transition-colors">
                    {producto.nombre}
                  </h4>
                  {producto.descripcion && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">{producto.descripcion}</p>
                  )}
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="text-xl font-black text-slate-900">
                      ${parseFloat(producto.precio_venta).toFixed(2)}
                    </span>
                    <button
                      onClick={() => agregarAlCarrito(producto)}
                      className="bg-slate-100 text-primary-700 w-10 h-10 rounded-full flex items-center justify-center font-bold hover:bg-primary-600 hover:text-white transition-colors shadow-sm active:scale-95"
                      aria-label="Agregar al carrito"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 4. OVERLAY + DRAWER CARRITO */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${carritoAbierto ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={() => setCarritoAbierto(false)}
      />

      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${carritoAbierto ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
            <ShoppingCart size={20} className="text-primary-600" /> Mi Pedido
          </div>
          <button
            onClick={() => setCarritoAbierto(false)}
            className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {carrito.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <ShoppingCart size={48} className="opacity-20" />
              <p>Tu carrito está vacío</p>
            </div>
          ) : (
            carrito.map(item => (
              <div key={item.producto.id} className="flex gap-4 bg-white p-3 border border-slate-100 rounded-xl shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  {item.producto.imagen_url ? (
                    <img src={item.producto.imagen_url} alt={item.producto.nombre} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <Package size={24} className="text-slate-300" />
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <h5 className="font-bold text-slate-800 text-sm leading-tight pr-2">{item.producto.nombre}</h5>
                    <button
                      onClick={() => eliminarItem(item.producto.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                      aria-label="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-black text-primary-700 text-sm">
                      ${(parseFloat(item.producto.precio_venta) * item.cantidad).toFixed(2)}
                    </span>
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                      <button onClick={() => modificarCantidad(item.producto.id, -1)} className="text-slate-500 hover:text-slate-800" aria-label="Disminuir">
                        <Minus size={14} />
                      </button>
                      <span className="font-bold text-slate-800 text-xs w-4 text-center">{item.cantidad}</span>
                      <button onClick={() => modificarCantidad(item.producto.id, 1)} className="text-slate-500 hover:text-slate-800" aria-label="Aumentar">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {carrito.length > 0 && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Subtotal ({totalItems} items)</span>
              <span className="text-2xl font-black text-slate-900">${totalCarrito.toFixed(2)}</span>
            </div>
            <button
              onClick={() => { setCheckoutAbierto(true); setCarritoAbierto(false); }}
              className="w-full bg-primary-600 text-white py-4 rounded-xl font-black text-base shadow-lg hover:bg-primary-700 transition-all flex items-center justify-center gap-2"
            >
              <ArrowRight size={20} /> Finalizar Pedido
            </button>
            <button
              onClick={enviarPedidoWhatsApp}
              className="w-full bg-green-500 text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-green-600 transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle size={18} /> Pedir por WhatsApp
            </button>
          </div>
        )}
      </aside>

      {/* 5. MODAL CHECKOUT */}
      {checkoutAbierto && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-primary-900 p-6 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Confirmar Pedido</h3>
              <button onClick={() => setCheckoutAbierto(false)} className="p-2 hover:bg-primary-800 rounded-full">
                <X size={20} />
              </button>
            </div>

            {exito ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={40} />
                </div>
                <h4 className="text-xl font-black text-slate-900">¡Pedido enviado!</h4>
                <p className="text-sm text-slate-500">
                  Tu pedido fue registrado con éxito. El comercio te contactará para confirmar la entrega.
                </p>
                <button
                  onClick={() => { setExito(false); setCheckoutAbierto(false); }}
                  className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700"
                >
                  Seguir comprando
                </button>
              </div>
            ) : (
              <form onSubmit={enviarPedido} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tu nombre</label>
                  <input
                    type="text"
                    value={nombreCliente}
                    onChange={e => setNombreCliente(e.target.value)}
                    placeholder="Ej. María Pérez"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-600 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    value={telefonoCliente}
                    onChange={e => setTelefonoCliente(e.target.value)}
                    placeholder="Ej. 0412 1234567"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-600 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección de entrega</label>
                  <textarea
                    value={direccionCliente}
                    onChange={e => setDireccionCliente(e.target.value)}
                    placeholder="Dirección completa"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-600 focus:bg-white h-20 resize-none"
                    required
                  />
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-600">Total a pagar</span>
                  <span className="text-xl font-black text-slate-900">${totalCarrito.toFixed(2)}</span>
                </div>

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full bg-accent-500 text-white py-3.5 rounded-xl font-black text-sm shadow-lg hover:bg-accent-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {enviando ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  Confirmar Pedido
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 6. BOTÓN FLOTANTE MÓVIL */}
      {!carritoAbierto && totalItems > 0 && (
        <button
          onClick={() => setCarritoAbierto(true)}
          className="md:hidden fixed bottom-6 right-6 bg-primary-600 text-white p-4 rounded-full shadow-2xl hover:bg-primary-700 flex items-center justify-center z-30"
          aria-label="Abrir carrito"
        >
          <ShoppingCart size={24} />
          <span className="absolute -top-2 -right-2 bg-accent-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white">
            {totalItems}
          </span>
        </button>
      )}
    </div>
  );
}
