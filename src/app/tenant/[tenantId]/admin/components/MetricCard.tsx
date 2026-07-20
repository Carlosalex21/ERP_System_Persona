"use client";

import React from 'react';

/**
 * @typedef {Object} MetricCardProps
 * @property {React.ReactNode} icon - Icono a mostrar en la tarjeta.
 * @property {string} title - Título de la métrica.
 * @property {string | number} value - Valor de la métrica.
 * @property {string} note - Nota o descripción adicional de la métrica.
 */
interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  note: string;
}

/**
 * Componente de tarjeta para mostrar métricas en el dashboard.
 * @param {MetricCardProps} props - Las propiedades del componente.
 * @returns {JSX.Element} La tarjeta de métrica.
 */
export default function MetricCard({ icon, title, value, note }: MetricCardProps): React.ReactElement {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">{icon}{title}</h4>
      <p className="text-3xl font-black text-slate-900 mt-2">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{note}</p>
    </div>
  );
}