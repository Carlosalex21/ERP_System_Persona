"use client";

import { useState, type ReactElement } from 'react';
import { HandCoins } from 'lucide-react';
import { AppModal, ActionButton } from '@/components/ui';
import { registrarPagoProveedor } from '@/services/proveedoresService';
import { useNotify } from '@/hooks/useNotify';
import type { CuentaPorPagar, MetodoPago } from '@/types/api';

interface RegistrarPagoModalProps {
  cuenta: CuentaPorPagar;
  metodosPago: MetodoPago[];
  onClose: () => void;
  onSaved: () => void;
}

export default function RegistrarPagoModal({ cuenta, metodosPago, onClose, onSaved }: RegistrarPagoModalProps): ReactElement {
  const notify = useNotify();
  const saldo = parseFloat(cuenta.saldo_pendiente);
  const [monto, setMonto] = useState(cuenta.saldo_pendiente);
  const [metodoPagoId, setMetodoPagoId] = useState('');
  const [referencia, setReferencia] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (): Promise<void> => {
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) {
      notify.error('Ingresa un monto válido.');
      return;
    }
    if (montoNum > saldo + 0.01) {
      notify.error(`El pago no puede superar el saldo pendiente ($${saldo.toFixed(2)}).`);
      return;
    }
    setGuardando(true);
    try {
      await registrarPagoProveedor(cuenta.id, {
        monto: montoNum,
        metodo_pago_id: metodoPagoId ? Number(metodoPagoId) : null,
        referencia: referencia.trim(),
      });
      notify.success('Pago registrado.');
      onSaved();
    } catch {
      notify.error('No se pudo registrar el pago.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Registrar Pago a Proveedor"
      icon={<HandCoins size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={guardar}>Registrar Pago</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
          <p className="font-bold text-slate-800">{cuenta.proveedor_nombre}</p>
          <p className="text-xs text-slate-500">{cuenta.numero_documento || 'Sin número de documento'}</p>
          <p className="text-xs text-slate-500 mt-1">Saldo pendiente: <span className="font-bold text-slate-700">${saldo.toFixed(2)}</span></p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto a pagar</label>
          <input
            type="number" min={0.01} max={saldo} step="0.01"
            value={monto} onChange={(e) => setMonto(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método de pago (opcional)</label>
          <select value={metodoPagoId} onChange={(e) => setMetodoPagoId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">Sin especificar</option>
            {metodosPago.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Referencia (opcional)</label>
          <input type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Nº de transferencia, cheque..." className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
      </div>
    </AppModal>
  );
}
