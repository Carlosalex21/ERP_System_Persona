"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Building2, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { Badge, Card, ConfirmDialog, DataTable, EmptyState, PageHeader, TableSkeleton } from '@/components/ui';
import { eliminarEdificio, getEdificios, type Edificio } from '@/services/inmueblesService';
import { toastApiError } from '@/utils/errors';
import { numero } from '@/components/inmuebles/formato';
import EdificioModal from './EdificioModal';

export default function EdificiosPage(): ReactElement {
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<Edificio | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [aEliminar, setAEliminar] = useState<Edificio | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      setEdificios(await getEdificios());
    } catch (e) {
      toastApiError(e, 'No se pudieron cargar los edificios.');
    } finally {
      setCargando(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos externos
  useEffect(() => { cargar(); }, [cargar]);

  const confirmarEliminar = async (): Promise<void> => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await eliminarEdificio(aEliminar.id);
      toast.success('Edificio eliminado.');
      setAEliminar(null);
      cargar();
    } catch (e) {
      toastApiError(e, 'No se pudo eliminar el edificio.');
      setAEliminar(null);
    } finally {
      setEliminando(false);
    }
  };

  const columns = useMemo<ColumnDef<Edificio>[]>(() => [
    {
      accessorKey: 'nombre',
      header: 'Edificio',
      cell: ({ row }) => (
        <div>
          <p className="font-bold text-slate-900">{row.original.nombre}</p>
          <p className="text-[11px] text-slate-400 truncate max-w-xs">{row.original.direccion || 'Sin dirección'}{row.original.rif ? ` · ${row.original.rif}` : ''}</p>
        </div>
      ),
    },
    {
      accessorKey: 'unidades_count',
      header: () => <div className="text-center">Unidades</div>,
      cell: ({ row }) => <div className="text-center font-bold text-slate-700 tabular-nums">{row.original.unidades_count}</div>,
    },
    {
      accessorKey: 'dia_vencimiento',
      header: () => <div className="text-center">Vence el día</div>,
      cell: ({ row }) => <div className="text-center text-slate-600 tabular-nums">{row.original.dia_vencimiento}</div>,
    },
    {
      id: 'mora',
      header: () => <div className="text-center">Mora mensual</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-center text-slate-600 tabular-nums">
          {Number(row.original.mora_pct_mensual) > 0 ? `${numero(row.original.mora_pct_mensual)} %` : <span className="text-slate-300">sin mora</span>}
        </div>
      ),
    },
    {
      id: 'fondo',
      header: () => <div className="text-center">Fondo de reserva</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-center text-slate-600 tabular-nums">
          {Number(row.original.fondo_reserva_pct) > 0 ? `${numero(row.original.fondo_reserva_pct)} %` : <span className="text-slate-300">—</span>}
        </div>
      ),
    },
    {
      id: 'portal',
      header: 'Portal',
      enableSorting: false,
      cell: ({ row }) => (
        <Badge tone={row.original.portal_muestra_morosidad ? 'primary' : 'slate'}>
          <span className="inline-flex items-center gap-1"><Eye size={11} /> {row.original.portal_muestra_morosidad ? 'Muestra morosidad' : 'Morosidad oculta'}</span>
        </Badge>
      ),
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => { setEditando(row.original); setModalAbierto(true); }} className="p-2 text-slate-400 hover:text-primary-600 transition-colors" aria-label={`Editar ${row.original.nombre}`}><Pencil size={16} /></button>
          <button onClick={() => setAEliminar(row.original)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" aria-label={`Eliminar ${row.original.nombre}`}><Trash2 size={16} /></button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Building2 size={20} />}
        title="Edificios"
        description="Cada condominio que administras, con sus reglas de cobro: día de vencimiento, mora y fondo de reserva."
        actions={
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setEditando(null); setModalAbierto(true); }} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2 shadow-md">
            <Plus size={18} /> Nuevo edificio
          </motion.button>
        }
      />

      {cargando ? (
        <TableSkeleton rows={4} />
      ) : edificios.length === 0 ? (
        <EmptyState
          icon={<Building2 size={28} />}
          title="Aún no tienes edificios"
          description="Crea tu primer condominio para cargar sus unidades, los gastos del mes y emitir las cuotas."
          action={<button onClick={() => { setEditando(null); setModalAbierto(true); }} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2"><Plus size={16} /> Crear edificio</button>}
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable columns={columns} data={edificios} resultLabel="edificios" />
        </Card>
      )}

      {modalAbierto && (
        <EdificioModal edificio={editando} onClose={() => setModalAbierto(false)} onSaved={() => { setModalAbierto(false); cargar(); }} />
      )}
      <ConfirmDialog
        isOpen={!!aEliminar}
        title="Eliminar edificio"
        message={`¿Eliminar "${aEliminar?.nombre}"? Solo es posible si ya no tiene unidades activas.`}
        confirmLabel="Eliminar"
        danger
        loading={eliminando}
        onConfirm={confirmarEliminar}
        onCancel={() => setAEliminar(null)}
      />
    </div>
  );
}
