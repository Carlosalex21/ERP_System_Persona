"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { Users, Plus, Pencil, Ban, ShieldCheck, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

import { PageHeader, Card, ActionButton, DataTable, TableSkeleton, Badge, ConfirmDialog } from '@/components/ui';
import { getClientes, desactivarCliente } from '@/services/clientesService';
import { getApiErrorMessages } from '@/utils/helpers';
import ClienteFormModal from '@/components/clientes/ClienteFormModal';
import type { Cliente } from '@/types/api';

/**
 * Módulo de Clientes (retail): antes solo se podían crear desde el alta
 * rápida del POS, sin forma de verlos todos juntos, editarlos (ej. marcar
 * "contribuyente especial" cuando el SENIAT califica a un cliente después
 * de registrado) ni fijarles días de crédito.
 */
export default function ClientesPage(): ReactElement {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [clienteADesactivar, setClienteADesactivar] = useState<Cliente | null>(null);
  const [desactivando, setDesactivando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setClientes(await getClientes());
    } catch (error) {
      const messages = getApiErrorMessages(error);
      messages.forEach((m) => toast.error(m));
      if (messages.length === 0) toast.error('No se pudieron cargar los clientes.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const clientesFiltrados = useMemo(() => {
    const texto = q.trim().toLowerCase();
    if (!texto) return clientes;
    return clientes.filter((c) =>
      c.nombre.toLowerCase().includes(texto) ||
      (c.documento || '').toLowerCase().includes(texto) ||
      (c.email || '').toLowerCase().includes(texto) ||
      (c.telefono || '').toLowerCase().includes(texto),
    );
  }, [clientes, q]);

  const abrirNuevo = useCallback(() => { setClienteEditando(null); setModalAbierto(true); }, []);
  const abrirEditar = useCallback((c: Cliente) => { setClienteEditando(c); setModalAbierto(true); }, []);

  const onGuardado = useCallback((cliente: Cliente) => {
    setModalAbierto(false);
    setClientes((prev) => {
      const existe = prev.some((c) => c.id === cliente.id);
      return existe ? prev.map((c) => (c.id === cliente.id ? cliente : c)) : [cliente, ...prev];
    });
  }, []);

  const confirmarDesactivar = useCallback(async () => {
    if (!clienteADesactivar) return;
    setDesactivando(true);
    try {
      await desactivarCliente(clienteADesactivar.id);
      toast.success('Cliente desactivado.');
      setClientes((prev) => prev.filter((c) => c.id !== clienteADesactivar.id));
      setClienteADesactivar(null);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      messages.forEach((m) => toast.error(m));
      if (messages.length === 0) toast.error('No se pudo desactivar el cliente.');
    } finally {
      setDesactivando(false);
    }
  }, [clienteADesactivar]);

  const columns = useMemo<ColumnDef<Cliente>[]>(() => [
    {
      id: 'nombre',
      header: 'Cliente',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">{row.original.nombre}</span>
          {row.original.contribuyente_especial && (
            <span title="Contribuyente especial" className="inline-flex text-primary-600"><ShieldCheck size={14} /></span>
          )}
        </div>
      ),
    },
    {
      id: 'documento',
      header: 'Documento',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-slate-500">
          {row.original.tipo_documento ? `${row.original.tipo_documento}-` : ''}{row.original.documento || '—'}
        </span>
      ),
    },
    { accessorKey: 'telefono', header: 'Teléfono', cell: ({ row }) => <span className="text-slate-600">{row.original.telefono || '—'}</span> },
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => <span className="text-slate-600">{row.original.email || '—'}</span> },
    {
      id: 'credito',
      header: 'Crédito',
      cell: ({ row }) => row.original.dias_credito
        ? <Badge tone="amber">{row.original.dias_credito} días</Badge>
        : <span className="text-slate-300">—</span>,
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <button type="button" onClick={() => abrirEditar(row.original)} className="p-2 text-slate-400 hover:text-primary-600 transition-colors" aria-label="Editar cliente">
            <Pencil size={15} />
          </button>
          <button type="button" onClick={() => setClienteADesactivar(row.original)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" aria-label="Desactivar cliente">
            <Ban size={15} />
          </button>
        </div>
      ),
    },
  ], [abrirEditar]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Users size={20} />}
        title="Clientes"
        description="Todos tus clientes en un solo lugar: datos de contacto, documento fiscal, contribuyente especial y días de crédito."
        actions={
          <div className="flex gap-2">
            <Link href="/admin/clientes/importar">
              <ActionButton variant="secondary"><Upload size={16} /> Importar</ActionButton>
            </Link>
            <ActionButton onClick={abrirNuevo}><Plus size={16} /> Nuevo Cliente</ActionButton>
          </div>
        }
      />

      <Card>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, documento, teléfono o email..."
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </Card>

      {cargando ? (
        <TableSkeleton rows={8} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable
            columns={columns}
            data={clientesFiltrados}
            pageSize={20}
            resultLabel="clientes"
            emptyState={<div className="p-12 text-center text-slate-400 text-sm">No hay clientes que coincidan con la búsqueda.</div>}
          />
        </Card>
      )}

      {modalAbierto && (
        <ClienteFormModal cliente={clienteEditando} onClose={() => setModalAbierto(false)} onSaved={onGuardado} />
      )}

      <ConfirmDialog
        isOpen={!!clienteADesactivar}
        title="Desactivar cliente"
        message={`¿Desactivar a "${clienteADesactivar?.nombre}"? Ya no aparecerá en el POS ni en los selectores, pero sus facturas y su historial se conservan.`}
        confirmLabel="Desactivar"
        loading={desactivando}
        onConfirm={confirmarDesactivar}
        onCancel={() => setClienteADesactivar(null)}
      />
    </div>
  );
}
