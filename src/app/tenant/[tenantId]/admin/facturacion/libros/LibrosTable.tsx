"use client";

import { useState, useCallback, useEffect, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Loader2, Landmark, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { LibroCompraVenta } from '@/types/api';
import { getReporteLibros } from '@/services/facturacionService';
import { getMonedas } from '@/services/configuracionService';
import { getApiErrorMessages, parseDecimal } from '@/utils/helpers';
import { DataTable, Card, TableSkeleton, Stagger, StaggerItem } from '@/components/ui';

function montoSortingFn(campo: keyof LibroCompraVenta) {
  return (a: { original: LibroCompraVenta }, b: { original: LibroCompraVenta }) =>
    parseDecimal(a.original[campo] as string) - parseDecimal(b.original[campo] as string);
}

export default function LibrosTable(): ReactElement {
  const [tipoLibro, setTipoLibro] = useState<'compra' | 'venta' | ''>('venta');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaLibroHasta, setFechaLibroHasta] = useState('');
  const [libros, setLibros] = useState<LibroCompraVenta[]>([]);
  const [cargando, setCargando] = useState(true);
  /** El Libro siempre está en la moneda base del tenant (nunca mezcla monedas) -- ver `libros_service.py`. */
  const [monedaBaseCodigo, setMonedaBaseCodigo] = useState('');

  useEffect(() => {
    getMonedas()
      .then((monedas) => setMonedaBaseCodigo(monedas.find((m) => m.es_predeterminada)?.codigo || ''))
      .catch(() => {});
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await getReporteLibros({
        tipo_libro: tipoLibro || undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaLibroHasta || undefined,
      });
      setLibros(data);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('Error al cargar el reporte de libros.');
      }
    } finally {
      setCargando(false);
    }
  }, [tipoLibro, fechaDesde, fechaLibroHasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const columns = useMemo<ColumnDef<LibroCompraVenta>[]>(() => [
    {
      accessorKey: 'fecha_operacion',
      header: 'Fecha',
      cell: ({ row }) => (
        <span className="text-slate-600">{new Date(row.original.fecha_operacion).toLocaleDateString('es-VE')}</span>
      ),
    },
    {
      accessorKey: 'tipo_documento',
      header: 'Tipo Doc.',
      cell: ({ row }) => <span className="text-slate-700">{row.original.tipo_documento}</span>,
    },
    {
      accessorKey: 'numero_documento',
      header: 'N° Documento',
      cell: ({ row }) => <span className="font-mono font-bold text-slate-900">{row.original.numero_documento}</span>,
    },
    {
      accessorKey: 'numero_control',
      header: 'Control',
      enableSorting: false,
      cell: ({ row }) => <span className="font-mono text-slate-500">{row.original.numero_control || '—'}</span>,
    },
    {
      accessorKey: 'rif',
      header: 'RIF',
      enableSorting: false,
      cell: ({ row }) => <span className="text-slate-500">{row.original.rif || '—'}</span>,
    },
    {
      accessorKey: 'razon_social',
      header: 'Razón Social',
      cell: ({ row }) => (
        <span className="text-slate-700 max-w-[200px] truncate block" title={row.original.razon_social}>
          {row.original.razon_social}
        </span>
      ),
    },
    {
      accessorKey: 'base_imponible',
      header: () => <div className="text-right">Base ({monedaBaseCodigo})</div>,
      sortingFn: montoSortingFn('base_imponible'),
      cell: ({ row }) => <div className="text-right font-mono">{parseDecimal(row.original.base_imponible).toFixed(2)}</div>,
    },
    {
      accessorKey: 'iva',
      header: () => <div className="text-right">IVA ({monedaBaseCodigo})</div>,
      sortingFn: montoSortingFn('iva'),
      cell: ({ row }) => <div className="text-right font-mono">{parseDecimal(row.original.iva).toFixed(2)}</div>,
    },
    {
      accessorKey: 'retencion',
      header: () => <div className="text-right">Retención ({monedaBaseCodigo})</div>,
      sortingFn: montoSortingFn('retencion'),
      cell: ({ row }) => <div className="text-right font-mono">{parseDecimal(row.original.retencion).toFixed(2)}</div>,
    },
    {
      accessorKey: 'total',
      header: () => <div className="text-right">Total ({monedaBaseCodigo})</div>,
      sortingFn: montoSortingFn('total'),
      cell: ({ row }) => (
        <div className="text-right font-black text-primary-700 font-mono">{parseDecimal(row.original.total).toFixed(2)}</div>
      ),
    },
  ], [monedaBaseCodigo]);

  const totales = useMemo(() => {
    return libros.reduce(
      (acc, libro) => {
        acc.base += parseDecimal(libro.base_imponible);
        acc.iva += parseDecimal(libro.iva);
        acc.retencion += parseDecimal(libro.retencion);
        acc.total += parseDecimal(libro.total);
        return acc;
      },
      { base: 0, iva: 0, retencion: 0, total: 0 },
    );
  }, [libros]);

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Landmark size={18} /> Filtros del Reporte
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="libro-tipo">
              Tipo de Libro
            </label>
            <select
              id="libro-tipo"
              value={tipoLibro}
              onChange={(e) => setTipoLibro(e.target.value as 'compra' | 'venta' | '')}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
            >
              <option value="">Todos</option>
              <option value="compra">Compra</option>
              <option value="venta">Venta</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="libro-desde">
              Fecha desde
            </label>
            <input
              id="libro-desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="libro-hasta">
              Fecha hasta
            </label>
            <input
              id="libro-hasta"
              type="date"
              value={fechaLibroHasta}
              onChange={(e) => setFechaLibroHasta(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="flex items-end">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={cargar}
              disabled={cargando}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2"
            >
              {cargando ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Consultar
            </motion.button>
          </div>
        </div>
      </Card>

      {cargando ? (
        <TableSkeleton rows={8} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          {libros.length > 0 && (
            <Stagger className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-b border-slate-100 bg-slate-50">
              <StaggerItem>
                <div className="text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Base</div>
                  <div className="font-black text-slate-900 font-mono">{monedaBaseCodigo} {totales.base.toFixed(2)}</div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400">IVA</div>
                  <div className="font-black text-slate-900 font-mono">{monedaBaseCodigo} {totales.iva.toFixed(2)}</div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Retención</div>
                  <div className="font-black text-slate-900 font-mono">{monedaBaseCodigo} {totales.retencion.toFixed(2)}</div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Total</div>
                  <div className="font-black text-primary-700 font-mono">{monedaBaseCodigo} {totales.total.toFixed(2)}</div>
                </div>
              </StaggerItem>
            </Stagger>
          )}
          <DataTable
            columns={columns}
            data={libros}
            pageSize={15}
            resultLabel="registros"
            emptyState={
              <div className="p-8 text-center text-slate-400 text-sm">
                No se encontraron registros para los filtros seleccionados.
              </div>
            }
          />
        </Card>
      )}
    </div>
  );
}
