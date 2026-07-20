"use client";

import React from 'react';
import { Trash2 } from 'lucide-react';

/**
 * @typedef {Object} Variant
 * @property {string} nombre - Nombre de la variante (ej. "Rojo", "Talla M").
 * @property {string} sku - SKU de la variante.
 * @property {string} precio - Precio de la variante.
 * @property {number} cantidad - Cantidad en stock de la variante.
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
 * @typedef {Object} VariantFieldsProps
 * @property {Variant[]} variantes - Array de variantes del producto.
 * @property {(index: number, campo: string, valor: any) => void} onVariantChange - Callback para actualizar una variante.
 * @property {(index: number) => void} onRemoveVariant - Callback para eliminar una variante.
 * @property {() => void} onAddVariant - Callback para añadir una nueva variante.
 */
interface VariantFieldsProps {
  variantes: Variant[];
  onVariantChange: (index: number, campo: string, valor: any) => void;
  onRemoveVariant: (index: number) => void;
  onAddVariant: () => void;
}

/**
 * Componente para gestionar los campos de variantes de un producto.
 * Permite añadir, eliminar y modificar las propiedades de cada variante.
 * @param {VariantFieldsProps} props - Las propiedades del componente.
 * @returns {JSX.Element} El componente de campos de variantes.
 */
export default function VariantFields({ variantes, onVariantChange, onRemoveVariant, onAddVariant }: VariantFieldsProps): React.ReactElement {
  return (
    <div className="space-y-3 animate-fade-in">
      <h4 className="text-sm font-bold text-slate-700">Variantes del Producto</h4>
      {variantes.map((variante, index) => (
        <div key={index} className="grid grid-cols-5 gap-2 items-center bg-slate-50 p-2 rounded-lg border">
          <input type="text" placeholder="Nombre (ej. Rojo, Talla M)" value={variante.nombre} onChange={e => onVariantChange(index, 'nombre', e.target.value)} className="col-span-2 px-2 py-1.5 border rounded text-xs" />
          <input type="number" placeholder="Precio" value={variante.precio} onChange={e => onVariantChange(index, 'precio', e.target.value)} className="px-2 py-1.5 border rounded text-xs" />
          <input type="number" placeholder="Stock" value={variante.cantidad} onChange={e => onVariantChange(index, 'cantidad', parseInt(e.target.value))} className="px-2 py-1.5 border rounded text-xs" />
          <button type="button" onClick={() => onRemoveVariant(index)} className="text-red-500 hover:bg-red-100 p-1 rounded-full justify-self-center"><Trash2 size={14} /></button>
        </div>
      ))}
      <button type="button" onClick={onAddVariant} className="text-xs font-bold text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-md border border-dashed">
        + Añadir Variante
      </button>
    </div>
  );
}