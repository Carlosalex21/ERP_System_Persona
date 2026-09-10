"use client";

import React from 'react';
import { Package } from 'lucide-react';
import VariantFields from './VariantFields';
import IvaVisualSelector from './IvaVisualSelector';
import { Almacen, Categoria, Iva } from '@/types/api';
import { AppModal, ActionButton } from '@/components/ui';

/**
 * @typedef {Object} ProductForm
 * @property {string} nombre - Nombre del producto.
 * @property {string} descripcion - Descripción del producto.
 * @property {string} precio - Precio del producto.
 * @property {number} cantidad - Cantidad en stock.
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
  cantidad: number;
  codigo_barras: string;
  disponible_online: boolean;
  tipo: 'simple' | 'variable';
  almacen: string;
  configuracion_iva: string;
  categoria: string;
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
  variantes: Variant[];
  setVariantes: React.Dispatch<React.SetStateAction<Variant[]>>;
  handleAñadirVariante: () => void;
  handleEliminarVariante: (index: number) => void;
  handleCambioVariante: (index: number, campo: string, valor: any) => void;
  almacenes: Almacen[];
  ivas: Iva[];
  categorias: Categoria[];
  guardarProducto: (e: React.FormEvent) => Promise<void>;
  cargando: boolean;
  setModalProducto: (abierto: boolean) => void;
}

/**
 * Modal para la creación o edición de productos, incluyendo la gestión de variantes.
 * @param {ProductModalProps} props - Las propiedades del componente.
 * @returns {JSX.Element} El modal de producto.
 */
export default function ProductModal({
  formProducto, setFormProducto,
  esProductoConVariantes, setEsProductoConVariantes,
  variantes, setVariantes,
  handleAñadirVariante, handleEliminarVariante, handleCambioVariante,
  almacenes, ivas, categorias,
  guardarProducto, cargando, setModalProducto
}: ProductModalProps): React.ReactElement {
  return (
    <AppModal
      isOpen
      onClose={() => setModalProducto(false)}
      title="Crear Nuevo Producto"
      icon={<Package size={20} />}
      size="xl"
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => setModalProducto(false)}>Cancelar</ActionButton>
          <ActionButton type="submit" loading={cargando} onClick={guardarProducto}>Guardar Producto</ActionButton>
        </>
      }
    >
      <form onSubmit={guardarProducto} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

        {/* Selector de Tipo de Producto */}
        <div className="flex items-center gap-4 p-2 bg-slate-100 rounded-lg">
          <label className="block text-xs font-bold text-slate-500 uppercase">Tipo de Producto</label>
          <button type="button" onClick={() => setEsProductoConVariantes(!esProductoConVariantes)} className="w-12 h-6 bg-slate-200 rounded-full p-1 transition-colors">
            <span className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${esProductoConVariantes ? 'translate-x-6 bg-primary-600' : 'translate-x-0'}`}></span>
          </button>
          <span className={`font-semibold text-sm ${esProductoConVariantes ? 'text-primary-700' : 'text-slate-600'}`}>
            {esProductoConVariantes ? 'Con Variantes (Tallas, Colores, etc.)' : 'Producto Simple'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Producto</label>
            <input type="text" value={formProducto.nombre} onChange={e => setFormProducto({...formProducto, nombre: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required />
          </div>
        </div>

        {/* Campos para Producto Simple */}
        {!esProductoConVariantes && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Precio</label>
              <input type="number" step="0.01" value={formProducto.precio} onChange={e => setFormProducto({...formProducto, precio: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required={!esProductoConVariantes} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock Inicial</label>
              <input type="number" value={formProducto.cantidad} onChange={e => setFormProducto({...formProducto, cantidad: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-lg text-sm" required={!esProductoConVariantes} />
            </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2 pt-4 border-t">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código de Barras / SKU (Padre)</label>
            <input type="text" value={formProducto.codigo_barras} onChange={e => setFormProducto({...formProducto, codigo_barras: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Almacén Principal</label>
            <select value={formProducto.almacen} onChange={e => setFormProducto({...formProducto, almacen: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white" required>
              <option value="">Selecciona un almacén...</option>
              {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <IvaVisualSelector
              ivas={ivas}
              value={formProducto.configuracion_iva}
              onChange={(value) => setFormProducto({ ...formProducto, configuracion_iva: value })}
              basePrice={Number.isFinite(parseFloat(formProducto.precio)) ? parseFloat(formProducto.precio) : 0}
              label="Impuesto (IVA)"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
            <select value={formProducto.categoria} onChange={e => setFormProducto({...formProducto, categoria: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white" required>
              <option value="">Selecciona una categoría...</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>
      </form>
    </AppModal>
  );
}
