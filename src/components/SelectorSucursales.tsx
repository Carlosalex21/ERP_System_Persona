"use client";

import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';

import { useSucursalFiltro } from '@/context/SucursalFiltroContext';

/**
 * Selector de sucursal(es) para el dashboard y Centro de Alertas -- "Todas"
 * o un subconjunto elegido a mano. No se renderiza nada si el tenant solo
 * tiene una sucursal (no hay nada que filtrar).
 */
export default function SelectorSucursales(): ReactElement | null {
  const { almacenes, seleccionIds, setSeleccionIds, todasSeleccionadas, mostrarSelector } = useSucursalFiltro();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cerrarSiAfuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrarSiAfuera);
    return () => document.removeEventListener('mousedown', cerrarSiAfuera);
  }, []);

  if (!mostrarSelector) return null;

  const alternar = (id: number): void => {
    setSeleccionIds(seleccionIds.includes(id) ? seleccionIds.filter((i) => i !== id) : [...seleccionIds, id]);
  };

  const etiqueta = todasSeleccionadas
    ? 'Todas las sucursales'
    : seleccionIds.length === 1
      ? almacenes.find((a) => a.id === seleccionIds[0])?.nombre || '1 sucursal'
      : `${seleccionIds.length} sucursales`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <Building2 size={14} className="text-primary-600" />
        <span className="max-w-[9rem] truncate">{etiqueta}</span>
        <ChevronDown size={13} className={`text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-xl z-40 overflow-hidden animate-fade-in">
          <button
            type="button"
            onClick={() => { setSeleccionIds([]); setAbierto(false); }}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-100"
          >
            Todas las sucursales
            {todasSeleccionadas && <Check size={15} className="text-primary-600" />}
          </button>
          <div className="max-h-64 overflow-y-auto">
            {almacenes.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => alternar(a.id)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                <span className="truncate text-left">{a.nombre}</span>
                {seleccionIds.includes(a.id) && <Check size={15} className="text-primary-600 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
