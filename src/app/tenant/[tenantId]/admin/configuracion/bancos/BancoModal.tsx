"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { Landmark } from 'lucide-react';
import type { Banco, BancoRequest } from '@/types/api';
import { AppModal, ActionButton } from '@/components/ui';

interface BancoModalProps {
  banco?: Banco | null;
  onClose: () => void;
  onSave: (data: BancoRequest, id?: number) => Promise<void>;
  cargando: boolean;
}

export default function BancoModal({ banco, onClose, onSave, cargando }: BancoModalProps): ReactElement {
  const [nombre, setNombre] = useState('');
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    setNombre(banco?.nombre || '');
    setActivo(banco?.activo ?? true);
  }, [banco]);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    await onSave({ nombre, activo }, banco?.id);
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={banco ? 'Editar Banco' : 'Nuevo Banco'}
      icon={<Landmark size={20} />}
      size="sm"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton type="submit" loading={cargando} onClick={submit}>
            {banco ? 'Guardar Cambios' : 'Crear Banco'}
          </ActionButton>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej. Banesco, Mercantil, Banco de Venezuela..."
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-600 focus:bg-white"
            required
          />
        </div>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={activo}
            onChange={e => setActivo(e.target.checked)}
            className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm font-semibold text-slate-700">Banco activo (disponible para asignar a métodos de pago)</span>
        </label>
      </form>
    </AppModal>
  );
}
