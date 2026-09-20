"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, FlaskConical, Trash2, AlertTriangle } from 'lucide-react';
import { PageHeader, Card, EmptyState, TableSkeleton, DataTable, ActionButton, ConfirmDialog } from '@/components/ui';
import { getLotes, deleteLote, type LoteProducto } from '@/services/farmaciaService';
import { useNotify } from '@/hooks/useNotify';
import LoteModal from './components/LoteModal';

function estadoLote(lote: LoteProducto): { texto: string; clase: string } {
  if (lote.vencido) return { texto: 'Vencido', clase: 'bg-red-50 text-red-700 border-red-200' };
  if (lote.dias_para_vencer <= 30) return { texto: `Vence en ${lote.dias_para_vencer}d`, clase: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { texto: 'Vigente', clase: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

export default function LotesPage(): ReactElement {
  const notify = useNotify();
  const [lotes, setLotes] = useState<LoteProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [loteAEliminar, setLoteAEliminar] = useState<LoteProducto | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setLotes(await getLotes());
    } catch {
      notify.error('No se pudieron cargar los lotes.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const confirmarEliminar = async (): Promise<void> => {
    if (!loteAEliminar) return;
    setEliminando(true);
    try {
      await deleteLote(loteAEliminar.id);
      notify.success('Lote eliminado.');
      setLoteAEliminar(null);
      cargar();
    } catch {
      notify.error('No se pudo eliminar el lote.');
    } finally {
      setEliminando(false);
    }
  };

  const porVencerCount = lotes.filter((l) => !l.vencido && l.dias_para_vencer <= 30).length;

  const columns = useMemo<ColumnDef<LoteProducto>[]>(() => [
    {
      accessorKey: 'producto_nombre',
      header: 'Producto',
      cell: ({ row }) => (
        <div>
          <p className="font-bold text-slate-900">{row.original.producto_nombre}</p>
          {row.original.producto_sku && <p className="text-[11px] font-mono text-slate-400">{row.original.producto_sku}</p>}
        </div>
      ),
    },
    { accessorKey: 'numero_lote', header: 'N° Lote', cell: ({ row }) => row.original.numero_lote || <span className="text-slate-300">—</span> },
    { accessorKey: 'cantidad', header: 'Cantidad' },
    { accessorKey: 'fecha_vencimiento', header: 'Vencimiento' },
    {
      id: 'estado',
      header: 'Estado',
      cell: ({ row }) => {
        const e = estadoLote(row.original);
        return <span className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${e.clase}`}>{e.texto}</span>;
      },
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <button onClick={() => setLoteAEliminar(row.original)} className="p-2 text-slate-400 hover:text-red-500" aria-label="Eliminar lote">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [lotes]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FlaskConical size={20} />}
        title="Lotes y Vencimientos"
        description="Registra los lotes de tus productos para llevar control de fechas de vencimiento."
        actions={
          <ActionButton onClick={() => setModalAbierto(true)}>
            <Plus size={16} /> Nuevo Lote
          </ActionButton>
        }
      />

      {porVencerCount > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold px-4 py-3 rounded-xl">
          <AlertTriangle size={18} className="shrink-0" />
          {porVencerCount} lote{porVencerCount === 1 ? '' : 's'} vence{porVencerCount === 1 ? '' : 'n'} en los próximos 30 días.
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={5} />
      ) : lotes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FlaskConical size={28} />}
            title="Aún no tienes lotes registrados"
            description="Registra tu primer lote para empezar a controlar vencimientos."
            action={<ActionButton onClick={() => setModalAbierto(true)}><Plus size={16} /> Registrar primer lote</ActionButton>}
          />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable columns={columns} data={lotes} resultLabel="lotes" />
        </Card>
      )}

      {modalAbierto && (
        <LoteModal lotesExistentes={lotes} onClose={() => setModalAbierto(false)} onCreated={() => { setModalAbierto(false); cargar(); }} />
      )}

      <ConfirmDialog
        isOpen={!!loteAEliminar}
        title="Eliminar Lote"
        message={`¿Eliminar el lote${loteAEliminar?.numero_lote ? ` "${loteAEliminar.numero_lote}"` : ''} de "${loteAEliminar?.producto_nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={eliminando}
        onConfirm={confirmarEliminar}
        onCancel={() => setLoteAEliminar(null)}
      />
    </div>
  );
}
