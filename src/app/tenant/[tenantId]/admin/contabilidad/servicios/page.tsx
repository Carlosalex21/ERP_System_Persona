"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Wrench, Pencil, Trash2 } from 'lucide-react';
import { PageHeader, Card, EmptyState, TableSkeleton, DataTable, ActionButton, ConfirmDialog } from '@/components/ui';
import { getProductos, deleteProducto } from '@/services/inventoryService';
import { useNotify } from '@/hooks/useNotify';
import type { Producto } from '@/types/api';
import ServicioFacturableModal from './components/ServicioFacturableModal';

export default function ServiciosFacturablesPage(): ReactElement {
  const notify = useNotify();
  const [servicios, setServicios] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [aEliminar, setAEliminar] = useState<Producto | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const lista = await getProductos();
      setServicios(lista.filter((p) => p.tipo === 'servicio'));
    } catch {
      notify.error('No se pudieron cargar los conceptos.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const confirmarEliminar = async (): Promise<void> => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await deleteProducto(aEliminar.id);
      notify.success('Concepto eliminado.');
      setAEliminar(null);
      cargar();
    } catch {
      notify.error('No se pudo eliminar el concepto.');
    } finally {
      setEliminando(false);
    }
  };

  const columns = useMemo<ColumnDef<Producto>[]>(() => [
    {
      accessorKey: 'nombre',
      header: 'Concepto',
      cell: ({ row }) => (
        <div>
          <p className="font-bold text-slate-900">{row.original.nombre}</p>
          {row.original.descripcion && <p className="text-xs text-slate-400 truncate max-w-md">{row.original.descripcion}</p>}
        </div>
      ),
    },
    {
      id: 'precio',
      header: 'Precio de referencia',
      cell: ({ row }) => (
        <span className="font-semibold text-slate-700">
          {row.original.moneda_codigo || '$'} {parseFloat(row.original.precio || '0').toFixed(2)}
        </span>
      ),
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => { setEditando(row.original); setModalAbierto(true); }} className="p-2 text-slate-400 hover:text-primary-600" aria-label="Editar concepto">
            <Pencil size={16} />
          </button>
          <button onClick={() => setAEliminar(row.original)} className="p-2 text-slate-400 hover:text-red-500" aria-label="Eliminar concepto">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [servicios]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Wrench size={20} />}
        title="Servicios y Honorarios"
        description="Los conceptos por los que facturas -- honorarios, declaraciones, asesorías. Elige entre estos al facturarle a una empresa."
        actions={
          <ActionButton onClick={() => { setEditando(null); setModalAbierto(true); }}>
            <Plus size={16} /> Nuevo Concepto
          </ActionButton>
        }
      />

      {loading ? (
        <TableSkeleton rows={5} />
      ) : servicios.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wrench size={28} />}
            title="Aún no tienes conceptos facturables"
            description="Crea el primero (ej. 'Honorarios Profesionales') para poder facturarlo a tus empresas."
            action={<ActionButton onClick={() => { setEditando(null); setModalAbierto(true); }}><Plus size={16} /> Crear primer concepto</ActionButton>}
          />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable columns={columns} data={servicios} resultLabel="conceptos" />
        </Card>
      )}

      {modalAbierto && (
        <ServicioFacturableModal
          servicio={editando}
          onClose={() => setModalAbierto(false)}
          onSaved={() => { setModalAbierto(false); cargar(); }}
        />
      )}

      <ConfirmDialog
        isOpen={!!aEliminar}
        title="Eliminar Concepto"
        message={`¿Eliminar "${aEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={eliminando}
        onConfirm={confirmarEliminar}
        onCancel={() => setAEliminar(null)}
      />
    </div>
  );
}
