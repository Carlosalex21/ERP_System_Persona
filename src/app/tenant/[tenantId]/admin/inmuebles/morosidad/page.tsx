"use client";

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { AlertTriangle, FileCheck2, HandCoins, Link2, MessageCircle, Receipt, Users } from 'lucide-react';

import { Card, EmptyState, PageHeader, StatCard, TableSkeleton } from '@/components/ui';
import { useSession } from '@/context/SessionContext';
import EnlacePortalModal from '@/components/inmuebles/EnlacePortalModal';
import EstadoCuentaModal from '@/components/inmuebles/EstadoCuentaModal';
import { mensajeCobro, usd } from '@/components/inmuebles/formato';
import { getEdificios, getAccesoPortal, getReporteMorosidad, pdfSolvencia, type Edificio, type FilaMorosidad, type ReporteMorosidad } from '@/services/inmueblesService';
import { construirLinkWhatsapp } from '@/utils/whatsapp';
import { toastApiError } from '@/utils/errors';
import RegistrarPagoModal from '../cobranza/RegistrarPagoModal';

export default function MorosidadPage(): ReactElement {
  const { tenant } = useSession();
  const [reporte, setReporte] = useState<ReporteMorosidad | null>(null);
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [edificioId, setEdificioId] = useState('');
  const [minMeses, setMinMeses] = useState('');
  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState<FilaMorosidad | null>(null);
  const [portal, setPortal] = useState<FilaMorosidad | null>(null);
  const [cobrando, setCobrando] = useState<FilaMorosidad | null>(null);
  const [trabajando, setTrabajando] = useState<number | null>(null);

  useEffect(() => { getEdificios().then(setEdificios).catch(() => undefined); }, []);

  const filtros = useMemo(() => ({ edificio: edificioId || undefined }), [edificioId]);
  const [clave, setClave] = useState(0);
  useEffect(() => {
    let vigente = true;
    getReporteMorosidad(filtros)
      .then((r) => { if (vigente) setReporte(r); })
      .catch((e) => toastApiError(e, 'No se pudo cargar el reporte de morosidad.'))
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [filtros, clave]);

  const cobrarPorWhatsapp = async (f: FilaMorosidad): Promise<void> => {
    if (!f.telefono) return;
    setTrabajando(f.unidad_id);
    try {
      // El enlace personal del portal va en el mensaje para que pague sin llamar.
      let enlace: string | undefined;
      if (f.responsable_id) {
        const acceso = await getAccesoPortal(f.responsable_id);
        enlace = `${window.location.origin}/portal/${acceso.token}`;
      }
      const link = construirLinkWhatsapp(f.telefono, mensajeCobro(f.responsable, f.unidad, f.total_vencido_usd, f.meses_vencidos, enlace), tenant?.pais_codigo);
      if (link) window.open(link, '_blank', 'noopener');
    } catch (e) {
      toastApiError(e, 'No se pudo preparar el mensaje.');
    } finally {
      setTrabajando(null);
    }
  };

  const filas = (reporte?.filas ?? []).filter((f) => f.meses_vencidos >= Number(minMeses || 0));
  const r = reporte?.resumen;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader icon={<AlertTriangle size={20} />} title="Morosidad" description="Quién debe, cuánto y desde cuándo. Cobra por WhatsApp con su enlace de pago en un clic." />

      <div className="flex flex-col sm:flex-row gap-3">
        <select value={edificioId} onChange={(e) => { setCargando(true); setEdificioId(e.target.value); }} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white sm:w-64" aria-label="Edificio">
          <option value="">Todos los edificios</option>
          {edificios.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <select value={minMeses} onChange={(e) => setMinMeses(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white sm:w-56" aria-label="Antigüedad">
          <option value="">Cualquier atraso</option>
          <option value="2">2 meses o más</option>
          <option value="3">3 meses o más</option>
          <option value="6">6 meses o más</option>
        </select>
      </div>

      {r && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Total vencido" value={usd(r.total_vencido_usd)} color="bg-red-600" icon={<Receipt size={20} />} />
          <StatCard label="Unidades morosas" value={`${r.unidades_morosas} de ${r.total_unidades}`} color="bg-amber-500" icon={<Users size={20} />} />
          <StatCard label="Índice de morosidad" value={`${Number(r.porcentaje_morosidad).toFixed(1)} %`} color="bg-slate-700" icon={<AlertTriangle size={20} />} />
        </div>
      )}

      {cargando && !reporte ? (
        <TableSkeleton rows={6} />
      ) : filas.length === 0 ? (
        <EmptyState icon={<FileCheck2 size={28} />} title="Nadie debe nada vencido" description="Todas las unidades están al día. Cuando una cuota se venza sin pagarse, aparecerá aquí." />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold">
                <th className="px-4 py-3 text-left">Unidad</th><th className="px-4 py-3 text-left">Responsable</th>
                <th className="px-3 py-3 text-right">0–30</th><th className="px-3 py-3 text-right">31–60</th><th className="px-3 py-3 text-right">61–90</th><th className="px-3 py-3 text-right">+90</th>
                <th className="px-4 py-3 text-right">Total vencido</th><th className="px-4 py-3 text-right">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map((f) => (
                  <tr key={f.unidad_id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3"><p className="font-bold text-slate-800">{f.unidad}</p><p className="text-[11px] text-slate-400">{f.edificio}</p></td>
                    <td className="px-4 py-3"><p className="text-slate-700">{f.responsable || '—'}</p><p className="text-[11px] text-slate-400">{f.meses_vencidos} {f.meses_vencidos === 1 ? 'mes' : 'meses'} · {f.dias_atraso} días de atraso</p></td>
                    {(['0_30', '31_60', '61_90', 'mas_90'] as const).map((k) => <td key={k} className={`px-3 py-3 text-right font-mono tabular-nums ${Number(f[k]) > 0 ? 'text-slate-700' : 'text-slate-300'}`}>{Number(f[k]) > 0 ? usd(f[k]) : '—'}</td>)}
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-black text-red-600">{usd(f.total_vencido_usd)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setCobrando(f)} className="p-2 text-slate-400 hover:text-primary-600" title="Registrar pago" aria-label={`Registrar pago de ${f.unidad}`}><HandCoins size={16} /></button>
                        <button onClick={() => cobrarPorWhatsapp(f)} disabled={!f.telefono || trabajando === f.unidad_id} className="p-2 text-slate-400 hover:text-green-600 disabled:opacity-30" title={f.telefono ? 'Cobrar por WhatsApp' : 'Sin teléfono registrado'} aria-label={`Cobrar a ${f.unidad} por WhatsApp`}><MessageCircle size={16} /></button>
                        {f.responsable_id && <button onClick={() => setPortal(f)} className="p-2 text-slate-400 hover:text-primary-600" title="Enlace del portal" aria-label="Enlace del portal"><Link2 size={16} /></button>}
                        <button onClick={() => setEstado(f)} className="p-2 text-slate-400 hover:text-primary-600" title="Estado de cuenta" aria-label="Estado de cuenta"><Receipt size={16} /></button>
                        <button onClick={() => pdfSolvencia(f.unidad_id).catch((e) => toastApiError(e, 'No se pudo generar la constancia.'))} className="p-2 text-slate-400 hover:text-primary-600" title="Constancia de deuda" aria-label="Constancia"><FileCheck2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {estado && <EstadoCuentaModal unidadId={estado.unidad_id} titulo={`${estado.unidad} · ${estado.edificio}`} onClose={() => setEstado(null)} />}
      {portal && portal.responsable_id && <EnlacePortalModal clienteId={portal.responsable_id} nombre={portal.responsable} telefono={portal.telefono} onClose={() => setPortal(null)} />}
      {cobrando && <RegistrarPagoModal unidadInicial={cobrando.unidad_id} onClose={() => setCobrando(null)} onSaved={() => { setCobrando(null); setClave((k) => k + 1); }} />}
    </div>
  );
}
