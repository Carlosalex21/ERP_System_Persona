/**
 * @file Página de administración de métodos de pago del tenant.
 * CRUD completo con toasts y diseño Mobile-First.
 */
"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Wallet, CreditCard, Banknote, Landmark, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import MetodoPagoModal from './MetodoPagoModal';
import { DataTable, PageHeader, Card, EmptyState, TableSkeleton } from '@/components/ui';
import {
  getMetodosDePago,
  createMetodoPago,
  updateMetodoPago,
  deleteMetodoPago,
} from '@/services/facturacionService';
import type { MetodoPago, MetodoPagoRequest } from '@/types/api';

function iconoMetodo(tipo?: string | null): ReactElement {
  const t = (tipo || '').toLowerCase();
  if (t.includes('efectivo')) return <Banknote size={18} />;
  if (t.includes('móvil') || t.includes('movil')) return <Wallet size={18} />;
  if (t.includes('dólar') || t.includes('dolar')) return <DollarSign size={18} />;
  if (t.includes('zelle') || t.includes('transferencia')) return <Landmark size={18} />;
  return <CreditCard size={18} />;
}

export default function MetodosPagoPage(): ReactElement {
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<MetodoPago | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getMetodosDePago();
      setMetodos(data);
    } catch (error) {
      console.error('Error cargando métodos de pago:', error);
      toast.error('No se pudieron cargar los métodos de pago.');
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

  const abrirEdicion = (metodo: MetodoPago): void => {
    setEditando(metodo);
    setModalAbierto(true);
  };

  const guardar = async (data: MetodoPagoRequest, id?: number): Promise<void> => {
    setSaving(true);
    try {
      if (id) {
        await updateMetodoPago(id, data);
        toast.success('Método de pago actualizado correctamente.');
      } else {
        await createMetodoPago(data);
        toast.success('Método de pago creado correctamente.');
      }
      setModalAbierto(false);
      await cargar();
    } catch (error) {
      console.error('Error guardando método de pago:', error);
      toast.error('No se pudo guardar el método de pago. Revisa los datos.');
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (metodo: MetodoPago): Promise<void> => {
    if (!confirm(`¿Eliminar el método de pago "${metodo.nombre}"?`)) return;
    try {
      await deleteMetodoPago(metodo.id);
      toast.success('Método de pago eliminado.');
      await cargar();
    } catch (error) {
      console.error('Error eliminando método de pago:', error);
      toast.error('No se pudo eliminar el método de pago. Puede que tenga transacciones asociadas.');
    }
  };

  const columns = useMemo<ColumnDef<MetodoPago>[]>(() => [
    {
      accessorKey: 'nombre',
      header: 'Método',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            {iconoMetodo(row.original.tipo_metodo)}
          </span>
          <span className="font-bold text-slate-900">{row.original.nombre}</span>
        </div>
      ),
    },
    {
      accessorKey: 'tipo_metodo',
      header: 'Tipo',
      cell: ({ row }) => <span className="text-xs font-medium text-slate-600">{row.original.tipo_metodo || '—'}</span>,
    },
    {
      accessorKey: 'nro_cuenta',
      header: 'N° Cuenta',
      cell: ({ row }) => (
        <span className="text-xs text-slate-500 hidden md:table-cell">
          {row.original.nro_cuenta || <span className="text-slate-300">—</span>}
        </span>
      ),
    },
    {
      accessorKey: 'telefono',
      header: 'Teléfono',
      cell: ({ row }) => (
        <span className="text-xs text-slate-500 hidden md:table-cell">
          {row.original.telefono || <span className="text-slate-300">—</span>}
        </span>
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
            aria-label="Editar método de pago"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => eliminar(row.original)}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            aria-label="Eliminar método de pago"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ], [metodos]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Wallet size={20} />}
        title="Métodos de Pago"
        description="Configura cómo tus clientes y el POS aceptan pagos: efectivo, bolívares, dólares, pago móvil, etc."
        actions={
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={abrirNuevo}
            className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
          >
            <Plus size={18} /> Nuevo Método de Pago
          </motion.button>
        }
      />

      {loading ? (
        <TableSkeleton rows={5} />
      ) : metodos.length === 0 ? (
        <EmptyState
          icon={<Wallet size={28} />}
          title="Aún no tienes métodos de pago"
          description="Crea tu primer método de pago para habilitar el cobro en el POS."
          action={
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={abrirNuevo}
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 shadow-md"
            >
              <Plus size={18} /> Crear primer método de pago
            </motion.button>
          }
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable columns={columns} data={metodos} resultLabel="métodos de pago" />
        </Card>
      )}

      {modalAbierto && (
        <MetodoPagoModal
          metodo={editando}
          onClose={() => setModalAbierto(false)}
          onSave={guardar}
          cargando={saving}
        />
      )}
    </div>
  );
}
