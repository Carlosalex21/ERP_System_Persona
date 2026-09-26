"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { LifeBuoy, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppModal, ActionButton } from '@/components/ui';
import { crearReclamo } from '@/services/postventaService';
import { getClientes } from '@/services/clientesService';
import ClientModal from '../../pos/components/ClientModal';
import type { Cliente, PrioridadReclamoPostventa } from '@/types/api';

interface NuevoReclamoModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function NuevoReclamoModal({ onClose, onCreated }: NuevoReclamoModalProps): ReactElement {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [nombreContactoLibre, setNombreContactoLibre] = useState('');
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [prioridad, setPrioridad] = useState<PrioridadReclamoPostventa>('media');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getClientes().then(setClientes).catch(() => setClientes([]));
  }, []);

  const guardar = async (): Promise<void> => {
    if (!titulo.trim()) { toast.error('Ingresa un título para el reclamo.'); return; }
    if (!clienteId && !nombreContactoLibre.trim()) { toast.error('Selecciona un cliente o ingresa al menos un nombre de contacto.'); return; }
    setGuardando(true);
    try {
      await crearReclamo({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        cliente: clienteId ? Number(clienteId) : null,
        nombre_contacto_libre: nombreContactoLibre.trim(),
        telefono_contacto: telefonoContacto.trim(),
        prioridad,
      });
      toast.success('Reclamo registrado.');
      onCreated();
    } catch {
      toast.error('No se pudo registrar el reclamo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Nuevo Reclamo"
      icon={<LifeBuoy size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={guardar}>Registrar</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Producto llegó dañado" className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente (opcional si es un contacto sin registrar)</label>
          <div className="flex gap-2">
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="flex-1 min-w-0 px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Sin registrar...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <button type="button" onClick={() => setModalNuevoCliente(true)} className="shrink-0 px-3 py-2 border rounded-lg text-sm font-bold text-primary-600 border-primary-200 bg-primary-50 hover:bg-primary-100 flex items-center gap-1.5">
              <UserPlus size={16} /> Nuevo
            </button>
          </div>
        </div>

        {modalNuevoCliente && (
          <ClientModal isOpen onClose={() => setModalNuevoCliente(false)} onClientCreated={(nuevo) => { setClientes((prev) => [...prev, nuevo]); setClienteId(String(nuevo.id)); setModalNuevoCliente(false); }} />
        )}

        {!clienteId && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de contacto</label>
              <input value={nombreContactoLibre} onChange={(e) => setNombreContactoLibre(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
              <input value={telefonoContacto} onChange={(e) => setTelefonoContacto(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prioridad</label>
          <select value={prioridad} onChange={(e) => setPrioridad(e.target.value as PrioridadReclamoPostventa)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
      </div>
    </AppModal>
  );
}
