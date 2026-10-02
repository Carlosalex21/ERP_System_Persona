"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, ReceiptText } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Retencion } from '@/types/api';
import { getRetenciones, deleteRetencion } from '@/services/facturacionService';
import { getApiErrorMessages, parseDecimal } from '@/utils/helpers';
import { DataTable, PageHeader, Card, TableSkeleton, ConfirmDialog } from '@/components/ui';
import RetencionModal from './RetencionModal';

const RETENCION_LABELS: Record<string, string> = {
  islr: 'ISLR',
  iva: 'IVA',
  otros: 'Otros',
};

function montoSortingFn(campo: keyof Retencion) {
  return (a: { original: Retencion }, b: { original: Retencion }) =>
    parseDecimal(a.original[campo] as string) - parseDecimal(b.original[campo] as string);
}

export default function RetencionesPage(): ReactElement {
  const [retenciones, setRetenciones] = useState<Retencion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Retencion | null>(null);

  const loadData = useCallback(async () => {
    setCargando(true);
    try {
      const data = await getRetenciones();
      setRetenciones(data);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('Error al cargar las retenciones.');
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

  const abrirEditar = useCallback((retencion: Retencion) => {
    setEditando(retencion);
    setModalAbierto(true);
  }, []);

  const [retencionAEliminar, setRetencionAEliminar] = useState<Retencion | null>(null);
  const [eliminandoRetencion, setEliminandoRetencion] = useState(false);

  const eliminar = useCallback((retencion: Retencion) => setRetencionAEliminar(retencion), []);

  const confirmarEliminarRetencion = useCallback(
    async () => {
      if (!retencionAEliminar) return;
      setEliminandoRetencion(true);
      try {
        await deleteRetencion(retencionAEliminar.id);
        toast.success('Retención eliminada.');
        setRetencionAEliminar(null);
        loadData();
      } catch (error) {
        const messages = getApiErrorMessages(error);
        if (messages.length > 0) {
          messages.forEach((msg) => toast.error(msg));
        } else {
          toast.error('Error al eliminar la retención.');
        }
      } finally {
        setEliminandoRetencion(false);
      }
    },
    [retencionAEliminar, loadData],
  );

  const columns = useMemo<ColumnDef<Retencion>[]>(() => [
    {
      id: 'documento',
      header: 'Documento',
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original;
        if (r.factura_compra) return <div><p className="font-mono text-slate-800">Compra {r.factura_compra_numero}</p><p className="text-[11px] text-slate-400">Emitida</p></div>;
        if (r.factura) return <div><p className="font-mono text-slate-800">Venta #{r.factura_correlativo || r.factura}</p><p className="text-[11px] text-slate-400">Recibida de cliente</p></div>;
        return <span className="text-slate-400">Sin factura</span>;
      },
    },
    {
      id: 'proveedor',
      header: 'Proveedor',
      enableSorting: false,
      cell: ({ row }) => row.original.proveedor_nombre
        ? <div><p className="text-slate-700">{row.original.proveedor_nombre}</p><p className="text-[11px] text-slate-400 font-mono">{row.original.proveedor_rif}</p></div>
        : <span className="text-slate-400">—</span>,
    },
    {
      accessorKey: 'tipo_retencion',
      header: 'Tipo',
      cell: ({ row }) => (
        <span className="px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 text-[10px] font-bold uppercase">
          {RETENCION_LABELS[row.original.tipo_retencion] || row.original.tipo_retencion}
        </span>
      ),
    },
    { accessorKey: 'numero_comprobante', header: 'N° Comprobante', enableSorting: false, cell: ({ row }) => <span className="font-mono font-bold text-slate-900">{row.original.numero_comprobante || '—'}</span> },
    { accessorKey: 'periodo_imposicion', header: 'Periodo', enableSorting: false, cell: ({ row }) => <span className="text-slate-600">{row.original.periodo_imposicion || '—'}</span> },
    { accessorKey: 'porcentaje', header: () => <div className="text-right">%</div>, sortingFn: montoSortingFn('porcentaje'), cell: ({ row }) => <div className="text-right font-mono">{parseDecimal(row.original.porcentaje).toFixed(2)}%</div> },
    { accessorKey: 'base', header: () => <div className="text-right">Base</div>, sortingFn: montoSortingFn('base'), cell: ({ row }) => <div className="text-right font-mono">{row.original.factura_moneda_codigo ? `${row.original.factura_moneda_codigo} ` : ''}{parseDecimal(row.original.base).toFixed(2)}</div> },
    { accessorKey: 'monto', header: () => <div className="text-right">Monto</div>, sortingFn: montoSortingFn('monto'), cell: ({ row }) => <div className="text-right font-black text-primary-700 font-mono">{row.original.factura_moneda_codigo ? `${row.original.factura_moneda_codigo} ` : ''}{parseDecimal(row.original.monto).toFixed(2)}</div> },
    { accessorKey: 'fecha_emision', header: 'Fecha', cell: ({ row }) => <span className="text-slate-600">{new Date(row.original.fecha_emision).toLocaleDateString('es-VE')}</span> },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => abrirEditar(row.original)} className="p-2 text-slate-400 hover:text-primary-600 transition-colors" aria-label={`Editar retención ${row.original.id}`}>
            <Pencil size={16} />
          </button>
          <button onClick={() => eliminar(row.original)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" aria-label={`Eliminar retención ${row.original.id}`}>
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [abrirEditar, eliminar]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<ReceiptText size={20} />}
        title="Retenciones"
        description="Comprobantes de retención de IVA/ISLR: los que emites a tus proveedores (numeración SENIAT propia) y los que te entregan tus clientes."
        actions={
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={abrirCrear}
            className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
          >
            <Plus size={18} /> Nueva Retención
          </motion.button>
        }
      />

      {cargando ? (
        <TableSkeleton rows={6} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable
            columns={columns}
            data={retenciones}
            resultLabel="retenciones"
            emptyState={<div className="p-8 text-center text-slate-400 text-sm">No hay retenciones registradas.</div>}
          />
        </Card>
      )}

      {modalAbierto && (
        <RetencionModal
          retencion={editando}
          onClose={() => setModalAbierto(false)}
          onSaved={() => {
            setModalAbierto(false);
            loadData();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!retencionAEliminar}
        title="Eliminar Retención"
        message={`¿Anular la retención ${retencionAEliminar?.numero_comprobante || `#${retencionAEliminar?.id}`}? Si era sobre una factura de compra, la deuda con el proveedor vuelve a su monto completo.`}
        confirmLabel="Eliminar"
        loading={eliminandoRetencion}
        onConfirm={confirmarEliminarRetencion}
        onCancel={() => setRetencionAEliminar(null)}
      />
    </div>
  );
}
