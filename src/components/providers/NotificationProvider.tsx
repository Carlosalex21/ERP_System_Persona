"use client";

import { type ReactElement, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

/**
 * Proveedor global para el sistema de notificaciones (toasts).
 * @param {{ children: ReactNode }} props - Propiedades del componente.
 * @returns {ReactElement}
 */
export default function NotificationProvider({ children }: { children: ReactNode }): ReactElement {
  return (
    <>
      {children}
      <Toaster position="bottom-right" reverseOrder={false} />
    </>
  );
}