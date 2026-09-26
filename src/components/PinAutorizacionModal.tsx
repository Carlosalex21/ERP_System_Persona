"use client";

import { type ReactElement } from 'react';
import { ShieldCheck } from 'lucide-react';
import { AppModal, ActionButton } from '@/components/ui';
import type { PinAutorizacionModalProps } from '@/hooks/usePinAutorizacion';

/** Modal genérico que pide el PIN de autorización antes de dejar pasar una acción sensible (ver `usePinAutorizacion`). */
export default function PinAutorizacionModal({
  isOpen,
  pin,
  onPinChange,
  onConfirm,
  onCancel,
  verificando,
  error,
}: PinAutorizacionModalProps): ReactElement | null {
  if (!isOpen) return null;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onCancel}
      title="Autorización requerida"
      icon={<ShieldCheck size={20} />}
      size="sm"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onCancel}>Cancelar</ActionButton>
          <ActionButton
            loading={verificando}
            disabled={pin.length < 4}
            onClick={onConfirm}
          >
            Confirmar
          </ActionButton>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">Esta acción necesita el PIN de un encargado para continuar.</p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => onPinChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => { if (e.key === 'Enter' && pin.length >= 4) onConfirm(); }}
          placeholder="PIN"
          className="w-full text-center text-2xl tracking-[0.5em] font-bold px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none"
        />
        {error && <p className="text-xs font-semibold text-red-500 text-center">{error}</p>}
      </div>
    </AppModal>
  );
}
