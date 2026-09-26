"use client";

import { useState, type ReactElement } from 'react';
import { Building2 } from 'lucide-react';
import { AppModal, ActionButton } from '@/components/ui';
import { createDepartamento, updateDepartamento } from '@/services/rrhhService';
import { useNotify } from '@/hooks/useNotify';
import type { Departamento } from '@/types/api';

interface DepartamentoModalProps {
  departamento?: Departamento | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function DepartamentoModal({ departamento, onClose, onSaved }: DepartamentoModalProps): ReactElement {
  const notify = useNotify();
  const [nombre, setNombre] = useState(departamento?.nombre || '');
  const [descripcion, setDescripcion] = useState(departamento?.descripcion || '');
  const [guardando, setGuardando] = useState(false);
  const editando = !!departamento;

  const guardar = async (): Promise<void> => {
    if (!nombre.trim()) {
      notify.error('Ingresa un nombre para el departamento.');
      return;
    }
    setGuardando(true);
    try {
      const data = { nombre: nombre.trim(), descripcion: descripcion.trim() };
      if (editando) {
        await updateDepartamento(departamento.id, data);
        notify.success('Departamento actualizado.');
      } else {
        await createDepartamento(data);
        notify.success('Departamento creado.');
      }
      onSaved();
    } catch {
      notify.error('No se pudo guardar el departamento.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={editando ? 'Editar Departamento' : 'Nuevo Departamento'}
      icon={<Building2 size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={guardar}>{editando ? 'Guardar' : 'Crear'}</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Cocina, Barra, Almacén, Taller"
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción (opcional)</label>
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Estación de preparación de platos calientes"
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <p className="text-[11px] text-slate-400">
          Asigna empleados y productos a este departamento para que el trabajo (platos en cocina, pedidos por preparar, órdenes de servicio) se pueda seguir por equipo, no solo por una persona.
        </p>
      </div>
    </AppModal>
  );
}
