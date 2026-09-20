"use client";

import { type ReactElement } from 'react';
import { ExternalLink } from 'lucide-react';
import { tenantUrl } from '@/utils/tenantUrl';

/**
 * A diferencia de `DemoWindow` (mockup animado que solo simula el
 * catálogo), esto incrusta el catálogo público REAL del tenant demo en un
 * iframe -- es el mismo storefront que ve cualquier cliente final, ya
 * público y de solo lectura para un visitante anónimo, así que no hay
 * riesgo de que alguien deje datos rotos ahí (a diferencia del panel
 * admin, que si permite crear/editar cosas).
 */
export default function LiveCatalogWindow(): ReactElement {
  const url = tenantUrl('demo', '/');

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-2 shadow-2xl shadow-black/40">
      <div className="rounded-xl bg-slate-100 overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-200/70 border-b border-slate-300/50">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 text-[10px] font-mono text-slate-500 truncate flex-1">{url.replace(/^https?:\/\//, '')}</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-bold text-primary-600 hover:text-primary-700 shrink-0"
          >
            Abrir <ExternalLink size={11} />
          </a>
        </div>
        <iframe
          src={url}
          title="Catálogo público de la tienda demo"
          className="w-full h-[480px] sm:h-[560px] bg-white"
          loading="lazy"
        />
      </div>
    </div>
  );
}
