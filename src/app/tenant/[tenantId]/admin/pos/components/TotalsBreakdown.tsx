/**
 * @file Desglose de totales del carrito del POS.
 * Muestra subtotal, base imponible, IVA, retención y total en la moneda de la
 * venta. Si la moneda es distinta a la base, renderiza un desglose secundario
 * con los montos consolidados (`_base`).
 */
"use client";

import { useState, type ReactElement } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import type { TotalesCalculo } from '@/utils/taxCalculator';

interface TotalsBreakdownProps {
  totales: TotalesCalculo;
  /** Símbolo o código de la moneda de la venta. */
  currencyCode: string;
  /** Símbolo o código de la moneda base del tenant. */
  baseCurrencyCode: string;
}

/** Línea simple del desglose principal. */
function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }): ReactElement {
  return (
    <div className={`flex justify-between ${bold ? 'text-lg font-bold text-slate-900 border-t pt-2 mt-2' : ''}`}>
      <span className={bold ? '' : 'text-slate-600'}>{label}</span>
      <span className={bold ? '' : 'font-semibold'}>{value}</span>
    </div>
  );
}

/**
 * Panel de totales con desglose secundario en moneda base.
 */
export default function TotalsBreakdown({
  totales,
  currencyCode,
  baseCurrencyCode,
}: TotalsBreakdownProps): ReactElement {
  const fmt = (value: number): string => value.toFixed(2);
  const esBase = totales.es_base;
  // Colapsado por defecto: el desglose completo en moneda base (5 líneas +
  // encabezado + nota de tasa) antes se mostraba siempre entero dentro de
  // una sección `shrink-0` -- en la columna angosta del carrito eso llegaba
  // a ocupar casi 400px, dejando el listado de productos aplastado a un
  // puñado de píxeles. Con esto colapsado, solo la línea "Total base" (la
  // que de verdad importa para cobrar) queda siempre visible; el resto es
  // opcional bajo un toggle.
  const [mostrarDetalleBase, setMostrarDetalleBase] = useState(false);

  return (
    <div className="space-y-2 text-sm">
      <Row label="Subtotal:" value={`${currencyCode} ${fmt(totales.subtotal)}`} />
      <Row label="Base Imponible:" value={`${currencyCode} ${fmt(totales.base_imponible)}`} />
      <Row label="IVA:" value={`${currencyCode} ${fmt(totales.iva_total)}`} />
      {totales.retencion_total > 0 && (
        <Row label="Retención:" value={`${currencyCode} ${fmt(totales.retencion_total)}`} />
      )}
      <Row label="Total:" value={`${currencyCode} ${fmt(totales.total)}`} bold />

      {/* Consolidado en moneda base (solo si se emite en otra divisa) --
          "Total base" siempre visible en una sola línea; el desglose
          completo queda oculto detrás de un toggle para no comerse el
          espacio del listado de productos arriba. */}
      {!esBase && (
        <div className="mt-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setMostrarDetalleBase(v => !v)}
            className="w-full flex justify-between items-center text-sm font-bold text-slate-900"
          >
            <span className="flex items-center gap-1 text-slate-500 font-semibold text-xs">
              {mostrarDetalleBase ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Total base ({baseCurrencyCode}):
            </span>
            <span>{baseCurrencyCode} {fmt(totales.total_base)}</span>
          </button>

          {mostrarDetalleBase && (
            <div className="mt-2 space-y-1.5 animate-fade-in">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Consolidado en moneda base ({baseCurrencyCode})
              </p>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Subtotal base:</span>
                <span className="font-semibold">{baseCurrencyCode} {fmt(totales.subtotal_base)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Base imponible base:</span>
                <span className="font-semibold">{baseCurrencyCode} {fmt(totales.base_imponible_base)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>IVA base:</span>
                <span className="font-semibold">{baseCurrencyCode} {fmt(totales.iva_base)}</span>
              </div>
              {totales.retencion_base > 0 && (
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Retención base:</span>
                  <span className="font-semibold">{baseCurrencyCode} {fmt(totales.retencion_base)}</span>
                </div>
              )}
              <p className="text-[10px] text-slate-400 text-right pt-1">
                Tasa: 1 {currencyCode} = {totales.tasa_cambio.toFixed(4)} {baseCurrencyCode}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
