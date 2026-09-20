"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Star, Coins } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Moneda } from '@/types/api';
import { getMonedas, deleteMoneda } from '@/services/configuracionService';
import { getApiErrorMessages } from '@/utils/helpers';
import { DataTable, PageHeader, Card, TableSkeleton, ConfirmDialog } from '@/components/ui';
import MonedaModal from './MonedaModal';

export default function MonedasPage(): ReactElement {
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Moneda | null>(null);

  const loadData = useCallback(async () => {
    setCargando(true);
    try {
      const data = await getMonedas();
      setMonedas(data);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('Error al cargar las monedas.');
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const abrirCrear = useCallback(() => {
    setEditando(null);
    setModalAbierto(true);
  }, []);

  const abrirEditar = useCallback((moneda: Moneda) => {
    setEditando(moneda);
    setModalAbierto(true);
  }, []);

  const [monedaAEliminar, setMonedaAEliminar] = useState<Moneda | null>(null);
  const [eliminandoMoneda, setEliminandoMoneda] = useState(false);

  const eliminar = useCallback((moneda: Moneda) => setMonedaAEliminar(moneda), []);

  const confirmarEliminarMoneda = useCallback(
    async () => {
      if (!monedaAEliminar) return;
      setEliminandoMoneda(true);
      try {
        await deleteMoneda(monedaAEliminar.id);
        toast.success('Moneda eliminada.');
        setMonedaAEliminar(null);
        loadData();
      } catch (error) {
        const messages = getApiErrorMessages(error);
        if (messages.length > 0) {
          messages.forEach((msg) => toast.error(msg));
        } else {
          toast.error('Error al eliminar la moneda.');
        }
      } finally {
        setEliminandoMoneda(false);
      }
    },
    [monedaAEliminar, loadData],
  );

  const monedaBase = useMemo(() => monedas.find((m) => m.es_predeterminada), [monedas]);

  const columns = useMemo<ColumnDef<Moneda>[]>(() => [
    { accessorKey: 'codigo', header: 'Código', cell: ({ row }) => <span className="font-bold text-slate-900">{row.original.codigo}</span> },
    { accessorKey: 'nombre', header: 'Nombre', cell: ({ row }) => <span className="text-slate-700">{row.original.nombre}</span> },
    { accessorKey: 'simbolo', header: 'Símbolo', cell: ({ row }) => <span className="text-slate-500">{row.original.simbolo || '—'}</span> },
    {
      id: 'tipo',
      header: 'Tipo',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.es_predeterminada ? (
          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold uppercase inline-flex items-center gap-1">
            <Star size={10} /> Base
          </span>
        ) : (
          <span className="text-slate-400 text-xs">Secundaria</span>
        ),
    },
    {
      accessorKey: 'activa',
      header: () => <div className="text-center">Estado</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span
            className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${
              row.original.activa
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}
          >
            {row.original.activa ? 'Activa' : 'Inactiva'}
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
            onClick={() => abrirEditar(row.original)}
            className="p-2 text-slate-400 hover:text-primary-600 transition-colors"
            aria-label={`Editar ${row.original.codigo}`}
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => eliminar(row.original)}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            aria-label={`Eliminar ${row.original.codigo}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ], [abrirEditar, eliminar]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Coins size={20} />}
        title="Monedas"
        description="Gestiona las monedas del tenant y define la moneda base."
        actions={
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={abrirCrear}
            className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
          >
            <Plus size={18} /> Nueva Moneda
          </motion.button>
        }
      />

      {monedaBase && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3">
          <Star className="text-amber-500 shrink-0" size={20} />
          <p className="text-sm text-amber-800">
            <strong>Moneda base:</strong> {monedaBase.codigo} ({monedaBase.nombre}) — el backend
            desmarcará las demás si marcas una nueva como base.
          </p>
        </div>
      )}

      {cargando ? (
        <TableSkeleton rows={5} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable
            columns={columns}
            data={monedas}
            resultLabel="monedas"
            emptyState={<div className="p-8 text-center text-slate-400 text-sm">No hay monedas registradas.</div>}
          />
        </Card>
      )}

      {modalAbierto && (
        <MonedaModal
          moneda={editando}
          onClose={() => setModalAbierto(false)}
          onSaved={() => {
            setModalAbierto(false);
            loadData();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!monedaAEliminar}
        title="Eliminar Moneda"
        message={`¿Eliminar la moneda ${monedaAEliminar?.codigo} (${monedaAEliminar?.nombre})? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={eliminandoMoneda}
        onConfirm={confirmarEliminarMoneda}
        onCancel={() => setMonedaAEliminar(null)}
      />
    </div>
  );
}
