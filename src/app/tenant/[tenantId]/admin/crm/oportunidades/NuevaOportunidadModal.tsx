"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { Target, UserPlus } from 'lucide-react';
import { AppModal, ActionButton } from '@/components/ui';
import { crearOportunidad } from '@/services/crmService';
import { getClientes } from '@/services/clientesService';
import { useNotify } from '@/hooks/useNotify';
import { toastApiError } from '@/utils/errors';
import ClientModal from '../../pos/components/ClientModal';
import type { Cliente } from '@/types/api';

interface NuevaOportunidadModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function NuevaOportunidadModal({ onClose, onCreated }: NuevaOportunidadModalProps): ReactElement {
  const notify = useNotify();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [nombreProspecto, setNombreProspecto] = useState('');
  const [telefonoProspecto, setTelefonoProspecto] = useState('');
  const [valorEstimado, setValorEstimado] = useState('');
  const [proximoSeguimiento, setProximoSeguimiento] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getClientes().then(setClientes).catch(() => setClientes([]));
  }, []);

  const guardar = async (): Promise<void> => {
    if (!titulo.trim()) { notify.error('Ingresa un título para la oportunidad.'); return; }
    if (!clienteId && !nombreProspecto.trim()) { notify.error('Selecciona un cliente o ingresa al menos el nombre del prospecto.'); return; }
    setGuardando(true);
    try {
      await crearOportunidad({
        titulo: titulo.trim(),
        cliente: clienteId ? Number(clienteId) : null,
        nombre_prospecto: nombreProspecto.trim(),
        telefono_prospecto: telefonoProspecto.trim(),
        valor_estimado: valorEstimado.trim() || null,
        proximo_seguimiento: proximoSeguimiento || null,
        observaciones: observaciones.trim(),
      });
      notify.success('Oportunidad creada.');
      onCreated();
    } catch (error) {
      toastApiError(error, 'No se pudo crear la oportunidad.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Nueva Oportunidad"
      icon={<Target size={20} />}
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
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Venta de 50 sillas para evento" className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente (opcional si es un prospecto nuevo)</label>
          <div className="flex gap-2">
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="flex-1 min-w-0 px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Es un prospecto sin registrar...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <button type="button" onClick={() => setModalNuevoCliente(true)} title="Crear cliente nuevo" className="shrink-0 px-3 py-2 border rounded-lg text-sm font-bold text-primary-600 border-primary-200 bg-primary-50 hover:bg-primary-100 flex items-center gap-1.5">
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

        {!clienteId && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del prospecto</label>
              <input value={nombreProspecto} onChange={(e) => setNombreProspecto(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
              <input value={telefonoProspecto} onChange={(e) => setTelefonoProspecto(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor estimado (opcional)</label>
            <input type="number" min={0} value={valorEstimado} onChange={(e) => setValorEstimado(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Próximo seguimiento</label>
            <input type="date" value={proximoSeguimiento} onChange={(e) => setProximoSeguimiento(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observaciones (opcional)</label>
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
      </div>
    </AppModal>
  );
}
