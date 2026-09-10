/**
 * @file Selector de moneda para el POS.
 * Muestra las monedas activas del tenant y la tasa de cambio vigente de la
 * moneda seleccionada frente a la base.
 */
"use client";

import { type ReactElement } from 'react';
import { Coins, Loader2, RefreshCw } from 'lucide-react';

import type { Moneda } from '@/types/api';
import type { TasaCambioActual } from '@/services/configuracionService';
import { parseDecimal } from '@/utils/helpers';

interface CurrencySelectorProps {
  monedas: Moneda[];
  tasasActuales: Record<string, TasaCambioActual>;
  selectedCurrencyCode: string;
  onCurrencyChange: (code: string) => void;
  onRefreshRates: () => void;
  refreshingRates: boolean;
}

/**
 * Selector visual de divisa con indicador de tasa vigente.
 */
export default function CurrencySelector({
  monedas,
  tasasActuales,
  selectedCurrencyCode,
  onCurrencyChange,
  onRefreshRates,
  refreshingRates,
}: CurrencySelectorProps): ReactElement {
  const tasaInfo = tasasActuales[selectedCurrencyCode];

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <select
          value={selectedCurrencyCode}
          onChange={(e) => onCurrencyChange(e.target.value)}
          aria-label="Moneda de la venta"
          className="w-full pl-9 pr-4 py-2 border rounded-lg bg-slate-50 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-primary-500"
        >
          {monedas.map(moneda => (
            <option key={moneda.id} value={moneda.codigo}>
              {moneda.codigo} — {moneda.nombre}
              {moneda.es_predeterminada ? ' (Base)' : ''}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onRefreshRates}
        disabled={refreshingRates}
        aria-label="Actualizar tasas de cambio"
        title="Actualizar tasas de cambio"
        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg disabled:opacity-40"
      >
        {refreshingRates ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
      </button>

      <div className="text-right shrink-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Tasa vigente</p>
        <p className="text-sm font-black text-primary-700 leading-tight">
          {tasaInfo?.es_base
            ? `${selectedCurrencyCode} (Base)`
            : tasaInfo?.tasa
              ? `1 ${selectedCurrencyCode} = ${parseDecimal(tasaInfo.tasa).toFixed(4)}`
              : `${selectedCurrencyCode} (Sin tasa)`}
        </p>
      </div>
    </div>
  );
}
