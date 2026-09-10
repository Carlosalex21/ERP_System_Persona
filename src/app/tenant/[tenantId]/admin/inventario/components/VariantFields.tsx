/**
 * @file Campos de variantes de producto con previsualización del precio final
 * al consumidor usando el IVA seleccionado en el producto padre.
 */
"use client";

import React from 'react';
import { Trash2, Percent } from 'lucide-react';

import type { Iva } from '@/types/api';
import { calcularPrecioFinal } from '@/utils/taxCalculator';
import { parseDecimal } from '@/utils/helpers';

/**
 * @typedef {Object} Variant
 * @property {string} nombre - Nombre de la variante (ej. "Rojo", "Talla M").
 * @property {string} sku - SKU de la variante.
 * @property {string} precio - Precio (base imponible) de la variante.
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
 * @property {Iva[]} ivas - Lista de configuraciones de IVA activas.
 * @property {string} configuracionIva - IVA seleccionado a nivel del producto (id como string).
 */
interface VariantFieldsProps {
  variantes: Variant[];
  onVariantChange: (index: number, campo: string, valor: any) => void;
  onRemoveVariant: (index: number) => void;
  onAddVariant: () => void;
  ivas: Iva[];
  configuracionIva: string;
}

/**
 * Componente para gestionar los campos de variantes de un producto.
 * Permite añadir, eliminar y modificar las propiedades de cada variante,
 * mostrando en tiempo real el precio final al consumidor según el IVA del producto.
 * @param {VariantFieldsProps} props - Las propiedades del componente.
 * @returns {JSX.Element} El componente de campos de variantes.
 */
export default function VariantFields({
  variantes,
  onVariantChange,
  onRemoveVariant,
  onAddVariant,
  ivas,
  configuracionIva,
}: VariantFieldsProps): React.ReactElement {
  const ivaSel = ivas.find(i => String(i.id) === configuracionIva);
  const tasaIva = ivaSel ? parseDecimal(ivaSel.porcentaje_iva) : 0;

  return (
    <div className="space-y-3 animate-fade-in">
      <h4 className="text-sm font-bold text-slate-700">Variantes del Producto</h4>
      {variantes.map((variante, index) => {
        const precioBase = parseDecimal(variante.precio);
        const precioFinal = calcularPrecioFinal(precioBase, tasaIva);
        return (
          <div key={index} className="bg-slate-50 p-2 rounded-lg border space-y-2">
            <div className="grid grid-cols-5 gap-2 items-center">
              <input
                type="text"
                placeholder="Nombre (ej. Rojo, Talla M)"
                value={variante.nombre}
                onChange={e => onVariantChange(index, 'nombre', e.target.value)}
                className="col-span-2 px-2 py-1.5 border rounded text-xs"
              />
              <input
                type="number"
                placeholder="Precio"
                value={variante.precio}
                onChange={e => onVariantChange(index, 'precio', e.target.value)}
                className="px-2 py-1.5 border rounded text-xs"
              />
              <input
                type="number"
                placeholder="Stock"
                value={variante.cantidad}
                onChange={e => onVariantChange(index, 'cantidad', parseInt(e.target.value))}
                className="px-2 py-1.5 border rounded text-xs"
              />
              <button
                type="button"
                onClick={() => onRemoveVariant(index)}
                className="text-red-500 hover:bg-red-100 p-1 rounded-full justify-self-center"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Previsualización dinámica del precio final al consumidor */}
            <div className="flex items-center justify-between text-xs bg-white border border-slate-200 rounded-md px-2 py-1.5">
              <span className="text-slate-500 flex items-center gap-1">
                <Percent size={11} /> Precio final ({ivaSel?.nombre || 'Sin IVA'} {tasaIva}%):
              </span>
              <span className="font-black text-primary-700">{precioFinal.toFixed(2)}</span>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={onAddVariant}
        className="text-xs font-bold text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-md border border-dashed"
      >
        + Añadir Variante
      </button>
    </div>
  );
}
