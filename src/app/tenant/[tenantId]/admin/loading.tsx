import type { ReactElement } from 'react';

/** Se muestra mientras carga la siguiente sección del panel (el menú lateral queda visible). */
export default function CargandoPanel(): ReactElement {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary-600" />
        <span className="text-xs font-semibold">Cargando…</span>
      </div>
    </div>
  );
}
