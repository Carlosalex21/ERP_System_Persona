import type { ReactNode, ReactElement, CSSProperties } from 'react';

interface FloatingChipProps {
  icon: ReactNode;
  label: string;
  color: 'primary' | 'accent' | 'emerald';
  /** Posicionamiento absoluto respecto al contenedor relativo padre. */
  className: string;
  /** Grados de rotación del sticker (efecto "recortado a mano"). */
  rotate?: number;
  /** Desfasa la animación de flotación para que no todos suban a la vez. */
  delayed?: boolean;
}

const COLOR_MAP: Record<FloatingChipProps['color'], string> = {
  primary: 'bg-primary-600 text-white border-primary-800',
  accent: 'bg-accent-400 text-ink-950 border-accent-600',
  emerald: 'bg-emerald-400 text-emerald-950 border-emerald-600',
};

/**
 * "Sticker" decorativo flotante (icono + etiqueta) que orbita el titular del
 * hero -- inspirado en el look de pegatinas recortadas de la referencia de
 * estilo del cliente, pero con la paleta de marca (azul/dorado/esmeralda)
 * en vez de la paleta original de la referencia.
 */
export default function FloatingChip({ icon, label, color, className, rotate = -6, delayed }: FloatingChipProps): ReactElement {
  const style: CSSProperties = { ['--sticker-rotate' as string]: `${rotate}deg`, transform: `rotate(${rotate}deg)` };
  return (
    <div
      className={`hidden lg:flex absolute items-center gap-2 pl-2 pr-3.5 py-2 rounded-full border-2 shadow-lg shadow-black/10 font-bold text-xs whitespace-nowrap select-none ${COLOR_MAP[color]} ${delayed ? 'animate-float-delayed' : 'animate-float'} ${className}`}
      style={style}
    >
      <span className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center shrink-0">{icon}</span>
      {label}
    </div>
  );
}
