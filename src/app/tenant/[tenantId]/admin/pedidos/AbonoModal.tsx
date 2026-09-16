/**
 * @file Modal para registrar un abono (pago parcial) sobre una factura a
 * crédito -- antes no existía forma de dejar constancia de que un cliente
 * fue pagando de a poco una cuenta pendiente; solo se podía marcar
 * "pagado" de una vez por el total completo.
 */
"use client";

import { useEffect, useState, type ReactElement } from 'react';
import { HandCoins } from 'lucide-react';
import toast from 'react-hot-toast';

import { Factura, MetodoPago } from '@/types/api';
import { registrarPago } from '@/services/facturacionService';
import { getApiErrorMessages, parseDecimal } from '@/utils/helpers';
import { AppModal, ActionButton } from '@/components/ui';

interface AbonoModalProps {
  factura: Factura;
  metodosPago: MetodoPago[];
  saldoPendiente: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function AbonoModal({ factura, metodosPago, saldoPendiente, onClose, onSaved }: AbonoModalProps): ReactElement {
  const [metodoPagoId, setMetodoPagoId] = useState<string>('');
  const [monto, setMonto] = useState(saldoPendiente > 0 ? saldoPendiente.toFixed(2) : '');
  const [referencia, setReferencia] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (metodosPago.length > 0 && !metodoPagoId) setMetodoPagoId(String(metodosPago[0].id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metodosPago]);

  const montoNum = parseDecimal(monto);
  const restanteTrasAbono = Math.max(saldoPendiente - montoNum, 0);

  const guardar = async () => {
    if (!metodoPagoId || montoNum <= 0) {
      toast.error('Indica un método de pago y un monto válido.');
      return;
    }
    if (montoNum > saldoPendiente + 0.01) {
      toast.error(`El abono no puede superar el saldo pendiente (${saldoPendiente.toFixed(2)}).`);
      return;
    }
    setGuardando(true);
    try {
      const resultado = await registrarPago(factura.id, [{
        metodo_pago_id: Number(metodoPagoId),
        monto: montoNum.toFixed(2),
        referencia: referencia.trim() || undefined,
      }]);
      const saldo = parseDecimal(resultado.saldo_pendiente || '0');
      toast.success(saldo > 0.01 ? `Abono registrado. Saldo restante: ${saldo.toFixed(2)}.` : 'Factura saldada por completo.');
      onSaved();
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('No se pudo registrar el abono.');
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={`Abonar a ${factura.correlativo || `#${factura.id}`}`}
      icon={<HandCoins size={20} />}
      size="sm"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={guardar}>Registrar Abono</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-slate-50 border rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Saldo Pendiente</p>
          <p className="text-2xl font-black text-slate-900">{factura.moneda_codigo} {saldoPendiente.toFixed(2)}</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método de Pago</label>
          <select
            value={metodoPagoId}
            onChange={e => setMetodoPagoId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="">Selecciona...</option>
            {metodosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto del Abono</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max={saldoPendiente}
            value={monto}
            onChange={e => setMonto(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">N° de Referencia (opcional)</label>
          <input
            type="text"
            value={referencia}
            onChange={e => setReferencia(e.target.value)}
            placeholder="Ej. 000123456789"
            className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
          />
        </div>

        {montoNum > 0 && (
          <div className={`rounded-xl px-3 py-2 text-xs font-bold flex justify-between ${
            restanteTrasAbono > 0.01 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            <span>{restanteTrasAbono > 0.01 ? 'Quedará pendiente' : 'Factura quedará saldada'}</span>
            {restanteTrasAbono > 0.01 && <span>{factura.moneda_codigo} {restanteTrasAbono.toFixed(2)}</span>}
          </div>
        )}
      </div>
    </AppModal>
  );
}
