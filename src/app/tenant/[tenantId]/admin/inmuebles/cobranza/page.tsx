"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Ban, Download, FilePlus2, HandCoins, Search, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { Badge, Card, ConfirmDialog, DataTable, EmptyState, PageHeader, TableSkeleton } from '@/components/ui';
import { useListaPaginada } from '@/hooks/useListaPaginada';
import { anularCargo, anularRecibo, getPaginaCargos, getPaginaRecibos, pdfRecibo, type Cargo, type Recibo } from '@/services/inmueblesService';
import { toastApiError } from '@/utils/errors';
import { ETIQUETA_METODO, fechaCorta, periodoLabel, usd } from '@/components/inmuebles/formato';
import RegistrarPagoModal from './RegistrarPagoModal';
import NuevoCargoModal from './NuevoCargoModal';

type Pestana = 'deudas' | 'recibos';
type FiltroDeuda = 'pendiente' | 'vencido' | 'pagado';

const chip = (activo: boolean): string => `px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${activo ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`;

export default function CobranzaPage(): ReactElement {
  const [pestana, setPestana] = useState<Pestana>('deudas');
  const [filtroDeuda, setFiltroDeuda] = useState<FiltroDeuda>('pendiente');
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [pagando, setPagando] = useState<{ unidad: number | null; cargo: number | null } | null>(null);
  const [nuevoCargo, setNuevoCargo] = useState(false);
  const [cargoAnular, setCargoAnular] = useState<Cargo | null>(null);
  const [reciboAnular, setReciboAnular] = useState<Recibo | null>(null);
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBusqueda(textoBusqueda.trim()), 350);
    return () => clearTimeout(t);
  }, [textoBusqueda]);

  const filtrosDeuda = useMemo(() => ({
    search: busqueda || undefined,
    estado: filtroDeuda === 'pagado' ? 'pagado' : 'pendiente',
    vencido: filtroDeuda === 'vencido' ? '1' : undefined,
    ordering: filtroDeuda === 'pagado' ? '-fecha_vencimiento' : 'fecha_vencimiento',
  }), [busqueda, filtroDeuda]);
  const cargarDeudas = useCallback((p: number) => getPaginaCargos(filtrosDeuda, p), [filtrosDeuda]);
  const deudas = useListaPaginada<Cargo>(cargarDeudas);

  const filtrosRecibo = useMemo(() => ({ search: busqueda || undefined, ordering: '-fecha' }), [busqueda]);
  const cargarRecibos = useCallback((p: number) => getPaginaRecibos(filtrosRecibo, p), [filtrosRecibo]);
  const recibos = useListaPaginada<Recibo>(cargarRecibos);

  useEffect(() => { if (deudas.error) toastApiError(deudas.error, 'No se pudieron cargar las deudas.'); }, [deudas.error]);
  useEffect(() => { if (recibos.error) toastApiError(recibos.error, 'No se pudieron cargar los recibos.'); }, [recibos.error]);

  const alCambiar = (): void => { void deudas.recargar(); void recibos.recargar(); };

  const confirmarAnularCargo = async (): Promise<void> => {
    if (!cargoAnular) return;
    setProcesando(true);
    try {
      await anularCargo(cargoAnular.id);
      toast.success('Cobro anulado.');
      setCargoAnular(null);
      alCambiar();
    } catch (e) {
      toastApiError(e, 'No se pudo anular el cobro.');
    } finally {
      setProcesando(false);
    }
  };

  const confirmarAnularRecibo = async (): Promise<void> => {
    if (!reciboAnular) return;
    if (!motivo.trim()) return void toast.error('Indica el motivo de la anulación.');
    setProcesando(true);
    try {
      await anularRecibo(reciboAnular.id, motivo.trim());
      toast.success('Recibo anulado; las deudas vuelven a quedar pendientes.');
      setReciboAnular(null);
      setMotivo('');
      alCambiar();
    } catch (e) {
      toastApiError(e, 'No se pudo anular el recibo.');
    } finally {
      setProcesando(false);
    }
  };

  const columnasDeuda = useMemo<ColumnDef<Cargo>[]>(() => [
    { header: 'Unidad', cell: ({ row }) => <div><p className="font-bold text-slate-800">{row.original.unidad_codigo}</p><p className="text-[11px] text-slate-400">{row.original.edificio_nombre ?? row.original.pagador_nombre ?? ''}</p></div> },
    { header: 'Concepto', cell: ({ row }) => <div><p className="text-slate-700">{row.original.concepto}</p><p className="text-[11px] text-slate-400">{row.original.tipo_display} · {periodoLabel(row.original.periodo)}</p></div> },
    { header: 'Responsable', cell: ({ row }) => <span className="text-slate-600">{row.original.pagador_nombre ?? '—'}</span> },
    { header: 'Vence', cell: ({ row }) => <span className={row.original.vencido ? 'text-red-600 font-bold' : 'text-slate-600'}>{fechaCorta(row.original.fecha_vencimiento)}</span> },
    { header: 'Monto', cell: ({ row }) => <span className="font-mono tabular-nums">{usd(row.original.monto_usd)}</span> },
    { header: 'Saldo', cell: ({ row }) => <span className={`font-mono tabular-nums font-bold ${Number(row.original.saldo_usd) > 0 ? 'text-slate-900' : 'text-green-600'}`}>{usd(row.original.saldo_usd)}</span> },
    { header: 'Estado', cell: ({ row }) => <Badge tone={row.original.estado === 'pagado' ? 'green' : row.original.vencido ? 'red' : 'amber'}>{row.original.estado === 'pagado' ? 'Pagada' : row.original.vencido ? 'Vencida' : 'Pendiente'}</Badge> },
    {
      id: 'acciones', header: '',
      cell: ({ row }) => row.original.estado === 'pendiente' ? (
        <div className="flex justify-end gap-1">
          <button onClick={() => setPagando({ unidad: row.original.unidad, cargo: row.original.id })} className="px-2.5 py-1.5 text-xs font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg">Cobrar</button>
          {Number(row.original.monto_pagado_usd) === 0 && <button onClick={() => setCargoAnular(row.original)} className="p-2 text-slate-400 hover:text-red-500" title="Anular cobro" aria-label="Anular cobro"><Ban size={16} /></button>}
        </div>
      ) : null,
    },
  ], []);

  const columnasRecibo = useMemo<ColumnDef<Recibo>[]>(() => [
    { header: 'Recibo', cell: ({ row }) => <div><p className="font-bold text-slate-800">{row.original.numero}</p><p className="text-[11px] text-slate-400">{fechaCorta(row.original.fecha)}</p></div> },
    { header: 'Unidad', cell: ({ row }) => <div><p className="font-semibold text-slate-700">{row.original.unidad_codigo}</p><p className="text-[11px] text-slate-400">{row.original.pagador_nombre ?? row.original.edificio_nombre ?? ''}</p></div> },
    { header: 'Método', cell: ({ row }) => <div><p className="text-slate-700">{ETIQUETA_METODO[row.original.metodo] ?? row.original.metodo_display}</p><p className="text-[11px] text-slate-400">{row.original.referencia ? `Ref. ${row.original.referencia}` : row.original.banco}</p></div> },
    { header: 'Pagó', cell: ({ row }) => <span className="font-mono tabular-nums text-slate-600">{Number(row.original.monto_pago).toLocaleString('es-VE', { minimumFractionDigits: 2 })} {row.original.moneda_pago}</span> },
    { header: 'Equivale', cell: ({ row }) => <span className="font-mono tabular-nums font-bold text-slate-900">{usd(row.original.monto_usd)}</span> },
    { header: 'Estado', cell: ({ row }) => <Badge tone={row.original.estado === 'confirmado' ? 'green' : 'red'}>{row.original.estado === 'confirmado' ? 'Confirmado' : 'Anulado'}</Badge> },
    {
      id: 'acciones', header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => pdfRecibo(row.original.id, row.original.numero).catch((e) => toastApiError(e, 'No se pudo generar el recibo.'))} className="p-2 text-slate-400 hover:text-primary-600" title="Ver recibo en PDF" aria-label={`Recibo ${row.original.numero}`}><Download size={16} /></button>
          {row.original.estado === 'confirmado' && <button onClick={() => { setMotivo(''); setReciboAnular(row.original); }} className="p-2 text-slate-400 hover:text-red-500" title="Anular recibo" aria-label="Anular recibo"><Ban size={16} /></button>}
        </div>
      ),
    },
  ], []);

  const activa = pestana === 'deudas' ? deudas : recibos;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Wallet size={20} />}
        title="Cobranza"
        description="Lo que se debe, lo que se ha cobrado y el registro de cada pago con su recibo."
        actions={
          <>
            <button onClick={() => setNuevoCargo(true)} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2"><FilePlus2 size={16} /> Nuevo cobro</button>
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => setPagando({ unidad: null, cargo: null })} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2 shadow-md"><HandCoins size={18} /> Registrar pago</motion.button>
          </>
        }
      />

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="flex gap-2">
          <button onClick={() => setPestana('deudas')} className={chip(pestana === 'deudas')}>Deudas</button>
          <button onClick={() => setPestana('recibos')} className={chip(pestana === 'recibos')}>Recibos de pago</button>
        </div>
        {pestana === 'deudas' && (
          <div className="flex gap-2 lg:ml-2">
            <button onClick={() => setFiltroDeuda('pendiente')} className={chip(filtroDeuda === 'pendiente')}>Pendientes</button>
            <button onClick={() => setFiltroDeuda('vencido')} className={chip(filtroDeuda === 'vencido')}>Vencidas</button>
            <button onClick={() => setFiltroDeuda('pagado')} className={chip(filtroDeuda === 'pagado')}>Pagadas</button>
          </div>
        )}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={textoBusqueda} onChange={(e) => setTextoBusqueda(e.target.value)} placeholder={pestana === 'deudas' ? 'Buscar por unidad, persona o concepto...' : 'Buscar por recibo, referencia o unidad...'} className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white" />
        </div>
      </div>

      {activa.cargando && activa.items.length === 0 ? (
        <TableSkeleton rows={6} />
      ) : activa.total === 0 && !busqueda && (pestana === 'recibos' || filtroDeuda === 'pendiente') ? (
        <EmptyState
          icon={<Wallet size={28} />}
          title={pestana === 'deudas' ? 'No hay deudas pendientes' : 'Aún no hay pagos registrados'}
          description={pestana === 'deudas' ? 'Cuando emitas los recibos del mes o los cánones de alquiler, las deudas aparecerán aquí.' : 'Registra el primer pago para generar su recibo.'}
          action={<button onClick={() => setPagando({ unidad: null, cargo: null })} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2"><HandCoins size={16} /> Registrar pago</button>}
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          {pestana === 'deudas' ? (
            <DataTable
              key="deudas" columns={columnasDeuda} data={deudas.items} resultLabel="deudas"
              paginacionServidor={{ pagina: deudas.pagina, totalPaginas: deudas.totalPaginas, total: deudas.total, onCambiarPagina: deudas.irAPagina, cargando: deudas.cargando }}
              emptyState={<div className="p-10 text-center text-sm text-slate-400">Ninguna deuda coincide con el filtro.</div>}
            />
          ) : (
            <DataTable
              key="recibos" columns={columnasRecibo} data={recibos.items} resultLabel="recibos"
              paginacionServidor={{ pagina: recibos.pagina, totalPaginas: recibos.totalPaginas, total: recibos.total, onCambiarPagina: recibos.irAPagina, cargando: recibos.cargando }}
              emptyState={<div className="p-10 text-center text-sm text-slate-400">Ningún recibo coincide con la búsqueda.</div>}
            />
          )}
        </Card>
      )}

      {pagando && <RegistrarPagoModal unidadInicial={pagando.unidad} cargoInicial={pagando.cargo} onClose={() => setPagando(null)} onSaved={() => { setPagando(null); setPestana('recibos'); alCambiar(); }} />}
      {nuevoCargo && <NuevoCargoModal onClose={() => setNuevoCargo(false)} onSaved={() => { setNuevoCargo(false); setPestana('deudas'); alCambiar(); }} />}
      <ConfirmDialog
        isOpen={!!cargoAnular}
        title="Anular cobro"
        message={`¿Anular "${cargoAnular?.concepto}" de ${cargoAnular?.unidad_codigo}? Dejará de contar como deuda.`}
        confirmLabel="Anular" danger loading={procesando}
        onConfirm={confirmarAnularCargo} onCancel={() => setCargoAnular(null)}
      />
      <ConfirmDialog
        isOpen={!!reciboAnular}
        title="Anular recibo"
        message={<div><p>¿Anular el recibo {reciboAnular?.numero}? Las deudas que pagaba vuelven a quedar pendientes.</p><input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo de la anulación *" className="mt-3 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>}
        confirmLabel="Anular recibo" danger loading={procesando}
        onConfirm={confirmarAnularRecibo} onCancel={() => setReciboAnular(null)}
      />
    </div>
  );
}
