"use client";

import { useState, useEffect, useCallback, useMemo, memo, type ReactElement } from 'react';
import { Plus, Loader2, Pencil, Trash2, Repeat, Star, Landmark } from 'lucide-react';
import toast from 'react-hot-toast';
import { Moneda, TasaCambio } from '@/types/api';
import {
  getMonedas,
  getTasasCambio,
  getTasasCambioActual,
  deleteTasaCambio,
  type TasaCambioActual,
} from '@/services/configuracionService';
import { getApiErrorMessages, parseDecimal } from '@/utils/helpers';
import TasaCambioModal from './TasaCambioModal';

interface TasaRowProps {
  tasa: TasaCambio;
  monedas: Moneda[];
  onEditar: (tasa: TasaCambio) => void;
  onEliminar: (tasa: TasaCambio) => void;
}

const TasaRow = memo(function TasaRow({
  tasa,
  monedas,
  onEditar,
  onEliminar,
}: TasaRowProps): ReactElement {
  const moneda = monedas.find((m) => m.id === tasa.moneda);
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="p-4 pl-6 text-slate-600">{new Date(tasa.fecha).toLocaleDateString('es-VE')}</td>
      <td className="p-4 font-bold text-slate-900">
        {tasa.codigo_moneda || moneda?.codigo || tasa.moneda}
      </td>
      <td className="p-4 font-mono text-slate-700">{parseDecimal(tasa.tasa).toFixed(6)}</td>
      <td className="p-4 text-slate-500">{tasa.fuente || '—'}</td>
      <td className="p-4 text-center">
        {tasa.activa ? (
          <span className="px-2.5 py-1 rounded-lg font-bold text-xs border bg-green-50 text-green-700 border-green-200">
            Vigente
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-lg font-bold text-xs border bg-slate-50 text-slate-400 border-slate-200">
            Inactiva
          </span>
        )}
      </td>
      <td className="p-4 text-right">
        <div className="flex justify-end gap-1">
          <button
            onClick={() => onEditar(tasa)}
            className="p-2 text-slate-400 hover:text-primary-600 transition-colors"
            aria-label={`Editar tasa de ${tasa.codigo_moneda || moneda?.codigo}`}
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onEliminar(tasa)}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            aria-label={`Eliminar tasa de ${tasa.codigo_moneda || moneda?.codigo}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
});

export default function TasasCambioPage(): ReactElement {
  const [tasas, setTasas] = useState<TasaCambio[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [tasasActuales, setTasasActuales] = useState<Record<string, TasaCambioActual>>({});
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<TasaCambio | null>(null);

  const loadData = useCallback(async () => {
    setCargando(true);
    try {
      const [tasasData, monedasData, actualesData] = await Promise.all([
        getTasasCambio(),
        getMonedas(),
        getTasasCambioActual(),
      ]);
      setTasas(tasasData);
      setMonedas(monedasData);
      setTasasActuales(actualesData);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('Error al cargar las tasas de cambio.');
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

  const abrirEditar = useCallback((tasa: TasaCambio) => {
    setEditando(tasa);
    setModalAbierto(true);
  }, []);

  const eliminar = useCallback(
    async (tasa: TasaCambio) => {
      if (
        !window.confirm(
          `¿Eliminar la tasa de ${tasa.codigo_moneda || tasa.moneda} del ${new Date(tasa.fecha).toLocaleDateString('es-VE')}?`,
        )
      )
        return;
      try {
        await deleteTasaCambio(tasa.id);
        toast.success('Tasa de cambio eliminada.');
        loadData();
      } catch (error) {
        const messages = getApiErrorMessages(error);
        if (messages.length > 0) {
          messages.forEach((msg) => toast.error(msg));
        } else {
          toast.error('Error al eliminar la tasa de cambio.');
        }
      }
    },
    [loadData],
  );

  const tasaVigente = useMemo(() => {
    const activas = tasas.filter((t) => t.activa);
    activas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return activas[0] ?? null;
  }, [tasas]);

  const entradasActuales = useMemo(
    () => Object.values(tasasActuales).sort((a, b) => a.codigo.localeCompare(b.codigo)),
    [tasasActuales],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tasas de Cambio</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registra el historial de tasas y consulta las tasas vigentes por moneda.
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
        >
          <Plus size={18} /> Nueva Tasa
        </button>
      </div>

      {/* Tasa vigente destacada */}
      {tasaVigente && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3">
          <Star className="text-emerald-500 shrink-0" size={20} />
          <div className="text-sm text-emerald-800">
            <strong>Tasa vigente:</strong> 1 {tasaVigente.codigo_moneda || 'moneda'} ={' '}
            <span className="font-mono font-bold">{parseDecimal(tasaVigente.tasa).toFixed(6)}</span>{' '}
            (fuente: {tasaVigente.fuente || 'N/A'}, fecha:{' '}
            {new Date(tasaVigente.fecha).toLocaleDateString('es-VE')})
          </div>
        </div>
      )}

      {/* Panel de tasas actuales */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Landmark size={18} /> Tasas Actuales por Moneda
        </h2>
        {entradasActuales.length === 0 ? (
          <p className="text-sm text-slate-400">No hay tasas actuales registradas.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {entradasActuales.map((item) => (
              <div
                key={item.codigo}
                className="border rounded-xl p-4 flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{item.codigo}</span>
                  {item.es_base && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                      <Star size={10} /> Base
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500">{item.nombre}</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-lg font-black text-primary-700 font-mono">
                    {item.tasa ? parseDecimal(item.tasa).toFixed(6) : '—'}
                  </span>
                  {item.simbolo && <span className="text-xs text-slate-400">{item.simbolo}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Repeat size={18} /> Historial de Tasas
          </h2>
        </div>
        {cargando ? (
          <div className="flex items-center justify-center h-48 text-slate-500">
            <Loader2 size={24} className="animate-spin mr-2" /> Cargando historial...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-4 pl-6">Fecha</th>
                  <th className="p-4">Moneda</th>
                  <th className="p-4">Tasa</th>
                  <th className="p-4">Fuente</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasas.map((tasa) => (
                  <TasaRow
                    key={tasa.id}
                    tasa={tasa}
                    monedas={monedas}
                    onEditar={abrirEditar}
                    onEliminar={eliminar}
                  />
                ))}
                {tasas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                      No hay tasas de cambio registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAbierto && (
        <TasaCambioModal
          tasa={editando}
          monedas={monedas}
          onClose={() => setModalAbierto(false)}
          onSaved={() => {
            setModalAbierto(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
