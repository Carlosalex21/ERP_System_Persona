"use client";

import { useEffect, useRef, useState, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, ChevronDown, Check } from 'lucide-react';

import { useSucursalFiltro } from '@/context/SucursalFiltroContext';

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

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
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/95 text-xs font-bold text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_-4px_rgba(15,23,42,0.1)] ring-1 ring-slate-900/[0.06] hover:ring-slate-900/10 transition-all duration-200"
      >
        <Building2 size={14} className="text-primary-600" />
        <span className="max-w-[9rem] truncate">{etiqueta}</span>
        <ChevronDown size={13} className={`text-slate-400 transition-transform duration-300 ${abierto ? 'rotate-180' : ''}`} style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }} />
      </motion.button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="absolute right-0 mt-2 w-64 bg-white rounded-2xl ring-1 ring-slate-900/[0.06] shadow-[0_4px_8px_rgba(15,23,42,0.04),0_16px_32px_-8px_rgba(15,23,42,0.16)] z-40 overflow-hidden origin-top-right"
          >
            <button
              type="button"
              onClick={() => { setSeleccionIds([]); setAbierto(false); }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors duration-150 border-b border-slate-100"
            >
              Todas las sucursales
              {todasSeleccionadas && <Check size={15} className="text-primary-600" />}
            </button>
            <div className="max-h-64 overflow-y-auto py-1">
              {almacenes.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => alternar(a.id)}
                  className="w-full flex items-center justify-between gap-2 px-3.5 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors duration-150"
                >
                  <span className="truncate text-left">{a.nombre}</span>
                  {seleccionIds.includes(a.id) && <Check size={15} className="text-primary-600 shrink-0" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
