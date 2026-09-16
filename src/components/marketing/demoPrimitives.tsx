"use client";

import { useEffect, useState, type ReactElement } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { MousePointer2 } from 'lucide-react';

/** Número que cuenta de 0 hasta `value` cada vez que `resetKey` cambia. */
export function AnimatedNumber({
  value,
  prefix = '',
  decimals = 0,
  resetKey,
}: {
  value: number;
  prefix?: string;
  decimals?: number;
  resetKey?: string | number;
}): ReactElement {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => `${prefix}${v.toFixed(decimals)}`);
  const [display, setDisplay] = useState(`${prefix}${(0).toFixed(decimals)}`);

  useEffect(() => {
    mv.set(0);
    const controls = animate(mv, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 });
    const unsub = rounded.on('change', setDisplay);
    return () => {
      controls.stop();
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, resetKey]);

  return <>{display}</>;
}

/** Punto de cursor falso que recorre paradas (%) dentro del contenedor y "hace clic" en cada una. */
export function FakeCursor({ stops, durationS }: { stops: { x: number; y: number }[]; durationS: number }): ReactElement {
  const xs = stops.map((s) => `${s.x}%`);
  const ys = stops.map((s) => `${s.y}%`);
  const n = stops.length;
  const times = stops.map((_, i) => i / (n - 1 || 1));

  return (
    <motion.div
      className="absolute z-30 pointer-events-none"
      initial={{ x: xs[0], y: ys[0], opacity: 0 }}
      animate={{ x: xs, y: ys, opacity: 1 }}
      transition={{ duration: durationS, times, ease: 'easeInOut' }}
      style={{ left: 0, top: 0 }}
    >
      <div className="relative -translate-x-1 -translate-y-1">
        <MousePointer2 size={22} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] fill-primary-600" />
        <motion.span
          className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-primary-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0], scale: [0.6, 1.8, 0.6] }}
          transition={{ duration: durationS, times, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  );
}
