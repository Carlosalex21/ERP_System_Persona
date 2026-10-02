"use client";

import type { ReactElement } from 'react';

import '@/styles/globals.css';

/**
 * Último recurso: falla el propio layout raíz. Reemplaza toda la página, así
 * que debe traer su `<html>`/`<body>` y no depender de ningún provider.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }): ReactElement {
  return (
    <html lang="es">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <div className="w-full max-w-md text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary-600">Algo salió mal</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">El sistema no pudo cargar</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
              Ocurrió un problema inesperado. Tus datos guardados están seguros. Recarga la página; si se repite, avísanos.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-700"
            >
              Recargar la página
            </button>
            {error.digest && <p className="mt-8 text-[11px] text-slate-400">Código de referencia: {error.digest}</p>}
          </div>
        </div>
      </body>
    </html>
  );
}
