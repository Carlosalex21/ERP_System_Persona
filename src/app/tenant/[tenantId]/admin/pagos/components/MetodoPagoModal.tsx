"use client";

import { useState, type ReactElement } from 'react';
import { X, Loader2 } from 'lucide-react';
import { MetodoPagoRequest } from '@/types/api';

interface MetodoPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MetodoPagoRequest) => Promise<void>;
}

/**
 * Modal para crear o editar un método de pago.
 * @param {MetodoPagoModalProps} props - Propiedades para controlar el modal.
 * @returns {ReactElement | null} El componente del modal.
 */
export default function MetodoPagoModal({ isOpen, onClose, onSave }: MetodoPagoModalProps): ReactElement | null {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<MetodoPagoRequest>({
    nombre: '',
    nro_cuenta: null,
    telefono: null,
    tipo_metodo: null,
    activo: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value || null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-scale-in">
        <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
          <h3 className="font-bold">Añadir Método de Pago</h3>
          <button onClick={onClose} className="hover:text-slate-300"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Método</label>
            <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Ej: Efectivo, Zelle, Tarjeta" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
            <input type="text" name="tipo_metodo" value={formData.tipo_metodo || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Ej: Efectivo, Electrónico" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nro. de Cuenta / Email</label>
            <input type="text" name="nro_cuenta" value={formData.nro_cuenta || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Opcional" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
            <input type="text" name="telefono" value={formData.telefono || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Opcional" />
          </div>
          <div className="mt-6 pt-4 border-t flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 bg-slate-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={loading} className="px-6 py-2 text-sm font-bold text-white bg-primary-600 rounded-lg flex items-center gap-2 disabled:bg-slate-300">
              {loading && <Loader2 size={16} className="animate-spin" />}
              Guardar Método
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}