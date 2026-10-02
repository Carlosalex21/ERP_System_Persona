"use client";

import type { ReactElement, ReactNode } from 'react';

interface PantallaErrorProps {
  /** Icono grande de la tarjeta (un elemento de lucide-react). */
  icono: ReactNode;
  /** Número o etiqueta grande ("404", "Error"). */
  etiqueta: string;
  titulo: string;
  mensaje: string;
  /** Botones de acción (primero el principal). */
  children?: ReactNode;
  /** Texto pequeño al pie (ej. código de referencia para soporte). */
  pie?: string;
  /** `true` dentro del panel (no ocupa toda la pantalla, conserva el menú). */
  compacta?: boolean;
}

/**
 * Pantalla de error de marca (404, fallo inesperado...): mismo aspecto en
 * todo el sistema, en vez de la página en inglés por defecto de Next.
 */
export default function PantallaError({
  icono, etiqueta, titulo, mensaje, children, pie, compacta = false,
}: PantallaErrorProps): ReactElement {
  return (
    <div className={`flex items-center justify-center p-4 ${compacta ? 'min-h-[60vh]' : 'min-h-screen bg-slate-50'}`}>
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 ring-1 ring-primary-100">
          {icono}
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary-600">{etiqueta}</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{titulo}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-500">{mensaje}</p>
        {children && <div className="mt-8 flex flex-col-reverse items-stretch justify-center gap-3 sm:flex-row sm:items-center">{children}</div>}
        {pie && <p className="mt-8 text-[11px] text-slate-400">{pie}</p>}
      </div>
    </div>
  );
}

/** Botón principal de las pantallas de error. */
export const claseBotonPrincipal =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2';

/** Botón secundario de las pantallas de error. */
export const claseBotonSecundario =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2';
