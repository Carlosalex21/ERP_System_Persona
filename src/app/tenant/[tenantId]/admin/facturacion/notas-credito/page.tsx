"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Receipt, Printer } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Factura, NotaCredito } from '@/types/api';
import { getNotasCredito, getFacturas, deleteNotaCredito } from '@/services/facturacionService';
import { getMonedas } from '@/services/configuracionService';
import { getApiErrorMessages, parseDecimal } from '@/utils/helpers';
import { DataTable, PageHeader, Card, TableSkeleton } from '@/components/ui';
import NotaCreditoModal from './NotaCreditoModal';
import NotaPdfModal from '@/components/facturacion/NotaPdfModal';

function montoSortingFn(campo: keyof NotaCredito) {
  return (a: { original: NotaCredito }, b: { original: NotaCredito }) =>
    parseDecimal(a.original[campo] as string) - parseDecimal(b.original[campo] as string);
}

export default function NotasCreditoPage(): ReactElement {
  const [notas, setNotas] = useState<NotaCredito[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<NotaCredito | null>(null);
  const [monedaBaseCodigo, setMonedaBaseCodigo] = useState('');
  const [notaImprimir, setNotaImprimir] = useState<NotaCredito | null>(null);

  const loadData = useCallback(async () => {
    setCargando(true);
    try {
      const [notasRes, facturasRes, monedasRes] = await Promise.allSettled([getNotasCredito(), getFacturas(), getMonedas()]);
      if (notasRes.status === 'fulfilled') setNotas(notasRes.value);
      if (facturasRes.status === 'fulfilled') setFacturas(facturasRes.value);
      if (monedasRes.status === 'fulfilled') {
        setMonedaBaseCodigo(monedasRes.value.find(m => m.es_predeterminada)?.codigo || '');
      }
      const fallo = [notasRes, facturasRes].find(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );
      if (fallo) {
        const messages = getApiErrorMessages(fallo.reason);
        if (messages.length > 0) {
          messages.forEach((msg) => toast.error(msg));
        } else {
          toast.error('Algunos datos no se pudieron cargar. Intenta actualizar la página.');
        }
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

  const abrirEditar = useCallback((nota: NotaCredito) => {
    setEditando(nota);
    setModalAbierto(true);
  }, []);

  const eliminar = useCallback(
    async (nota: NotaCredito) => {
      if (!window.confirm(`¿Eliminar la nota de crédito ${nota.numero_nota}?`)) return;
      try {
        await deleteNotaCredito(nota.id);
        toast.success('Nota de crédito eliminada.');
        loadData();
      } catch (error) {
        const messages = getApiErrorMessages(error);
        if (messages.length > 0) {
          messages.forEach((msg) => toast.error(msg));
        } else {
          toast.error('Error al eliminar la nota de crédito.');
        }
      }
    },
    [loadData],
  );

  const columns = useMemo<ColumnDef<NotaCredito>[]>(() => [
    { accessorKey: 'numero_nota', header: 'N° Nota', cell: ({ row }) => <span className="font-bold text-slate-900">{row.original.numero_nota}</span> },
    { accessorKey: 'numero_control', header: 'Control', enableSorting: false, cell: ({ row }) => <span className="font-mono text-slate-500">{row.original.numero_control || '—'}</span> },
    {
      id: 'factura',
      header: 'Factura',
      enableSorting: false,
      cell: ({ row }) => {
        const factura = facturas.find(f => f.id === row.original.factura);
        return <span className="text-slate-600">{factura ? `#${factura.correlativo || factura.id}` : `#${row.original.factura}`}</span>;
      },
    },
    { accessorKey: 'fecha_emision', header: 'Fecha', cell: ({ row }) => <span className="text-slate-600">{new Date(row.original.fecha_emision).toLocaleDateString('es-VE')}</span> },
    { accessorKey: 'motivo', header: 'Motivo', enableSorting: false, cell: ({ row }) => <span className="text-slate-700 max-w-[220px] truncate block" title={row.original.motivo}>{row.original.motivo}</span> },
    { accessorKey: 'base_imponible', header: () => <div className="text-right">Base</div>, sortingFn: montoSortingFn('base_imponible'), cell: ({ row }) => <div className="text-right font-mono">{parseDecimal(row.original.base_imponible).toFixed(2)}</div> },
    { accessorKey: 'iva_total', header: () => <div className="text-right">IVA</div>, sortingFn: montoSortingFn('iva_total'), cell: ({ row }) => <div className="text-right font-mono">{parseDecimal(row.original.iva_total).toFixed(2)}</div> },
    { accessorKey: 'retencion_total', header: () => <div className="text-right">Retención</div>, sortingFn: montoSortingFn('retencion_total'), cell: ({ row }) => <div className="text-right font-mono">{parseDecimal(row.original.retencion_total).toFixed(2)}</div> },
    {
      accessorKey: 'total',
      header: () => <div className="text-right">Total</div>,
      sortingFn: montoSortingFn('total'),
      cell: ({ row }) => (
        <div className="text-right font-black text-primary-700 font-mono">
          {row.original.factura_moneda_codigo ? `${row.original.factura_moneda_codigo} ` : ''}{parseDecimal(row.original.total).toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: 'total_base',
      header: () => <div className="text-right">Total ({monedaBaseCodigo || 'base'})</div>,
      sortingFn: montoSortingFn('total_base'),
      cell: ({ row }) => (
        <div className="text-right font-mono text-slate-600">
          {monedaBaseCodigo} {parseDecimal(row.original.total_base).toFixed(2)}
        </div>
      ),
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => setNotaImprimir(row.original)} className="p-2 text-slate-400 hover:text-primary-600 transition-colors" aria-label={`Imprimir nota ${row.original.numero_nota}`}>
            <Printer size={16} />
          </button>
          <button onClick={() => abrirEditar(row.original)} className="p-2 text-slate-400 hover:text-primary-600 transition-colors" aria-label={`Editar nota ${row.original.numero_nota}`}>
            <Pencil size={16} />
          </button>
          <button onClick={() => eliminar(row.original)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" aria-label={`Eliminar nota ${row.original.numero_nota}`}>
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [facturas, abrirEditar, eliminar, monedaBaseCodigo]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Receipt size={20} />}
        title="Notas de Crédito"
        description="Registra notas de crédito asociadas a facturas (el backend calcula el desglose)."
        actions={
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={abrirCrear}
            className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
          >
            <Plus size={18} /> Nueva Nota de Crédito
          </motion.button>
        }
      />

      {cargando ? (
        <TableSkeleton rows={6} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable
            columns={columns}
            data={notas}
            resultLabel="notas"
            emptyState={<div className="p-8 text-center text-slate-400 text-sm">No hay notas de crédito registradas.</div>}
          />
        </Card>
      )}

      {modalAbierto && (
        <NotaCreditoModal
          nota={editando}
          facturas={facturas}
          onClose={() => setModalAbierto(false)}
          onSaved={() => {
            setModalAbierto(false);
            loadData();
          }}
        />
      )}

      <NotaPdfModal
        isOpen={!!notaImprimir}
        onClose={() => setNotaImprimir(null)}
        notaId={notaImprimir?.id ?? null}
        tipo="credito"
      />
    </div>
  );
}
