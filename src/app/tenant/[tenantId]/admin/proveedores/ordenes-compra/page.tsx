"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, ClipboardList, Send, PackageCheck, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { DataTable, Badge, PageHeader, Card, TableSkeleton } from '@/components/ui';
import { getOrdenesCompra, enviarOrdenCompra, cancelarOrdenCompra } from '@/services/proveedoresService';
import { toastApiError } from '@/utils/errors';
import type { OrdenCompra, EstadoOrdenCompra } from '@/types/api';
import NuevaOrdenCompraModal from './NuevaOrdenCompraModal';
import RecepcionModal from './RecepcionModal';

type ToneBadge = 'green' | 'orange' | 'red' | 'slate' | 'amber' | 'primary';

const ETIQUETA_ESTADO: Record<EstadoOrdenCompra, { texto: string; tone: ToneBadge }> = {
  borrador: { texto: 'Borrador', tone: 'slate' },
  enviada: { texto: 'Enviada', tone: 'primary' },
  recibida_parcial: { texto: 'Recibida parcial', tone: 'amber' },
  recibida: { texto: 'Recibida completa', tone: 'green' },
  cancelada: { texto: 'Cancelada', tone: 'red' },
};

export default function OrdenesCompraPage(): ReactElement {
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalNueva, setModalNueva] = useState(false);
  const [ordenARecibir, setOrdenARecibir] = useState<OrdenCompra | null>(null);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      setOrdenes(await getOrdenesCompra());
    } catch {
      toast.error('No se pudieron cargar las órdenes de compra.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const enviar = async (orden: OrdenCompra): Promise<void> => {
    setProcesandoId(orden.id);
    try {
      await enviarOrdenCompra(orden.id);
      toast.success(`Orden OC-${orden.numero} marcada como enviada.`);
      await cargar();
    } catch (error) {
      toastApiError(error, 'No se pudo marcar como enviada.');
    } finally {
      setProcesandoId(null);
    }
  };

  const cancelar = async (orden: OrdenCompra): Promise<void> => {
    setProcesandoId(orden.id);
    try {
      await cancelarOrdenCompra(orden.id);
      toast.success(`Orden OC-${orden.numero} cancelada.`);
      await cargar();
    } catch (error) {
      toastApiError(error, 'No se pudo cancelar la orden.');
    } finally {
      setProcesandoId(null);
    }
  };

  const columns = useMemo<ColumnDef<OrdenCompra>[]>(() => [
    {
      accessorKey: 'numero',
      header: 'Orden',
      cell: ({ row }) => (
        <div>
          <p className="font-bold text-slate-900">OC-{row.original.numero}</p>
          <p className="text-xs text-slate-500">{row.original.proveedor_nombre}</p>
        </div>
      ),
    },
    {
      id: 'lineas',
      header: () => <div className="text-center">Líneas</div>,
      enableSorting: false,
      cell: ({ row }) => <div className="text-center font-bold text-slate-700">{row.original.detalles.length}</div>,
    },
    {
      id: 'avance',
      header: () => <div className="text-center">Avance</div>,
      enableSorting: false,
      cell: ({ row }) => {
        const pedida = row.original.detalles.reduce((acc, d) => acc + d.cantidad_pedida, 0);
        const recibida = row.original.detalles.reduce((acc, d) => acc + d.cantidad_recibida, 0);
        return <div className="text-center font-mono text-xs text-slate-500">{recibida} / {pedida}</div>;
      },
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => {
        const info = ETIQUETA_ESTADO[row.original.estado];
        return <Badge tone={info.tone}>{info.texto}</Badge>;
      },
    },
    { accessorKey: 'fecha_creacion', header: 'Creada', cell: ({ row }) => new Date(row.original.fecha_creacion).toLocaleDateString('es-VE', { timeZone: 'UTC' }) },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => {
        const orden = row.original;
        const procesando = procesandoId === orden.id;
        return (
          <div className="flex justify-end items-center gap-3">
            {orden.estado === 'borrador' && (
              <button onClick={() => enviar(orden)} disabled={procesando} className="flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 disabled:opacity-40">
                <Send size={13} /> Enviar
              </button>
            )}
            {(orden.estado === 'enviada' || orden.estado === 'recibida_parcial') && (
              <button onClick={() => setOrdenARecibir(orden)} className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700">
                <PackageCheck size={13} /> Recibir
              </button>
            )}
            {(orden.estado === 'borrador' || orden.estado === 'enviada') && (
              <button onClick={() => cancelar(orden)} disabled={procesando} className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 disabled:opacity-40">
                <XCircle size={13} /> Cancelar
              </button>
            )}
          </div>
        );
      },
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [procesandoId]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ClipboardList size={20} />}
        title="Órdenes de Compra"
        description="Pide formalmente a tu proveedor, recibe la mercancía cuando llegue (total o por partes) y compara lo pedido contra lo recibido -- cada recepción real mueve el inventario y genera su cuenta por pagar sola."
        actions={<motion.button whileTap={{ scale: 0.96 }} onClick={() => setModalNueva(true)} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"><Plus size={18} /> Nueva Orden</motion.button>}
      />

      {cargando ? (
        <TableSkeleton rows={5} />
      ) : ordenes.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-slate-400 text-sm">Aún no tienes órdenes de compra.</div>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable columns={columns} data={ordenes} resultLabel="órdenes" />
        </Card>
      )}

      {modalNueva && (
        <NuevaOrdenCompraModal onClose={() => setModalNueva(false)} onCreated={() => { setModalNueva(false); cargar(); }} />
      )}
      {ordenARecibir && (
        <RecepcionModal orden={ordenARecibir} onClose={() => setOrdenARecibir(null)} onSaved={() => { setOrdenARecibir(null); cargar(); }} />
      )}
    </div>
  );
}
