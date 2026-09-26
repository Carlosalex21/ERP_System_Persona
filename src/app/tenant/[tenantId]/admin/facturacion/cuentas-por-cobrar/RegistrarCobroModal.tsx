"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { HandCoins } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppModal, ActionButton } from '@/components/ui';
import { getMetodosDePago, registrarPago } from '@/services/facturacionService';
import { getApiErrorMessages } from '@/utils/helpers';
import type { FilaFacturaAging, MetodoPago } from '@/types/api';

interface RegistrarCobroModalProps {
  clienteNombre: string;
  factura: FilaFacturaAging;
  onClose: () => void;
  onCobrado: () => void;
}

/**
 * Cobro manual contra una factura a crédito ya emitida -- antes Cuentas por
 * Cobrar solo mostraba el saldo, sin ninguna forma de registrar que el
 * cliente pagó (ni completo ni parcial) fuera del momento de la venta en el
 * POS. Reutiliza el mismo endpoint que el POS (`registrarPago`), que ya
 * soporta abonos: si el monto no cubre el saldo, la factura sigue pendiente
 * con el resto, y se puede volver a cobrar después.
 */
export default function RegistrarCobroModal({ clienteNombre, factura, onClose, onCobrado }: RegistrarCobroModalProps): ReactElement {
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [metodoPagoId, setMetodoPagoId] = useState('');
  const [monto, setMonto] = useState(factura.saldo_pendiente);
  const [referencia, setReferencia] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getMetodosDePago().then((data) => {
      setMetodos(data);
      if (data.length > 0) setMetodoPagoId(String(data[0].id));
    }).catch(() => setMetodos([]));
  }, []);

  const saldo = parseFloat(factura.saldo_pendiente);

  const guardar = async (): Promise<void> => {
    const montoNum = Number(monto);
    if (!metodoPagoId) {
      toast.error('Selecciona el método de pago.');
      return;
    }
    if (!montoNum || montoNum <= 0) {
      toast.error('Ingresa un monto válido.');
      return;
    }
    if (montoNum > saldo + 0.01) {
      toast.error(`El cobro no puede superar el saldo pendiente (${factura.moneda_simbolo || ''}${saldo.toFixed(2)}).`);
      return;
    }
    setGuardando(true);
    try {
      await registrarPago(factura.id, [{
        metodo_pago_id: Number(metodoPagoId),
        monto: monto,
        referencia: referencia.trim() || undefined,
      }]);
      toast.success(montoNum >= saldo - 0.01 ? 'Factura cobrada por completo.' : 'Abono registrado.');
      onCobrado();
    } catch (error) {
      const messages = getApiErrorMessages(error);
      messages.forEach((m) => toast.error(m));
      if (messages.length === 0) toast.error('No se pudo registrar el cobro.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Registrar cobro"
      icon={<HandCoins size={20} />}
      size="sm"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={guardar}>Registrar Cobro</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
          <p className="font-bold text-slate-800">{clienteNombre}</p>
          <p className="text-xs text-slate-500">{factura.correlativo || `Factura #${factura.id}`}</p>
          <p className="text-xs text-slate-500 mt-1">
            Saldo pendiente: <span className="font-bold text-slate-700">{factura.moneda_simbolo || ''}{saldo.toFixed(2)}</span>
          </p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto a cobrar</label>
          <input
            type="number" min={0.01} max={saldo} step="0.01"
            value={monto} onChange={(e) => setMonto(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="text-[11px] text-slate-400 mt-1">Puede ser parcial -- el resto queda pendiente para un próximo cobro.</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método de pago</label>
          <select value={metodoPagoId} onChange={(e) => setMetodoPagoId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
            <option value="">Selecciona...</option>
            {metodos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Referencia (opcional)</label>
          <input type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Nº de transferencia, recibo..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
        </div>
      </div>
    </AppModal>
  );
}
