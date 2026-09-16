"use client";

/**
 * @file Animaciones de entrada para el panel admin (al montar, NO al hacer
 * scroll -- para eso está `components/marketing/Reveal.tsx`, pensado para
 * una landing donde el visitante scrollea una página larga). Las pantallas
 * del admin están casi siempre completas dentro del viewport, así que lo
 * que se necesita es una entrada suave cuando los datos ya cargaron, no
 * detección de scroll.
 */
import type { ReactElement, ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1] as const;

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/** Fade + leve desplazamiento hacia arriba al montar -- para un bloque suelto. */
export default function FadeIn({ children, delay = 0, className }: FadeInProps): ReactElement {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

interface StaggerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Contenedor que orquesta la entrada en cascada de sus hijos directos --
 * cada hijo debe ser un `<StaggerItem>` (o cualquier `motion.*` con las
 * mismas variantes) para heredar el stagger automáticamente.
 */
export function Stagger({ children, className }: StaggerProps): ReactElement {
  return (
    <motion.div className={className} variants={containerVariants} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

/** Hijo de `<Stagger>`: hereda su turno en la cascada vía `variants`. */
export function StaggerItem({ children, className }: StaggerProps): ReactElement {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
