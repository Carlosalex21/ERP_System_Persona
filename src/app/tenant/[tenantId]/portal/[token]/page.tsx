"use client";

import { use, useCallback, useEffect, useState, type ReactElement } from 'react';
import { AlertCircle, Building, CheckCircle2, Clock, Copy, FileText, HandCoins, Loader2, MessageCircle, ShieldAlert, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { fechaCorta, numero, periodoLabel, usd } from '@/components/inmuebles/formato';
import { abrirPdfPortal, getPortal, type DatosPortal, type PortalUnidad } from '@/services/inmueblesPublicService';
import { toastApiError } from '@/utils/errors';
import ReportarPagoModal from './ReportarPagoModal';

const ESTADO_PAGO = {
  pendiente: { icono: Clock, color: 'text-amber-600 bg-amber-50', texto: 'En revisión' },
  aprobado: { icono: CheckCircle2, color: 'text-green-700 bg-green-50', texto: 'Aprobado' },
  rechazado: { icono: XCircle, color: 'text-red-600 bg-red-50', texto: 'Rechazado' },
} as const;

export default function PortalPage({ params }: { params: Promise<{ tenantId: string; token: string }> }): ReactElement {
  const { token } = use(params);
  const [datos, setDatos] = useState<DatosPortal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [reportando, setReportando] = useState<PortalUnidad | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    try {
      setDatos(await getPortal(token));
      setError(null);
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setError(status === 404 ? 'Este enlace no es válido o fue desactivado. Pídele uno nuevo a tu administración.' : status === 429 ? 'Demasiados intentos seguidos. Espera un minuto y recarga la página.' : 'No pudimos cargar tu información. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }, [token]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos externos
  useEffect(() => { void cargar(); }, [cargar]);

  const pdf = (ruta: string): void => { abrirPdfPortal(token, ruta).catch((e) => toastApiError(e, 'No se pudo abrir el documento.')); };
  const copiar = async (texto: string): Promise<void> => { await navigator.clipboard.writeText(texto); toast.success('Copiado'); };

  if (cargando) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary-600" size={32} /></div>;
  if (error || !datos) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center gap-3">
        <ShieldAlert size={44} className="text-slate-300" />
        <p className="text-slate-600 max-w-sm">{error}</p>
        <button onClick={() => { setCargando(true); void cargar(); }} className="text-sm font-bold text-primary-600 hover:underline">Reintentar</button>
      </div>
    );
  }

  const debe = Number(datos.saldo_total_usd) > 0;
  const vencido = Number(datos.vencido_total_usd) > 0;
  const whatsapp = datos.empresa.telefono ? `https://wa.me/${datos.empresa.telefono.replace(/\D/g, '')}` : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-2"><Building size={20} className="text-primary-600" /><p className="font-black text-slate-800 uppercase tracking-tight truncate">{datos.empresa.nombre}</p></div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        <section className={`rounded-3xl p-6 text-white shadow-lg ${vencido ? 'bg-gradient-to-br from-red-600 to-red-700' : debe ? 'bg-gradient-to-br from-amber-500 to-amber-600' : 'bg-gradient-to-br from-green-600 to-green-700'}`}>
          <p className="text-sm opacity-90">Hola, {datos.persona.nombre.split(' ')[0]}</p>
          <p className="text-xs uppercase font-bold opacity-80 mt-3">{debe ? 'Total por pagar' : 'Estás al día'}</p>
          <p className="text-4xl font-black font-mono tabular-nums">{usd(datos.saldo_total_usd)}</p>
          {vencido && <p className="text-sm mt-1 font-semibold">{usd(datos.vencido_total_usd)} ya vencido</p>}
          {datos.tasa && debe && <p className="text-xs opacity-90 mt-3">Tasa de hoy: {numero(datos.tasa.valor, 2)} {datos.tasa.moneda} por USD · equivale a {numero(Number(datos.saldo_total_usd) * Number(datos.tasa.valor), 2)} {datos.tasa.moneda}</p>}
        </section>

        {datos.unidades.length === 0 && <p className="text-center text-slate-500 py-10">No tienes inmuebles asociados a este enlace todavía.</p>}

        {datos.unidades.map((u) => {
          const pendientePorRevisar = u.pagos_reportados.some((p) => p.estado === 'pendiente');
          return (
            <section key={u.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 flex items-start justify-between gap-3 border-b border-slate-100">
                <div><p className="font-black text-slate-900 text-lg">{u.codigo}</p><p className="text-xs text-slate-500">{u.edificio || '—'} · {u.rol === 'propietario' ? 'Propietario' : 'Inquilino'}</p></div>
                <div className="text-right"><p className="text-[10px] uppercase font-bold text-slate-400">Saldo</p><p className={`font-mono font-black text-xl ${Number(u.vencido_usd) > 0 ? 'text-red-600' : 'text-slate-900'}`}>{usd(u.saldo_usd)}</p>{Number(u.saldo_a_favor_usd) > 0 && <p className="text-[11px] text-green-600 font-semibold">Saldo a favor {usd(u.saldo_a_favor_usd)}</p>}</div>
              </div>

              <div className="p-5 space-y-4">
                {u.cargos.length === 0 ? (
                  <p className="text-sm text-green-600 font-semibold flex items-center gap-2"><CheckCircle2 size={16} /> No tienes deudas pendientes en esta unidad.</p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl">
                    {u.cargos.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{c.concepto}</p><p className={`text-xs ${c.vencido ? 'text-red-600 font-bold' : 'text-slate-500'}`}>{periodoLabel(c.periodo)} · {c.vencido ? 'venció' : 'vence'} {fechaCorta(c.vencimiento)}</p></div>
                        <p className="font-mono font-bold text-slate-900 tabular-nums">{usd(c.saldo_usd)}</p>
                        {c.tipo === 'cuota_condominio' && <button onClick={() => pdf(`cuota/${c.id}/pdf/`)} className="p-2 text-slate-400 hover:text-primary-600" title="Ver recibo de condominio" aria-label="Ver recibo de condominio"><FileText size={16} /></button>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={() => setReportando(u)} className="flex-1 bg-primary-600 text-white py-3 rounded-2xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"><HandCoins size={18} /> {pendientePorRevisar ? 'Reportar otro pago' : 'Ya pagué, reportar pago'}</button>
                  <button onClick={() => pdf(`unidad/${u.id}/estado-cuenta/pdf/`)} className="py-3 px-4 rounded-2xl text-sm font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"><FileText size={16} /> Estado de cuenta</button>
                </div>

                {u.medios_pago.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400 mb-2">Dónde pagar</p>
                    <div className="grid gap-2">
                      {u.medios_pago.map((m) => (
                        <div key={m.id} className="border border-slate-200 rounded-2xl px-4 py-3 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-slate-800">{m.tipo_display}{m.banco ? ` · ${m.banco}` : ''} <span className="text-xs font-semibold text-slate-400">({m.moneda})</span></p>
                            {m.numero_cuenta && <button onClick={() => copiar(m.numero_cuenta)} className="p-1.5 text-slate-400 hover:text-primary-600" aria-label="Copiar cuenta"><Copy size={14} /></button>}
                          </div>
                          <p className="text-slate-600">{m.titular}{m.documento_titular ? ` · ${m.documento_titular}` : ''}</p>
                          {m.numero_cuenta && <p className="font-mono text-slate-800">{m.numero_cuenta}</p>}
                          {m.instrucciones && <p className="text-xs text-slate-500 mt-1">{m.instrucciones}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {u.pagos_reportados.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400 mb-2">Tus avisos de pago</p>
                    <div className="space-y-2">
                      {u.pagos_reportados.map((p) => {
                        const e = ESTADO_PAGO[p.estado];
                        const Icono = e.icono;
                        return (
                          <div key={p.id} className="flex items-start gap-3 text-sm">
                            <span className={`mt-0.5 px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${e.color}`}><Icono size={12} /> {e.texto}</span>
                            <div><p className="text-slate-700">{numero(p.monto_pago)} {p.moneda_pago} · {fechaCorta(p.fecha_pago)}{p.referencia ? ` · Ref. ${p.referencia}` : ''}</p>{p.estado === 'rechazado' && p.motivo_rechazo && <p className="text-xs text-red-600">{p.motivo_rechazo}</p>}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {u.recibos.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400 mb-2">Tus recibos de pago</p>
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl">
                      {u.recibos.map((r) => (
                        <button key={r.id} onClick={() => pdf(`recibo/${r.id}/pdf/`)} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50">
                          <span className="text-sm text-slate-700">{r.numero} <span className="text-xs text-slate-400">· {fechaCorta(r.fecha)} · {r.metodo}</span></span>
                          <span className="font-mono text-sm font-bold text-slate-800">{usd(r.monto_usd)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {u.morosidad_edificio && (
                  <details className="bg-slate-50 rounded-2xl px-4 py-3 text-sm">
                    <summary className="cursor-pointer font-bold text-slate-700 flex items-center gap-2"><AlertCircle size={15} className="text-amber-500" /> Morosidad del edificio: {Number(u.morosidad_edificio.porcentaje_morosidad).toFixed(1)} % ({u.morosidad_edificio.unidades_morosas} de {u.morosidad_edificio.total_unidades} unidades)</summary>
                    {u.morosidad_edificio.unidades.length > 0 && <ul className="mt-2 space-y-1 text-slate-600">{u.morosidad_edificio.unidades.map((m) => <li key={m.codigo}>{m.codigo} · {m.meses_vencidos} {m.meses_vencidos === 1 ? 'mes' : 'meses'} de atraso</li>)}</ul>}
                  </details>
                )}
              </div>
            </section>
          );
        })}

        {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-sm font-bold text-green-700 bg-green-50 border border-green-100 rounded-2xl py-3 hover:bg-green-100"><MessageCircle size={18} /> ¿Dudas? Escríbele a la administración</a>}
        <p className="text-center text-[11px] text-slate-400">Este enlace es personal: no lo compartas con nadie.</p>
      </main>

      {reportando && <ReportarPagoModal token={token} unidad={reportando} tasa={datos.tasa} onClose={() => setReportando(null)} onDone={() => { setReportando(null); void cargar(); }} />}
    </div>
  );
}
