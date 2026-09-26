"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { UserRound } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppModal, ActionButton } from '@/components/ui';
import { createCliente, updateCliente, getTiposDocumento } from '@/services/clientesService';
import { getApiErrorMessages } from '@/utils/helpers';
import type { Cliente, ClienteRequest, TipoDocumentoOpcion } from '@/types/api';

interface ClienteFormModalProps {
  /** Si se pasa, edita ese cliente; si no, crea uno nuevo. */
  cliente?: Cliente | null;
  onClose: () => void;
  onSaved: (cliente: Cliente) => void;
}

const FORM_VACIO: ClienteRequest = {
  nombre: '', tipo_documento: '', documento: '', email: '', telefono: '', direccion: '',
  activo: true, contribuyente_especial: false, dias_credito: null,
};

/**
 * Formulario compartido de alta/edición de cliente -- usado tanto por el
 * módulo de Clientes (`admin/clientes`) como por el alta rápida desde el
 * POS, para no mantener dos copias de los mismos campos (y que ambos se
 * beneficien por igual del tipo de documento por país en vez de texto libre).
 */
export default function ClienteFormModal({ cliente, onClose, onSaved }: ClienteFormModalProps): ReactElement {
  const [form, setForm] = useState<ClienteRequest>(cliente ? { ...FORM_VACIO, ...cliente } : FORM_VACIO);
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumentoOpcion[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getTiposDocumento()
      .then((r) => setTiposDocumento(r.tipos_documento))
      .catch(() => setTiposDocumento([]));
  }, []);

  const guardar = async (): Promise<void> => {
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio.');
      return;
    }
    setGuardando(true);
    try {
      const payload: ClienteRequest = {
        ...form,
        dias_credito: form.dias_credito || null,
      };
      const guardado = cliente
        ? await updateCliente(cliente.id, payload)
        : await createCliente(payload);
      toast.success(cliente ? 'Cliente actualizado.' : 'Cliente creado.');
      onSaved(guardado);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      messages.forEach((m) => toast.error(m));
      if (messages.length === 0) toast.error('No se pudo guardar el cliente.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={cliente ? 'Editar cliente' : 'Nuevo cliente'}
      icon={<UserRound size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={guardar}>Guardar</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre completo</label>
          <input
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
            <select
              value={form.tipo_documento || ''}
              onChange={(e) => setForm((f) => ({ ...f, tipo_documento: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Sin especificar</option>
              {tiposDocumento.map((t) => <option key={t.value} value={t.value}>{t.value}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Documento</label>
            <input
              value={form.documento || ''}
              onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
            <input
              type="email"
              value={form.email || ''}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
            <input
              value={form.telefono || ''}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección</label>
          <input
            value={form.direccion || ''}
            onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Días de crédito</label>
            <input
              type="number" min={0} step="1"
              placeholder="Sin crédito"
              value={form.dias_credito ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, dias_credito: e.target.value ? Number(e.target.value) : null }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 pb-2">
            <input
              type="checkbox"
              checked={!!form.contribuyente_especial}
              onChange={(e) => setForm((f) => ({ ...f, contribuyente_especial: e.target.checked }))}
              className="rounded border-slate-300"
            />
            Contribuyente especial
          </label>
        </div>
      </div>
    </AppModal>
  );
}
