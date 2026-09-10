"use client";

import { useState, useEffect, use, useMemo, useCallback, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import {
  Package, AlertTriangle, Plus, Trash2, Loader2, Search, Boxes, DollarSign, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiPrivada } from '@/services/api';
import { getNombreById } from '@/utils/helpers';
import { roundMoney } from '@/utils/taxCalculator';
import ProductModal from '../inventario/components/ProductModal';
import { Almacen, Categoria, Iva, Producto, ProductoRequest, VariacionproductoRequest } from '@/types/api';
import { createProducto, createVarianteProducto, deleteProducto, getAlmacenes, getCategorias, getProductos } from '@/services/inventoryService';
import { getIvas } from '@/services/configService';

export default function InventarioPage({ params }: { params: Promise<{ tenantId: string }> }): ReactElement {
  const { tenantId } = use(params);
  const router = useRouter();

  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const [productos, setProductos] = useState<Producto[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [ivas, setIvas] = useState<Iva[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  const [modalProducto, setModalProducto] = useState(false);

  const [esProductoConVariantes, setEsProductoConVariantes] = useState(false);
  const [variantes, setVariantes] = useState<any[]>([
    { nombre: '', sku: '', precio: '', cantidad: 0, codigo_barras: '' }
  ]);
  const [formProducto, setFormProducto] = useState({
    nombre: '', descripcion: '', precio: '', cantidad: 0,
    codigo_barras: '', disponible_online: true, tipo: 'simple' as 'simple' | 'variable',
    almacen: '', configuracion_iva: '', categoria: '',
  });

  const cargarDatosMaestros = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      const [resProd, resAlm, resIva, resCat] = await Promise.all([
        getProductos(),
        getAlmacenes(),
        getIvas(),
        getCategorias()
      ]);
      setProductos(resProd);
      setAlmacenes(resAlm);
      setIvas(resIva);
      setCategorias(resCat);
    } catch (error) {
      console.error("Error cargando inventario:", error);
      if ((error as any).response?.status === 401) {
        Cookies.remove('access_token', { domain: '.localhost' });
        Cookies.remove('refresh_token', { domain: '.localhost' });
        router.push(`/${tenantId}/login`);
      }
    } finally {
      setCargando(false);
    }
  }, [router, tenantId]);

  useEffect(() => {
    cargarDatosMaestros();
  }, [cargarDatosMaestros]);

  // useMemo: filtrado de productos por búsqueda (nombre, SKU, código de barras).
  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.codigo_barras || '').toLowerCase().includes(q),
    );
  }, [productos, busqueda]);

  // useMemo: estadísticas del inventario.
  const stats = useMemo(() => {
    const total = productos.length;
    const bajoStock = productos.filter(p => (p.cantidad || 0) <= 5 && (p.cantidad || 0) > 0).length;
    const agotados = productos.filter(p => !p.cantidad || p.cantidad <= 0).length;
    const valor = productos.reduce((acc, p) => acc + (parseFloat(p.precio || '0') * (p.cantidad || 0)), 0);
    return { total, bajoStock, agotados, valor };
  }, [productos]);

  const guardarProducto = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setCargando(true);

    const payload: ProductoRequest = {
      ...formProducto,
      almacen: Number(formProducto.almacen) || null,
      configuracion_iva: Number(formProducto.configuracion_iva) || null,
      categoria: Number(formProducto.categoria) || null,
      activo: true,
      tipo: esProductoConVariantes ? 'variable' : 'simple',
    };

    try {
      const resProductoPadre = await createProducto(payload);
      const productoId = resProductoPadre.id;

      if (esProductoConVariantes && productoId) {
        const promesasVariantes = variantes.map(variante =>
          createVarianteProducto({
            ...variante,
            producto: productoId,
            atributos: [],
          } as VariacionproductoRequest)
        );
        await Promise.all(promesasVariantes);
      }

      setModalProducto(false);
      setFormProducto({
        nombre: '', descripcion: '', precio: '', cantidad: 0,
        codigo_barras: '', disponible_online: true, tipo: 'simple' as 'simple' | 'variable',
        almacen: '', configuracion_iva: '', categoria: '',
      });
      setVariantes([{ nombre: '', sku: '', precio: '', cantidad: 0, codigo_barras: '' }]);
      setEsProductoConVariantes(false);
      toast.success('Producto guardado correctamente.');
      cargarDatosMaestros();
    } catch (error) {
      console.error("Error guardando producto:", error);
      toast.error("Error al guardar el producto. Revisa que todos los campos obligatorios estén llenos.");
    } finally { setCargando(false); }
  };

  const handleAñadirVariante = (): void => {
    setVariantes([...variantes, { nombre: '', sku: '', precio: '', cantidad: 0, codigo_barras: '' }]);
  };

  const handleEliminarVariante = (index: number): void => {
    const nuevasVariantes = variantes.filter((_, i) => i !== index);
    setVariantes(nuevasVariantes);
  };

  const handleCambioVariante = (index: number, campo: string, valor: any): void => {
    const nuevasVariantes = [...variantes];
    nuevasVariantes[index] = { ...nuevasVariantes[index], [campo]: valor };
    setVariantes(nuevasVariantes);
  };

  const eliminarProducto = async (id: number): Promise<void> => {
    if (!confirm("¿Eliminar producto?")) return;
    try {
      await deleteProducto(id);
      toast.success('Producto eliminado.');
      cargarDatosMaestros();
    } catch (error) {
      toast.error("No se pudo eliminar el producto.");
      console.error("Error eliminando producto:", error);
    }
  };

  // useMemo: tarjetas de estadísticas.
  const statCards = useMemo(() => [
    { label: 'Total Productos', value: String(stats.total), icon: <Boxes size={20} />, color: 'bg-primary-600' },
    { label: 'Bajo Stock', value: String(stats.bajoStock), icon: <AlertTriangle size={20} />, color: 'bg-orange-500' },
    { label: 'Agotados', value: String(stats.agotados), icon: <XCircle size={20} />, color: 'bg-red-500' },
    { label: 'Valor Inventario', value: `$${roundMoney(stats.valor)}`, icon: <DollarSign size={20} />, color: 'bg-green-600' },
  ], [stats]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package size={24} className="text-primary-600" /> Catálogo de Productos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Gestiona tus productos conectados a la BD de Django.</p>
        </div>
        <button
          onClick={() => setModalProducto(true)}
          className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
        >
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      {/* Aviso de configuración inicial */}
      {(almacenes.length === 0 || ivas.length === 0 || categorias.length === 0) && (
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-orange-800 text-sm">Falta configuración inicial</h4>
            <p className="text-xs text-orange-700 mt-1">
              Antes de crear tu primer producto, debes ir a la pestaña <strong>"Ajustes de Tienda"</strong> y crear al menos:
              {!almacenes.length && " un Almacén, "} {!ivas.length && " un Impuesto (IVA), "} {!categorias.length && " una Categoría."}
            </p>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 ${card.color}`}>
              {card.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{card.label}</p>
              <p className="text-xl font-black text-slate-900 truncate">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, SKU o código de barras..."
          className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center h-48 text-slate-500 gap-2">
            <Loader2 size={24} className="animate-spin" /> Cargando inventario...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-4 pl-6">Producto</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4 text-right">Precio</th>
                  <th className="p-4 text-center">Stock</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productosFiltrados.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                          <Package size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{p.nombre}</p>
                          <p className="text-[10px] font-mono text-slate-400 truncate">SKU: {p.sku || p.codigo_barras || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                        {getNombreById(categorias, p.categoria) || 'Sin categoría'}
                      </span>
                    </td>
                    <td className="p-4 text-right font-black text-slate-900">${parseFloat(p.precio || '0').toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${
                        (p.cantidad || 0) <= 0
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : (p.cantidad || 0) <= 5
                            ? 'bg-orange-50 text-orange-600 border-orange-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {p.cantidad || 0}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => eliminarProducto(p.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        aria-label="Eliminar producto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {productosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400">
                      <Package size={40} className="mx-auto mb-3 text-slate-300" />
                      <p className="font-bold text-slate-500">No hay productos en el inventario</p>
                      <p className="text-xs mt-1">Crea tu primer producto o ajusta la búsqueda.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalProducto && (
        <ProductModal
          formProducto={formProducto}
          setFormProducto={setFormProducto}
          esProductoConVariantes={esProductoConVariantes}
          setEsProductoConVariantes={setEsProductoConVariantes}
          variantes={variantes}
          setVariantes={setVariantes}
          handleAñadirVariante={handleAñadirVariante}
          handleEliminarVariante={handleEliminarVariante}
          handleCambioVariante={handleCambioVariante}
          almacenes={almacenes}
          ivas={ivas}
          categorias={categorias}
          guardarProducto={guardarProducto}
          cargando={cargando}
          setModalProducto={setModalProducto}
        />
      )}
    </div>
  );
}
