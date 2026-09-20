"use client";

import { useState, type ReactElement } from 'react';
import DemoWindow from './DemoWindow';
import { ADMIN_SCENES } from './adminScenes';

/** Recorrido grabado del panel real (no un mockup dibujado) -- ver README de esta carpeta sobre cómo regenerarlo. */
const GIF_SRC = '/marketing/demo-panel-real.gif';

/**
 * A diferencia de `DemoWindow` (mockup animado con datos inventados), esto
 * reproduce una GRABACIÓN real del panel administrativo funcionando. Si el
 * archivo todavía no existe (por ejemplo, en un checkout limpio antes de
 * generarlo), cae de vuelta al mockup animado en vez de mostrar un ícono
 * de imagen rota.
 */
export default function RealDemoMedia(): ReactElement {
  const [disponible, setDisponible] = useState(true);

  if (!disponible) {
    return <DemoWindow urlLabel="tutienda.erpsystem.com/admin" scenes={ADMIN_SCENES} contentHeight="aspect-[1536/639]" />;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-2 shadow-2xl shadow-black/40">
      <div className="rounded-xl bg-slate-100 overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-200/70 border-b border-slate-300/50">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 text-[10px] font-mono text-slate-500 truncate">tutienda.erpsystem.com/admin</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- GIF animado: <Image> de Next lo congelaría en el primer frame. */}
        <img
          src={GIF_SRC}
          alt="Recorrido real del panel administrativo"
          // La relación de aspecto exacta de la grabación (1536x639): así se
          // ve completa (sidebar + carrito incluidos), sin recortar los
          // costados como pasaba al forzarla dentro de un recuadro más alto.
          className="w-full aspect-[1536/639] object-contain bg-black"
          onError={() => setDisponible(false)}
        />
      </div>
    </div>
  );
}
