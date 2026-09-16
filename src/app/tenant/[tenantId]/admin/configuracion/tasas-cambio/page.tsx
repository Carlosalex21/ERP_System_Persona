"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Loader2, Pencil, Trash2, Repeat, Star, Landmark, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Moneda, TasaCambio } from '@/types/api';
import {
  getMonedas,
  getTasasCambio,
  getTasasCambioActual,
  deleteTasaCambio,
  actualizarTasaBcv,
  type TasaCambioActual,
} from '@/services/configuracionService';
import { getApiErrorMessages, parseDecimal } from '@/utils/helpers';
import { toastApiError } from '@/utils/errors';
import { DataTable, PageHeader, Card, CardHeader, TableSkeleton, Stagger, StaggerItem } from '@/components/ui';
import TasaCambioModal from './TasaCambioModal';

export default function TasasCambioPage(): ReactElement {
  const [tasas, setTasas] = useState<TasaCambio[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [tasasActuales, setTasasActuales] = useState<Record<string, TasaCambioActual>>({});
  const [cargando, setCargando] = useState(true);
  const [actualizandoBcv, setActualizandoBcv] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<TasaCambio | null>(null);

  const loadData = useCallback(async () => {
    setCargando(true);
    try {
      const [tasasRes, monedasRes, actualesRes] = await Promise.allSettled([
        getTasasCambio(),
        getMonedas(),
        getTasasCambioActual(),
      ]);
      if (tasasRes.status === 'fulfilled') setTasas(tasasRes.value);
      if (monedasRes.status === 'fulfilled') setMonedas(monedasRes.value);
      if (actualesRes.status === 'fulfilled') setTasasActuales(actualesRes.value);
      const fallo = [tasasRes, monedasRes, actualesRes].find(
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

  const actualizarDesdeBcv = useCallback(async () => {
    setActualizandoBcv(true);
    try {
      await actualizarTasaBcv();
      toast.success('Tasa oficial del BCV actualizada.');
      await loadData();
    } catch (error) {
      toastApiError(error, 'No se pudo consultar la tasa oficial del BCV. Solo aplica a tenants de Venezuela con USD configurado.');
    } finally {
      setActualizandoBcv(false);
    }
  }, [loadData]);

  const tasaVigente = useMemo(() => {
    const activas = tasas.filter((t) => t.activa);
    activas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return activas[0] ?? null;
  }, [tasas]);

  const entradasActuales = useMemo(
    () => Object.values(tasasActuales).sort((a, b) => a.codigo.localeCompare(b.codigo)),
    [tasasActuales],
  );

  const columns = useMemo<ColumnDef<TasaCambio>[]>(() => [
    {
      accessorKey: 'fecha',
      header: 'Fecha',
      cell: ({ row }) => (
        <span className="text-slate-600">{new Date(row.original.fecha).toLocaleDateString('es-VE')}</span>
      ),
    },
    {
      id: 'moneda',
      header: 'Moneda',
      cell: ({ row }) => {
        const moneda = monedas.find((m) => m.id === row.original.moneda);
        return (
          <span className="font-bold text-slate-900">
            {row.original.codigo_moneda || moneda?.codigo || row.original.moneda}
          </span>
        );
      },
    },
    {
      accessorKey: 'tasa',
      header: 'Tasa',
      cell: ({ row }) => <span className="font-mono text-slate-700">{parseDecimal(row.original.tasa).toFixed(6)}</span>,
    },
    {
      accessorKey: 'fuente',
      header: 'Fuente',
      cell: ({ row }) => <span className="text-slate-500">{row.original.fuente || '—'}</span>,
    },
    {
      accessorKey: 'activa',
      header: () => <div className="text-center">Estado</div>,
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.activa ? (
            <span className="px-2.5 py-1 rounded-lg font-bold text-xs border bg-green-50 text-green-700 border-green-200">
              Vigente
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg font-bold text-xs border bg-slate-50 text-slate-400 border-slate-200">
              Inactiva
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => {
        const moneda = monedas.find((m) => m.id === row.original.moneda);
        return (
          <div className="flex justify-end gap-1">
            <button
              onClick={() => abrirEditar(row.original)}
              className="p-2 text-slate-400 hover:text-primary-600 transition-colors"
              aria-label={`Editar tasa de ${row.original.codigo_moneda || moneda?.codigo}`}
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => eliminar(row.original)}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              aria-label={`Eliminar tasa de ${row.original.codigo_moneda || moneda?.codigo}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      },
    },
  ], [monedas, abrirEditar, eliminar]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Repeat size={20} />}
        title="Tasas de Cambio"
        description="Registra el historial de tasas y consulta las tasas vigentes por moneda. Para tenants de Venezuela, la tasa oficial del USD se trae sola del BCV una vez al día -- no hace falta cargarla a mano."
        actions={
          <div className="flex gap-2 shrink-0">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={actualizarDesdeBcv}
              disabled={actualizandoBcv}
              className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
              title="Solo aplica a tenants de Venezuela con USD configurado como moneda"
            >
              {actualizandoBcv ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              Actualizar desde BCV
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={abrirCrear}
              className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
            >
              <Plus size={18} /> Nueva Tasa
            </motion.button>
          </div>
        }
      />

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
      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><Landmark size={18} /> Tasas Actuales por Moneda</span>} />
        {entradasActuales.length === 0 ? (
          <p className="text-sm text-slate-400">No hay tasas actuales registradas.</p>
        ) : (
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {entradasActuales.map((item) => (
              <StaggerItem key={item.codigo}>
              <div className="border rounded-xl p-4 flex flex-col justify-between gap-2">
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
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </Card>

      {/* Historial */}
      {cargando ? (
        <TableSkeleton rows={6} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Repeat size={18} /> Historial de Tasas
            </h2>
          </div>
          <DataTable
            columns={columns}
            data={tasas}
            resultLabel="tasas"
            emptyState={<div className="p-8 text-center text-slate-400 text-sm">No hay tasas de cambio registradas.</div>}
          />
        </Card>
      )}

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
