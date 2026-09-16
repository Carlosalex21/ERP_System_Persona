"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import toast from 'react-hot-toast';
import {
  ShoppingCart, Plus, Minus, Trash2, X, ArrowRight, Search, Loader2, Package, CheckCircle2,
  TrendingUp, Clock, RefreshCw, Wallet, BadgePercent,
} from 'lucide-react';
import {
  getB2BCatalogo, crearPedidoB2B, getB2BPerfil, getSugerenciasReposicion,
  type B2BProducto, type B2BVariante, type B2BOrderItemRequest, type B2BPerfil, type B2BSugerenciaReposicion,
} from '@/services/b2bPortalService';

interface ItemCarrito {
  producto: B2BProducto;
  variante: B2BVariante | null;
  cantidad: number;
}

/** Clave única de carrito: un producto variable puede tener varias variantes distintas a la vez. */
function claveItem(productoId: number, varianteId: number | null): string {
  return `${productoId}:${varianteId ?? 'simple'}`;
}

/** Catálogo B2B: mismo patrón que el storefront público, pero autenticado y con precio negociado. */
export default function B2BPortalCatalogo(): ReactElement {
  const [productos, setProductos] = useState<B2BProducto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pedidoExitoso, setPedidoExitoso] = useState<{ correlativo: string | null; total: string } | null>(null);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<Record<number, number>>({});

  const [perfil, setPerfil] = useState<B2BPerfil | null>(null);
  const [sugerencias, setSugerencias] = useState<B2BSugerenciaReposicion[]>([]);

  const cargarCatalogo = useCallback(async (): Promise<void> => {
    setCargando(true);
    setError(null);
    try {
      const data = await getB2BCatalogo();
      setProductos(data.results || []);
    } catch (err) {
      console.error('Error cargando catálogo B2B:', err);
      setError('No se pudo cargar el catálogo.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarCatalogo();
    getB2BPerfil().then(setPerfil).catch(() => undefined);
    getSugerenciasReposicion().then(setSugerencias).catch(() => undefined);
  }, [cargarCatalogo]);

  const agregarAlCarrito = useCallback((producto: B2BProducto, variante: B2BVariante | null, cantidadInicial = 1): void => {
    const stockDisponible = variante ? variante.stock_disponible : (producto.stock_disponible ?? 0);
    if (stockDisponible <= 0) return;
    const clave = claveItem(producto.id, variante?.id ?? null);
    setCarrito(prev => {
      const existe = prev.find(item => claveItem(item.producto.id, item.variante?.id ?? null) === clave);
      if (existe) {
        const nuevaCantidad = Math.min(existe.cantidad + cantidadInicial, stockDisponible);
        return prev.map(item =>
          claveItem(item.producto.id, item.variante?.id ?? null) === clave ? { ...item, cantidad: nuevaCantidad } : item,
        );
      }
      return [...prev, { producto, variante, cantidad: Math.min(cantidadInicial, stockDisponible) }];
    });
    setCarritoAbierto(true);
  }, []);

  const modificarCantidad = useCallback((clave: string, delta: number): void => {
    setCarrito(prev =>
      prev.map(item => {
        if (claveItem(item.producto.id, item.variante?.id ?? null) !== clave) return item;
        const stockDisponible = item.variante ? item.variante.stock_disponible : (item.producto.stock_disponible ?? 0);
        const nueva = Math.min(item.cantidad + delta, stockDisponible);
        return nueva > 0 ? { ...item, cantidad: nueva } : item;
      }),
    );
  }, []);

  const eliminarItem = useCallback((clave: string): void => {
    setCarrito(prev => prev.filter(item => claveItem(item.producto.id, item.variante?.id ?? null) !== clave));
  }, []);

  const precioItem = (item: ItemCarrito): number =>
    parseFloat((item.variante ? item.variante.precio_con_descuento : item.producto.precio_con_descuento) || '0');

  const totalCarrito = useMemo(
    () => carrito.reduce((sum, item) => sum + precioItem(item) * item.cantidad, 0),
    [carrito],
  );
  const totalItems = useMemo(() => carrito.reduce((sum, item) => sum + item.cantidad, 0), [carrito]);

  const productosFiltrados = useMemo(
    () => productos.filter(p => p.nombre.toLowerCase().includes(filtro.toLowerCase())),
    [productos, filtro],
  );

  const reponerAhora = useCallback((sugerencia: B2BSugerenciaReposicion): void => {
    const producto = productos.find(p => p.id === sugerencia.producto_id);
    if (!producto) {
      toast.error('Ese producto ya no está disponible en el catálogo.');
      return;
    }
    agregarAlCarrito(producto, null, sugerencia.cantidad_habitual);
    toast.success(`Agregadas ${sugerencia.cantidad_habitual} unidades de ${sugerencia.producto_nombre} al carrito.`);
  }, [productos, agregarAlCarrito]);

  const confirmarPedido = async (): Promise<void> => {
    setEnviando(true);
    try {
      const items: B2BOrderItemRequest[] = carrito.map(item => ({
        producto_id: item.producto.id,
        variante_id: item.variante?.id,
        cantidad: item.cantidad,
      }));
      const resultado = await crearPedidoB2B(items);
      setPedidoExitoso({ correlativo: resultado.correlativo, total: resultado.total });
      setCarrito([]);
      setCarritoAbierto(false);
      cargarCatalogo();
      getB2BPerfil().then(setPerfil).catch(() => undefined);
    } catch (err: any) {
      const mensaje = err?.response?.data?.data?.error || err?.response?.data?.error || 'No se pudo registrar el pedido. Intenta de nuevo.';
      toast.error(mensaje);
    } finally {
      setEnviando(false);
    }
  };

  if (cargando && productos.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-slate-500 gap-3">
        <Loader2 size={28} className="animate-spin" /> Cargando tu catálogo...
      </div>
    );
  }

  if (error && productos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <Package size={44} className="text-slate-300 mb-3" />
        <p className="font-bold text-slate-600">{error}</p>
        <button onClick={cargarCatalogo} className="mt-4 bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Tu catálogo mayorista</h1>
          <p className="text-sm text-slate-500 mt-0.5">Precios ya calculados con tu nivel de descuento.</p>
        </div>
        <button
          onClick={() => setCarritoAbierto(true)}
          className="relative bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2.5 flex items-center gap-2 font-bold text-sm text-slate-700 hover:bg-slate-50"
        >
          <ShoppingCart size={18} /> Carrito
          {totalItems > 0 && (
            <span className="bg-accent-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>
      </div>

      {/* Resumen: nivel de precio + línea de crédito */}
      {perfil && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
              <BadgePercent size={14} className="text-primary-600" /> Tu nivel de precio
            </div>
            <p className="text-lg font-black text-slate-900">
              {perfil.nivel_precio ? `${perfil.nivel_precio.nombre} · ${parseFloat(perfil.nivel_precio.porcentaje_descuento)}% off` : 'Sin nivel asignado'}
            </p>
            {perfil.proximo_nivel && (
              <p className="text-xs text-slate-500 mt-1">
                Te faltan <span className="font-bold text-primary-700">${parseFloat(perfil.proximo_nivel.monto_faltante).toFixed(2)}</span> en
                compras para subir a <span className="font-bold">{perfil.proximo_nivel.nivel.nombre}</span> ({parseFloat(perfil.proximo_nivel.nivel.porcentaje_descuento)}% off).
              </p>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
              <Wallet size={14} className="text-primary-600" /> Línea de crédito
            </div>
            {perfil.credito_disponible !== null ? (
              <>
                <p className="text-lg font-black text-slate-900">${parseFloat(perfil.credito_disponible).toFixed(2)} disponibles</p>
                <p className="text-xs text-slate-500 mt-1">
                  ${parseFloat(perfil.credito_usado).toFixed(2)} usados de ${parseFloat(perfil.limite_credito).toFixed(2)}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-400">No tienes una línea de crédito configurada.</p>
            )}
          </div>
        </div>
      )}

      {/* Sugerencias de reposición */}
      {sugerencias.length > 0 && (
        <div className="bg-primary-50/60 border border-primary-100 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 text-xs font-bold text-primary-700 uppercase mb-3">
            <TrendingUp size={14} /> Sugerencias de reposición
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sugerencias.slice(0, 6).map(s => (
              <div key={s.producto_id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{s.producto_nombre}</p>
                  <p className={`text-[11px] font-semibold mt-0.5 flex items-center gap-1 ${s.urgente ? 'text-red-500' : 'text-slate-400'}`}>
                    <Clock size={11} />
                    {s.dias_estimados_restantes <= 0 ? 'Ya deberías reponer' : `~${s.dias_estimados_restantes} días restantes`}
                  </p>
                </div>
                <button
                  onClick={() => reponerAhora(s)}
                  className="shrink-0 bg-primary-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-1.5"
                >
                  <RefreshCw size={12} /> Reponer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Buscar producto..."
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {productosFiltrados.map(producto => {
          const esVariable = producto.tipo === 'variable';
          const varianteActivaId = varianteSeleccionada[producto.id] ?? producto.variantes[0]?.id;
          const varianteActiva = esVariable ? producto.variantes.find(v => v.id === varianteActivaId) || null : null;

          const precioLista = esVariable ? varianteActiva?.precio_lista : producto.precio_lista;
          const precioConDescuento = esVariable ? varianteActiva?.precio_con_descuento : producto.precio_con_descuento;
          const stock = esVariable ? (varianteActiva?.stock_disponible ?? 0) : (producto.stock_disponible ?? 0);
          const conDescuento = precioLista && precioConDescuento && parseFloat(precioConDescuento) < parseFloat(precioLista);
          const agotado = stock <= 0 || (esVariable && !varianteActiva);

          return (
            <div key={producto.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="h-32 bg-slate-50 flex items-center justify-center relative">
                {producto.imagen_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={producto.imagen_url} alt={producto.nombre} className={`w-full h-full object-cover ${agotado ? 'grayscale opacity-60' : ''}`} loading="lazy" />
                ) : (
                  <Package size={36} className="text-slate-300" />
                )}
                {agotado && (
                  <span className="absolute top-2 left-2 bg-slate-900/80 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">Agotado</span>
                )}
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">{producto.nombre}</h4>

                {esVariable && producto.variantes.length > 0 && (
                  <select
                    value={varianteActivaId ?? ''}
                    onChange={e => setVarianteSeleccionada(prev => ({ ...prev, [producto.id]: Number(e.target.value) }))}
                    className="mt-1 w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50"
                  >
                    {producto.variantes.map(v => (
                      <option key={v.id} value={v.id} disabled={v.stock_disponible <= 0}>
                        {v.nombre} {v.stock_disponible <= 0 ? '(agotado)' : ''}
                      </option>
                    ))}
                  </select>
                )}

                <div className="mt-auto pt-3">
                  {precioConDescuento ? (
                    <>
                      {conDescuento && (
                        <span className="text-xs text-slate-400 line-through mr-1.5">${parseFloat(precioLista!).toFixed(2)}</span>
                      )}
                      <span className="text-lg font-black text-slate-900">${parseFloat(precioConDescuento).toFixed(2)}</span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">Selecciona una variante</span>
                  )}
                  <button
                    onClick={() => agregarAlCarrito(producto, varianteActiva)}
                    disabled={agotado}
                    className="mt-2 w-full bg-primary-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {productosFiltrados.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            No se encontraron productos.
          </div>
        )}
      </div>

      {/* Carrito lateral */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity ${carritoAbierto ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={() => setCarritoAbierto(false)}
      />
      <aside className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 shadow-2xl flex flex-col transform transition-transform ${carritoAbierto ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><ShoppingCart size={18} /> Tu pedido</h3>
          <button onClick={() => setCarritoAbierto(false)} className="p-2 text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {carrito.length === 0 ? (
            <p className="text-center text-slate-400 py-12">Tu carrito está vacío.</p>
          ) : (
            carrito.map(item => {
              const clave = claveItem(item.producto.id, item.variante?.id ?? null);
              return (
                <div key={clave} className="flex gap-3 border border-slate-100 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {item.producto.nombre}{item.variante ? ` · ${item.variante.nombre}` : ''}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-black text-primary-700 text-sm">
                        ${(precioItem(item) * item.cantidad).toFixed(2)}
                      </span>
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                        <button onClick={() => modificarCantidad(clave, -1)}><Minus size={13} /></button>
                        <span className="text-xs font-bold w-4 text-center">{item.cantidad}</span>
                        <button onClick={() => modificarCantidad(clave, 1)}><Plus size={13} /></button>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => eliminarItem(clave)} className="text-slate-300 hover:text-red-500 shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>
        {carrito.length > 0 && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium text-sm">Total ({totalItems} items)</span>
              <span className="text-2xl font-black text-slate-900">${totalCarrito.toFixed(2)}</span>
            </div>
            {perfil?.credito_disponible !== null && perfil && totalCarrito > parseFloat(perfil.credito_disponible || '0') && (
              <p className="text-xs font-bold text-red-500">Este pedido supera tu crédito disponible (${parseFloat(perfil.credito_disponible || '0').toFixed(2)}).</p>
            )}
            <button
              onClick={confirmarPedido}
              disabled={enviando}
              className="w-full bg-primary-600 text-white py-3.5 rounded-xl font-black flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {enviando ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />} Confirmar Pedido
            </button>
          </div>
        )}
      </aside>

      {/* Confirmación */}
      {pedidoExitoso && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>
            <h4 className="text-xl font-black text-slate-900">¡Pedido registrado!</h4>
            {pedidoExitoso.correlativo && (
              <p className="text-sm text-slate-500">Correlativo: <span className="font-bold text-slate-700">{pedidoExitoso.correlativo}</span></p>
            )}
            <p className="text-sm text-slate-500">Total: <span className="font-bold text-slate-700">${pedidoExitoso.total}</span></p>
            <button onClick={() => setPedidoExitoso(null)} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold">
              Seguir comprando
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
