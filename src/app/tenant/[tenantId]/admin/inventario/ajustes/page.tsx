"use client";

import { useState, useEffect, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, ArrowLeftRight, PackagePlus, PackageMinus, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';

import { DataTable, Badge, PageHeader, Card, TableSkeleton } from '@/components/ui';
import { getPaginaAjustesInventario } from '@/services/inventoryService';
import { useListaPaginada } from '@/hooks/useListaPaginada';
import { toastApiError } from '@/utils/errors';
import type { AjusteInventario } from '@/types/api';
import AjusteModal from './AjusteModal';
import AjusteEditModal from './AjusteEditModal';

export default function AjustesInventarioPage(): ReactElement {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [ajusteEditando, setAjusteEditando] = useState<AjusteInventario | null>(null);

  const lista = useListaPaginada<AjusteInventario>(getPaginaAjustesInventario);
  const { cargando, error: errorLista } = lista;

  useEffect(() => {
    if (errorLista) toastApiError(errorLista, 'No se pudieron cargar los ajustes de inventario.');
  }, [errorLista]);

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
        description="Movimientos internos de stock: conteos físicos, mermas, consumo propio e inventario inicial. Las compras a proveedores se registran en Compras > Facturas de compra. Los productos de un mismo ajuste se aplican todos juntos, de una sola vez."
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

      {cargando && lista.items.length === 0 ? (
        <TableSkeleton rows={6} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable
            columns={columns}
            data={lista.items}
            paginacionServidor={{
              pagina: lista.pagina,
              totalPaginas: lista.totalPaginas,
              total: lista.total,
              onCambiarPagina: lista.irAPagina,
              cargando,
            }}
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
            void lista.recargar();
          }}
        />
      )}

      {ajusteEditando && (
        <AjusteEditModal
          ajuste={ajusteEditando}
          onClose={() => setAjusteEditando(null)}
          onSaved={() => {
            setAjusteEditando(null);
            void lista.recargar(true);
          }}
        />
      )}
    </div>
  );
}
