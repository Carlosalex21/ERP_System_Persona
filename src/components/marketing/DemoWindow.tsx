"use client";

import { useEffect, useState, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Play, ChevronLeft, ChevronRight } from 'lucide-react';

export interface DemoScene {
  id: string;
  tab: string;
  render: () => ReactElement;
}

interface DemoWindowProps {
  urlLabel: string;
  scenes: DemoScene[];
  /** Duración de cada escena en autoplay (ms). */
  durationMs?: number;
  /** Alto del área de contenido -- las vitrinas grandes usan más espacio que el teaser del hero. */
  contentHeight?: string;
}

/**
 * Ventana de navegador falsa reutilizable para las demos animadas del sitio
 * de marketing -- antes cada demo (hero, panel admin, catálogo) repetía su
 * propia barra de navegador, pestañas, autoplay y barra de progreso. Ahora
 * el "shell" vive una sola vez y cada demo solo aporta sus escenas.
 *
 * Deja que la demo se reproduzca sola (autoplay) PERO también se puede
 * controlar a mano: pestañas clicables, flechas prev/next y un botón de
 * pausa -- así el visitante puede quedarse viendo pasivamente o explorar
 * a su ritmo.
 */
export default function DemoWindow({ urlLabel, scenes, durationMs = 5200, contentHeight = 'h-[280px] sm:h-[300px]' }: DemoWindowProps): ReactElement {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => setIdx((i) => (i + 1) % scenes.length), durationMs);
    return () => clearInterval(interval);
  }, [playing, durationMs, scenes.length]);

  const escena = scenes[idx];
  const Escena = escena.render;

  const ir = (nuevo: number) => setIdx((nuevo + scenes.length) % scenes.length);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-2 shadow-2xl shadow-black/40">
      <div className="rounded-xl bg-slate-100 overflow-hidden">
        {/* Barra superior estilo navegador */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-200/70 border-b border-slate-300/50">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 text-[10px] font-mono text-slate-500 truncate">{urlLabel}</span>
        </div>

        {/* Pestañas de escena + controles manuales */}
        <div className="flex items-center gap-1 px-3 pt-2.5 bg-white border-b border-slate-100">
          <div className="flex items-center gap-1 flex-1 overflow-x-auto">
            {scenes.map((e, i) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setIdx(i)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-t-lg transition-colors whitespace-nowrap ${
                  i === idx ? 'bg-slate-100 text-primary-700' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {e.tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 shrink-0 pb-1.5">
            <button
              type="button"
              onClick={() => ir(idx - 1)}
              aria-label="Escena anterior"
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? 'Pausar demo' : 'Reproducir demo'}
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              {playing ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <button
              type="button"
              onClick={() => ir(idx + 1)}
              aria-label="Siguiente escena"
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className={`${contentHeight} relative overflow-hidden`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={escena.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0"
            >
              <Escena />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Indicador de progreso de la escena activa */}
        <div className="flex gap-1.5 px-4 py-2.5 bg-white border-t border-slate-100">
          {scenes.map((e, i) => (
            <div key={e.id} className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
              {i === idx && playing && (
                <motion.div
                  key={`${escena.id}-${playing}`}
                  className="h-full bg-primary-500"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: durationMs / 1000, ease: 'linear' }}
                />
              )}
              {i === idx && !playing && <div className="h-full bg-primary-500 w-1/3" />}
              {i < idx && <div className="h-full bg-primary-200" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
