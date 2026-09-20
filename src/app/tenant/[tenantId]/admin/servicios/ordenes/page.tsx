"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Wrench, Receipt, Share2 } from 'lucide-react';
import { PageHeader, Card, EmptyState, TableSkeleton, DataTable, ActionButton } from '@/components/ui';
import { getOrdenesServicio, updateOrdenServicio, type OrdenServicio, type EstadoOrdenServicio } from '@/services/serviciosService';
import { useNotify } from '@/hooks/useNotify';
import NuevaOrdenModal from './components/NuevaOrdenModal';
import CerrarOrdenModal from './components/CerrarOrdenModal';
import SeguimientoModal from './components/SeguimientoModal';

const ESTADOS: { valor: EstadoOrdenServicio; etiqueta: string; clase: string }[] = [
  { valor: 'recibido', etiqueta: 'Recibido', clase: 'bg-slate-100 text-slate-600 border-slate-200' },
  { valor: 'en_proceso', etiqueta: 'En Proceso', clase: 'bg-amber-50 text-amber-700 border-amber-200' },
  { valor: 'listo', etiqueta: 'Listo', clase: 'bg-sky-50 text-sky-700 border-sky-200' },
  { valor: 'entregado', etiqueta: 'Entregado', clase: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { valor: 'cancelado', etiqueta: 'Cancelado', clase: 'bg-red-50 text-red-700 border-red-200' },
];

export default function OrdenesServicioPage(): ReactElement {
  const notify = useNotify();
  const [ordenes, setOrdenes] = useState<OrdenServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNueva, setModalNueva] = useState(false);
  const [ordenACerrar, setOrdenACerrar] = useState<OrdenServicio | null>(null);
  const [ordenSeguimiento, setOrdenSeguimiento] = useState<OrdenServicio | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setOrdenes(await getOrdenesServicio());
    } catch {
      notify.error('No se pudieron cargar las órdenes de servicio.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiarEstado = async (orden: OrdenServicio, estado: EstadoOrdenServicio): Promise<void> => {
    try {
      await updateOrdenServicio(orden.id, { estado });
      notify.success('Estado actualizado.');
      cargar();
    } catch {
      notify.error('No se pudo actualizar el estado.');
    }
  };

  const columns = useMemo<ColumnDef<OrdenServicio>[]>(() => [
    {
      accessorKey: 'numero',
      header: 'Orden',
      cell: ({ row }) => (
        <div>
          <p className="font-bold text-slate-900">OS-{row.original.numero}</p>
          <p className="text-xs text-slate-500">{row.original.cliente_nombre}</p>
        </div>
      ),
    },
    { accessorKey: 'equipo', header: 'Equipo' },
    {
      id: 'estado',
      header: 'Estado',
      cell: ({ row }) => {
        const orden = row.original;
        if (orden.factura) {
          const e = ESTADOS.find((x) => x.valor === orden.estado);
          return <span className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${e?.clase}`}>{e?.etiqueta}</span>;
        }
        return (
          <select
            value={orden.estado}
            onChange={(e) => cambiarEstado(orden, e.target.value as EstadoOrdenServicio)}
            className="text-xs font-bold border rounded-lg px-2 py-1 bg-white"
          >
            {ESTADOS.map((e) => <option key={e.valor} value={e.valor}>{e.etiqueta}</option>)}
          </select>
        );
      },
    },
    { accessorKey: 'fecha_recepcion', header: 'Recibido', cell: ({ row }) => new Date(row.original.fecha_recepcion).toLocaleDateString() },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end items-center gap-3">
          <button
            onClick={() => setOrdenSeguimiento(row.original)}
            title="Compartir seguimiento con el cliente"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary-600"
          >
            <Share2 size={14} /> Seguimiento
          </button>
          {!row.original.factura && row.original.estado !== 'cancelado' && (
            <button
              onClick={() => setOrdenACerrar(row.original)}
              className="flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700"
            >
              <Receipt size={14} /> Facturar
            </button>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [ordenes]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Wrench size={20} />}
        title="Órdenes de Servicio"
        description="Gestiona los equipos que entran a tu taller, su estado y su facturación."
        actions={
          <ActionButton onClick={() => setModalNueva(true)}>
            <Plus size={16} /> Nueva Orden
          </ActionButton>
        }
      />

      {loading ? (
        <TableSkeleton rows={5} />
      ) : ordenes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wrench size={28} />}
            title="Aún no tienes órdenes de servicio"
            description="Crea la primera cuando entre un equipo a tu taller."
            action={<ActionButton onClick={() => setModalNueva(true)}><Plus size={16} /> Crear primera orden</ActionButton>}
          />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable columns={columns} data={ordenes} resultLabel="órdenes" />
        </Card>
      )}

      {modalNueva && (
        <NuevaOrdenModal onClose={() => setModalNueva(false)} onCreated={() => { setModalNueva(false); cargar(); }} />
      )}
      {ordenACerrar && (
        <CerrarOrdenModal
          orden={ordenACerrar}
          onClose={() => setOrdenACerrar(null)}
          onCerrada={() => { setOrdenACerrar(null); cargar(); }}
        />
      )}
      {ordenSeguimiento && (
        <SeguimientoModal orden={ordenSeguimiento} onClose={() => setOrdenSeguimiento(null)} />
      )}
    </div>
  );
}
