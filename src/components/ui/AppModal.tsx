/**
 * @file Modal reutilizable de la aplicación, sobre Radix Dialog.
 * Resuelve los problemas de "modales apilados" que se ven mal:
 *  - Portal sobre <body> (evita conflictos de z-index/stacking) -- vía Radix.
 *  - Focus-trap real y devolución de foco al cerrar -- vía Radix (la versión
 *    anterior, hecha a mano, no atrapaba el foco dentro del modal).
 *  - Bloquea el scroll del body mientras está abierto -- vía Radix.
 *  - Se cierra con Escape o clic en el fondo -- vía Radix.
 *  - Transición de entrada/salida real (la versión anterior solo animaba la
 *    entrada; al cerrar desaparecía de golpe) -- vía Framer Motion.
 *  - Limita la altura del contenido para que nunca desborde en pantallas pequeñas.
 */
"use client";

import { useCallback, type ReactElement, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
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

const PANEL_TRANSITION = { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const };

export default function AppModal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  size = 'md',
  accentHeader = true,
}: AppModalProps): ReactElement {
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </Dialog.Overlay>

            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
              <Dialog.Content asChild forceMount aria-describedby={undefined}>
                <motion.div
                  className={`pointer-events-auto bg-white w-full ${SIZE_CLASSES[size]} rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] focus:outline-none`}
                  initial={{ opacity: 0, scale: 0.94, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={PANEL_TRANSITION}
                >
                  {/* Header */}
                  <div
                    className={`flex items-center justify-between gap-4 px-6 py-4 shrink-0 ${
                      accentHeader
                        ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white'
                        : 'bg-white border-b border-slate-100 text-slate-900'
                    }`}
                  >
                    <Dialog.Title asChild>
                      <h3 className="font-bold text-lg flex items-center gap-2 min-w-0 truncate">
                        {icon && <span className="shrink-0">{icon}</span>}
                        <span className="truncate">{title}</span>
                      </h3>
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className={`p-2 rounded-full transition-colors shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                          accentHeader
                            ? 'hover:bg-slate-700 text-slate-300 hover:text-white focus-visible:outline-white'
                            : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700 focus-visible:outline-primary-600'
                        }`}
                        aria-label="Cerrar modal"
                      >
                        <X size={20} />
                      </button>
                    </Dialog.Close>
                  </div>

                  {/* Body scrolleable */}
                  <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">{children}</div>

                  {/* Footer opcional */}
                  {footer && (
                    <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                      {footer}
                    </div>
                  )}
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
