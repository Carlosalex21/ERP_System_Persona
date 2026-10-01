"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus, Package, X, Boxes, Layers, Wrench } from 'lucide-react';
import VariantFields from './VariantFields';
import PresentacionesFields, { PresentacionForm } from './PresentacionesFields';
import IvaVisualSelector from './IvaVisualSelector';
import { Almacen, Categoria, Departamento, Iva, Moneda } from '@/types/api';
import { AppModal, ActionButton } from '@/components/ui';

/**
 * @typedef {Object} ProductForm
 * @property {string} nombre - Nombre del producto.
 * @property {string} descripcion - Descripción del producto.
 * @property {string} precio - Precio de venta del producto.
 * @property {string} costo_promedio - Costo de compra (solo editable al crear -- después se corrige vía Ajustes de Inventario, para que se promedie en vez de pisarse).
 * @property {number} cantidad - Cantidad en stock.
 * @property {string} stock_minimo - Umbral de "bajo stock" propio del producto (vacío = usa el general).
 * @property {string} meses_garantia - Meses de garantía al vender este producto (vacío = sin garantía rastreada).
 * @property {string} sku - SKU interno (distinto del código de barras; para sincronizar con otras plataformas).
 * @property {string} codigo_barras - Código de barras o SKU.
 * @property {boolean} disponible_online - Si está disponible online.
 * @property {string} tipo - Tipo de producto ('simple' o 'variable').
 * @property {string} almacen - ID del almacén.
 * @property {string} configuracion_iva - ID de la configuración de IVA.
 * @property {string} categoria - ID de la categoría.
 */
interface ProductForm {
  nombre: string;
  descripcion: string;
  precio: string;
  costo_promedio: string;
  cantidad: number;
  stock_minimo: string;
  meses_garantia: string;
  sku: string;
  codigo_barras: string;
  disponible_online: boolean;
  es_insumo: boolean;
  tipo: 'simple' | 'variable' | 'servicio';
  almacen: string;
  configuracion_iva: string;
  categoria: string;
  moneda: string;
  departamento: string;
  imagen: File | null;
}

/**
 * @typedef {Object} Variant
 * @property {string} nombre - Nombre de la variante.
 * @property {string} sku - SKU de la variante.
 * @property {string} precio - Precio de la variante.
 * @property {number} cantidad - Cantidad de la variante.
 * @property {string} codigo_barras - Código de barras de la variante.
 */
interface Variant {
  nombre: string;
  sku: string;
  precio: string;
  cantidad: number;
  codigo_barras: string;
  costo_promedio: string;
}

/**
 * @typedef {Object} ProductModalProps
 * @property {ProductForm} formProducto - Estado del formulario del producto.
 * @property {React.Dispatch<React.SetStateAction<ProductForm>>} setFormProducto - Setter para el estado del formulario del producto.
 * @property {boolean} esProductoConVariantes - Indica si el producto tiene variantes.
 * @property {React.Dispatch<React.SetStateAction<boolean>>} setEsProductoConVariantes - Setter para el estado de variantes.
 * @property {Variant[]} variantes - Array de variantes del producto.
 * @property {React.Dispatch<React.SetStateAction<Variant[]>>} setVariantes - Setter para el estado de variantes.
 * @property {() => void} handleAñadirVariante - Función para añadir una variante.
 * @property {(index: number) => void} handleEliminarVariante - Función para eliminar una variante.
 * @property {(index: number, campo: string, valor: any) => void} handleCambioVariante - Función para cambiar un campo de una variante.
 * @property {PresentacionForm[]} presentaciones - Presentaciones de venta del producto (Unidad, Caja, Bulto...).
 * @property {() => void} handleAñadirPresentacion - Función para añadir una presentación.
 * @property {(index: number) => void} handleEliminarPresentacion - Función para eliminar una presentación.
 * @property {(index: number, campo: string, valor: any) => void} handleCambioPresentacion - Función para cambiar un campo de una presentación.
 * @property {Almacen[]} almacenes - Lista de almacenes disponibles.
 * @property {Iva[]} ivas - Lista de configuraciones de IVA disponibles.
 * @property {Categoria[]} categorias - Lista de categorías disponibles.
 * @property {(e: React.FormEvent) => Promise<void>} guardarProducto - Función para guardar el producto.
 * @property {boolean} cargando - Indica si la operación de guardado está en curso.
 * @property {(abierto: boolean) => void} setModalProducto - Función para cerrar el modal.
 */
interface ProductModalProps {
  formProducto: ProductForm;
  setFormProducto: React.Dispatch<React.SetStateAction<ProductForm>>;
  esProductoConVariantes: boolean;
  setEsProductoConVariantes: React.Dispatch<React.SetStateAction<boolean>>;
  esServicio: boolean;
  setEsServicio: React.Dispatch<React.SetStateAction<boolean>>;
  variantes: Variant[];
  setVariantes: React.Dispatch<React.SetStateAction<Variant[]>>;
  handleAñadirVariante: () => void;
  handleEliminarVariante: (index: number) => void;
  handleCambioVariante: (index: number, campo: string, valor: any) => void;
  presentaciones: PresentacionForm[];
  handleAñadirPresentacion: () => void;
  handleEliminarPresentacion: (index: number) => void;
  handleCambioPresentacion: (index: number, campo: string, valor: any) => void;
  almacenes: Almacen[];
  ivas: Iva[];
  categorias: Categoria[];
  monedas: Moneda[];
  departamentos: Departamento[];
  guardarProducto: (e: React.FormEvent) => Promise<void>;
  cargando: boolean;
  setModalProducto: (abierto: boolean) => void;
  /** true si se está editando un producto existente en vez de creando uno nuevo. */
  editando?: boolean;
}

/**
 * Modal para la creación o edición de productos, incluyendo la gestión de
 * variantes y presentaciones de venta.
 *
 * Orden de las secciones: primero todo lo general (nombre, foto, precio,
 * stock, presentaciones, almacén, categoría) y AL FINAL la selección de
 * impuesto -- con su desglose base/IVA/total -- porque es lo último que se
 * decide al cargar un producto, no lo primero.
 * @param {ProductModalProps} props - Las propiedades del componente.
 * @returns {JSX.Element} El modal de producto.
 */
export default function ProductModal({
  formProducto, setFormProducto,
  esProductoConVariantes, setEsProductoConVariantes,
  esServicio, setEsServicio,
  variantes, setVariantes,
  handleAñadirVariante, handleEliminarVariante, handleCambioVariante,
  presentaciones, handleAñadirPresentacion, handleEliminarPresentacion, handleCambioPresentacion,
  almacenes, ivas, categorias, monedas, departamentos,
  guardarProducto, cargando, setModalProducto, editando = false,
}: ProductModalProps): React.ReactElement {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Genera (y libera) una URL de vista previa local cuando se selecciona un
  // archivo de imagen -- no se sube nada hasta que se guarda el producto.
  useEffect(() => {
    if (!formProducto.imagen) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(formProducto.imagen);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [formProducto.imagen]);

  return (
    <AppModal
      isOpen
      onClose={() => setModalProducto(false)}
      title={editando ? 'Editar Producto' : 'Crear Nuevo Producto'}
      icon={<Package size={20} />}
      size="xl"
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => setModalProducto(false)}>Cancelar</ActionButton>
          <ActionButton type="submit" loading={cargando} onClick={guardarProducto}>
            {editando ? 'Guardar Cambios' : 'Guardar Producto'}
          </ActionButton>
        </>
      }
    >
      <form onSubmit={guardarProducto} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

        {/* Selector de Tipo de Producto -- oculto al editar: por ahora esta
            pantalla solo edita los campos simples de un producto ya
            existente, no agrega/quita variantes ni cambia entre tipos. */}
        {!editando && (
        <div className="p-1.5 bg-slate-100/80 rounded-2xl ring-1 ring-slate-900/[0.04]">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 px-1.5 pt-0.5">Tipo de Producto</label>
          <div className="relative grid grid-cols-3 gap-1">
            {[
              { id: 'simple', label: 'Simple', icon: <Boxes size={14} />, activo: !esProductoConVariantes && !esServicio, onClick: () => { setEsProductoConVariantes(false); setEsServicio(false); } },
              { id: 'variantes', label: 'Con Variantes', icon: <Layers size={14} />, activo: esProductoConVariantes, onClick: () => { setEsProductoConVariantes(true); setEsServicio(false); } },
              { id: 'servicio', label: 'Servicio', icon: <Wrench size={14} />, activo: esServicio, onClick: () => { setEsServicio(true); setEsProductoConVariantes(false); } },
            ].map((tipo) => (
              <button
                key={tipo.id}
                type="button"
                onClick={tipo.onClick}
                className="relative py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                {tipo.activo && (
                  <motion.div
                    layoutId="tipo-producto-pill"
                    className="absolute inset-0 bg-white rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_-4px_rgba(15,23,42,0.14)]"
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-1.5 transition-colors duration-200 ${tipo.activo ? 'text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}>
                  {tipo.icon} {tipo.label}
                </span>
              </button>
            ))}
          </div>
          {esServicio && (
            <p className="text-[11px] text-slate-500 px-1.5 pt-2 pb-0.5">
              Algo que se cobra pero no es un ítem físico (ej. &quot;Servicio Técnico&quot;, &quot;Mano de Obra&quot;, &quot;Consulta&quot;) -- sin stock, almacén ni código de barras.
            </p>
          )}
          {esProductoConVariantes && (
            <p className="text-[11px] text-slate-500 px-1.5 pt-2 pb-0.5">
              Cada variante trae su propio precio, costo y stock -- el producto padre solo agrupa nombre, categoría e impuesto.
            </p>
          )}
        </div>
        )}
        {editando && formProducto.tipo === 'variable' && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            Este producto tiene variantes. Por ahora, editar aquí solo cambia sus datos generales (nombre, categoría, etc.), no sus variantes.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Producto</label>
            <input type="text" value={formProducto.nombre} onChange={e => setFormProducto({...formProducto, nombre: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
            <textarea
              value={formProducto.descripcion}
              onChange={e => setFormProducto({ ...formProducto, descripcion: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              rows={2}
              placeholder="Se muestra en el catálogo público, si el producto está habilitado ahí."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Foto del Producto</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- vista previa de un archivo local (blob:), no un asset del bundle.
                  <img src={previewUrl} alt="Vista previa" className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus size={22} className="text-slate-300" />
                )}
              </div>
              <div className="flex-1">
                <input
                  id="producto-imagen"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setFormProducto({ ...formProducto, imagen: e.target.files?.[0] ?? null })}
                />
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="producto-imagen"
                    className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                  >
                    <ImagePlus size={14} /> {formProducto.imagen ? 'Cambiar imagen' : 'Subir imagen'}
                  </label>
                  {formProducto.imagen && (
                    <button
                      type="button"
                      onClick={() => setFormProducto({ ...formProducto, imagen: null })}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      aria-label="Quitar imagen"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Se muestra en el catálogo público y en el listado de inventario. JPG o PNG.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Campos para Producto Simple */}
        {!esProductoConVariantes && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Precio</label>
              <input type="number" step="0.01" value={formProducto.precio} onChange={e => setFormProducto({...formProducto, precio: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required={!esProductoConVariantes} />
            </div>
            {!esServicio && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Costo de Compra</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formProducto.costo_promedio}
                  onChange={e => setFormProducto({ ...formProducto, costo_promedio: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${editando ? 'bg-slate-100 text-slate-500' : ''}`}
                  required={!esProductoConVariantes && !editando}
                  disabled={editando}
                  readOnly={editando}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {editando
                    ? 'Para corregirlo, registra una entrada en Ajustes de Inventario (se promedia, no se pisa).'
                    : 'Lo que te costó a ti comprarlo -- distinto del Precio de venta. Define el valor real de tu inventario.'}
                </p>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Moneda del precio</label>
              <select value={formProducto.moneda} onChange={e => setFormProducto({...formProducto, moneda: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                {monedas.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.codigo} {m.es_predeterminada ? '(base)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                En qu&eacute; moneda escribiste el precio de arriba. Si cambias de tienda de moneda en el POS, se convierte autom&aacute;ticamente.
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Meses de Garantía</label>
              <input
                type="number"
                min="0"
                value={formProducto.meses_garantia}
                onChange={e => setFormProducto({ ...formProducto, meses_garantia: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Opcional"
              />
              <p className="text-[11px] text-slate-400 mt-1">Al venderse, genera una garantía rastreable por este tiempo. Vacío = sin garantía.</p>
            </div>
            {!esServicio && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    {editando ? 'Stock Actual' : 'Stock Inicial'}
                  </label>
                  <input
                    type="number"
                    value={formProducto.cantidad}
                    onChange={e => setFormProducto({ ...formProducto, cantidad: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${editando ? 'bg-slate-100 text-slate-500' : ''}`}
                    required={!esProductoConVariantes}
                    disabled={editando}
                    readOnly={editando}
                  />
                  {editando && (
                    <p className="text-[11px] text-slate-400 mt-1">Para corregir el stock, usa Ajustes de Inventario (queda registrado en el kardex).</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={formProducto.stock_minimo}
                    onChange={e => setFormProducto({ ...formProducto, stock_minimo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Opcional"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">A partir de cuánto stock se avisa &quot;bajo stock&quot;. Vacío = umbral general.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SKU</label>
                  <input
                    type="text"
                    value={formProducto.sku}
                    onChange={e => setFormProducto({ ...formProducto, sku: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Opcional"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Código interno propio (distinto del de barras), útil para sincronizar con otras plataformas.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código de Barras</label>
                  <input type="text" value={formProducto.codigo_barras} onChange={e => setFormProducto({...formProducto, codigo_barras: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Opcional" />
                </div>
              </>
            )}
          </div>
        )}

        {/* Campos para Producto con Variantes */}
        {esProductoConVariantes && (
          <VariantFields
            variantes={variantes}
            onVariantChange={handleCambioVariante}
            onRemoveVariant={handleEliminarVariante}
            onAddVariant={handleAñadirVariante}
            ivas={ivas}
            configuracionIva={formProducto.configuracion_iva}
          />
        )}

        {/* Presentaciones de venta -- solo aplica a productos simples (ver
            docstring de `PresentacionProducto` en el backend); un servicio
            no se vende "por bulto/caja". */}
        {!esProductoConVariantes && !esServicio && (
          <div className="pt-4 border-t">
            <PresentacionesFields
              presentaciones={presentaciones}
              onChange={handleCambioPresentacion}
              onAdd={handleAñadirPresentacion}
              onRemove={handleEliminarPresentacion}
              precioUnitario={Number.isFinite(parseFloat(formProducto.precio)) ? parseFloat(formProducto.precio) : 0}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2 pt-4 border-t">
          {/* Almacén no aplica a un servicio -- no hay nada físico que guardar. */}
          {!esServicio && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Almacén Principal</label>
              <select value={formProducto.almacen} onChange={e => setFormProducto({...formProducto, almacen: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white" required>
                <option value="">Selecciona un almacén...</option>
                {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
            <select value={formProducto.categoria} onChange={e => setFormProducto({...formProducto, categoria: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white" required>
              <option value="">Selecciona una categoría...</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Departamento (opcional)</label>
            <select value={formProducto.departamento} onChange={e => setFormProducto({...formProducto, departamento: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Sin departamento</option>
              {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">Quién lo prepara/despacha (ej. Cocina, Barra, Almacén) -- se hereda automáticamente en Mesas/Cocina.</p>
          </div>

          <label className="md:col-span-2 flex items-center gap-3 p-3 bg-slate-50 border rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={formProducto.disponible_online}
              onChange={e => setFormProducto({ ...formProducto, disponible_online: e.target.checked })}
              className="w-5 h-5 accent-primary-600"
            />
            <span className="text-sm font-semibold text-slate-700">Mostrar en el catálogo público (tienda online)</span>
          </label>

          {/* Un servicio no puede ser "insumo interno" -- ese concepto es de
              stock físico (materia prima), que un servicio no tiene. */}
          {!esServicio && (
            <label className="md:col-span-2 flex items-center gap-3 p-3 bg-slate-50 border rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={formProducto.es_insumo}
                onChange={e => setFormProducto({ ...formProducto, es_insumo: e.target.checked })}
                className="w-5 h-5 accent-primary-600"
              />
              <span className="text-sm font-semibold text-slate-700">
                Es un insumo interno (materia prima, ej. papas, zanahoria) -- no se ofrece directamente
                <span className="block text-xs font-normal text-slate-400 mt-0.5">
                  Se sigue controlando como stock normal, pero no aparecerá en el selector de &quot;agregar producto&quot; del POS/Mesas.
                </span>
              </span>
            </label>
          )}
        </div>

        {/* Impuesto y desglose del precio -- al final: es lo último que se
            decide, no lo primero, y así el total queda siempre como cierre
            del formulario en vez de aparecer a mitad de camino. Se muestra
            también para productos con variantes: `VariantFields` usa este
            mismo `configuracion_iva` para desglosar el precio de cada
            variante. */}
        <div className="pt-4 border-t">
          <IvaVisualSelector
            ivas={ivas}
            value={formProducto.configuracion_iva}
            onChange={(value) => setFormProducto({ ...formProducto, configuracion_iva: value })}
            basePrice={Number.isFinite(parseFloat(formProducto.precio)) ? parseFloat(formProducto.precio) : 0}
            label="Impuesto (IVA)"
          />
        </div>
      </form>
    </AppModal>
  );
}
