"use client";

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Check, ExternalLink, Inbox, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { ActionButton, AppModal, Badge, Card, EmptyState, PageHeader, TableSkeleton } from '@/components/ui';
import { aprobarPagoReportado, getPagosReportados, rechazarPagoReportado, type PagoReportado } from '@/services/inmueblesService';
import { getTasasCambioActual } from '@/services/configuracionService';
import { toastApiError } from '@/utils/errors';
import { ETIQUETA_METODO, fechaCorta, numero, usd } from '@/components/inmuebles/formato';

type Estado = PagoReportado['estado'];
const TONO: Record<Estado, 'amber' | 'green' | 'red'> = { pendiente: 'amber', aprobado: 'green', rechazado: 'red' };
const TEXTO: Record<Estado, string> = { pendiente: 'Por revisar', aprobado: 'Aprobado', rechazado: 'Rechazado' };

const campo = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const etiqueta = 'block text-xs font-bold text-slate-500 uppercase mb-1';

export default function PagosReportadosPage(): ReactElement {
  const [estado, setEstado] = useState<Estado>('pendiente');
  const [pagos, setPagos] = useState<PagoReportado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aprobando, setAprobando] = useState<PagoReportado | null>(null);
  const [rechazando, setRechazando] = useState<PagoReportado | null>(null);
  const [tasaDia, setTasaDia] = useState('');
  const [tasa, setTasa] = useState('');
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      setPagos(await getPagosReportados({ estado }));
    } catch (e) {
      toastApiError(e, 'No se pudieron cargar los pagos reportados.');
    } finally {
      setCargando(false);
    }
  }, [estado]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos externos
  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => { getTasasCambioActual().then((t) => setTasaDia(t['USD']?.tasa ? String(Number(t['USD'].tasa)) : '')).catch(() => undefined); }, []);

  const abrirAprobar = (p: PagoReportado): void => {
    setAprobando(p);
    setMonto(String(Number(p.monto_pago)));
    setTasa(p.moneda_pago === 'USD' ? '' : tasaDia);
  };

  const aprobar = async (): Promise<void> => {
    if (!aprobando) return;
    const enBs = aprobando.moneda_pago !== 'USD';
    if (enBs && !(Number(tasa) > 0)) return void toast.error('Indica la tasa de cambio del día del pago.');
    if (!(Number(monto) > 0)) return void toast.error('Indica el monto verificado en el banco.');
    setProcesando(true);
    try {
      await aprobarPagoReportado(aprobando.id, { tasa: enBs ? tasa : null, monto_pago: String(monto) });
      toast.success('Pago aprobado. Se generó su recibo y se descontó de la deuda.');
      setAprobando(null);
      void cargar();
    } catch (e) {
      toastApiError(e, 'No se pudo aprobar el pago.');
    } finally {
      setProcesando(false);
    }
  };

  const rechazar = async (): Promise<void> => {
    if (!rechazando) return;
    if (!motivo.trim()) return void toast.error('Escribe el motivo para que el propietario lo vea.');
    setProcesando(true);
    try {
      await rechazarPagoReportado(rechazando.id, motivo.trim());
      toast.success('Pago rechazado.');
      setRechazando(null);
      setMotivo('');
      void cargar();
    } catch (e) {
      toastApiError(e, 'No se pudo rechazar el pago.');
    } finally {
      setProcesando(false);
    }
  };

  const enBs = aprobando ? aprobando.moneda_pago !== 'USD' : false;
  const equivalente = aprobando ? (enBs ? (Number(tasa) > 0 ? Number(monto) / Number(tasa) : 0) : Number(monto)) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader icon={<Inbox size={20} />} title="Pagos por revisar" description="Pagos que los propietarios reportaron desde su portal. Verifícalos en el banco y apruébalos para generar el recibo." />

      <div className="flex gap-2">
        {(['pendiente', 'aprobado', 'rechazado'] as Estado[]).map((e) => (
          <button key={e} onClick={() => setEstado(e)} className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${estado === e ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{e === 'pendiente' ? 'Por revisar' : e === 'aprobado' ? 'Aprobados' : 'Rechazados'}</button>
        ))}
      </div>

      {cargando ? (
        <TableSkeleton rows={4} />
      ) : pagos.length === 0 ? (
        <EmptyState icon={<Inbox size={28} />} title={estado === 'pendiente' ? 'No hay pagos por revisar' : 'Sin registros'} description={estado === 'pendiente' ? 'Cuando un propietario reporte un pago desde su enlace, aparecerá aquí para que lo apruebes.' : 'No hay pagos en este estado.'} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {pagos.map((p) => (
            <Card key={p.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{p.unidad_codigo}{p.edificio_nombre ? ` · ${p.edificio_nombre}` : ''}</p>
                  <p className="text-xs text-slate-500">{p.cliente_nombre ?? 'Sin nombre'} · reportado {fechaCorta(p.fecha_creacion)}</p>
                </div>
                <Badge tone={TONO[p.estado]}>{TEXTO[p.estado]}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-[10px] uppercase font-bold text-slate-400">Monto</p><p className="font-mono font-bold text-slate-900">{numero(p.monto_pago)} {p.moneda_pago}</p></div>
                <div><p className="text-[10px] uppercase font-bold text-slate-400">Método</p><p className="text-slate-700">{ETIQUETA_METODO[p.metodo] ?? p.metodo_display}</p></div>
                <div><p className="text-[10px] uppercase font-bold text-slate-400">Fecha del pago</p><p className="text-slate-700">{fechaCorta(p.fecha_pago)}</p></div>
                <div><p className="text-[10px] uppercase font-bold text-slate-400">Referencia / banco</p><p className="text-slate-700 truncate">{p.referencia || '—'}{p.banco ? ` · ${p.banco}` : ''}</p></div>
              </div>
              {p.cargos_detalle.length > 0 && (
                <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                  Paga: {p.cargos_detalle.map((c) => `${c.concepto} (${usd(c.saldo_usd)})`).join(' · ')}
                </div>
              )}
              {p.nota && <p className="text-xs text-slate-500 italic">“{p.nota}”</p>}
              {p.estado === 'rechazado' && p.motivo_rechazo && <p className="text-xs text-red-600">Motivo: {p.motivo_rechazo}</p>}
              {p.recibo_numero && <p className="text-xs text-green-600 font-semibold">Recibo {p.recibo_numero}</p>}
              <div className="flex items-center justify-between gap-2 pt-1">
                {p.comprobante_url ? <a href={p.comprobante_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary-600 hover:underline flex items-center gap-1"><ExternalLink size={13} /> Ver comprobante</a> : <span className="text-xs text-slate-400">Sin comprobante</span>}
                {p.estado === 'pendiente' && (
                  <div className="flex gap-2">
                    <button onClick={() => { setMotivo(''); setRechazando(p); }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 flex items-center gap-1"><X size={14} /> Rechazar</button>
                    <button onClick={() => abrirAprobar(p)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-700 flex items-center gap-1"><Check size={14} /> Aprobar</button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {aprobando && (
        <AppModal isOpen onClose={() => setAprobando(null)} title="Aprobar pago" icon={<Check size={20} />} size="md"
          footer={<><ActionButton variant="secondary" onClick={() => setAprobando(null)}>Cancelar</ActionButton><ActionButton onClick={aprobar} loading={procesando}>Aprobar y generar recibo</ActionButton></>}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{aprobando.unidad_codigo} · {aprobando.cliente_nombre}. Confirma el monto que realmente entró a tu cuenta; si difiere de lo reportado, corrígelo.</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={etiqueta}>Monto verificado ({aprobando.moneda_pago})</label><input type="number" min={0} step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className={campo} /></div>
              {enBs && <div><label className={etiqueta}>Tasa del día ({aprobando.moneda_pago}/USD)</label><input type="number" min={0} step="0.0001" value={tasa} onChange={(e) => setTasa(e.target.value)} className={campo} /></div>}
            </div>
            <div className="px-3 py-2 rounded-lg bg-primary-50 border border-primary-100 text-sm flex justify-between"><span className="text-primary-700 font-semibold">Se acreditará</span><span className="font-mono font-black text-primary-800">{usd(equivalente)}</span></div>
          </div>
        </AppModal>
      )}

      {rechazando && (
        <AppModal isOpen onClose={() => setRechazando(null)} title="Rechazar pago" icon={<X size={20} />} size="sm"
          footer={<><ActionButton variant="secondary" onClick={() => setRechazando(null)}>Cancelar</ActionButton><ActionButton variant="danger" onClick={rechazar} loading={procesando}>Rechazar</ActionButton></>}>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">El propietario verá el motivo en su portal.</p>
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: No encontramos la transferencia en el banco" className={campo} autoFocus />
          </div>
        </AppModal>
      )}
    </div>
  );
}
