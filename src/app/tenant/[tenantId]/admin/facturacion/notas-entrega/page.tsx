"use client";

/**
 * @file Notas de entrega: mercancía ya entregada (stock ya descontado, ver
 * `inventario_afectado`) pero todavía sin facturar fiscalmente -- para
 * ventas a crédito donde el cliente confirma o se factura recién en cierta
 * fecha. Se crean desde el POS (condición de pago "Nota de entrega"); esta
 * pantalla es donde luego se convierten en factura real (le asigna
 * correlativo) o se anulan (restaura el stock).
 */

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Truck, FileCheck, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { Factura, Cliente } from '@/types/api';
import { getNotasEntrega, convertirNotaEntregaAFactura, anularFactura } from '@/services/facturacionService';
import { getClientes } from '@/services/clientesService';
import { getApiErrorMessages, parseDecimal } from '@/utils/helpers';
import { DataTable, PageHeader, Card, TableSkeleton, ConfirmDialog } from '@/components/ui';

export default function NotasEntregaPage(): ReactElement {
  const [notas, setNotas] = useState<Factura[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [notaAConvertir, setNotaAConvertir] = useState<Factura | null>(null);
  const [condicionElegida, setCondicionElegida] = useState<'contado' | 'credito'>('credito');
  const [convirtiendo, setConvirtiendo] = useState(false);
  const [notaAAnular, setNotaAAnular] = useState<Factura | null>(null);
  const [anulando, setAnulando] = useState(false);

  const loadData = useCallback(async () => {
    setCargando(true);
    try {
      const [notasData, clientesData] = await Promise.all([getNotasEntrega(), getClientes()]);
      setNotas(notasData);
      setClientes(clientesData);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      messages.forEach((msg) => toast.error(msg));
      if (messages.length === 0) toast.error('No se pudieron cargar las notas de entrega.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const nombreCliente = useCallback(
    (id?: number | null) => clientes.find((c) => c.id === id)?.nombre || 'Sin cliente',
    [clientes],
  );

  const confirmarConvertir = useCallback(async () => {
    if (!notaAConvertir) return;
    setConvirtiendo(true);
    try {
      await convertirNotaEntregaAFactura(notaAConvertir.id, condicionElegida);
      toast.success('Nota de entrega convertida en factura.');
      setNotaAConvertir(null);
      loadData();
    } catch (error) {
      const messages = getApiErrorMessages(error);
      messages.forEach((msg) => toast.error(msg));
      if (messages.length === 0) toast.error('No se pudo convertir la nota de entrega.');
    } finally {
      setConvirtiendo(false);
    }
  }, [notaAConvertir, condicionElegida, loadData]);

  const confirmarAnular = useCallback(async () => {
    if (!notaAAnular) return;
    setAnulando(true);
    try {
      await anularFactura(notaAAnular.id);
      toast.success('Nota de entrega anulada -- el stock fue restaurado.');
      setNotaAAnular(null);
      loadData();
    } catch (error) {
      const messages = getApiErrorMessages(error);
      messages.forEach((msg) => toast.error(msg));
      if (messages.length === 0) toast.error('No se pudo anular la nota de entrega.');
    } finally {
      setAnulando(false);
    }
  }, [notaAAnular, loadData]);

  const columns = useMemo<ColumnDef<Factura>[]>(() => [
    { accessorKey: 'correlativo', header: 'N°', cell: ({ row }) => <span className="font-mono text-xs text-slate-500">{row.original.correlativo || '—'}</span> },
    { id: 'cliente', header: 'Cliente', cell: ({ row }) => <span className="font-bold text-slate-800">{nombreCliente(row.original.cliente)}</span> },
    { accessorKey: 'fecha_operacion', header: 'Fecha', cell: ({ row }) => <span className="text-slate-600">{new Date(row.original.fecha_operacion).toLocaleDateString('es-VE')}</span> },
    {
      id: 'items',
      header: 'Ítems',
      enableSorting: false,
      cell: ({ row }) => <span className="text-slate-600">{row.original.detalles?.length ?? 0} línea(s)</span>,
    },
    {
      accessorKey: 'total',
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => (
        <div className="text-right font-black text-primary-700 font-mono">
          {row.original.moneda_codigo ? `${row.original.moneda_codigo} ` : ''}{parseDecimal(row.original.total).toFixed(2)}
        </div>
      ),
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => { setNotaAConvertir(row.original); setCondicionElegida('credito'); }}
            className="flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-800 px-2.5 py-1.5 rounded-lg hover:bg-primary-50"
          >
            <FileCheck size={14} /> Convertir a factura
          </button>
          <button
            type="button"
            onClick={() => setNotaAAnular(row.original)}
            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
            aria-label="Anular nota de entrega"
          >
            <Ban size={16} />
          </button>
        </div>
      ),
    },
  ], [nombreCliente]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Truck size={20} />}
        title="Notas de Entrega"
        description="Mercancía ya entregada (el stock ya salió) pendiente de facturar. Se crean desde el POS eligiendo 'Nota de entrega' como condición de pago."
      />

      {cargando ? (
        <TableSkeleton rows={6} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable
            columns={columns}
            data={notas}
            resultLabel="notas de entrega"
            emptyState={<div className="p-8 text-center text-slate-400 text-sm">No hay notas de entrega pendientes.</div>}
          />
        </Card>
      )}

      <ConfirmDialog
        isOpen={!!notaAConvertir}
        title="Convertir en factura"
        message={
          <div className="space-y-3">
            <p>Esta nota de entrega recibirá número de factura y de control fiscal. El stock no vuelve a descontarse -- ya salió al entregarse.</p>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Condición de pago</label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCondicionElegida('contado')}
                  className={`flex-1 py-2 transition-colors ${condicionElegida === 'contado' ? 'bg-primary-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                  Contado
                </button>
                <button
                  type="button"
                  onClick={() => setCondicionElegida('credito')}
                  className={`flex-1 py-2 transition-colors ${condicionElegida === 'credito' ? 'bg-primary-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                  Crédito
                </button>
              </div>
            </div>
          </div>
        }
        confirmLabel="Convertir"
        loading={convirtiendo}
        onConfirm={confirmarConvertir}
        onCancel={() => setNotaAConvertir(null)}
      />

      <ConfirmDialog
        isOpen={!!notaAAnular}
        title="Anular nota de entrega"
        message="Se anulará esta nota de entrega y se restaurará el stock que había descontado. Esta acción no se puede deshacer."
        confirmLabel="Anular"
        loading={anulando}
        onConfirm={confirmarAnular}
        onCancel={() => setNotaAAnular(null)}
      />
    </div>
  );
}
