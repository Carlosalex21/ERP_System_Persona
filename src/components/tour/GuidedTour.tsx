"use client";

/**
 * @file Tour guiado genérico: oscurece toda la pantalla salvo un "hoyo" de
 * luz alrededor del elemento señalado (vía `data-tour="..."`) y muestra una
 * tarjeta explicando qué hacer ahí. Reutilizable para cualquier flujo futuro
 * (onboarding, un feature nuevo que se quiera destacar, etc.) -- este
 * componente no sabe nada de tenants/sesión, solo recibe `steps` y `run`.
 *
 * El "hoyo" se logra con 4 franjas oscuras alrededor del rectángulo del
 * elemento (arriba/abajo/izquierda/derecha) en vez de un overlay con
 * `clip-path`: es más simple de calcular y el elemento real queda 100%
 * interactivo sin trucos de `pointer-events` sobre su propia área.
 */
import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, PartyPopper } from 'lucide-react';

export interface TourStep {
  /** Identificador estable del paso (usado como `key` de animación). */
  id: string;
  /** Selector CSS del elemento a señalar (ej. `[data-tour="inventario"]`). Si se omite, el paso se muestra centrado (bienvenida/cierre). */
  target?: string;
  title: string;
  description: string;
  /** Emoji grande junto al título. */
  emoji?: string;
  /** Lado preferido para la tarjeta respecto al elemento señalado. */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface GuidedTourProps {
  steps: TourStep[];
  run: boolean;
  onFinish: () => void;
  onSkip: () => void;
}

interface Rect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

const PADDING = 8;
const CARD_WIDTH = 320;
const CARD_GAP = 16;
const VIEWPORT_MARGIN = 16;

function medirRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // El elemento puede estar fuera del área visible de un contenedor con
  // scroll propio (ej. el sidebar, que tiene su propio `overflow-y-auto` --
  // el layout no se scrollea como página completa). Sin esto, un paso que
  // señala algo más abajo en el sidebar mide un rect fuera de pantalla y el
  // "hoyo"/tarjeta quedan mal ubicados. Los eventos de scroll (ya
  // escuchados) van actualizando el rect mientras dura la animación.
  const fueraDeVista = r.top < 0 || r.bottom > window.innerHeight || r.left < 0 || r.right > window.innerWidth;
  if (fueraDeVista) {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}

export default function GuidedTour({ steps, run, onFinish, onSkip }: GuidedTourProps): ReactElement | null {
  const [mounted, setMounted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (run) setStepIndex(0);
  }, [run]);

  const step = steps[stepIndex];

  const recomputar = useCallback(() => {
    if (!step?.target) {
      setRect(null);
      return;
    }
    setRect(medirRect(step.target));
  }, [step]);

  useEffect(() => {
    if (!run) return undefined;
    recomputar();
    // El elemento señalado puede tardar un instante en montarse/animarse
    // (ej. justo después de un cambio de página) -- se reintenta una vez.
    const retry = window.setTimeout(recomputar, 250);
    window.addEventListener('resize', recomputar);
    window.addEventListener('scroll', recomputar, true);
    return () => {
      window.clearTimeout(retry);
      window.removeEventListener('resize', recomputar);
      window.removeEventListener('scroll', recomputar, true);
    };
  }, [run, recomputar]);

  const esUltimo = stepIndex === steps.length - 1;
  const siguiente = useCallback((): void => {
    setStepIndex((i) => (i >= steps.length - 1 ? i : i + 1));
  }, [steps.length]);
  const anterior = useCallback((): void => setStepIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!run) return undefined;
    const manejarTecla = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onSkip();
      else if (e.key === 'ArrowRight') (esUltimo ? onFinish() : siguiente());
      else if (e.key === 'ArrowLeft') anterior();
    };
    window.addEventListener('keydown', manejarTecla);
    return () => window.removeEventListener('keydown', manejarTecla);
  }, [run, esUltimo, onSkip, onFinish, siguiente, anterior]);

  if (!mounted || !run || !step) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const hoyo = rect
    ? {
        top: Math.max(rect.top - PADDING, 0),
        left: Math.max(rect.left - PADDING, 0),
        right: Math.min(rect.right + PADDING, vw),
        bottom: Math.min(rect.bottom + PADDING, vh),
      }
    : null;

  const calloutStyle = (() => {
    if (!hoyo) {
      // Paso centrado (bienvenida / cierre): la tarjeta se centra sola vía flex.
      return null;
    }
    const placement = step.placement ?? (hoyo.bottom + 160 < vh ? 'bottom' : 'top');
    let top: number;
    if (placement === 'bottom') top = hoyo.bottom + CARD_GAP;
    else if (placement === 'top') top = hoyo.top - CARD_GAP - 220; // alto estimado de la tarjeta
    else top = Math.max(hoyo.top, VIEWPORT_MARGIN);

    let left: number;
    if (placement === 'left') left = hoyo.left - CARD_GAP - CARD_WIDTH;
    else if (placement === 'right') left = hoyo.right + CARD_GAP;
    else left = hoyo.left;

    left = Math.min(Math.max(left, VIEWPORT_MARGIN), vw - CARD_WIDTH - VIEWPORT_MARGIN);
    top = Math.min(Math.max(top, VIEWPORT_MARGIN), vh - VIEWPORT_MARGIN - 160);

    return { top, left, width: CARD_WIDTH };
  })();

  const franjas = hoyo
    ? [
        { top: 0, left: 0, width: vw, height: hoyo.top },
        { top: hoyo.bottom, left: 0, width: vw, height: Math.max(vh - hoyo.bottom, 0) },
        { top: hoyo.top, left: 0, width: hoyo.left, height: hoyo.bottom - hoyo.top },
        { top: hoyo.top, left: hoyo.right, width: Math.max(vw - hoyo.right, 0), height: hoyo.bottom - hoyo.top },
      ]
    : [{ top: 0, left: 0, width: vw, height: vh }];

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[300]">
        {franjas.map((f, i) => (
          <motion.div
            key={i}
            className="fixed bg-slate-950/70"
            initial={false}
            animate={{ top: f.top, left: f.left, width: f.width, height: f.height, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            style={{ position: 'fixed' }}
          />
        ))}

        {hoyo && (
          <motion.div
            className="fixed rounded-xl pointer-events-none ring-2 ring-primary-400"
            initial={false}
            animate={{
              top: hoyo.top, left: hoyo.left, width: hoyo.right - hoyo.left, height: hoyo.bottom - hoyo.top,
              boxShadow: [
                '0 0 0 4px rgba(96,165,250,0.35), 0 0 22px 6px rgba(96,165,250,0.35)',
                '0 0 0 6px rgba(96,165,250,0.2), 0 0 30px 10px rgba(96,165,250,0.2)',
                '0 0 0 4px rgba(96,165,250,0.35), 0 0 22px 6px rgba(96,165,250,0.35)',
              ],
            }}
            transition={{
              top: { type: 'spring', stiffness: 300, damping: 32 },
              left: { type: 'spring', stiffness: 300, damping: 32 },
              width: { type: 'spring', stiffness: 300, damping: 32 },
              height: { type: 'spring', stiffness: 300, damping: 32 },
              boxShadow: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
            }}
            style={{ position: 'fixed' }}
          />
        )}

        <div className={`fixed inset-0 flex ${calloutStyle ? '' : 'items-center justify-center p-6'}`}>
          <motion.div
            key={step.id}
            className="pointer-events-auto bg-white rounded-2xl shadow-2xl p-5"
            style={calloutStyle ? { position: 'fixed', top: calloutStyle.top, left: calloutStyle.left, width: calloutStyle.width } : { width: CARD_WIDTH }}
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {step.emoji && <span className="text-2xl shrink-0">{step.emoji}</span>}
                <h3 className="font-black text-slate-900 text-base leading-snug">{step.title}</h3>
              </div>
              <button
                type="button"
                onClick={onSkip}
                className="text-slate-400 hover:text-slate-600 -mt-1 -mr-1 p-1 shrink-0"
                aria-label="Saltar tutorial"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">{step.description}</p>
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-1.5">
                {steps.map((s, i) => (
                  <span
                    key={s.id}
                    className={`h-1.5 rounded-full transition-all ${i === stepIndex ? 'w-5 bg-primary-600' : 'w-1.5 bg-slate-200'}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                {stepIndex > 0 && (
                  <button
                    type="button"
                    onClick={anterior}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1"
                  >
                    <ArrowLeft size={14} /> Atrás
                  </button>
                )}
                <button
                  type="button"
                  onClick={esUltimo ? onFinish : siguiente}
                  className="text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-md"
                >
                  {esUltimo ? (
                    <>¡Listo! <PartyPopper size={14} /></>
                  ) : (
                    <>Siguiente <ArrowRight size={14} /></>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
