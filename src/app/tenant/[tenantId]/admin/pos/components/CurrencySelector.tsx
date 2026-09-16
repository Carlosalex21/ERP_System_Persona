/**
 * @file Selector de moneda para el POS.
 * Muestra las monedas activas del tenant y la tasa de cambio vigente de la
 * moneda seleccionada frente a la base.
 */
"use client";

import { useState, type ReactElement } from 'react';
import { Coins, Loader2, RefreshCw, Pencil, Check, X } from 'lucide-react';

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
  /** Guarda una tasa nueva para la moneda seleccionada (hoy). */
  onSaveRate: (tasa: string) => Promise<void>;
  savingRate: boolean;
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
  onSaveRate,
  savingRate,
}: CurrencySelectorProps): ReactElement {
  const tasaInfo = tasasActuales[selectedCurrencyCode];
  const [editando, setEditando] = useState(false);
  const [valorEditado, setValorEditado] = useState('');

  const empezarEdicion = (): void => {
    setValorEditado(tasaInfo?.tasa ? parseDecimal(tasaInfo.tasa).toString() : '');
    setEditando(true);
  };

  const confirmarEdicion = async (): Promise<void> => {
    if (!valorEditado || Number(valorEditado) <= 0) return;
    await onSaveRate(valorEditado);
    setEditando(false);
  };

  return (
    // Antes esto era una sola fila (`flex items-center gap-2` con el select,
    // el botón de refrescar y el bloque de tasa todos lado a lado): el
    // bloque de tasa crece bastante para una moneda no-base (texto "1 USD =
    // 842.2067" + el lápiz de editar), y en la columna angosta del carrito
    // eso no cabía -- desbordaba la tarjeta hacia los lados, lo que además
    // rompía el layout vertical y dejaba el listado de productos aplastado
    // a unos pocos píxeles de alto. Con dos filas (select+refrescar arriba,
    // tasa abajo) cada una tiene su propio ancho completo y nunca desborda.
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select
            value={selectedCurrencyCode}
            onChange={(e) => onCurrencyChange(e.target.value)}
            disabled={editando}
            aria-label="Moneda de la venta"
            className="w-full pl-9 pr-4 py-2 border rounded-lg bg-slate-50 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-primary-500 disabled:bg-slate-100 disabled:text-slate-500"
          >
            {monedas.map(moneda => (
              <option key={moneda.id} value={moneda.codigo}>
                {moneda.codigo} — {moneda.nombre}
                {moneda.es_predeterminada ? ' (Base)' : ''}
              </option>
            ))}
          </select>
        </div>

        {editando ? (
          <>
            <input
              type="number"
              min="0"
              step="0.000001"
              value={valorEditado}
              onChange={(e) => setValorEditado(e.target.value)}
              placeholder={`Bs. por 1 ${selectedCurrencyCode}`}
              autoFocus
              className="w-28 px-2 py-2 border-2 border-primary-400 rounded-lg text-sm font-bold text-slate-800 focus:outline-none"
            />
            <button
              type="button"
              onClick={confirmarEdicion}
              disabled={savingRate}
              aria-label="Guardar tasa"
              title="Guardar tasa"
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-40 shrink-0"
            >
              {savingRate ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              aria-label="Cancelar"
              title="Cancelar"
              className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg shrink-0"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onRefreshRates}
            disabled={refreshingRates}
            aria-label="Actualizar tasas de cambio"
            title="Actualizar tasas de cambio"
            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg disabled:opacity-40 shrink-0"
          >
            {refreshingRates ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        )}
      </div>

      {!editando && (
        <div className="flex items-center justify-between gap-1.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase leading-none shrink-0">Tasa vigente</p>
          <p className="text-xs font-black text-primary-700 leading-tight truncate">
            {tasaInfo?.es_base
              ? `${selectedCurrencyCode} (Base)`
              : tasaInfo?.tasa
                ? `1 ${selectedCurrencyCode} = ${parseDecimal(tasaInfo.tasa).toFixed(4)}`
                : `${selectedCurrencyCode} (Sin tasa)`}
          </p>
          {!tasaInfo?.es_base && (
            <button
              type="button"
              onClick={empezarEdicion}
              aria-label="Actualizar tasa de hoy"
              title="Actualizar tasa de hoy"
              className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg shrink-0"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
