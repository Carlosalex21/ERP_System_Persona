"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { Wrench, UserPlus } from 'lucide-react';
import { AppModal, ActionButton } from '@/components/ui';
import { createOrdenServicio } from '@/services/serviciosService';
import { getClientes } from '@/services/clientesService';
import { useNotify } from '@/hooks/useNotify';
import ClientModal from '../../../pos/components/ClientModal';
import type { Cliente } from '@/types/api';

interface NuevaOrdenModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function NuevaOrdenModal({ onClose, onCreated }: NuevaOrdenModalProps): ReactElement {
  const notify = useNotify();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [equipo, setEquipo] = useState('');
  const [descripcionFalla, setDescripcionFalla] = useState('');
  const [costoEstimado, setCostoEstimado] = useState('');
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState('');
  const [guardando, setGuardando] = useState(false);
  // El 99% de los clientes de un taller son nuevos -- forzar a salir del
  // modal a crearlo en el módulo de Clientes era tedioso, así que se puede
  // crear sin salir de aquí (mismo modal que ya usa el POS).
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false);

  useEffect(() => {
    getClientes().then(setClientes).catch(() => setClientes([]));
  }, []);

  const guardar = async (): Promise<void> => {
    if (!clienteId || !equipo.trim()) {
      notify.error('Selecciona el cliente y describe el equipo.');
      return;
    }
    setGuardando(true);
    try {
      await createOrdenServicio({
        cliente: Number(clienteId),
        equipo: equipo.trim(),
        descripcion_falla: descripcionFalla || undefined,
        costo_estimado: costoEstimado ? Number(costoEstimado) : null,
        fecha_entrega_estimada: fechaEntregaEstimada || null,
      });
      notify.success('Orden de servicio creada.');
      onCreated();
    } catch {
      notify.error('No se pudo crear la orden.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Nueva Orden de Servicio"
      icon={<Wrench size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={guardar}>Crear</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
          <div className="flex gap-2">
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="flex-1 min-w-0 px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Selecciona un cliente...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setModalNuevoCliente(true)}
              title="Crear cliente nuevo"
              className="shrink-0 px-3 py-2 border rounded-lg text-sm font-bold text-primary-600 border-primary-200 bg-primary-50 hover:bg-primary-100 flex items-center gap-1.5"
            >
              <UserPlus size={16} /> Nuevo
            </button>
          </div>
        </div>

        {modalNuevoCliente && (
          <ClientModal
            isOpen
            onClose={() => setModalNuevoCliente(false)}
            onClientCreated={(nuevo) => {
              setClientes((prev) => [...prev, nuevo]);
              setClienteId(String(nuevo.id));
              setModalNuevoCliente(false);
            }}
          />
        )}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Equipo / Artículo</label>
          <input type="text" value={equipo} onChange={(e) => setEquipo(e.target.value)} placeholder="Laptop HP Pavilion, Nevera Whirlpool..." className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción de la falla (opcional)</label>
          <textarea value={descripcionFalla} onChange={(e) => setDescripcionFalla(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Costo Estimado (opcional)</label>
            <input type="number" min={0} value={costoEstimado} onChange={(e) => setCostoEstimado(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entrega Estimada (opcional)</label>
            <input type="date" value={fechaEntregaEstimada} onChange={(e) => setFechaEntregaEstimada(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
      </div>
    </AppModal>
  );
}
