"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { Warehouse, Save } from 'lucide-react';
import type { Almacen, AlmacenRequest } from '@/types/api';
import { AppModal, ActionButton } from '@/components/ui';

interface AlmacenModalProps {
  almacen?: Almacen | null;
  onClose: () => void;
  onSave: (data: AlmacenRequest, id?: number) => Promise<void>;
  cargando: boolean;
}

export default function AlmacenModal({
  almacen,
  onClose,
  onSave,
  cargando,
}: AlmacenModalProps): ReactElement {
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    if (almacen) {
      setNombre(almacen.nombre);
      setDireccion(almacen.direccion || '');
      setTelefono(almacen.telefono || '');
      setActivo(almacen.activo);
    } else {
      setNombre('');
      setDireccion('');
      setTelefono('');
      setActivo(true);
    }
  }, [almacen]);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const payload: AlmacenRequest = {
      nombre,
      direccion,
      telefono: telefono || null,
      activo,
    };
    await onSave(payload, almacen?.id);
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={almacen ? 'Editar Almacén' : 'Nuevo Almacén'}
      icon={<Warehouse size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton type="submit" loading={cargando} onClick={submit}>
            {almacen ? 'Guardar Cambios' : 'Crear Almacén'}
          </ActionButton>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Almacén</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej. Almacén Principal, Sucursal Centro..."
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-600 focus:bg-white"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección</label>
          <textarea
            value={direccion}
            onChange={e => setDireccion(e.target.value)}
            placeholder="Av. Principal, local Nº 1..."
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-600 focus:bg-white h-20 resize-none"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono (Opcional)</label>
          <input
            type="text"
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            placeholder="Ej. 0212-5551234"
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-600 focus:bg-white"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={activo}
            onChange={e => setActivo(e.target.checked)}
            className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm font-semibold text-slate-700">Almacén activo (visible para el POS)</span>
        </label>
      </form>
    </AppModal>
  );
}
