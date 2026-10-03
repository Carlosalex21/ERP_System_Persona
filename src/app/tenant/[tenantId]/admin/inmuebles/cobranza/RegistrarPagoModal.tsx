"use client";

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { HandCoins, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';

import { ActionButton, AppModal } from '@/components/ui';
import SelectorUnidad from '@/components/inmuebles/SelectorUnidad';
import { ETIQUETA_METODO, fechaCorta, hoyISO, numero, usd } from '@/components/inmuebles/formato';
import { getMonedas, getTasasCambioActual } from '@/services/configuracionService';
import { getCargos, pdfRecibo, registrarRecibo, type Cargo, type Recibo, type TipoMedioPago } from '@/services/inmueblesService';
import { toastApiError } from '@/utils/errors';

interface Props {
  unidadInicial?: number | null;
  cargoInicial?: number | null;
  onClose: () => void;
  onSaved: (recibo: Recibo) => void;
}

const METODOS: TipoMedioPago[] = ['pago_movil', 'transferencia', 'zelle', 'efectivo', 'deposito', 'otro'];
const REQUIEREN_REFERENCIA: TipoMedioPago[] = ['pago_movil', 'transferencia', 'zelle', 'deposito'];
const campo = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const etiqueta = 'block text-xs font-bold text-slate-500 uppercase mb-1';

export default function RegistrarPagoModal({ unidadInicial = null, cargoInicial = null, onClose, onSaved }: Props): ReactElement {
  const [unidadId, setUnidadId] = useState<number | null>(unidadInicial);
  const [pendientes, setPendientes] = useState<Cargo[]>([]);
  const [elegidos, setElegidos] = useState<number[]>(cargoInicial ? [cargoInicial] : []);
  const [fecha, setFecha] = useState(hoyISO());
  const [moneda, setMoneda] = useState('USD');
  const [monedaBase, setMonedaBase] = useState<string | null>(null);
  const [tasa, setTasa] = useState('');
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState<TipoMedioPago>('pago_movil');
  const [referencia, setReferencia] = useState('');
  const [banco, setBanco] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // Moneda base del negocio y tasa vigente del dólar (la que se propone al cobrar en bolívares).
  useEffect(() => {
    Promise.all([getMonedas(), getTasasCambioActual()]).then(([monedas, tasas]) => {
      const base = monedas.find((m) => m.es_predeterminada)?.codigo ?? null;
      setMonedaBase(base && base !== 'USD' ? base : null);
      if (base && base !== 'USD') setMoneda(base);
      const usdTasa = tasas['USD']?.tasa;
      if (usdTasa) setTasa(String(Number(usdTasa)));
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos externos
    if (!unidadId) { setPendientes([]); return; }
    getCargos({ unidad: unidadId, estado: 'pendiente' })
      .then((lista) => setPendientes(lista.filter((c) => Number(c.saldo_usd) > 0)))
      .catch((e) => toastApiError(e, 'No se pudieron cargar las deudas de la unidad.'));
  }, [unidadId]);

  const deudaTotal = pendientes.reduce((acc, c) => acc + Number(c.saldo_usd), 0);
  const deudaElegida = pendientes.filter((c) => elegidos.includes(c.id)).reduce((acc, c) => acc + Number(c.saldo_usd), 0);
  const enUsd = moneda === 'USD';
  const equivalenteUsd = useMemo(() => {
    const m = Number(monto);
    if (!(m > 0)) return 0;
    if (enUsd) return m;
    const t = Number(tasa);
    return t > 0 ? m / t : 0;
  }, [monto, tasa, enUsd]);
  const objetivoUsd = elegidos.length ? deudaElegida : deudaTotal;

  const alternarCargo = (id: number): void => setElegidos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const llenarConLaDeuda = (): void => {
    if (!(objetivoUsd > 0)) return;
    setMonto(enUsd ? objetivoUsd.toFixed(2) : Number(tasa) > 0 ? (objetivoUsd * Number(tasa)).toFixed(2) : '');
  };

  const guardar = async (): Promise<void> => {
    if (!unidadId) return void toast.error('Selecciona la unidad que paga.');
    if (!(Number(monto) > 0)) return void toast.error('Indica el monto recibido.');
    if (!enUsd && !(Number(tasa) > 0)) return void toast.error('Indica la tasa de cambio del día.');
    if (REQUIEREN_REFERENCIA.includes(metodo) && !referencia.trim()) return void toast.error('Indica el número de referencia de la operación.');
    setGuardando(true);
    try {
      const recibo = await registrarRecibo({
        unidad: unidadId, fecha, monto_pago: String(monto), moneda_pago: moneda, tasa: enUsd ? null : String(tasa), metodo,
        referencia: referencia.trim(), banco: banco.trim(), cargos: elegidos.length ? elegidos : undefined, observaciones: observaciones.trim(), comprobante: archivo,
      });
      toast.success(`Pago registrado: ${recibo.numero}.`);
      onSaved(recibo);
      pdfRecibo(recibo.id).catch(() => undefined);
    } catch (e) {
      toastApiError(e, 'No se pudo registrar el pago.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Registrar pago"
      icon={<HandCoins size={20} />}
      size="lg"
      footer={<><ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton><ActionButton onClick={guardar} loading={guardando}>Registrar y ver recibo</ActionButton></>}
    >
      <div className="space-y-5">
        <SelectorUnidad value={unidadId} onChange={(id) => { setUnidadId(id); setElegidos([]); }} />

        {unidadId && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <p className="text-xs font-bold uppercase text-slate-500">Deudas pendientes</p>
              <p className="text-sm font-black font-mono tabular-nums text-slate-900">{usd(deudaTotal)}</p>
            </div>
            {pendientes.length === 0 ? (
              <p className="px-4 py-4 text-sm text-green-600 font-semibold">Esta unidad está al día. Un pago quedará como saldo a favor.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
                {pendientes.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={elegidos.includes(c.id)} onChange={() => alternarCargo(c.id)} className="rounded border-slate-300 text-primary-600" />
                    <span className="flex-1 min-w-0"><span className="block text-sm text-slate-800 truncate">{c.concepto}</span><span className={`block text-[11px] ${c.vencido ? 'text-red-500 font-bold' : 'text-slate-400'}`}>{c.vencido ? 'Vencida' : 'Vence'} {fechaCorta(c.fecha_vencimiento)}</span></span>
                    <span className="font-mono tabular-nums text-sm font-bold text-slate-700">{usd(c.saldo_usd)}</span>
                  </label>
                ))}
              </div>
            )}
            {pendientes.length > 0 && <p className="px-4 py-2 text-[11px] text-slate-400 bg-slate-50/60 border-t border-slate-100">Marca las deudas que paga; si no marcas ninguna, el pago se aplica a las más antiguas primero.</p>}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className={etiqueta}>Fecha del pago</label>
            <input type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} className={campo} />
          </div>
          <div>
            <label className={etiqueta}>Moneda</label>
            <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className={campo}>
              {monedaBase && <option value={monedaBase}>{monedaBase} (moneda local)</option>}
              <option value="USD">USD (dólares)</option>
            </select>
          </div>
          <div className="col-span-2 sm:col-span-2">
            <label className={etiqueta}>Monto recibido</label>
            <div className="flex gap-2">
              <input type="number" min={0} step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className={campo} placeholder="0.00" />
              {objetivoUsd > 0 && <button type="button" onClick={llenarConLaDeuda} className="shrink-0 px-3 text-[11px] font-bold text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50" title="Poner el monto de lo que se debe">Todo</button>}
            </div>
          </div>
          {!enUsd && (
            <div className="col-span-2 sm:col-span-2">
              <label className={etiqueta}>Tasa del día ({moneda} por USD)</label>
              <input type="number" min={0} step="0.0001" value={tasa} onChange={(e) => setTasa(e.target.value)} className={campo} />
            </div>
          )}
          <div className={`col-span-2 ${enUsd ? 'sm:col-span-4' : 'sm:col-span-2'} flex items-end`}>
            <div className="w-full px-3 py-2 rounded-lg bg-primary-50 border border-primary-100 text-sm flex items-center justify-between">
              <span className="text-primary-700 font-semibold">Equivale a</span>
              <span className="font-mono font-black text-primary-800 tabular-nums">{usd(equivalenteUsd)}</span>
            </div>
          </div>
        </div>
        {equivalenteUsd > 0 && objetivoUsd > 0 && Math.abs(equivalenteUsd - objetivoUsd) > 0.009 && (
          <p className={`text-xs -mt-2 ${equivalenteUsd > objetivoUsd ? 'text-amber-600' : 'text-slate-400'}`}>
            {equivalenteUsd > objetivoUsd ? `Sobran ${usd(equivalenteUsd - objetivoUsd)}: quedarán como saldo a favor para las próximas cuotas.` : `Queda pendiente ${usd(objetivoUsd - equivalenteUsd)} de lo seleccionado.`}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={etiqueta}>Método</label>
            <select value={metodo} onChange={(e) => setMetodo(e.target.value as TipoMedioPago)} className={campo}>
              {METODOS.map((m) => <option key={m} value={m}>{ETIQUETA_METODO[m]}</option>)}
            </select>
          </div>
          <div>
            <label className={etiqueta}>Referencia{REQUIEREN_REFERENCIA.includes(metodo) ? ' *' : ''}</label>
            <input value={referencia} onChange={(e) => setReferencia(e.target.value)} className={campo} placeholder="N° de operación" />
          </div>
          <div>
            <label className={etiqueta}>Banco</label>
            <input value={banco} onChange={(e) => setBanco(e.target.value)} className={campo} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={etiqueta}>Observaciones</label>
            <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={campo} placeholder="Opcional" />
          </div>
          <div>
            <label className={etiqueta}>Comprobante</label>
            <button type="button" onClick={() => input.current?.click()} className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-lg py-2 text-sm text-slate-500 hover:border-primary-400 hover:bg-primary-50/40"><Paperclip size={15} /> {archivo ? archivo.name : 'Adjuntar (opcional)'}</button>
            <input ref={input} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <p className="text-[11px] text-slate-400 -mt-2">Tasa y equivalente en USD quedan guardados en el recibo ({numero(Number(tasa) || 0, 2)} {monedaBase ?? ''}/USD el día del pago).</p>
      </div>
    </AppModal>
  );
}
