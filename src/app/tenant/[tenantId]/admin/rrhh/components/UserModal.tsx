"use client";

import { useState, type ReactElement } from 'react';
import { UserPlus } from 'lucide-react';
import { Rol, Sucursal, UserManaged, UserManagedRequest } from '@/types/api';
import { createManagedUser, updateManagedUser } from '@/services/rrhhService';
import { AppModal, ActionButton } from '@/components/ui';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  roles: Rol[];
  sucursales: Sucursal[];
  /** Si viene un empleado, el modal edita ese registro en vez de invitar uno nuevo. */
  usuario?: UserManaged | null;
}

export default function UserModal({ isOpen, onClose, onSave, roles, sucursales, usuario = null }: UserModalProps): ReactElement {
  const editando = usuario !== null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<UserManagedRequest>>(() => usuario ? {
    first_name: usuario.first_name,
    last_name: usuario.last_name,
    email: usuario.email,
    password: '',
    rol: usuario.rol ?? undefined,
    sucursal: usuario.sucursal ?? undefined,
    is_active: usuario.is_active,
  } : {
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

  // Acepta tanto el submit nativo del <form> (Enter en un input) como el
  // click del botón "Invitar Empleado" del footer -- ese botón vive FUERA
  // del <form> (AppModal renderiza el footer aparte, ver `AppModal.tsx`),
  // así que un simple `type="submit"` no lo dispararía solo.
  const handleSubmit = async (e?: { preventDefault: () => void }) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);

    // Validación del lado del cliente más robusta
    if (!formData.rol) {
      setError("Debe seleccionar un rol para el empleado.");
      setLoading(false);
      return;
    }

    // La contraseña solo es obligatoria al invitar (crear); al editar, se
    // deja en blanco para no tocar la existente.
    if (!editando && (!formData.password || formData.password.trim() === '')) {
      setError("La contraseña temporal es obligatoria.");
      setLoading(false);
      return;
    }

    try {
      if (editando && usuario) {
        const payload: Partial<UserManagedRequest> = {
          first_name: formData.first_name || '',
          last_name: formData.last_name || '',
          email: formData.email || '',
          rol: formData.rol ? Number(formData.rol) : null,
          sucursal: formData.sucursal ? Number(formData.sucursal) : null,
          is_active: formData.is_active || false,
        };
        if (formData.password && formData.password.trim() !== '') {
          payload.password = formData.password;
        }
        await updateManagedUser(usuario.id, payload);
      } else {
        const payload: UserManagedRequest = {
          first_name: formData.first_name || '',
          last_name: formData.last_name || '',
          email: formData.email || '',
          password: formData.password || '',
          rol: formData.rol ? Number(formData.rol) : null,
          sucursal: formData.sucursal ? Number(formData.sucursal) : null,
          is_active: formData.is_active || false,
        };
        await createManagedUser(payload);
      }
      onSave();
    } catch (err: any) {
      console.error("Error al guardar usuario:", err);
      let errorMessage = editando ? "Ocurrió un error al actualizar el empleado." : "Ocurrió un error al invitar al empleado.";
      if (err.response?.data) {
        // Intenta encontrar el primer mensaje de error del backend, sea cual sea el campo.
        const fieldErrors = Object.values(err.response.data).flat();
        if (fieldErrors.length > 0 && typeof fieldErrors[0] === 'string') {
          errorMessage = fieldErrors[0];
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={editando ? 'Editar Empleado' : 'Invitar Nuevo Empleado'}
      icon={<UserPlus size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton type="submit" loading={loading} onClick={handleSubmit}>
            {editando ? 'Guardar Cambios' : 'Invitar Empleado'}
          </ActionButton>
        </>
      }
    >
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              {editando ? 'Nueva Contraseña (opcional)' : 'Contraseña Temporal'}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder={editando ? 'Déjalo en blanco para no cambiarla' : undefined}
              required={!editando}
            />
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
        </form>
    </AppModal>
  );
}
