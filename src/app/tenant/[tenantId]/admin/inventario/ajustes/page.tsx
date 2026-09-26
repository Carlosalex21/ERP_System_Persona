"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, ArrowLeftRight, PackagePlus, PackageMinus, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { DataTable, Badge, PageHeader, Card, TableSkeleton } from '@/components/ui';
import { getAjustesInventario } from '@/services/inventoryService';
import type { AjusteInventario } from '@/types/api';
import AjusteModal from './AjusteModal';
import AjusteEditModal from './AjusteEditModal';

export default function AjustesInventarioPage(): ReactElement {
  const [ajustes, setAjustes] = useState<AjusteInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [ajusteEditando, setAjusteEditando] = useState<AjusteInventario | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      const data = await getAjustesInventario();
      setAjustes(data);
    } catch {
      toast.error('No se pudieron cargar los ajustes de inventario.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const columns = useMemo<ColumnDef<AjusteInventario>[]>(() => [
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
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: ({ row }) => (
        <Badge tone={row.original.tipo === 'entrada' ? 'green' : 'red'}>
          <span className="inline-flex items-center gap-1">
            {row.original.tipo === 'entrada' ? <PackagePlus size={12} /> : <PackageMinus size={12} />}
            {row.original.tipo_display}
          </span>
        </Badge>
      ),
    },
    {
      accessorKey: 'motivo_display',
      header: 'Motivo',
      enableSorting: false,
      cell: ({ row }) => <span className="text-slate-700">{row.original.motivo_display}</span>,
    },
    {
      accessorKey: 'numero_documento',
      header: 'Documento',
      enableSorting: false,
      cell: ({ row }) => <span className="font-mono text-slate-500">{row.original.numero_documento || '—'}</span>,
    },
    {
      id: 'fecha_documento',
      header: 'Fecha del doc.',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-slate-500 text-xs">
          {row.original.fecha_documento
            ? new Date(row.original.fecha_documento + 'T00:00:00').toLocaleDateString('es-VE')
            : '—'}
        </span>
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
      accessorKey: 'usuario_nombre',
      header: 'Registrado por',
      enableSorting: false,
      cell: ({ row }) => <span className="text-slate-500 text-xs">{row.original.usuario_nombre || '—'}</span>,
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setAjusteEditando(row.original)}
            className="p-2 text-slate-400 hover:text-primary-600 transition-colors"
            aria-label="Corregir ajuste"
          >
            <Pencil size={15} />
          </button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<ArrowLeftRight size={20} />}
        title="Ajustes de Inventario"
        description="Registra entradas o salidas manuales de stock -- ej. mercancía recibida con nota de entrega (sin factura) o correcciones tras un conteo físico. Los productos que agregues en un mismo ajuste se aplican todos juntos, de una sola vez."
        actions={
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setModalAbierto(true)}
            className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md shrink-0"
          >
            <Plus size={18} /> Nuevo Ajuste
          </motion.button>
        }
      />

      {cargando ? (
        <TableSkeleton rows={6} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable
            columns={columns}
            data={ajustes}
            resultLabel="ajustes"
            emptyState={
              <div className="p-12 text-center text-slate-400 text-sm">
                Aún no has registrado ningún ajuste de inventario.
              </div>
            }
          />
        </Card>
      )}

      {modalAbierto && (
        <AjusteModal
          onClose={() => setModalAbierto(false)}
          onSaved={() => {
            setModalAbierto(false);
            cargar();
          }}
        />
      )}

      {ajusteEditando && (
        <AjusteEditModal
          ajuste={ajusteEditando}
          onClose={() => setAjusteEditando(null)}
          onSaved={(actualizado) => {
            setAjustes((prev) => prev.map((a) => (a.id === actualizado.id ? actualizado : a)));
            setAjusteEditando(null);
          }}
        />
      )}
    </div>
  );
}
