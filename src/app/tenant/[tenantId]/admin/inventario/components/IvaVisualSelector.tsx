/**
 * @file Selector visual de configuración de IVA con previsualización del precio
 * final al consumidor, calculado en tiempo real (base imponible + %IVA).
 */
"use client";

import { type ReactElement, useMemo } from 'react';
import { ReceiptText, Percent } from 'lucide-react';

import type { Iva } from '@/types/api';
import { calcularPrecioFinal, roundMoney } from '@/utils/taxCalculator';
import { parseDecimal } from '@/utils/helpers';

interface IvaVisualSelectorProps {
  ivas: Iva[];
  /** Valor seleccionado (id del IVA como string, '' si ninguno). */
  value: string;
  onChange: (value: string) => void;
  /** Precio base imponible (neto) para calcular la preview. */
  basePrice: number;
  /** Etiqueta opcional para el selector. */
  label?: string;
}

/**
 * Selector por chips del IVA con preview del precio final al consumidor.
 */
export default function IvaVisualSelector({
  ivas,
  value,
  onChange,
  basePrice,
  label = 'Configuración de IVA',
}: IvaVisualSelectorProps): ReactElement {
  const selectedIva = useMemo(() => ivas.find(i => String(i.id) === value), [ivas, value]);

  const tasaIva = selectedIva ? parseDecimal(selectedIva.porcentaje_iva) : 0;
  const base = basePrice || 0;
  const precioFinal = calcularPrecioFinal(base, tasaIva);
  const montoIva = roundMoney(precioFinal - base);

  const activeIvas = useMemo(() => ivas.filter(i => i.activo), [ivas]);

  return (
    <div className="space-y-3">
      <div>
        <span className="block text-xs font-bold text-slate-500 uppercase mb-2">{label}</span>
        <div className="flex flex-wrap gap-2">
          {activeIvas.length === 0 ? (
            <p className="text-xs text-slate-400">No hay configuraciones de IVA activas.</p>
          ) : (
            activeIvas.map(iva => {
              const isActive = String(iva.id) === value;
              return (
                <button
                  key={iva.id}
                  type="button"
                  onClick={() => onChange(String(iva.id))}
                  aria-pressed={isActive}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-primary-100 text-primary-700 border-primary-500 ring-2 ring-primary-300'
                      : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <ReceiptText size={14} className={isActive ? 'text-primary-600' : 'text-slate-400'} />
                  {iva.nombre || `IVA ${parseDecimal(iva.porcentaje_iva)}%`}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Previsualización del precio final al consumidor */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Percent size={12} /> Precio final al consumidor
        </p>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Base imponible:</span>
          <span className="font-semibold">{base.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">IVA ({tasaIva}%):</span>
          <span className="font-semibold">{montoIva.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base font-black text-slate-900 border-t pt-1.5">
          <span>Precio final:</span>
          <span className="text-primary-700">{precioFinal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
