"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowRight, Lock, Paperclip, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { Badge, Card, ConfirmDialog, DataTable, EmptyState, PageHeader, StatCard, TableSkeleton } from '@/components/ui';
import { eliminarGastoComun, getEdificios, getGastosComunes, getPeriodos, type Edificio, type GastoComun } from '@/services/inmueblesService';
import { toastApiError } from '@/utils/errors';
import { fechaCorta, opcionesPeriodos, periodoActual, periodoLabel, usd } from '@/components/inmuebles/formato';
import GastoModal from './GastoModal';

export default function GastosComunesPage(): ReactElement {
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [edificioId, setEdificioId] = useState('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const [gastos, setGastos] = useState<GastoComun[]>([]);
  const [emitido, setEmitido] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<GastoComun | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [aEliminar, setAEliminar] = useState<GastoComun | null>(null);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    getEdificios().then((lista) => {
      setEdificios(lista);
      setEdificioId((actual) => actual || (lista[0] ? String(lista[0].id) : ''));
      if (lista.length === 0) setCargando(false);
    }).catch((e) => { toastApiError(e, 'No se pudieron cargar los edificios.'); setCargando(false); });
  }, []);

  const cargar = useCallback(async (): Promise<void> => {
    if (!edificioId) return;
    setCargando(true);
    try {
      const [lista, periodos] = await Promise.all([
        getGastosComunes({ edificio: edificioId, periodo }),
        getPeriodos({ edificio: edificioId, periodo, estado: 'emitido' }),
      ]);
      setGastos(lista);
      setEmitido(periodos.length > 0);
    } catch (e) {
      toastApiError(e, 'No se pudieron cargar los gastos.');
    } finally {
      setCargando(false);
    }
  }, [edificioId, periodo]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos externos
  useEffect(() => { void cargar(); }, [cargar]);

  const edificio = edificios.find((e) => String(e.id) === edificioId) ?? null;
  const total = gastos.reduce((acc, g) => acc + Number(g.monto_usd), 0);
  const fondo = edificio ? (total * Number(edificio.fondo_reserva_pct)) / 100 : 0;

  const confirmarEliminar = async (): Promise<void> => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await eliminarGastoComun(aEliminar.id);
      toast.success('Gasto eliminado.');
      setAEliminar(null);
      void cargar();
    } catch (e) {
      toastApiError(e, 'No se pudo eliminar el gasto.');
      setAEliminar(null);
    } finally {
      setEliminando(false);
    }
  };

  const columns = useMemo<ColumnDef<GastoComun>[]>(() => [
    {
      accessorKey: 'descripcion',
      header: 'Gasto',
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-slate-900">{row.original.descripcion}</p>
          <p className="text-[11px] text-slate-400">{row.original.proveedor_nombre ?? 'Sin proveedor'}</p>
        </div>
      ),
    },
    { accessorKey: 'categoria_display', header: 'Categoría', cell: ({ row }) => <Badge tone="slate">{row.original.categoria_display}</Badge> },
    { accessorKey: 'fecha', header: 'Fecha', cell: ({ row }) => <span className="text-slate-600 tabular-nums">{fechaCorta(row.original.fecha)}</span> },
    {
      id: 'comprobante',
      header: 'Soporte',
      enableSorting: false,
      cell: ({ row }) => row.original.comprobante_url
        ? <a href={row.original.comprobante_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:underline"><Paperclip size={13} /> Ver</a>
        : <span className="text-slate-300">—</span>,
    },
    {
      accessorKey: 'monto_usd',
      header: () => <div className="text-right">Monto</div>,
      sortingFn: (a, b) => Number(a.original.monto_usd) - Number(b.original.monto_usd),
      cell: ({ row }) => <div className="text-right font-mono font-bold tabular-nums text-slate-900">{usd(row.original.monto_usd)}</div>,
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => emitido ? (
        <div className="flex justify-end text-slate-300" title="El mes ya fue emitido"><Lock size={15} /></div>
      ) : (
        <div className="flex justify-end gap-1">
          <button onClick={() => { setEditando(row.original); setModalAbierto(true); }} className="p-2 text-slate-400 hover:text-primary-600" aria-label="Editar gasto"><Pencil size={16} /></button>
          <button onClick={() => setAEliminar(row.original)} className="p-2 text-slate-400 hover:text-red-500" aria-label="Eliminar gasto"><Trash2 size={16} /></button>
        </div>
      ),
    },
  ], [emitido]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<ReceiptText size={20} />}
        title="Gastos comunes"
        description="Lo que gastó el edificio en el mes. Con esto se calcula la cuota de cada unidad."
        actions={
          <motion.button whileTap={{ scale: 0.96 }} disabled={!edificio || emitido} onClick={() => { setEditando(null); setModalAbierto(true); }} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2 shadow-md">
            <Plus size={18} /> Agregar gasto
          </motion.button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <select value={edificioId} onChange={(e) => setEdificioId(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white sm:w-64" aria-label="Edificio">
          {edificios.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white sm:w-52" aria-label="Mes">
          {opcionesPeriodos(18, 1).map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
        </select>
        {emitido && <Badge tone="green"><span className="inline-flex items-center gap-1"><Lock size={11} /> {periodoLabel(periodo)} ya emitido</span></Badge>}
      </div>

      {edificios.length === 0 && !cargando ? (
        <EmptyState icon={<ReceiptText size={28} />} title="Primero crea un edificio" description="Los gastos se cargan por edificio y por mes." action={<Link href="/admin/inmuebles/edificios" className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700">Ir a Edificios</Link>} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard label="Gastos del mes" value={usd(total)} color="bg-primary-600" icon={<ReceiptText size={20} />} note={`${gastos.length} gasto(s) cargados`} />
            <StatCard label="Fondo de reserva" value={usd(fondo)} color="bg-amber-500" icon={<Lock size={20} />} note={edificio ? `${edificio.fondo_reserva_pct} % de los gastos` : undefined} />
            <StatCard label="Total a repartir" value={usd(total + fondo)} color="bg-green-600" icon={<ArrowRight size={20} />} note="Entre las unidades, según su alícuota" />
          </div>

          {cargando ? (
            <TableSkeleton rows={5} />
          ) : gastos.length === 0 ? (
            <EmptyState icon={<ReceiptText size={28} />} title={`Sin gastos en ${periodoLabel(periodo)}`} description="Agrega la vigilancia, el aseo, el agua y lo demás que pagó el edificio este mes." />
          ) : (
            <Card padding="none" className="overflow-hidden"><DataTable columns={columns} data={gastos} resultLabel="gastos" pageSize={15} /></Card>
          )}

          {!emitido && gastos.length > 0 && (
            <div className="flex justify-end">
              <Link href={`/admin/inmuebles/periodos?edificio=${edificioId}&periodo=${periodo}`} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 shadow-md">
                Ver la distribución y emitir los recibos <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </>
      )}

      {modalAbierto && edificio && (
        <GastoModal edificio={edificio} periodo={periodo} gasto={editando} onClose={() => setModalAbierto(false)} onSaved={() => { setModalAbierto(false); void cargar(); }} />
      )}
      <ConfirmDialog isOpen={!!aEliminar} title="Eliminar gasto" message={`¿Eliminar "${aEliminar?.descripcion}"?`} confirmLabel="Eliminar" danger loading={eliminando} onConfirm={confirmarEliminar} onCancel={() => setAEliminar(null)} />
    </div>
  );
}
