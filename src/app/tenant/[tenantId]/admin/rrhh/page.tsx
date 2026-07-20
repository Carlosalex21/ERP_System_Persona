"use client";

import { useState, useEffect, use, type ReactElement } from 'react';
import { Plus, Users, Edit, Trash2, Loader2, UserX, UserCheck } from 'lucide-react';
import { getManagedUsers, getSucursales } from '@/services/rrhhService';
import { UserManaged, Rol, Sucursal } from '@/types/api';
import { getNombreById } from '@/utils/helpers';
import UserModal from './components/UserModal';

// Roles predefinidos ya que no hay un endpoint para obtenerlos.
const ROLES_PREDEFINIDOS: Rol[] = [
  { id: 1, nombre: 'Administrador' },
  { id: 2, nombre: 'Vendedor' },
  { id: 3, nombre: 'Almacenista' },
];

/**
 * Página de Recursos Humanos (RRHH).
 * Actualmente es un placeholder.
 * @returns {ReactElement} El componente de la página de RRHH.
 */
export default function RrhhPage({ params }: { params: Promise<{ tenantId: string }> }): ReactElement {
  const { tenantId } = use(params);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserManaged[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, sucursalesData] = await Promise.all([
        getManagedUsers(),
        getSucursales(),
      ]);
      setUsers(usersData);
      setSucursales(sucursalesData);
    } catch (error) {
      console.error("Error al cargar datos de RRHH:", error);
      alert("No se pudieron cargar los datos de empleados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveUser = async () => {
    setIsModalOpen(false);
    await fetchData(); // Recargar datos después de guardar
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center text-slate-500">
        <Loader2 size={32} className="animate-spin mr-3" />
        Cargando gestión de empleados...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Empleados</h1>
          <p className="text-xs text-slate-500 mt-0.5">Invita, asigna roles y gestiona el acceso de tu equipo.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
        >
          <Plus size={18} /> Invitar Empleado
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-4 pl-6">Nombre</th>
              <th className="p-4">Rol</th>
              <th className="p-4">Sucursal</th>
              <th className="p-4 text-center">Estado</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 pl-6">
                  <span className="font-bold text-slate-900 block">{user.first_name} {user.last_name}</span>
                  <span className="text-xs text-slate-500">{user.email}</span>
                </td>
                <td className="p-4 text-xs font-medium text-slate-600">{getNombreById(ROLES_PREDEFINIDOS, user.rol)}</td>
                <td className="p-4 text-xs font-medium text-slate-600">{getNombreById(sucursales, user.sucursal) || 'Todas'}</td>
                <td className="p-4 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-xs border ${
                    user.is_active
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-red-50 text-red-600 border-red-200'
                  }`}>
                    {user.is_active ? <UserCheck size={12} /> : <UserX size={12} />}
                    {user.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="p-2 text-slate-400 hover:text-primary-600 transition-colors"><Edit size={16} /></button>
                  <button className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400 text-sm">
                  No has invitado a ningún empleado todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <UserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveUser}
          roles={ROLES_PREDEFINIDOS}
          sucursales={sucursales}
        />
      )}
      </div>
  );
}
