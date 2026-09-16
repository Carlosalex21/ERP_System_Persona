"use client";

import { useRef, type ReactElement, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface CursorGlowProps {
  children: ReactNode;
  className?: string;
  color?: string;
}

/**
 * Envuelve una sección y hace que un halo de luz suave siga al cursor
 * dentro de ella -- micro-interacción barata que le da textura "premium"
 * al hero en vez de dejarlo estático. Se ignora en touch (no hay cursor).
 */
export default function CursorGlow({ children, className = '', color = 'rgba(45,86,234,0.35)' }: CursorGlowProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const sx = useSpring(x, { damping: 30, stiffness: 200, mass: 0.5 });
  const sy = useSpring(y, { damping: 30, stiffness: 200, mass: 0.5 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  };

  return (
    <div ref={ref} onMouseMove={handleMove} className={`relative ${className}`}>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 hidden sm:block overflow-hidden">
        <motion.div
          className="absolute w-[36rem] h-[36rem] rounded-full blur-[100px]"
          style={{
            left: sx,
            top: sy,
            x: '-50%',
            y: '-50%',
            background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          }}
        />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
