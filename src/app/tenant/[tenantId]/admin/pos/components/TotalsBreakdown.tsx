/**
 * @file Desglose de totales del carrito del POS.
 * Muestra subtotal, base imponible, IVA, retención y total en la moneda de la
 * venta. Si la moneda es distinta a la base, renderiza un desglose secundario
 * con los montos consolidados (`_base`).
 */
"use client";

import { type ReactElement } from 'react';

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

  return (
    <div className="space-y-2 text-sm">
      <Row label="Subtotal:" value={`${currencyCode} ${fmt(totales.subtotal)}`} />
      <Row label="Base Imponible:" value={`${currencyCode} ${fmt(totales.base_imponible)}`} />
      <Row label="IVA:" value={`${currencyCode} ${fmt(totales.iva_total)}`} />
      {totales.retencion_total > 0 && (
        <Row label="Retención:" value={`${currencyCode} ${fmt(totales.retencion_total)}`} />
      )}
      <Row label="Total:" value={`${currencyCode} ${fmt(totales.total)}`} bold />

      {/* Desglose secundario en moneda base (solo si se emite en otra divisa) */}
      {!esBase && (
        <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5">
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
          <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t">
            <span>Total base:</span>
            <span>{baseCurrencyCode} {fmt(totales.total_base)}</span>
          </div>
          <p className="text-[10px] text-slate-400 text-right pt-1">
            Tasa: 1 {currencyCode} = {totales.tasa_cambio.toFixed(4)} {baseCurrencyCode}
          </p>
        </div>
      )}
    </div>
  );
}
