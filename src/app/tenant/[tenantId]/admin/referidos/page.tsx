"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Gift, Copy, Check, Users, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

import { PageHeader, Card, StatCard, Badge, EmptyState } from '@/components/ui';
import { getProgramaReferidos } from '@/services/referidosService';
import type { ReferidoPrograma } from '@/types/api';

export default function ReferidosPage(): ReactElement {
  const [programa, setPrograma] = useState<ReferidoPrograma | null>(null);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      setPrograma(await getProgramaReferidos());
    } catch {
      toast.error('No se pudo cargar el programa de referidos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const copiarLink = async (): Promise<void> => {
    if (!programa) return;
    try {
      await navigator.clipboard.writeText(programa.link_invitacion);
      setCopiado(true);
      toast.success('Enlace copiado.');
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error('No se pudo copiar el enlace.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Gift size={20} />}
        title="Programa de Referidos"
        description="Invita a otros negocios a usar el sistema -- cuando el negocio que invitaste paga su primera suscripción, ambos reciben un mes gratis."
      />

      {cargando || !programa ? (
        <Card><div className="p-8 text-center text-slate-400 text-sm">Cargando...</div></Card>
      ) : (
        <>
          <Card>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Tu enlace de invitación</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                readOnly value={programa.link_invitacion}
                onFocus={(e) => e.target.select()}
                className="flex-1 min-w-0 px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono bg-slate-50 text-slate-600"
              />
              <button
                onClick={copiarLink}
                className="shrink-0 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2"
              >
                {copiado ? <Check size={16} /> : <Copy size={16} />} {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Compártelo por WhatsApp, redes sociales o directo con otro dueño de negocio -- cualquiera que se registre desde este enlace queda vinculado a tu cuenta.
            </p>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Negocios invitados" value={String(programa.total_referidos)} />
            <StatCard label="Pendientes de convertir" value={String(programa.referidos_pendientes)} />
            <StatCard label="Meses gratis ganados" value={String(programa.meses_ganados)} color="bg-emerald-600" />
          </div>

          <Card padding="none">
            {programa.referidos.length === 0 ? (
              <EmptyState
                icon={<Users size={28} />}
                title="Aún no has invitado a nadie"
                description="Comparte tu enlace y empieza a ganar meses gratis cuando esos negocios se conviertan en clientes de pago."
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase border-b border-slate-200">
                    <th className="p-3 text-left">Negocio</th>
                    <th className="p-3 text-left">Se registró</th>
                    <th className="p-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {programa.referidos.map((r, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-semibold text-slate-700">{r.nombre_empresa}</td>
                      <td className="p-3 text-slate-400">{new Date(r.fecha_registro).toLocaleDateString('es-VE')}</td>
                      <td className="p-3 text-center">
                        {r.estado === 'recompensado' ? (
                          <Badge tone="green"><span className="flex items-center gap-1"><Sparkles size={11} /> Recompensado</span></Badge>
                        ) : (
                          <Badge tone="slate">Pendiente de pago</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
