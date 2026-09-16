/**
 * @file Campos para gestionar las presentaciones de venta de un producto
 * simple (Unidad, Caja x12, Bulto x50...). El stock siempre se lleva en
 * unidades base -- una presentación es solo un factor de conversión y,
 * opcionalmente, un precio propio (para vender con descuento por volumen).
 */
"use client";

import React from 'react';
import { Plus, Trash2, Layers } from 'lucide-react';
import { parseDecimal } from '@/utils/helpers';

export interface PresentacionForm {
  id?: number;
  nombre: string;
  factor_conversion: string;
  precio: string;
  es_default: boolean;
}

interface PresentacionesFieldsProps {
  presentaciones: PresentacionForm[];
  onChange: (index: number, campo: string, valor: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  /** Precio unitario (con IVA incluido) del producto -- para sugerir el precio de cada presentación. */
  precioUnitario: number;
}

/**
 * Componente para gestionar las presentaciones de venta de un producto:
 * "Unidad" (factor 1, la que se preselecciona al vender), "Caja x12",
 * "Bulto x50"... Cada una descuenta del MISMO stock (en unidades base),
 * multiplicado por su factor -- nunca llevan contadores separados.
 */
export default function PresentacionesFields({
  presentaciones, onChange, onAdd, onRemove, precioUnitario,
}: PresentacionesFieldsProps): React.ReactElement {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
            <Layers size={13} /> Presentaciones de venta
          </label>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Opcional. Además de vender por unidad, define otras formas de entregarlo (caja, bulto, paquete de X) -- todas descuentan del mismo stock.
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 flex items-center gap-1 text-xs font-bold text-primary-600 hover:bg-primary-50 px-2.5 py-1.5 rounded-lg border border-dashed border-primary-300"
        >
          <Plus size={13} /> Añadir
        </button>
      </div>

      {presentaciones.length > 0 && (
        <div className="space-y-2">
          {presentaciones.map((p, index) => {
            const factor = parseDecimal(p.factor_conversion) || 0;
            const precioSugerido = precioUnitario * factor;
            return (
              <div key={index} className="bg-slate-50 p-2 rounded-lg border space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nombre (ej. Bulto x50)"
                    value={p.nombre}
                    onChange={e => onChange(index, 'nombre', e.target.value)}
                    className="flex-1 min-w-0 px-2 py-1.5 border rounded text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="shrink-0 text-red-500 hover:bg-red-100 p-1 rounded-full"
                    aria-label="Quitar presentación"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-slate-400">× unid.</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Factor"
                      value={p.factor_conversion}
                      onChange={e => onChange(index, 'factor_conversion', e.target.value)}
                      className="w-20 px-2 py-1.5 border rounded text-xs"
                    />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={precioSugerido ? `${precioSugerido.toFixed(2)}` : 'Precio'}
                    value={p.precio}
                    onChange={e => onChange(index, 'precio', e.target.value)}
                    className="flex-1 min-w-[90px] px-2 py-1.5 border rounded text-xs"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-[10px] text-slate-500 pl-1">
                  <input
                    type="checkbox"
                    checked={p.es_default}
                    onChange={e => onChange(index, 'es_default', e.target.checked)}
                    className="w-3.5 h-3.5 accent-primary-600"
                  />
                  Preseleccionada al vender
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
