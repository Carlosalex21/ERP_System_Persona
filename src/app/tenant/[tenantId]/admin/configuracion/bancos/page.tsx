"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Landmark, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import BancoModal from './BancoModal';
import { DataTable, TableSkeleton, PageHeader, Card, EmptyState } from '@/components/ui';
import { getBancos, createBanco, updateBanco, deleteBanco } from '@/services/bancosService';
import type { Banco, BancoRequest } from '@/types/api';

export default function BancosPage(): ReactElement {
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Banco | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setBancos(await getBancos());
    } catch (error) {
      console.error('Error cargando bancos:', error);
      toast.error('No se pudieron cargar los bancos.');
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

  const abrirEdicion = (banco: Banco): void => {
    setEditando(banco);
    setModalAbierto(true);
  };

  const guardar = async (data: BancoRequest, id?: number): Promise<void> => {
    setSaving(true);
    try {
      if (id) {
        await updateBanco(id, data);
        toast.success('Banco actualizado correctamente.');
      } else {
        await createBanco(data);
        toast.success('Banco creado correctamente.');
      }
      setModalAbierto(false);
      await cargar();
    } catch (error) {
      console.error('Error guardando banco:', error);
      toast.error('No se pudo guardar el banco.');
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (banco: Banco): Promise<void> => {
    if (!confirm(`¿Eliminar el banco "${banco.nombre}"?`)) return;
    try {
      await deleteBanco(banco.id);
      toast.success('Banco eliminado.');
      await cargar();
    } catch (error) {
      console.error('Error eliminando banco:', error);
      toast.error('No se pudo eliminar el banco.');
    }
  };

  const columns = useMemo<ColumnDef<Banco>[]>(() => [
    {
      accessorKey: 'nombre',
      header: 'Banco',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <Landmark size={16} />
          </span>
          <span className="font-bold text-slate-900">{row.original.nombre}</span>
        </div>
      ),
    },
    {
      accessorKey: 'activo',
      header: () => <div className="text-center">Estado</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${
            row.original.activo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-400 border-slate-200'
          }`}>
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
          <button onClick={() => abrirEdicion(row.original)} className="p-2 text-slate-400 hover:text-primary-600 transition-colors" aria-label="Editar banco">
            <Pencil size={16} />
          </button>
          <button onClick={() => eliminar(row.original)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" aria-label="Eliminar banco">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Landmark size={20} />}
        title="Bancos"
        description="Entidades bancarias a las que entran tus métodos de pago -- se usan para cuadrar el reporte de Cobros al final del día."
        actions={
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={abrirNuevo}
            className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
          >
            <Plus size={18} /> Nuevo Banco
          </motion.button>
        }
      />

      {loading ? (
        <TableSkeleton rows={5} />
      ) : bancos.length === 0 ? (
        <EmptyState
          icon={<Landmark size={28} />}
          title="Aún no tienes bancos registrados"
          description="Crea tus bancos para poder asignarlos a los métodos de pago (transferencia, Pago Móvil...) y cuadrar los cobros al final del día."
          action={
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={abrirNuevo}
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 shadow-md"
            >
              <Plus size={18} /> Crear primer banco
            </motion.button>
          }
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable columns={columns} data={bancos} resultLabel="bancos" />
        </Card>
      )}

      {modalAbierto && (
        <BancoModal banco={editando} onClose={() => setModalAbierto(false)} onSave={guardar} cargando={saving} />
      )}
    </div>
  );
}
