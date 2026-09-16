import type { ReactElement } from 'react';

interface MarqueeBarProps {
  items: string[];
  className?: string;
}

/**
 * Franja de texto en scroll horizontal infinito (barra de confianza /
 * marquesina). Duplica la lista una vez y la desliza -50% con `animate-marquee`
 * para que el loop sea perfectamente continuo (ver keyframes en globals.css).
 */
export default function MarqueeBar({ items, className = '' }: MarqueeBarProps): ReactElement {
  const loop = [...items, ...items];
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {loop.map((item, i) => (
          <span key={i} className="flex items-center gap-3 shrink-0 px-6">
            <span className="font-display text-lg sm:text-xl font-extrabold uppercase tracking-tight">{item}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
          </span>
        ))}
      </div>
    </div>
  );
}
