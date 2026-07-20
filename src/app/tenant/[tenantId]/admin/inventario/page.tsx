"use client";

import { useState, useEffect, use, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import {
  Package, AlertTriangle, Plus, Trash2, Loader2,
} from 'lucide-react';
import { apiPrivada } from '@/services/api';
import { getNombreById } from '@/utils/helpers';
import ProductModal from '../inventario/components/ProductModal';
import { Almacen, Categoria, Iva, Producto, ProductoRequest, VariacionproductoRequest } from '@/types/api';
import { createProducto, createVarianteProducto, deleteProducto, getAlmacenes, getCategorias, getProductos } from '@/services/inventoryService';
import { getIvas } from '@/services/configService';

/**
 * @typedef {Object} InventarioPageProps
 * @property {Object} params - Parámetros de la ruta.
 * @property {string} params.tenantId - El ID del tenant actual.
 */
export default function InventarioPage({ params }: { params: Promise<{ tenantId: string }> }): ReactElement {
  const { tenantId } = use(params);
  const router = useRouter();

  const [cargando, setCargando] = useState(false);

  // Estados de Datos Reales (Desde Django)
  const [productos, setProductos] = useState<Producto[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [ivas, setIvas] = useState<Iva[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  // Estados de Modales
  const [modalProducto, setModalProducto] = useState(false);

  // Estado para Variantes de Producto
  const [esProductoConVariantes, setEsProductoConVariantes] = useState(false);
  const [variantes, setVariantes] = useState<any[]>([
    { nombre: '', sku: '', precio: '', cantidad: 0, codigo_barras: '' }
  ]);
  const [formProducto, setFormProducto] = useState({
    nombre: '', descripcion: '', precio: '', cantidad: 0,
    codigo_barras: '', disponible_online: true, tipo: 'simple' as 'simple' | 'variable',
    almacen: '', configuracion_iva: '', categoria: '',
  });


  /**
   * Carga los datos maestros (productos, almacenes, IVAs, categorías) desde la API.
   * @returns {Promise<void>}
   */
  const cargarDatosMaestros = async (): Promise<void> => {
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
  };

  useEffect(() => {
    cargarDatosMaestros();
  }, []);

  /**
   * Guarda un nuevo producto o sus variantes.
   * @param {React.FormEvent} e - Evento del formulario.
   * @returns {Promise<void>}
   */
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
            atributos: [], // Asumiendo que los atributos se manejarán por separado o no son obligatorios aquí
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
      cargarDatosMaestros();
    } catch (error) {
      console.error("Error guardando producto:", error);
      alert("Error al guardar el producto. Revisa la consola para más detalles y asegúrate de que todos los campos obligatorios estén llenos.");
    } finally { setCargando(false); }
  };

  /**
   * Funciones para manejar variantes.
   */
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

  /**
   * Elimina un producto por su ID.
   * @param {number} id - El ID del producto a eliminar.
   * @returns {Promise<void>}
   */
  const eliminarProducto = async (id: number): Promise<void> => {
    if (!confirm("¿Eliminar producto?")) return;
    try {
      await deleteProducto(id);
      cargarDatosMaestros();
    } catch (error) {
      alert("Error eliminando.");
      console.error("Error eliminando producto:", error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Catálogo de Productos</h1>
          <p className="text-xs text-slate-500 mt-0.5">Gestiona tus productos conectados a la BD de Django.</p>
        </div>
        <button onClick={() => setModalProducto(true)} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md">
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
            {productos.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 pl-6">
                  <span className="font-bold text-slate-900 block">{p.nombre}</span>
                  <span className="text-[10px] font-mono text-slate-400">SKU/Barras: {p.codigo_barras || p.sku || 'N/A'}</span>
                </td>
                <td className="p-4 text-xs font-medium text-slate-600">{getNombreById(categorias, p.categoria)}</td>
                <td className="p-4 text-right font-black text-slate-900">${parseFloat(p.precio || '0').toFixed(2)}</td>
                <td className="p-4 text-center">
                  <span className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${p.cantidad && p.cantidad <= 5 ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                    {p.cantidad}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => eliminarProducto(p.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {productos.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-sm">No hay productos en el inventario.</td></tr>
            )}
          </tbody>
        </table>
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
