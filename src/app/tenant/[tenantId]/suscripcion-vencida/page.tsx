"use client";

import { useEffect, useState, use, type ReactElement } from 'react';
import { AlertTriangle, ArrowRight, LogOut, Loader2 } from 'lucide-react';
import { apiPrivada } from '@/services/api';
import { mainUrl } from '@/utils/tenantUrl';
import type { TenantProfile } from '@/context/SessionContext';
import { cerrarSesion as cerrarSesionGlobal } from '@/utils/authSession';

/**
 * Pantalla a la que `apiPrivada` redirige cuando el backend responde 402
 * (`SubscriptionGateMiddleware`): la suscripción del tenant venció y ya
 * pasó el período de gracia. `/tenants/profile/` sigue exenta del bloqueo
 * (ver la lista blanca del middleware), así que esta página puede cargarla
 * sin problema para mostrar el plan/fecha exactos.
 */
export default function SuscripcionVencidaPage({ params }: { params: Promise<{ tenantId: string }> }): ReactElement {
  const { tenantId } = use(params);
  const [perfil, setPerfil] = useState<TenantProfile | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    apiPrivada.get<TenantProfile>('/tenants/profile/')
      .then((res) => setPerfil(res.data))
      .catch(() => undefined)
      .finally(() => setCargando(false));
  }, []);

  const cerrarSesion = (): void => {
    cerrarSesionGlobal();
    window.location.href = 'login';
  };

  const hrefPago = mainUrl(`/pago?subdominio=${tenantId}`);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-red-600 p-8 text-center relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20">
              <AlertTriangle className="text-white" size={32} />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">Suscripción Vencida</h1>
          </div>
        </div>

        <div className="p-8 space-y-5 text-center">
          {cargando ? (
            <Loader2 className="animate-spin text-slate-400 mx-auto" size={24} />
          ) : (
            <p className="text-sm text-slate-600">
              La suscripción de <strong className="text-slate-800">{perfil?.nombre_empresa || tenantId}</strong> venció
              {perfil?.subscription_status?.plan_nombre ? <> (plan <strong>{perfil.subscription_status.plan_nombre}</strong>)</> : null}.
              Renueva tu plan para seguir usando el panel administrativo.
            </p>
          )}

          <a
            href={hrefPago}
            className="w-full bg-primary-600 text-white py-3.5 rounded-xl font-bold hover:bg-primary-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            Renovar Suscripción <ArrowRight size={18} />
          </a>

          <button
            onClick={cerrarSesion}
            className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-bold py-2"
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}
