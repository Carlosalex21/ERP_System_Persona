"use client";

import { useState, useCallback, useEffect, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { BarChart3, Loader2, Search, Wallet, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  getReporteVentas,
  getCierreCaja,
  type VentaReporte,
  type CierreCajaTransaccion,
  type TotalCajaPorMoneda,
} from '@/services/reportesService';
import { getApiErrorMessages, parseDecimal } from '@/utils/helpers';
import { getMonedas } from '@/services/configuracionService';
import { DataTable, PageHeader, Card, TableSkeleton } from '@/components/ui';

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function haceUnMesISO(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

function EstadoBadge({ estado }: { estado: string }): ReactElement {
  const normalizado = (estado || '').toLowerCase();
  const estilos = normalizado.includes('pagad')
    ? 'bg-green-50 text-green-700 border-green-200'
    : normalizado.includes('pendient')
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : normalizado.includes('anulad') || normalizado.includes('rechazad')
        ? 'bg-red-50 text-red-600 border-red-200'
        : 'bg-slate-100 text-slate-500 border-slate-200';
  return (
    <span className={`px-2.5 py-1 rounded-lg font-bold text-xs border capitalize ${estilos}`}>
      {estado || '—'}
    </span>
  );
}

function ReporteVentasTab(): ReactElement {
  const [fechaInicio, setFechaInicio] = useState(haceUnMesISO());
  const [fechaFin, setFechaFin] = useState(hoyISO());
  const [ventas, setVentas] = useState<VentaReporte[]>([]);
  const [cargando, setCargando] = useState(false);
  // Símbolo de la moneda BASE del tenant -- el reporte de ventas es un
  // documento fiscal (como el Libro), así que siempre se totaliza y
  // muestra en esa moneda, nunca mezclando con la moneda propia de cada
  // factura (ver `total_base`, ya convertido con la tasa congelada de cada
  // factura).
  const [simboloBase, setSimboloBase] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await getReporteVentas(fechaInicio, fechaFin);
      setVentas(data);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('Error al cargar el reporte de ventas.');
      }
    } finally {
      setCargando(false);
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => {
    cargar();
    getMonedas()
      .then((monedas) => {
        const base = monedas.find((m) => m.es_predeterminada) ?? monedas[0];
        setSimboloBase(base?.simbolo || base?.codigo || '');
      })
      .catch(() => setSimboloBase(''));
    // Solo al montar: las fechas se aplican al presionar "Consultar".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo<ColumnDef<VentaReporte>[]>(() => [
    {
      accessorKey: 'fecha_operacion',
      header: 'Fecha',
      cell: ({ row }) => (
        <span className="text-slate-600">{new Date(row.original.fecha_operacion).toLocaleDateString('es-VE')}</span>
      ),
    },
    {
      accessorKey: 'correlativo',
      header: 'N° Factura',
      cell: ({ row }) => <span className="font-mono font-bold text-slate-900">{row.original.correlativo}</span>,
    },
    {
      accessorKey: 'cliente_nombre',
      header: 'Cliente',
      cell: ({ row }) => <span className="text-slate-700">{row.original.cliente_nombre || '—'}</span>,
    },
    {
      accessorKey: 'estado',
      header: () => <div className="text-center">Estado</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <EstadoBadge estado={row.original.estado} />
        </div>
      ),
    },
    {
      accessorKey: 'total_base',
      header: () => <div className="text-right">Total</div>,
      sortingFn: (a, b) => parseDecimal(a.original.total_base) - parseDecimal(b.original.total_base),
      cell: ({ row }) => (
        <div className="text-right">
          <div className="font-black text-primary-700 font-mono">
            {simboloBase} {parseDecimal(row.original.total_base).toFixed(2)}
          </div>
          {row.original.moneda_codigo && row.original.moneda_codigo !== simboloBase && (
            <div className="text-[10px] text-slate-400 font-mono">
              orig: {row.original.moneda_codigo} {parseDecimal(row.original.total).toFixed(2)}
            </div>
          )}
        </div>
      ),
    },
  ], [simboloBase]);

  // Siempre se suma `total_base` (moneda local), nunca `total` crudo -- una
  // factura en USD y otra en Bs no se pueden sumar como si fueran la misma
  // unidad.
  const totalVentas = useMemo(() => ventas.reduce((acc, v) => acc + parseDecimal(v.total_base), 0), [ventas]);

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="reporte-desde">
              Fecha inicio
            </label>
            <input
              id="reporte-desde"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="reporte-hasta">
              Fecha fin
            </label>
            <input
              id="reporte-hasta"
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="flex items-end lg:col-span-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={cargar}
              disabled={cargando}
              className="w-full sm:w-auto px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2"
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
          {ventas.length > 0 && (
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <span className="text-xs font-bold uppercase text-slate-400">{ventas.length} facturas</span>
              <span className="font-black text-primary-700 font-mono">Total: {simboloBase} {totalVentas.toFixed(2)}</span>
            </div>
          )}
          <DataTable
            columns={columns}
            data={ventas}
            pageSize={15}
            resultLabel="facturas"
            emptyState={
              <div className="p-8 text-center text-slate-400 text-sm">
                No se encontraron ventas para el rango seleccionado.
              </div>
            }
          />
        </Card>
      )}
    </div>
  );
}

function CierreCajaTab(): ReactElement {
  const [fecha, setFecha] = useState(hoyISO());
  const [totalCaja, setTotalCaja] = useState<TotalCajaPorMoneda[]>([]);
  const [transacciones, setTransacciones] = useState<CierreCajaTransaccion[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await getCierreCaja(fecha);
      setTotalCaja(data.total_caja);
      setTransacciones(data.transactions);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('Error al cargar el cierre de caja.');
      }
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const columns = useMemo<ColumnDef<CierreCajaTransaccion>[]>(() => [
    {
      accessorKey: 'fecha_operacion',
      header: 'Hora',
      cell: ({ row }) => (
        <span className="text-slate-600">
          {new Date(row.original.fecha_operacion).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      accessorKey: 'correlativo',
      header: 'N° Factura',
      cell: ({ row }) => <span className="font-mono font-bold text-slate-900">{row.original.correlativo}</span>,
    },
    {
      accessorKey: 'cliente_nombre',
      header: 'Cliente',
      cell: ({ row }) => <span className="text-slate-700">{row.original.cliente_nombre || '—'}</span>,
    },
    {
      accessorKey: 'metodo_pago_nombre',
      header: 'Método de Pago',
      cell: ({ row }) => <span className="text-xs font-medium text-slate-600">{row.original.metodo_pago_nombre || '—'}</span>,
    },
    {
      accessorKey: 'total',
      header: () => <div className="text-right">Total</div>,
      sortingFn: (a, b) => parseDecimal(a.original.total) - parseDecimal(b.original.total),
      cell: ({ row }) => (
        <div className="text-right font-black text-primary-700 font-mono">
          {row.original.moneda_codigo || ''} {parseDecimal(row.original.total).toFixed(2)}
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="caja-fecha">
              Fecha del cierre
            </label>
            <input
              id="caja-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Un total POR MONEDA, nunca uno solo mezclándolas -- un cajero
          necesita saber cuánto debe tener de cada una en la gaveta. */}
      {totalCaja.length > 0 && !cargando && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {totalCaja.map((entrada) => (
            <div key={entrada.moneda_codigo} className="bg-primary-900 rounded-2xl p-6 flex items-center justify-between text-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <Wallet size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-primary-200">Total en caja ({entrada.moneda_codigo})</p>
                  <p className="text-xs text-primary-300">{transacciones.length} facturas pagadas ese día</p>
                </div>
              </div>
              <p className="text-3xl font-black font-mono">{entrada.moneda_simbolo} {parseDecimal(entrada.total).toFixed(2)}</p>
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
            data={transacciones}
            pageSize={15}
            resultLabel="transacciones"
            emptyState={
              <div className="p-8 text-center text-slate-400 text-sm">
                No hay facturas pagadas registradas para esta fecha.
              </div>
            }
          />
        </Card>
      )}
    </div>
  );
}

export default function ReportesPage(): ReactElement {
  const [tab, setTab] = useState<'ventas' | 'caja'>('ventas');

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<BarChart3 size={20} />}
        title="Reportes"
        description="Consulta tus ventas históricas y el cierre de caja diario."
      />

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab('ventas')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            tab === 'ventas' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <TrendingUp size={16} /> Ventas
        </button>
        <button
          onClick={() => setTab('caja')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            tab === 'caja' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Wallet size={16} /> Cierre de Caja
        </button>
      </div>

      {tab === 'ventas' ? <ReporteVentasTab /> : <CierreCajaTab />}
    </div>
  );
}
