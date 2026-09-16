/**
 * @file Reporte de Cobros: cada pago registrado (POS o abonos), con su
 * banco y cajero -- para cuadrar al final del día/turno contra el estado
 * de cuenta real de cada banco. Antes no existía ninguna ventana para ver
 * esto; solo se sabía el método de pago de una factura, sin poder agrupar
 * por banco ni ver quién cobró cada cosa.
 */
"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Landmark, Search } from 'lucide-react';
import toast from 'react-hot-toast';

import { getCobros, type Cobro } from '@/services/cajaService';
import { getBancos } from '@/services/bancosService';
import { getMetodosDePago } from '@/services/facturacionService';
import { parseDecimal } from '@/utils/helpers';
import { DataTable, PageHeader, Card, TableSkeleton } from '@/components/ui';
import type { Banco, MetodoPago } from '@/types/api';

export default function CobrosPage(): ReactElement {
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [bancoId, setBancoId] = useState('');
  const [metodoId, setMetodoId] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await getCobros({
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        banco_id: bancoId ? Number(bancoId) : undefined,
        metodo_pago_id: metodoId ? Number(metodoId) : undefined,
      });
      setCobros(data);
    } catch (error) {
      console.error('Error cargando cobros:', error);
      toast.error('No se pudieron cargar los cobros.');
    } finally {
      setCargando(false);
    }
  }, [fechaDesde, fechaHasta, bancoId, metodoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    getBancos().then(setBancos).catch(() => {/* opcional */});
    getMetodosDePago().then(setMetodos).catch(() => {/* opcional */});
  }, []);

  const totalesPorBanco = useMemo(() => {
    const mapa = new Map<string, number>();
    cobros.forEach((c) => {
      const clave = c.banco_nombre || (c.metodo_pago_nombre ? `${c.metodo_pago_nombre} (efectivo)` : 'Sin método');
      mapa.set(clave, (mapa.get(clave) || 0) + parseDecimal(c.monto));
    });
    return Array.from(mapa.entries());
  }, [cobros]);

  const columns = useMemo<ColumnDef<Cobro>[]>(() => [
    {
      accessorKey: 'fecha',
      header: 'Fecha',
      cell: ({ row }) => <span className="text-slate-600 text-xs">{row.original.fecha ? new Date(row.original.fecha).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span>,
    },
    { accessorKey: 'factura_correlativo', header: 'Factura', cell: ({ row }) => <span className="font-mono font-bold text-slate-900">{row.original.factura_correlativo || `#${row.original.factura}`}</span> },
    { accessorKey: 'metodo_pago_nombre', header: 'Método', cell: ({ row }) => <span className="text-slate-700">{row.original.metodo_pago_nombre || '—'}</span> },
    {
      accessorKey: 'banco_nombre',
      header: 'Banco',
      cell: ({ row }) => row.original.banco_nombre
        ? <span className="px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 text-[10px] font-bold">{row.original.banco_nombre}</span>
        : <span className="text-xs text-slate-300">Efectivo</span>,
    },
    { accessorKey: 'referencia', header: 'Referencia', cell: ({ row }) => <span className="font-mono text-xs text-slate-500">{row.original.referencia || '—'}</span> },
    { accessorKey: 'cajero_nombre', header: 'Cajero', cell: ({ row }) => <span className="text-slate-600 text-xs">{row.original.cajero_nombre || '—'}</span> },
    {
      accessorKey: 'monto',
      header: () => <div className="text-right">Monto</div>,
      cell: ({ row }) => (
        <div className="text-right font-black text-primary-700 font-mono">
          {row.original.moneda_codigo} {parseDecimal(row.original.monto).toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: 'vuelto',
      header: () => <div className="text-right">Vuelto</div>,
      cell: ({ row }) => {
        const v = parseDecimal(row.original.vuelto);
        return <div className="text-right font-mono text-slate-500">{v > 0 ? `${row.original.moneda_codigo} ${v.toFixed(2)}` : '—'}</div>;
      },
    },
  ], []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Landmark size={20} />}
        title="Cobros"
        description="Cada pago registrado, con su banco y cajero -- para cuadrar contra el estado de cuenta real al final del día."
      />

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Desde</label>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hasta</label>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Banco</label>
            <select value={bancoId} onChange={e => setBancoId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Todos</option>
              {bancos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método</label>
            <select value={metodoId} onChange={e => setMetodoId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Todos</option>
              {metodos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {!cargando && totalesPorBanco.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {totalesPorBanco.map(([nombre, total]) => (
            <div key={nombre} className="bg-white border rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{nombre}</p>
              <p className="font-black text-slate-900 font-mono">{total.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}

      {cargando ? (
        <TableSkeleton rows={8} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable
            columns={columns}
            data={cobros}
            resultLabel="cobros"
            emptyState={
              <div className="p-12 text-center text-slate-400">
                <Search size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No hay cobros para los filtros seleccionados.</p>
              </div>
            }
          />
        </Card>
      )}
    </div>
  );
}
