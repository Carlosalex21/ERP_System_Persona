"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Edit, Trash2, UserX, UserCheck, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getManagedUsers, getSucursales, getRoles, getDepartamentos, updateManagedUser } from '@/services/rrhhService';
import { UserManaged, Rol, Sucursal, Departamento } from '@/types/api';
import { getNombreById } from '@/utils/helpers';
import { DataTable, PageHeader, Card, TableSkeleton, ConfirmDialog } from '@/components/ui';
import UserModal from './components/UserModal';

/**
 * Página de Recursos Humanos (RRHH): gestión de empleados del tenant.
 */
export default function RrhhPage(): ReactElement {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserManaged[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editandoUsuario, setEditandoUsuario] = useState<UserManaged | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Antes: roles hardcodeados a 3 IDs fijos. Ahora se consultan los
      // roles reales del tenant (ver apps.usuarios.api.views_roles).
      const [usersRes, sucursalesRes, rolesRes, departamentosRes] = await Promise.allSettled([
        getManagedUsers(),
        getSucursales(),
        getRoles(),
        getDepartamentos(),
      ]);
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value);
      if (sucursalesRes.status === 'fulfilled') setSucursales(sucursalesRes.value);
      if (rolesRes.status === 'fulfilled') setRoles(rolesRes.value);
      if (departamentosRes.status === 'fulfilled') setDepartamentos(departamentosRes.value);
      const fallos = [usersRes, sucursalesRes, rolesRes, departamentosRes].filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );
      if (fallos.length > 0) {
        console.error("Error al cargar datos de RRHH:", fallos.map((f) => f.reason));
        toast.error('Algunos datos no se pudieron cargar. Intenta actualizar la página.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveUser = async () => {
    setIsModalOpen(false);
    setEditandoUsuario(null);
    await fetchData();
  };

  const abrirEdicion = (usuario: UserManaged): void => {
    setEditandoUsuario(usuario);
    setIsModalOpen(true);
  };

  // No se borra al empleado de verdad: su usuario queda referenciado en
  // ventas/facturas pasadas (vendedor, quién la registró) y borrarlo de
  // verdad dejaría esos registros históricos sin esa atribución. Se
  // desactiva en su lugar -- ya no puede iniciar sesión, pero su historial
  // se mantiene intacto.
  const [usuarioADesactivar, setUsuarioADesactivar] = useState<UserManaged | null>(null);
  const [desactivando, setDesactivando] = useState(false);

  const confirmarDesactivarUsuario = async (): Promise<void> => {
    if (!usuarioADesactivar) return;
    setDesactivando(true);
    try {
      await updateManagedUser(usuarioADesactivar.id, { is_active: false });
      toast.success('Empleado desactivado.');
      setUsuarioADesactivar(null);
      await fetchData();
    } catch {
      toast.error('No se pudo desactivar al empleado.');
    } finally {
      setDesactivando(false);
    }
  };

  const columns = useMemo<ColumnDef<UserManaged>[]>(() => [
    {
      id: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.original.first_name} {row.original.last_name}</span>
          <span className="text-xs text-slate-500">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: 'rol',
      header: 'Rol',
      enableSorting: false,
      cell: ({ row }) => <span className="text-xs font-medium text-slate-600">{getNombreById(roles, row.original.rol)}</span>,
    },
    {
      accessorKey: 'sucursal',
      header: 'Sucursal',
      enableSorting: false,
      cell: ({ row }) => <span className="text-xs font-medium text-slate-600">{getNombreById(sucursales, row.original.sucursal) || 'Todas'}</span>,
    },
    {
      accessorKey: 'departamento',
      header: 'Departamento',
      enableSorting: false,
      cell: ({ row }) => <span className="text-xs font-medium text-slate-600">{getNombreById(departamentos, row.original.departamento) || '—'}</span>,
    },
    {
      accessorKey: 'is_active',
      header: () => <div className="text-center">Estado</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-xs border ${
            row.original.is_active
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-600 border-red-200'
          }`}>
            {row.original.is_active ? <UserCheck size={12} /> : <UserX size={12} />}
            {row.original.is_active ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      ),
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => abrirEdicion(row.original)}
            className="p-2 text-slate-400 hover:text-primary-600 transition-colors"
            aria-label="Editar empleado"
          >
            <Edit size={16} />
          </button>
          {row.original.is_active && (
            <button
              onClick={() => setUsuarioADesactivar(row.original)}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              aria-label="Desactivar empleado"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [roles, sucursales, departamentos]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Users size={20} />}
        title="Gestión de Empleados"
        description="Invita, asigna roles y gestiona el acceso de tu equipo."
        actions={
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { setEditandoUsuario(null); setIsModalOpen(true); }}
            className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
          >
            <Plus size={18} /> Invitar Empleado
          </motion.button>
        }
      />

      {loading ? (
        <TableSkeleton rows={5} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable
            columns={columns}
            data={users}
            resultLabel="empleados"
            emptyState={<div className="p-8 text-center text-slate-400 text-sm">No has invitado a ningún empleado todavía.</div>}
          />
        </Card>
      )}

      {isModalOpen && (
        <UserModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditandoUsuario(null); }}
          onSave={handleSaveUser}
          roles={roles}
          sucursales={sucursales}
          departamentos={departamentos}
          usuario={editandoUsuario}
        />
      )}

      <ConfirmDialog
        isOpen={!!usuarioADesactivar}
        title="Desactivar Empleado"
        message={`¿Desactivar a ${usuarioADesactivar?.first_name} ${usuarioADesactivar?.last_name}? Ya no podrá iniciar sesión.`}
        confirmLabel="Desactivar"
        loading={desactivando}
        onConfirm={confirmarDesactivarUsuario}
        onCancel={() => setUsuarioADesactivar(null)}
      />
    </div>
  );
}
