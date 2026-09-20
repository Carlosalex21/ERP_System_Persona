"use client";

import { useState, type ReactElement } from 'react';
import { Copy } from 'lucide-react';
import { AppModal, ActionButton } from '@/components/ui';
import { guardarAsientoComoPlantilla, type AsientoContable } from '@/services/contabilidadService';
import { useNotify } from '@/hooks/useNotify';

interface GuardarPlantillaModalProps {
  asiento: AsientoContable;
  onClose: () => void;
  onGuardada: () => void;
}

export default function GuardarPlantillaModal({ asiento, onClose, onGuardada }: GuardarPlantillaModalProps): ReactElement {
  const notify = useNotify();
  const [nombre, setNombre] = useState(asiento.descripcion);
  const [guardando, setGuardando] = useState(false);

  const guardar = async (): Promise<void> => {
    if (!nombre.trim()) {
      notify.error('Ponle un nombre a la plantilla.');
      return;
    }
    setGuardando(true);
    try {
      await guardarAsientoComoPlantilla(asiento.id, nombre.trim());
      notify.success('Plantilla guardada -- ya está disponible al crear un nuevo asiento.');
      onGuardada();
    } catch {
      notify.error('No se pudo guardar la plantilla.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Guardar como Plantilla"
      icon={<Copy size={20} />}
      size="sm"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={guardar}>Guardar</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Guarda la estructura de cuentas y montos del asiento #{asiento.numero} para reutilizarla (ej. alquiler mensual, nómina quincenal).
        </p>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de la plantilla</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Alquiler mensual" className="w-full px-3 py-2 border rounded-lg text-sm" autoFocus />
        </div>
      </div>
    </AppModal>
  );
}
