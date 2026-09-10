/**
 * @file Modal reutilizable de la aplicación.
 * Resuelve los problemas de "modales apilados" que se ven mal:
 *  - Se monta en un portal sobre <body> (evita conflictos de z-index/stacking).
 *  - Bloquea el scroll del body mientras está abierto.
 *  - Se cierra con Escape o clic en el fondo.
 *  - Limita la altura del contenido para que nunca desborde en pantallas pequeñas.
 *  - Header y footer consistentes.
 */
"use client";

import { useEffect, useCallback, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type AppModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: AppModalSize;
  /** Renderiza el header oscuro por defecto del sistema. */
  accentHeader?: boolean;
}

const SIZE_CLASSES: Record<AppModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw] lg:max-w-6xl',
};

export default function AppModal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  size = 'md',
  accentHeader = true,
}: AppModalProps): ReactElement | null {
  // Bloquea el scroll del body y cierra con Escape.
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Solo cierra si el clic fue exactamente en el backdrop, no dentro del panel.
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      onMouseDown={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`bg-white w-full ${SIZE_CLASSES[size]} rounded-3xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between gap-4 px-6 py-4 shrink-0 ${
            accentHeader
              ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white'
              : 'bg-white border-b border-slate-100 text-slate-900'
          }`}
        >
          <h3 className="font-bold text-lg flex items-center gap-2 min-w-0 truncate">
            {icon && <span className="shrink-0">{icon}</span>}
            <span className="truncate">{title}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-full transition-colors shrink-0 ${
              accentHeader ? 'hover:bg-slate-700 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
            }`}
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body scrolleable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">{children}</div>

        {/* Footer opcional */}
        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
