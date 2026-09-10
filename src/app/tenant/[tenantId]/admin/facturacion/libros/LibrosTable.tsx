"use client";

import { useState, useCallback, useEffect, useMemo, memo, type ReactElement } from 'react';
import { Loader2, Landmark, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { LibroCompraVenta } from '@/types/api';
import { getReporteLibros } from '@/services/facturacionService';
import { getApiErrorMessages, parseDecimal } from '@/utils/helpers';

interface LibroRowProps {
  libro: LibroCompraVenta;
}

const LibroRow = memo(function LibroRow({ libro }: LibroRowProps): ReactElement {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="p-4 pl-6 text-slate-600">{new Date(libro.fecha_operacion).toLocaleDateString('es-VE')}</td>
      <td className="p-4 text-slate-700">{libro.tipo_documento}</td>
      <td className="p-4 font-mono font-bold text-slate-900">{libro.numero_documento}</td>
      <td className="p-4 font-mono text-slate-500">{libro.numero_control || '—'}</td>
      <td className="p-4 text-slate-500">{libro.rif || '—'}</td>
      <td className="p-4 text-slate-700 max-w-[200px] truncate" title={libro.razon_social}>
        {libro.razon_social}
      </td>
      <td className="p-4 text-right font-mono">{parseDecimal(libro.base_imponible).toFixed(2)}</td>
      <td className="p-4 text-right font-mono">{parseDecimal(libro.iva).toFixed(2)}</td>
      <td className="p-4 text-right font-mono">{parseDecimal(libro.retencion).toFixed(2)}</td>
      <td className="p-4 text-right font-black text-primary-700 font-mono">
        {parseDecimal(libro.total).toFixed(2)}
      </td>
    </tr>
  );
});

export default function LibrosTable(): ReactElement {
  const [tipoLibro, setTipoLibro] = useState<'compra' | 'venta' | ''>('venta');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaLibroHasta, setFechaLibroHasta] = useState('');
  const [libros, setLibros] = useState<LibroCompraVenta[]>([]);
  const [cargando, setCargando] = useState(false);

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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
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
            <button
              onClick={cargar}
              disabled={cargando}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2"
            >
              {cargando ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Consultar
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center h-48 text-slate-500">
            <Loader2 size={24} className="animate-spin mr-2" /> Cargando reporte de libros...
          </div>
        ) : (
          <>
            {libros.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-b border-slate-100 bg-slate-50">
                <div className="text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Base</div>
                  <div className="font-black text-slate-900 font-mono">{totales.base.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400">IVA</div>
                  <div className="font-black text-slate-900 font-mono">{totales.iva.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Retención</div>
                  <div className="font-black text-slate-900 font-mono">{totales.retencion.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Total</div>
                  <div className="font-black text-primary-700 font-mono">{totales.total.toFixed(2)}</div>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-4 pl-6">Fecha</th>
                    <th className="p-4">Tipo Doc.</th>
                    <th className="p-4">N° Documento</th>
                    <th className="p-4">Control</th>
                    <th className="p-4">RIF</th>
                    <th className="p-4">Razón Social</th>
                    <th className="p-4 text-right">Base</th>
                    <th className="p-4 text-right">IVA</th>
                    <th className="p-4 text-right">Retención</th>
                    <th className="p-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {libros.map((libro) => (
                    <LibroRow key={libro.id} libro={libro} />
                  ))}
                  {libros.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 text-sm">
                        No se encontraron registros para los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
