"use client";

import { useState, type ReactElement } from 'react';
import { LayoutGrid } from 'lucide-react';
import { AppModal, ActionButton } from '@/components/ui';
import { createMesa, updateMesa, type Mesa } from '@/services/restaurantesService';
import { useNotify } from '@/hooks/useNotify';

interface NuevaMesaModalProps {
  /** Si se pasa, el modal edita esta mesa en vez de crear una nueva. */
  mesa?: Mesa;
  onClose: () => void;
  onCreated: () => void;
}

export default function NuevaMesaModal({ mesa, onClose, onCreated }: NuevaMesaModalProps): ReactElement {
  const notify = useNotify();
  const [numero, setNumero] = useState(mesa?.numero || '');
  const [capacidad, setCapacidad] = useState(mesa?.capacidad ? String(mesa.capacidad) : '');
  const [guardando, setGuardando] = useState(false);
  const esEdicion = !!mesa;

  const guardar = async (): Promise<void> => {
    if (!numero.trim()) {
      notify.error('Ponle un número o nombre a la mesa.');
      return;
    }
    setGuardando(true);
    try {
      if (esEdicion) {
        await updateMesa(mesa.id, { numero: numero.trim(), capacidad: capacidad ? Number(capacidad) : null });
        notify.success('Mesa actualizada.');
      } else {
        await createMesa({ numero: numero.trim(), capacidad: capacidad ? Number(capacidad) : null });
        notify.success('Mesa creada.');
      }
      onCreated();
    } catch {
      notify.error(esEdicion ? 'No se pudo actualizar la mesa.' : 'No se pudo crear la mesa (¿ya existe una con ese número?).');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={esEdicion ? 'Editar Mesa' : 'Nueva Mesa'}
      icon={<LayoutGrid size={20} />}
      size="sm"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={guardar}>{esEdicion ? 'Guardar' : 'Crear'}</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número / Nombre</label>
          <input
            type="text"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="Mesa 7, Barra 2, Terraza 1..."
            className="w-full px-3 py-2 border rounded-lg text-sm"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Capacidad (opcional)</label>
          <input
            type="number"
            min={1}
            value={capacidad}
            onChange={(e) => setCapacidad(e.target.value)}
            placeholder="4"
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>
    </AppModal>
  );
}
