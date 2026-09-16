/**
 * @file Panel/tarjeta base reutilizable en todo el panel admin.
 * Antes cada pantalla repetía a mano `bg-white rounded-2xl border
 * border-slate-200 shadow-sm p-6` (y variantes ligeramente distintas de
 * eso) en decenas de sitios -- centralizarlo aquí significa que un cambio
 * de estilo futuro (radio, sombra, padding) se aplica en un solo lugar.
 */
import type { ReactElement, ReactNode } from 'react';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: CardPadding;
  /** Quita la sombra/hover -- para tarjetas dentro de otra tarjeta, ej. filas anidadas. */
  flat?: boolean;
}

/** Contenedor base: fondo blanco, borde, radio y sombra consistentes. */
export function Card({ children, className = '', padding = 'md', flat = false }: CardProps): ReactElement {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 ${flat ? '' : 'shadow-sm'} ${PADDING_CLASSES[padding]} ${className}`}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Encabezado de tarjeta: título (+ subtítulo opcional) a la izquierda, acción/badge a la derecha. */
export function CardHeader({ title, subtitle, action, className = '' }: CardHeaderProps): ReactElement {
  return (
    <div className={`flex justify-between items-center gap-3 mb-3 ${className}`}>
      <div className="min-w-0">
        <h3 className="font-bold text-slate-800 truncate">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
