"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, FileInput, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { Badge, Card, DataTable, PageHeader, TableSkeleton } from '@/components/ui';
import { getFacturasCompra } from '@/services/proveedoresService';
import type { FacturaCompra } from '@/types/api';
import FacturaCompraModal from './FacturaCompraModal';
import FacturaCompraDetalleModal from './FacturaCompraDetalleModal';

const fmt = (v: string | number): string =>
  Number(v).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fecha = (iso: string): string => new Date(`${iso}T00:00:00`).toLocaleDateString('es-VE');

export default function FacturasCompraPage(): ReactElement {
  const [facturas, setFacturas] = useState<FacturaCompra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState<'registrada' | 'anulada' | ''>('registrada');
  const [modalNueva, setModalNueva] = useState(false);
  const [viendo, setViendo] = useState<FacturaCompra | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      setFacturas(await getFacturasCompra(estado ? { estado } : {}));
    } catch {
      toast.error('No se pudieron cargar las compras.');
    } finally {
      setCargando(false);
    }
  }, [estado]);

  useEffect(() => { cargar(); }, [cargar]);

  const totales = useMemo(() => facturas.reduce(
    (acc, f) => ({
      total: acc.total + Number(f.total),
      iva: acc.iva + (f.tipo_documento === 'factura' ? Number(f.iva) : 0),
      saldo: acc.saldo + Number(f.saldo_pendiente),
    }),
    { total: 0, iva: 0, saldo: 0 },
  ), [facturas]);

  const columns = useMemo<ColumnDef<FacturaCompra>[]>(() => [
    {
      accessorKey: 'fecha_emision',
      header: 'Fecha',
      cell: ({ row }) => <span className="text-slate-600 tabular-nums">{fecha(row.original.fecha_emision)}</span>,
    },
    {
      accessorKey: 'numero_factura',
      header: 'Documento',
      cell: ({ row }) => (
        <div>
          <p className="font-mono font-bold text-slate-900">{row.original.numero_factura}</p>
          <p className="text-[11px] text-slate-400">
            {row.original.tipo_documento === 'factura' ? `Control ${row.original.numero_control}` : 'Nota de entrega'}
            {row.original.orden_compra_numero ? ` · OC-${row.original.orden_compra_numero}` : ''}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'proveedor_nombre',
      header: 'Proveedor',
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-slate-800">{row.original.proveedor_nombre}</p>
          <p className="text-[11px] text-slate-400 font-mono">{row.original.proveedor_rif}</p>
        </div>
      ),
    },
    {
      accessorKey: 'base_imponible',
      header: () => <div className="text-right">Base</div>,
      sortingFn: (a, b) => Number(a.original.base_imponible) - Number(b.original.base_imponible),
      cell: ({ row }) => <div className="text-right font-mono tabular-nums text-slate-600">{fmt(row.original.base_imponible)}</div>,
    },
    {
      accessorKey: 'iva',
      header: () => <div className="text-right">IVA</div>,
      sortingFn: (a, b) => Number(a.original.iva) - Number(b.original.iva),
      cell: ({ row }) => <div className="text-right font-mono tabular-nums text-slate-600">{fmt(row.original.iva)}</div>,
    },
    {
      accessorKey: 'total',
      header: () => <div className="text-right">Total</div>,
      sortingFn: (a, b) => Number(a.original.total) - Number(b.original.total),
      cell: ({ row }) => (
        <div className="text-right">
          <p className="font-mono font-bold tabular-nums text-slate-900">{fmt(row.original.total)}</p>
          {Number(row.original.retencion_iva) + Number(row.original.retencion_islr) > 0 && (
            <p className="text-[11px] text-amber-700 font-mono tabular-nums">
              −{fmt(Number(row.original.retencion_iva) + Number(row.original.retencion_islr))} ret.
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'estado',
      header: 'Estado',
      enableSorting: false,
      cell: ({ row }) => {
        const f = row.original;
        if (f.estado === 'anulada') return <Badge tone="red">Anulada</Badge>;
        return Number(f.saldo_pendiente) > 0
          ? <Badge tone="amber">Debe {fmt(f.saldo_pendiente)}</Badge>
          : <Badge tone="green">Pagada</Badge>;
      },
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Ver</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <button onClick={() => setViendo(row.original)} className="p-2 text-slate-400 hover:text-primary-600 transition-colors" aria-label={`Ver compra ${row.original.numero_factura}`}>
            <Eye size={16} />
          </button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileInput size={20} />}
        title="Facturas de compra"
        description="Registra las facturas (o notas de entrega) de tus proveedores: la mercancía entra al inventario, se crea la cuenta por pagar y la factura queda en el Libro de Compras."
        actions={
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setModalNueva(true)}
            className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
          >
            <Plus size={18} /> Registrar compra
          </motion.button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Resumen etiqueta="Total comprado" valor={totales.total} />
        <Resumen etiqueta="IVA crédito fiscal" valor={totales.iva} />
        <Resumen etiqueta="Por pagar a proveedores" valor={totales.saldo} destacado />
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {([['registrada', 'Vigentes'], ['anulada', 'Anuladas'], ['', 'Todas']] as const).map(([valor, texto]) => (
          <button
            key={texto}
            onClick={() => setEstado(valor)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${estado === valor ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {texto}
          </button>
        ))}
      </div>

      {cargando ? (
        <TableSkeleton rows={6} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable
            columns={columns}
            data={facturas}
            resultLabel="compras"
            emptyState={<div className="p-8 text-center text-slate-400 text-sm">No hay compras registradas.</div>}
          />
        </Card>
      )}

      {modalNueva && (
        <FacturaCompraModal
          onClose={() => setModalNueva(false)}
          onSaved={() => { setModalNueva(false); cargar(); }}
        />
      )}
      {viendo && (
        <FacturaCompraDetalleModal
          factura={viendo}
          onClose={() => setViendo(null)}
          onAnulada={() => { setViendo(null); cargar(); }}
        />
      )}
    </div>
  );
}

function Resumen({ etiqueta, valor, destacado = false }: { etiqueta: string; valor: number; destacado?: boolean }): ReactElement {
  return (
    <Card>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{etiqueta}</p>
      <p className={`mt-1 text-xl font-black font-mono tabular-nums ${destacado ? 'text-amber-700' : 'text-slate-900'}`}>{fmt(valor)}</p>
    </Card>
  );
}
