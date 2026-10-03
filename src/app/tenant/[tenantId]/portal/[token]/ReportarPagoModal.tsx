"use client";

import { useMemo, useRef, useState, type ReactElement } from 'react';
import { HandCoins, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';

import { ActionButton, AppModal } from '@/components/ui';
import { ETIQUETA_METODO, fechaCorta, hoyISO, numero, periodoLabel, usd } from '@/components/inmuebles/formato';
import { reportarPagoPortal, type DatosPortal, type PortalUnidad } from '@/services/inmueblesPublicService';
import type { TipoMedioPago } from '@/services/inmueblesService';
import { toastApiError } from '@/utils/errors';

interface Props {
  token: string;
  unidad: PortalUnidad;
  tasa: DatosPortal['tasa'];
  onClose: () => void;
  onDone: () => void;
}

const METODOS: TipoMedioPago[] = ['pago_movil', 'transferencia', 'zelle', 'efectivo', 'deposito', 'otro'];
const campo = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const etiqueta = 'block text-xs font-bold text-slate-500 uppercase mb-1';

/** Aviso de pago del portal: el residente indica lo que pagó; la administración lo verifica y emite el recibo. */
export default function ReportarPagoModal({ token, unidad, tasa, onClose, onDone }: Props): ReactElement {
  const [elegidos, setElegidos] = useState<number[]>(unidad.cargos.map((c) => c.id));
  const [moneda, setMoneda] = useState(tasa?.moneda ?? 'USD');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [metodo, setMetodo] = useState<TipoMedioPago>('pago_movil');
  const [referencia, setReferencia] = useState('');
  const [banco, setBanco] = useState('');
  const [nota, setNota] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const totalUsd = useMemo(() => unidad.cargos.filter((c) => elegidos.includes(c.id)).reduce((a, c) => a + Number(c.saldo_usd), 0), [unidad.cargos, elegidos]);
  const sugerido = moneda === 'USD' || !tasa ? totalUsd : totalUsd * Number(tasa.valor);
  const requiereReferencia = metodo !== 'efectivo';

  const alternar = (id: number): void => setElegidos((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const enviar = async (): Promise<void> => {
    if (!(Number(monto) > 0)) return void toast.error('Escribe el monto que pagaste.');
    if (requiereReferencia && !referencia.trim()) return void toast.error('Escribe el número de referencia de tu operación.');
    if (requiereReferencia && !archivo) return void toast.error('Adjunta una captura o foto del comprobante.');
    setEnviando(true);
    try {
      const r = await reportarPagoPortal(token, {
        unidad: unidad.id, fecha_pago: fecha, monto_pago: String(monto), moneda_pago: moneda, metodo, referencia: referencia.trim(), banco: banco.trim(),
        cargos: elegidos, nota: nota.trim(), comprobante: archivo,
      });
      setListo(r.mensaje);
    } catch (e) {
      toastApiError(e, 'No pudimos enviar tu aviso de pago.');
    } finally {
      setEnviando(false);
    }
  };

  if (listo) {
    return (
      <AppModal isOpen onClose={onDone} title="¡Aviso enviado!" icon={<HandCoins size={20} />} size="sm" footer={<ActionButton onClick={onDone}>Listo</ActionButton>}>
        <p className="text-sm text-slate-600">{listo}</p>
      </AppModal>
    );
  }

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={`Reportar pago · ${unidad.codigo}`}
      icon={<HandCoins size={20} />}
      size="lg"
      footer={<><ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton><ActionButton onClick={enviar} loading={enviando}>Enviar aviso de pago</ActionButton></>}
    >
      <div className="space-y-5">
        {unidad.cargos.length > 0 && (
          <div>
            <p className={etiqueta}>¿Qué estás pagando?</p>
            <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-44 overflow-y-auto">
              {unidad.cargos.map((c) => (
                <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer">
                  <input type="checkbox" checked={elegidos.includes(c.id)} onChange={() => alternar(c.id)} className="rounded border-slate-300 text-primary-600" />
                  <span className="flex-1 text-sm text-slate-700 min-w-0 truncate">{c.concepto} <span className="text-xs text-slate-400">· {periodoLabel(c.periodo)} · vence {fechaCorta(c.vencimiento)}</span></span>
                  <span className="font-mono text-sm font-bold">{usd(c.saldo_usd)}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">Total seleccionado: <b>{usd(totalUsd)}</b>{tasa && ` ≈ ${numero(totalUsd * Number(tasa.valor))} ${tasa.moneda} (tasa de hoy ${numero(tasa.valor)})`}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={etiqueta}>Moneda con la que pagaste</label>
            <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className={campo}>
              {tasa && <option value={tasa.moneda}>{tasa.moneda}</option>}
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label className={etiqueta}>Monto pagado *</label>
            <div className="flex gap-2">
              <input type="number" inputMode="decimal" min={0} step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className={campo} placeholder="0.00" />
              {sugerido > 0 && <button type="button" onClick={() => setMonto(sugerido.toFixed(2))} className="shrink-0 px-3 text-[11px] font-bold text-primary-600 border border-primary-200 rounded-xl hover:bg-primary-50">Todo</button>}
            </div>
          </div>
          <div><label className={etiqueta}>Fecha del pago</label><input type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} className={campo} /></div>
          <div>
            <label className={etiqueta}>Método</label>
            <select value={metodo} onChange={(e) => setMetodo(e.target.value as TipoMedioPago)} className={campo}>{METODOS.map((m) => <option key={m} value={m}>{ETIQUETA_METODO[m]}</option>)}</select>
          </div>
          <div><label className={etiqueta}>Referencia{requiereReferencia ? ' *' : ''}</label><input value={referencia} onChange={(e) => setReferencia(e.target.value)} className={campo} placeholder="N° de operación" /></div>
          <div><label className={etiqueta}>Banco</label><input value={banco} onChange={(e) => setBanco(e.target.value)} className={campo} /></div>
        </div>

        <div>
          <label className={etiqueta}>Comprobante{requiereReferencia ? ' *' : ''}</label>
          <button type="button" onClick={() => input.current?.click()} className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl py-3 text-sm text-slate-500 hover:border-primary-400 hover:bg-primary-50/40"><Paperclip size={16} /> {archivo ? archivo.name : 'Adjuntar captura, foto o PDF'}</button>
          <input ref={input} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
        </div>
        <div><label className={etiqueta}>Nota (opcional)</label><input value={nota} onChange={(e) => setNota(e.target.value)} className={campo} /></div>
      </div>
    </AppModal>
  );
}
