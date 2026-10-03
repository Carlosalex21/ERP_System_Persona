"use client";

import { useEffect, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { AlertTriangle, CalendarClock, Home, Inbox, MessageSquare, TrendingUp, Wallet } from 'lucide-react';

import { Card, EmptyState, PageHeader, StatCard, TableSkeleton } from '@/components/ui';
import { usd } from '@/components/inmuebles/formato';
import { getTableroInmuebles, type TableroInmuebles } from '@/services/inmueblesService';
import { toastApiError } from '@/utils/errors';

export default function DashboardInmuebles({ tipo }: { tipo: 'condominios' | 'inmobiliaria' }): ReactElement {
  // El middleware antepone el tenant según el dominio: las rutas del panel son relativas a él.
  const base = '/admin/inmuebles';
  const [t, setT] = useState<TableroInmuebles | null>(null);

  useEffect(() => {
    getTableroInmuebles().then(setT).catch((e) => toastApiError(e, 'No se pudo cargar el resumen.'));
  }, []);

  if (!t) return <div className="space-y-6"><TableSkeleton rows={4} /></div>;

  const facturado = Number(t.facturado_mes_usd);
  const cobrado = Number(t.cobrado_mes_usd);
  const pct = facturado > 0 ? Math.min(100, Math.round((cobrado / facturado) * 100)) : 0;
  const porVencer = t.contratos_por_vencer;
  const sinNada = t.unidades_total === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader icon={<TrendingUp size={20} />} title="Resumen" description={tipo === 'condominios' ? 'Cobranza, morosidad y pagos pendientes de tus condominios.' : 'Cartera, alquileres y consultas de tu inmobiliaria.'} />

      {sinNada ? (
        <EmptyState
          icon={<Home size={28} />}
          title="Empecemos cargando tus inmuebles"
          description={tipo === 'condominios' ? 'Crea tu primer edificio y agrega sus unidades; luego emite los recibos del mes.' : 'Registra tus propiedades con fotos y publícalas en tu catálogo web.'}
          action={<Link href={`${base}/${tipo === 'condominios' ? 'edificios' : 'propiedades'}`} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700">{tipo === 'condominios' ? 'Crear edificio' : 'Agregar propiedad'}</Link>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Cartera vencida" value={usd(t.cartera_vencida_usd)} color="bg-red-600" icon={<AlertTriangle size={20} />} note={`${t.morosidad.unidades_morosas} de ${t.morosidad.total_unidades} unidades · ${Number(t.morosidad.porcentaje_morosidad).toFixed(1)} %`} />
            <StatCard label="Por vencer" value={usd(t.cartera_por_vencer_usd)} color="bg-amber-500" icon={<CalendarClock size={20} />} note="Deuda que aún no vence" />
            <StatCard label="Cobrado este mes" value={usd(t.cobrado_mes_usd)} color="bg-green-600" icon={<Wallet size={20} />} note={`${pct} % de lo facturado (${usd(t.facturado_mes_usd)})`} />
            <StatCard label="Pagos por revisar" value={String(t.pagos_por_revisar)} color="bg-primary-600" icon={<Inbox size={20} />} note={t.pagos_por_revisar > 0 ? 'Reportados desde el portal' : 'Todo al día'} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2 space-y-3">
              <div className="flex items-center justify-between"><p className="font-bold text-slate-900">Mayores deudores</p><Link href={`${base}/morosidad`} className="text-xs font-bold text-primary-600 hover:underline">Ver morosidad completa</Link></div>
              {t.top_morosos.length === 0 ? <p className="text-sm text-green-600 font-semibold py-6 text-center">Nadie tiene deudas vencidas.</p> : (
                <div className="divide-y divide-slate-100">
                  {t.top_morosos.map((m) => (
                    <div key={m.unidad_id} className="flex items-center justify-between py-2.5 gap-3">
                      <div className="min-w-0"><p className="text-sm font-bold text-slate-800 truncate">{m.unidad}{m.edificio ? ` · ${m.edificio}` : ''}</p><p className="text-xs text-slate-500">{m.responsable || 'Sin responsable'} · {m.meses_vencidos} {m.meses_vencidos === 1 ? 'mes' : 'meses'}</p></div>
                      <span className="font-mono tabular-nums font-black text-red-600">{usd(m.total_vencido_usd)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="space-y-4">
              {tipo === 'inmobiliaria' && (
                <Card className="space-y-2">
                  <p className="font-bold text-slate-900">Contratos</p>
                  <p className="text-sm text-slate-600"><span className="font-black text-2xl text-slate-900">{t.contratos_vigentes}</span> vigentes</p>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <p>Vencen en 30 días: <b className="text-amber-600">{porVencer['30']}</b></p>
                    <p>En 60 días: <b>{porVencer['60']}</b> · En 90 días: <b>{porVencer['90']}</b></p>
                    {t.contratos_vencidos_con_inquilino > 0 && <p className="text-red-600 font-semibold">{t.contratos_vencidos_con_inquilino} vencidos con inquilino dentro</p>}
                  </div>
                  <Link href={`${base}/contratos`} className="text-xs font-bold text-primary-600 hover:underline">Ver contratos</Link>
                </Card>
              )}
              {tipo === 'inmobiliaria' && (
                <Card className="space-y-2">
                  <div className="flex items-center gap-2"><MessageSquare size={16} className="text-primary-600" /><p className="font-bold text-slate-900">Interesados</p></div>
                  <p className="text-sm text-slate-600"><span className="font-black text-2xl text-slate-900">{t.consultas_nuevas}</span> consultas nuevas</p>
                  <Link href={`${base}/consultas`} className="text-xs font-bold text-primary-600 hover:underline">Responder ahora</Link>
                </Card>
              )}
              <Card className="space-y-2">
                <p className="font-bold text-slate-900">{tipo === 'condominios' ? 'Unidades' : 'Cartera de propiedades'}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(t.unidades_por_estado).map(([estado, n]) => <span key={estado} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold">{n} {estado}</span>)}
                </div>
                <p className="text-xs text-slate-400">{t.unidades_total} en total</p>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
