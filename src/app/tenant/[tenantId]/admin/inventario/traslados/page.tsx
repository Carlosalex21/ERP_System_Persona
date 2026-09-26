"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Shuffle } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { DataTable, Badge, PageHeader, Card, TableSkeleton } from '@/components/ui';
import { getTraslados } from '@/services/inventoryService';
import type { TrasladoInventario } from '@/types/api';
import TrasladoModal from './TrasladoModal';

export default function TrasladosInventarioPage(): ReactElement {
  const [traslados, setTraslados] = useState<TrasladoInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);

  const cargar = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      const data = await getTraslados();
      setTraslados(data);
    } catch {
      toast.error('No se pudieron cargar los traslados de inventario.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const columns = useMemo<ColumnDef<TrasladoInventario>[]>(() => [
    {
      accessorKey: 'fecha_creacion',
      header: 'Fecha',
      cell: ({ row }) => (
        <span className="text-slate-600">
          {new Date(row.original.fecha_creacion).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      ),
    },
    {
      id: 'ruta',
      header: 'Ruta',
      enableSorting: false,
      cell: ({ row }) => (
        <Badge tone="primary">
          <span className="inline-flex items-center gap-1">
            {row.original.almacen_origen_nombre} <Shuffle size={12} /> {row.original.almacen_destino_nombre}
          </span>
        </Badge>
      ),
    },
    {
      id: 'lineas',
      header: () => <div className="text-center">Líneas</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-center font-bold text-slate-700">{row.original.detalles.length}</div>
      ),
    },
    {
      id: 'unidades',
      header: () => <div className="text-center">Unidades</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-center font-mono text-slate-600">
          {row.original.detalles.reduce((acc, d) => acc + d.cantidad, 0)}
        </div>
      ),
    },
    {
      accessorKey: 'observaciones',
      header: 'Observaciones',
      enableSorting: false,
      cell: ({ row }) => <span className="text-slate-500 text-xs">{row.original.observaciones || '—'}</span>,
    },
    {
      accessorKey: 'usuario_nombre',
      header: 'Registrado por',
      enableSorting: false,
      cell: ({ row }) => <span className="text-slate-500 text-xs">{row.original.usuario_nombre || '—'}</span>,
    },
  ], []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Shuffle size={20} />}
        title="Traslados entre Almacenes"
        description="Mueve stock de un almacén a otro de forma inmediata y directa: al guardar, el traslado ya se aplicó -- no hay un estado 'en tránsito' pendiente de confirmación."
        actions={
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setModalAbierto(true)}
            className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md shrink-0"
          >
            <Plus size={18} /> Nuevo Traslado
          </motion.button>
        }
      />

      {cargando ? (
        <TableSkeleton rows={6} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable
            columns={columns}
            data={traslados}
            resultLabel="traslados"
            emptyState={
              <div className="p-12 text-center text-slate-400 text-sm">
                Aún no has registrado ningún traslado entre almacenes.
              </div>
            }
          />
        </Card>
      )}

      {modalAbierto && (
        <TrasladoModal
          onClose={() => setModalAbierto(false)}
          onSaved={() => {
            setModalAbierto(false);
            cargar();
          }}
        />
      )}
    </div>
  );
}
