/**
 * @file Modal de confirmación reutilizable, sobre `AppModal` -- reemplaza al
 * `window.confirm()` nativo del navegador (feo, no se puede estilizar, y
 * bloquea el hilo principal) para acciones destructivas como "eliminar".
 */
"use client";

import type { ReactElement } from 'react';
import { AlertTriangle } from 'lucide-react';
import AppModal from './AppModal';
import { ActionButton } from './primitives';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** true = botón de confirmar en rojo (acción destructiva, ej. eliminar). */
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): ReactElement | null {
  if (!isOpen) return null;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      icon={<AlertTriangle size={20} />}
      size="sm"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onCancel}>{cancelLabel}</ActionButton>
          <ActionButton
            variant={danger ? 'danger' : 'primary'}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </ActionButton>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </AppModal>
  );
}
