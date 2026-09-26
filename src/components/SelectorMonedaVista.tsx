"use client";

import type { ReactElement } from 'react';
import { useMonedaVista } from '@/context/MonedaVistaContext';

/**
 * Interruptor "$ | Bs." de la barra superior: cambia en qué moneda se ven
 * TODOS los montos del panel (ver `MonedaVistaContext`). Si el tenant no
 * tiene una segunda moneda con tasa cargada, solo muestra la moneda base.
 */
export default function SelectorMonedaVista(): ReactElement {
  const { vista, setVista, base, referencia } = useMonedaVista();

  if (!referencia) {
    return (
      <span
        className="hidden sm:inline-flex items-center bg-slate-50 text-slate-600 border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-full"
        title="Carga la tasa de cambio del día para poder ver los montos también en otra moneda."
      >
        {base.simbolo}
      </span>
    );
  }

  const opciones = [
    { id: 'referencia' as const, etiqueta: referencia.simbolo, titulo: `Ver montos en ${referencia.codigo}` },
    { id: 'base' as const, etiqueta: base.simbolo, titulo: `Ver montos en ${base.codigo}` },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Moneda para mostrar los montos"
      className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs font-bold"
      title={`Tasa del día: 1 ${referencia.codigo} = ${referencia.tasa.toLocaleString('es-VE', { maximumFractionDigits: 4 })} ${base.simbolo}`}
    >
      {opciones.map((o) => {
        const activo = vista === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={activo}
            title={o.titulo}
            onClick={() => setVista(o.id)}
            className={`px-3 py-1 rounded-full transition-colors ${activo ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {o.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
