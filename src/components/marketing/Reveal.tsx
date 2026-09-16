"use client";

import { motion, type Variants } from 'framer-motion';
import type { ReactNode, ReactElement } from 'react';

interface RevealProps {
  children: ReactNode;
  /** Retraso en segundos antes de animar (para cascadas). */
  delay?: number;
  /** Dirección desde la que entra. */
  from?: 'up' | 'down' | 'left' | 'right' | 'scale';
  className?: string;
  as?: 'div' | 'span';
}

const OFFSETS: Record<NonNullable<RevealProps['from']>, Variants> = {
  up: { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0 } },
  down: { hidden: { opacity: 0, y: -28 }, show: { opacity: 1, y: 0 } },
  left: { hidden: { opacity: 0, x: -28 }, show: { opacity: 1, x: 0 } },
  right: { hidden: { opacity: 0, x: 28 }, show: { opacity: 1, x: 0 } },
  scale: { hidden: { opacity: 0, scale: 0.92 }, show: { opacity: 1, scale: 1 } },
};

/**
 * Envoltorio de animación "entra al hacer scroll" -- fade + desplazamiento,
 * reutilizado en todo el sitio de marketing (home/planes/login) en vez de
 * repetir la config de IntersectionObserver/framer-motion en cada sección.
 * `viewport.once` para que no se repita la animación al volver a scrollear.
 */
export default function Reveal({ children, delay = 0, from = 'up', className }: RevealProps): ReactElement {
  return (
    <motion.div
      className={className}
      variants={OFFSETS[from]}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
