/**
 * @file Campos de variantes de producto con previsualización del precio final
 * al consumidor usando el IVA seleccionado en el producto padre.
 */
"use client";

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, Percent, Plus, Layers } from 'lucide-react';

import type { Iva } from '@/types/api';
import { extraerBaseImponible } from '@/utils/taxCalculator';
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
  /** Costo de compra de esta variante -- solo se pide al crearla (sin stock previo que promediar); después se corrige vía Ajustes de Inventario. */
  costo_promedio: string;
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

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

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
  const stockTotal = variantes.reduce((acc, v) => acc + (Number(v.cantidad) || 0), 0);
  const completas = variantes.filter((v) => v.nombre.trim() && v.precio.trim()).length;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-0.5">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <Layers size={15} className="text-primary-600" /> Variantes del Producto
        </h4>
        <span className="text-[11px] font-semibold text-slate-400">
          {completas}/{variantes.length} completas{stockTotal > 0 ? ` · ${stockTotal} unid.` : ''}
        </span>
      </div>

      {/* Encabezado de columnas -- una sola vez arriba, no repetido como placeholder en cada fila. */}
      {variantes.length > 0 && (
        <div className="hidden sm:grid grid-cols-[1fr_6.5rem_6.5rem_5rem_1.75rem] gap-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
          <span>Variante</span>
          <span>Precio</span>
          <span>Costo</span>
          <span>Stock</span>
          <span />
        </div>
      )}

      <AnimatePresence initial={false}>
        {variantes.map((variante, index) => {
          // `variante.precio` es el precio final YA con IVA incluido (misma
          // convención que `Producto.precio` -- ver comentario en
          // `IvaVisualSelector`), así que aquí solo se desglosa, nunca se le
          // suma impuesto encima.
          const precioFinal = parseDecimal(variante.precio);
          const baseImponible = extraerBaseImponible(precioFinal, tasaIva);
          const sinNombre = !variante.nombre.trim();
          const sinPrecio = !variante.precio.trim();

          return (
            <motion.div
              key={index}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
              className="bg-white rounded-xl ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-2.5 space-y-2"
            >
              <div className="grid grid-cols-2 sm:grid-cols-[1fr_6.5rem_6.5rem_5rem_1.75rem] gap-2 items-center">
                <input
                  type="text"
                  placeholder="Nombre (ej. Rojo, Talla M)"
                  value={variante.nombre}
                  onChange={e => onVariantChange(index, 'nombre', e.target.value)}
                  className={`col-span-2 sm:col-span-1 px-2.5 py-1.5 rounded-lg text-xs transition-shadow duration-200 ${
                    sinNombre ? 'ring-1 ring-amber-300 bg-amber-50/60' : 'ring-1 ring-slate-200 focus:ring-2 focus:ring-primary-400'
                  } outline-none`}
                />
                <input
                  type="number"
                  placeholder="Precio"
                  value={variante.precio}
                  onChange={e => onVariantChange(index, 'precio', e.target.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs transition-shadow duration-200 ${
                    sinPrecio ? 'ring-1 ring-amber-300 bg-amber-50/60' : 'ring-1 ring-slate-200 focus:ring-2 focus:ring-primary-400'
                  } outline-none`}
                />
                <input
                  type="number"
                  step="0.000001"
                  placeholder="Costo"
                  title="Costo de compra de esta variante"
                  value={variante.costo_promedio}
                  onChange={e => onVariantChange(index, 'costo_promedio', e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg text-xs ring-1 ring-slate-200 focus:ring-2 focus:ring-primary-400 outline-none transition-shadow duration-200"
                />
                <input
                  type="number"
                  placeholder="Stock"
                  value={variante.cantidad}
                  onChange={e => onVariantChange(index, 'cantidad', parseInt(e.target.value) || 0)}
                  className="px-2.5 py-1.5 rounded-lg text-xs ring-1 ring-slate-200 focus:ring-2 focus:ring-primary-400 outline-none transition-shadow duration-200"
                />
                <button
                  type="button"
                  onClick={() => onRemoveVariant(index)}
                  aria-label="Quitar variante"
                  className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-200 justify-self-center"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Desglose del precio ya cobrado (el precio de arriba es el final, con IVA incluido) */}
              {precioFinal > 0 && (
                <div className="flex items-center justify-between text-[11px] bg-slate-50 rounded-lg px-2.5 py-1.5">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Percent size={10} /> Base {tasaIva}% ({ivaSel?.nombre || 'Sin IVA'}) + IVA
                  </span>
                  <span className="font-bold text-primary-700">
                    {baseImponible.toFixed(2)} + {(precioFinal - baseImponible).toFixed(2)}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      <button
        type="button"
        onClick={onAddVariant}
        className="group w-full flex items-center justify-center gap-2 text-xs font-bold text-primary-600 hover:text-primary-700 py-2.5 rounded-xl border border-dashed border-primary-200 hover:border-primary-300 hover:bg-primary-50/60 transition-all duration-200"
      >
        <span className="w-5 h-5 rounded-full bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center transition-colors duration-200">
          <Plus size={12} />
        </span>
        Añadir otra variante
      </button>
    </div>
  );
}
