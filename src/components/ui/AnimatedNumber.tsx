"use client";

/**
 * @file Número que "cuenta" hasta su valor final cuando aparece o cambia --
 * versión compartida del panel admin. El sitio de marketing tiene su propia
 * copia (`components/marketing/demoPrimitives.tsx`) a propósito: esa vive
 * en demos que se reproducen en loop con timings propios, mientras que esta
 * es la que consumen las pantallas reales del admin (StatCard, etc.). Ambas
 * comparten la misma técnica (framer-motion `animate` sobre un
 * `useMotionValue`) para no reinventar la rueda dos veces con enfoques
 * distintos.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { useMotionValue, useTransform, animate } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  /** Usa separador de miles (1.234 / 1,234 según locale). */
  thousands?: boolean;
  locale?: string;
}

/** Cuenta desde el valor anterior (o 0 la primera vez) hasta `value` con easing. */
export default function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 0.9,
  thousands = false,
  locale = 'es-VE',
}: AnimatedNumberProps): ReactElement {
  const mv = useMotionValue(0);
  const format = (v: number) =>
    `${prefix}${thousands ? v.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : v.toFixed(decimals)}${suffix}`;
  const formatted = useTransform(mv, format);
  const [display, setDisplay] = useState(format(0));

  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    const unsub = formatted.on('change', setDisplay);
    return () => {
      controls.stop();
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display}</>;
}
