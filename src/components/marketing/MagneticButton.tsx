"use client";

import { useRef, type ReactElement, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  /** Qué tanto "jala" el botón hacia el cursor (px máx.). */
  strength?: number;
}

/**
 * Envuelve un botón/link y lo hace "magnético": al pasar el mouse cerca, el
 * botón se desplaza levemente hacia el cursor, y vuelve a su sitio con un
 * resorte al salir. Micro-interacción de las que hacen que un sitio se
 * sienta pulido en vez de estático -- se ignora en touch (no hay hover).
 */
export default function MagneticButton({ children, className = '', strength = 14 }: MagneticButtonProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.4 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set((relX / (rect.width / 2)) * strength);
    y.set((relY / (rect.height / 2)) * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  );
}
