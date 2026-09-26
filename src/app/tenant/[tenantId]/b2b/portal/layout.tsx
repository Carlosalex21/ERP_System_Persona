"use client";

import { useEffect, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, Building2, BadgePercent } from 'lucide-react';
import { getB2BPerfil, type B2BPerfil } from '@/services/b2bPortalService';
import { cerrarSesion as cerrarSesionGlobal } from '@/utils/authSession';

/**
 * Shell del portal de clientes B2B: distinto del admin (sin sidebar de
 * gestión interna) -- un cliente B2B solo ve su catálogo con su precio y
 * su historial, no el panel operativo del tenant.
 */
export default function B2BPortalLayout({ children }: { children: React.ReactNode }): ReactElement {
  const router = useRouter();
  const [perfil, setPerfil] = useState<B2BPerfil | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    getB2BPerfil()
      .then(setPerfil)
      .catch(() => {
        // Sin perfil B2B válido (o sesión expirada): no pertenece a este portal.
        router.push('../login');
      })
      .finally(() => setCargando(false));
  }, [router]);

  const cerrarSesion = (): void => {
    cerrarSesionGlobal();
    router.push('../login');
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-ink-950 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
              <Building2 size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{perfil?.razon_social}</p>
              <p className="text-[10px] text-slate-400 font-mono truncate">{perfil?.rif}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {perfil?.nivel_precio && (
              <span className="hidden sm:inline-flex items-center gap-1.5 bg-accent-400/10 text-accent-400 border border-accent-400/20 text-xs font-bold px-3 py-1.5 rounded-full">
                <BadgePercent size={13} /> {perfil.nivel_precio.nombre} · {parseFloat(perfil.nivel_precio.porcentaje_descuento)}% off
              </span>
            )}
            <button
              onClick={cerrarSesion}
              className="p-2 rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
