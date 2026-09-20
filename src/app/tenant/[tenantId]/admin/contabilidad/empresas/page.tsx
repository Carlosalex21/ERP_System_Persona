"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Building2, Pencil, Trash2, Receipt, History } from 'lucide-react';
import { PageHeader, Card, EmptyState, TableSkeleton, DataTable, ActionButton, ConfirmDialog } from '@/components/ui';
import { getEmpresasContables, deleteEmpresaContable, type EmpresaContable } from '@/services/contabilidadService';
import { useNotify } from '@/hooks/useNotify';
import EmpresaContableModal from './components/EmpresaContableModal';
import FacturarHonorariosModal from './components/FacturarHonorariosModal';
import HistorialFacturasModal from './components/HistorialFacturasModal';

export default function EmpresasContablesPage(): ReactElement {
  const notify = useNotify();
  const [empresas, setEmpresas] = useState<EmpresaContable[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<EmpresaContable | null>(null);
  const [empresaAEliminar, setEmpresaAEliminar] = useState<EmpresaContable | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [empresaAFacturar, setEmpresaAFacturar] = useState<EmpresaContable | null>(null);
  const [empresaHistorial, setEmpresaHistorial] = useState<EmpresaContable | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setEmpresas(await getEmpresasContables());
    } catch {
      notify.error('No se pudieron cargar las empresas.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const confirmarEliminar = async (): Promise<void> => {
    if (!empresaAEliminar) return;
    setEliminando(true);
    try {
      await deleteEmpresaContable(empresaAEliminar.id);
      notify.success('Empresa eliminada.');
      setEmpresaAEliminar(null);
      cargar();
    } catch {
      notify.error('No se pudo eliminar la empresa.');
    } finally {
      setEliminando(false);
    }
  };

  const columns = useMemo<ColumnDef<EmpresaContable>[]>(() => [
    {
      accessorKey: 'nombre',
      header: 'Empresa',
      cell: ({ row }) => (
        <div>
          <p className="font-bold text-slate-900">{row.original.nombre}</p>
          {row.original.identificacion_fiscal && <p className="text-xs font-mono text-slate-400">{row.original.identificacion_fiscal}</p>}
        </div>
      ),
    },
    {
      id: 'cliente',
      header: 'Cliente vinculado',
      cell: ({ row }) => row.original.cliente_nombre
        ? <span className="text-sm text-slate-600">{row.original.cliente_nombre}</span>
        : <span className="text-xs text-slate-300">Sin vincular</span>,
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end items-center gap-1">
          {row.original.cliente ? (
            <>
              <button
                onClick={() => setEmpresaHistorial(row.original)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary-600 mr-2"
              >
                <History size={14} /> Historial
              </button>
              <button
                onClick={() => setEmpresaAFacturar(row.original)}
                className="flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 mr-2"
              >
                <Receipt size={14} /> Facturar Honorarios
              </button>
            </>
          ) : (
            <span className="text-[11px] text-slate-300 mr-2" title="Vincula un cliente en Editar para poder facturarle">
              Sin cliente vinculado
            </span>
          )}
          <button onClick={() => { setEditando(row.original); setModalAbierto(true); }} className="p-2 text-slate-400 hover:text-primary-600" aria-label="Editar empresa">
            <Pencil size={16} />
          </button>
          <button onClick={() => setEmpresaAEliminar(row.original)} className="p-2 text-slate-400 hover:text-red-500" aria-label="Eliminar empresa">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [empresas]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Building2 size={20} />}
        title="Empresas (Clientes Contables)"
        description="Cada una lleva su propio plan de cuentas y libros -- independientes entre sí."
        actions={
          <ActionButton onClick={() => { setEditando(null); setModalAbierto(true); }}>
            <Plus size={16} /> Nueva Empresa
          </ActionButton>
        }
      />

      {loading ? (
        <TableSkeleton rows={5} />
      ) : empresas.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 size={28} />}
            title="Aún no tienes empresas registradas"
            description="Crea la primera empresa (cliente) para empezar a llevar su contabilidad."
            action={<ActionButton onClick={() => { setEditando(null); setModalAbierto(true); }}><Plus size={16} /> Crear primera empresa</ActionButton>}
          />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable columns={columns} data={empresas} resultLabel="empresas" />
        </Card>
      )}

      {modalAbierto && (
        <EmpresaContableModal
          empresa={editando}
          onClose={() => setModalAbierto(false)}
          onSaved={() => { setModalAbierto(false); cargar(); }}
        />
      )}

      <ConfirmDialog
        isOpen={!!empresaAEliminar}
        title="Eliminar Empresa"
        message={`¿Eliminar "${empresaAEliminar?.nombre}"? Su plan de cuentas y asientos quedarán fuera de este listado (no se borran del historial).`}
        confirmLabel="Eliminar"
        loading={eliminando}
        onConfirm={confirmarEliminar}
        onCancel={() => setEmpresaAEliminar(null)}
      />

      {empresaAFacturar && (
        <FacturarHonorariosModal
          empresa={empresaAFacturar}
          onClose={() => setEmpresaAFacturar(null)}
          onFacturado={() => setEmpresaAFacturar(null)}
        />
      )}

      {empresaHistorial && (
        <HistorialFacturasModal
          empresa={empresaHistorial}
          onClose={() => setEmpresaHistorial(null)}
        />
      )}
    </div>
  );
}
