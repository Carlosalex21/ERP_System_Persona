"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Truck, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getProveedores, deleteProveedor } from '@/services/proveedoresService';
import { getApiErrorMessages } from '@/utils/helpers';
import { Proveedor } from '@/types/api';
import { DataTable, PageHeader, Card, EmptyState, TableSkeleton } from '@/components/ui';
import ProveedorModal from './ProveedorModal';

export default function ProveedoresPage(): ReactElement {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Proveedor | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getProveedores();
      setProveedores(data);
    } catch (error) {
      console.error('Error cargando proveedores:', error);
      toast.error('No se pudieron cargar los proveedores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirNuevo = (): void => {
    setEditando(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (proveedor: Proveedor): void => {
    setEditando(proveedor);
    setModalAbierto(true);
  };

  const eliminar = async (proveedor: Proveedor): Promise<void> => {
    if (!confirm(`¿Eliminar el proveedor "${proveedor.nombre}"?`)) return;
    try {
      await deleteProveedor(proveedor.id);
      toast.success('Proveedor eliminado.');
      await cargar();
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('No se pudo eliminar el proveedor.');
      }
    }
  };

  const columns = useMemo<ColumnDef<Proveedor>[]>(() => [
    {
      accessorKey: 'nombre',
      header: 'Proveedor',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <Truck size={16} />
          </span>
          <div>
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              {row.original.nombre}
              {row.original.es_contribuyente_especial && (
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200" title="Contribuyente Especial (SENIAT)">
                  C.E.
                </span>
              )}
            </span>
            <span className="text-xs text-slate-500 font-mono">{row.original.identificador_fiscal}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Contacto',
      enableSorting: false,
      cell: ({ row }) => (
        <div>
          <span className="text-xs text-slate-600 block">{row.original.email}</span>
          <span className="text-xs text-slate-400">{row.original.telefono || 'Sin teléfono'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'plazo_pago',
      header: () => <div className="text-center">Plazo de Pago</div>,
      cell: ({ row }) => (
        <div className="text-center text-xs font-medium text-slate-600">
          {row.original.plazo_pago != null ? `${row.original.plazo_pago} días` : '—'}
        </div>
      ),
    },
    {
      accessorKey: 'activo',
      header: () => <div className="text-center">Estado</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span
            className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${
              row.original.activo
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
          >
            {row.original.activo ? 'Activo' : 'Inactivo'}
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
            aria-label="Editar proveedor"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => eliminar(row.original)}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            aria-label="Eliminar proveedor"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ], [proveedores]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Truck size={20} />}
        title="Proveedores"
        description="Gestiona los proveedores de tu negocio y sus condiciones de pago."
        actions={
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={abrirNuevo}
            className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
          >
            <Plus size={18} /> Nuevo Proveedor
          </motion.button>
        }
      />

      {loading ? (
        <TableSkeleton rows={5} />
      ) : proveedores.length === 0 ? (
        <EmptyState
          icon={<Truck size={28} />}
          title="Aún no tienes proveedores"
          description="Registra tus proveedores para llevar el control de tus compras y cuentas por pagar."
          action={
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={abrirNuevo}
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 shadow-md"
            >
              <Plus size={18} /> Crear primer proveedor
            </motion.button>
          }
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable columns={columns} data={proveedores} resultLabel="proveedores" />
        </Card>
      )}

      {modalAbierto && (
        <ProveedorModal
          proveedor={editando}
          onClose={() => setModalAbierto(false)}
          onSaved={() => {
            setModalAbierto(false);
            cargar();
          }}
        />
      )}
    </div>
  );
}
