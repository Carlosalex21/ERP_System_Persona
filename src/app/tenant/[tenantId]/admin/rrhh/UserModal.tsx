"use client";

import { useState, type ReactElement } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Rol, Sucursal, UserManagedRequest } from '@/types/api';
import { createManagedUser } from '@/services/rrhhService';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  roles: Rol[];
  sucursales: Sucursal[];
}

export default function UserModal({ isOpen, onClose, onSave, roles, sucursales }: UserModalProps): ReactElement | null {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<UserManagedRequest>>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    rol: undefined,
    sucursal: undefined,
    is_active: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: UserManagedRequest = {
      first_name: formData.first_name || '',
      last_name: formData.last_name || '',
      email: formData.email || '',
      password: formData.password,
      rol: formData.rol ? Number(formData.rol) : null,
      sucursal: formData.sucursal ? Number(formData.sucursal) : null,
      is_active: formData.is_active || false,
    };

    try {
      await createManagedUser(payload);
      onSave();
    } catch (err: any) {
      console.error("Error al crear usuario:", err);
      setError(err.response?.data?.email?.[0] || "Ocurrió un error al invitar al empleado.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-scale-in">
        <div className="bg-primary-900 p-4 text-white flex justify-between items-center">
          <h3 className="font-bold">Invitar Nuevo Empleado</h3>
          <button onClick={onClose} className="hover:text-primary-200"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
              <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Apellido</label>
              <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Correo Electrónico</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contraseña Temporal</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rol</label>
              <select name="rol" value={formData.rol || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm bg-white" required>
                <option value="">Selecciona un rol...</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sucursal</label>
              <select name="sucursal" value={formData.sucursal || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                <option value="">Todas las sucursales</option>
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <label className="text-sm font-medium text-slate-700">Usuario activo (puede iniciar sesión)</label>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-md">{error}</p>}

          <div className="mt-6 pt-4 border-t flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 bg-slate-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-bold text-white bg-primary-600 rounded-lg flex items-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Invitando...' : 'Invitar Empleado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}