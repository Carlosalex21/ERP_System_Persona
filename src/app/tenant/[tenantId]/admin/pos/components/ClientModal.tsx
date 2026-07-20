"use client";

import { useState, type ReactElement } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Cliente, ClienteRequest } from '@/types/api';
import { createCliente } from '@/services/clientesService';
import { useNotify } from '@/hooks/useNotify';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: (newClient: Cliente) => void;
}

/**
 * Modal para crear un nuevo cliente desde el POS.
 * @param {ClientModalProps} props - Propiedades para controlar el modal.
 * @returns {ReactElement | null} El componente del modal de cliente.
 */
export default function ClientModal({ isOpen, onClose, onClientCreated }: ClientModalProps): ReactElement | null {
  const notify = useNotify();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<ClienteRequest>>({
    nombre: '',
    documento: '',
    email: '',
    telefono: '',
    tipo_documento: '',
    direccion: '',
    activo: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newClient = await createCliente(formData as ClienteRequest);
      notify.success('Cliente creado con éxito');
      onClientCreated(newClient);
    } catch (error) {
      console.error("Error al crear cliente:", error);
      notify.error('No se pudo crear el cliente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-scale-in">
        <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
          <h3 className="font-bold">Crear Nuevo Cliente</h3>
          <button onClick={onClose} className="hover:text-slate-300"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
              <input type="text" name="nombre" value={formData.nombre || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div className="flex gap-2">
                <div className="w-1/4">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                    <input type="text" name="tipo_documento" placeholder="V" value={formData.tipo_documento || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div className="w-3/4">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Documento</label>
                    <input type="text" name="documento" value={formData.documento || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
              <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
              <input type="tel" name="telefono" value={formData.telefono || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección</label>
            <input type="text" name="direccion" value={formData.direccion || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="mt-6 pt-4 border-t flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 bg-slate-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={loading} className="px-6 py-2 text-sm font-bold text-white bg-primary-600 rounded-lg flex items-center gap-2 disabled:bg-slate-300">
              {loading && <Loader2 size={16} className="animate-spin" />}
              Guardar Cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}