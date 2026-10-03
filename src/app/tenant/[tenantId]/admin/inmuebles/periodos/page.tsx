"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Ban, CheckCircle2, Eye, FileText, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { Badge, Card, ConfirmDialog, DataTable, EmptyState, PageHeader, TableSkeleton } from '@/components/ui';
import { useSession } from '@/context/SessionContext';
import {
  anularPeriodo, emitirPeriodo, getEdificios, getPeriodos, previsualizarPeriodo, type Edificio, type PeriodoCondominio, type VistaPreviaPeriodo,
} from '@/services/inmueblesService';
import { toastApiError } from '@/utils/errors';
import { fechaCorta, numero, opcionesPeriodos, periodoActual, periodoLabel, sumarMeses, usd } from '@/components/inmuebles/formato';
import CuotasPeriodoModal from './CuotasPeriodoModal';

export default function PeriodosPage(): ReactElement {
  const { usuario } = useSession();
  const esAdmin = usuario?.rol_codigo === 'admin';

  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [edificioId, setEdificioId] = useState('');
  const [periodo, setPeriodo] = useState(sumarMeses(periodoActual(), -1));
  const [vista, setVista] = useState<VistaPreviaPeriodo | null>(null);
  const [cargandoVista, setCargandoVista] = useState(false);
  const [historial, setHistorial] = useState<PeriodoCondominio[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [vencimiento, setVencimiento] = useState('');
  const [forzar, setForzar] = useState(false);
  const [confirmandoEmision, setConfirmandoEmision] = useState(false);
  const [emitiendo, setEmitiendo] = useState(false);
  const [verCuotas, setVerCuotas] = useState<PeriodoCondominio | null>(null);
  const [aAnular, setAAnular] = useState<PeriodoCondominio | null>(null);
  const [anulando, setAnulando] = useState(false);

  // Si se llega desde "Gastos comunes", respeta el edificio y mes que se estaban viendo.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos externos
    if (params.get('periodo')) setPeriodo(params.get('periodo') as string);
    getEdificios().then((lista) => {
      setEdificios(lista);
      const deUrl = params.get('edificio');
      setEdificioId(deUrl && lista.some((e) => String(e.id) === deUrl) ? deUrl : lista[0] ? String(lista[0].id) : '');
      if (lista.length === 0) setCargandoHistorial(false);
    }).catch((e) => toastApiError(e, 'No se pudieron cargar los edificios.'));
  }, []);

  const cargarVista = useCallback(async (): Promise<void> => {
    if (!edificioId) return;
    setCargandoVista(true);
    try {
      const v = await previsualizarPeriodo(Number(edificioId), periodo);
      setVista(v);
      setVencimiento(v.vencimiento_sugerido);
      setForzar(false);
    } catch (e) {
      setVista(null);
      toastApiError(e, 'No se pudo calcular la distribución.');
    } finally {
      setCargandoVista(false);
    }
  }, [edificioId, periodo]);

  const cargarHistorial = useCallback(async (): Promise<void> => {
    if (!edificioId) return;
    setCargandoHistorial(true);
    try {
      setHistorial(await getPeriodos({ edificio: edificioId }));
    } catch (e) {
      toastApiError(e, 'No se pudo cargar el historial.');
    } finally {
      setCargandoHistorial(false);
    }
  }, [edificioId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos externos
  useEffect(() => { void cargarVista(); }, [cargarVista]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos externos
  useEffect(() => { void cargarHistorial(); }, [cargarHistorial]);

  const emitir = async (): Promise<void> => {
    setEmitiendo(true);
    try {
      await emitirPeriodo({ edificio: Number(edificioId), periodo, fecha_vencimiento: vencimiento || undefined, forzar_alicuotas: forzar });
      toast.success(`Recibos de ${periodoLabel(periodo)} emitidos.`);
      setConfirmandoEmision(false);
      void cargarVista();
      void cargarHistorial();
    } catch (e) {
      toastApiError(e, 'No se pudieron emitir los recibos.');
      setConfirmandoEmision(false);
    } finally {
      setEmitiendo(false);
    }
  };

  const anular = async (): Promise<void> => {
    if (!aAnular) return;
    setAnulando(true);
    try {
      await anularPeriodo(aAnular.id);
      toast.success('Período anulado: ya puedes corregirlo y emitirlo de nuevo.');
      setAAnular(null);
      void cargarVista();
      void cargarHistorial();
    } catch (e) {
      toastApiError(e, 'No se pudo anular el período.');
      setAAnular(null);
    } finally {
      setAnulando(false);
    }
  };

  const columnas = useMemo<ColumnDef<PeriodoCondominio>[]>(() => [
    { accessorKey: 'periodo', header: 'Mes', cell: ({ row }) => <span className="font-bold text-slate-900">{periodoLabel(row.original.periodo)}</span> },
    { accessorKey: 'total_distribuido_usd', header: () => <div className="text-right">Repartido</div>, sortingFn: (a, b) => Number(a.original.total_distribuido_usd) - Number(b.original.total_distribuido_usd), cell: ({ row }) => <div className="text-right font-mono tabular-nums">{usd(row.original.total_distribuido_usd)}</div> },
    {
      id: 'cobrado',
      header: 'Cobrado',
      enableSorting: false,
      cell: ({ row }) => {
        const pct = Number(row.original.total_distribuido_usd) > 0 ? Math.min(100, (Number(row.original.cobrado_usd) / Number(row.original.total_distribuido_usd)) * 100) : 0;
        return (
          <div className="min-w-[130px]">
            <div className="flex justify-between text-[11px] mb-1"><span className="font-mono tabular-nums text-slate-600">{usd(row.original.cobrado_usd)}</span><span className="font-bold text-slate-400">{numero(pct, 0)} %</span></div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} /></div>
          </div>
        );
      },
    },
    { accessorKey: 'cuotas', header: () => <div className="text-center">Cuotas</div>, cell: ({ row }) => <div className="text-center tabular-nums text-slate-600">{row.original.cuotas}</div> },
    { accessorKey: 'fecha_vencimiento', header: 'Vence', cell: ({ row }) => <span className="text-slate-600 tabular-nums">{fechaCorta(row.original.fecha_vencimiento)}</span> },
    { accessorKey: 'estado', header: 'Estado', cell: ({ row }) => <Badge tone={row.original.estado === 'emitido' ? 'green' : 'red'}>{row.original.estado === 'emitido' ? 'Emitido' : 'Anulado'}</Badge> },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => row.original.estado === 'emitido' ? (
        <div className="flex justify-end gap-1">
          <button onClick={() => setVerCuotas(row.original)} className="p-2 text-slate-400 hover:text-primary-600" title="Ver cuotas y recibos" aria-label="Ver cuotas"><Eye size={16} /></button>
          {esAdmin && <button onClick={() => setAAnular(row.original)} className="p-2 text-slate-400 hover:text-red-500" title="Anular período" aria-label="Anular período"><Ban size={16} /></button>}
        </div>
      ) : null,
    },
  ], [esAdmin]);

  const edificio = edificios.find((e) => String(e.id) === edificioId) ?? null;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader icon={<FileText size={20} />} title="Recibos de condominio" description="Reparte los gastos del mes entre las unidades según su alícuota y emite la cuota de cada una." />

      {edificios.length === 0 && !cargandoHistorial ? (
        <EmptyState icon={<FileText size={28} />} title="Primero crea un edificio" action={<Link href="/admin/inmuebles/edificios" className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700">Ir a Edificios</Link>} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={edificioId} onChange={(e) => setEdificioId(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white sm:w-64" aria-label="Edificio">
              {edificios.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white sm:w-52" aria-label="Mes">
              {opcionesPeriodos(18, 1).map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
            </select>
          </div>

          {cargandoVista && !vista ? (
            <TableSkeleton rows={5} />
          ) : vista && (
            <Card padding="none" className="overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="font-black text-slate-900 text-lg">{periodoLabel(periodo)} · {edificio?.nombre}</h2>
                  <p className="text-xs text-slate-400">{vista.gastos_cantidad} gasto(s) cargado(s) · <Link href="/admin/inmuebles/gastos" className="font-bold text-primary-600 hover:underline">editar gastos</Link></p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-right">
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Gastos</p><p className="font-mono font-bold tabular-nums">{usd(vista.total_gastos_usd)}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Fondo reserva</p><p className="font-mono font-bold tabular-nums text-amber-600">{usd(vista.fondo_reserva_usd)}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">A repartir</p><p className="font-mono font-black tabular-nums text-primary-700">{usd(vista.total_a_distribuir_usd)}</p></div>
                </div>
              </div>

              {vista.advertencias.length > 0 && !vista.ya_emitido && (
                <div className="mx-5 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 space-y-1">
                  {vista.advertencias.map((a) => <p key={a} className="flex items-start gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0" /> {a}</p>)}
                </div>
              )}

              <div className="overflow-x-auto max-h-[46vh] overflow-y-auto mt-2">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50"><tr className="text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200"><th className="px-5 py-2.5 text-left">Unidad</th><th className="px-3 py-2.5 text-left">Responsable</th><th className="px-3 py-2.5 text-right">Alícuota</th><th className="px-5 py-2.5 text-right">Cuota (USD)</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {vista.unidades.map((u) => (
                      <tr key={u.unidad_id} className="hover:bg-slate-50">
                        <td className="px-5 py-2.5 font-bold text-slate-800">{u.codigo}</td>
                        <td className="px-3 py-2.5 text-slate-600">{u.responsable ?? <span className="text-amber-600 text-xs font-bold">Sin propietario</span>}</td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-500">{numero(u.alicuota, 4)} %</td>
                        <td className="px-5 py-2.5 text-right font-mono font-bold tabular-nums">{usd(u.monto_usd)}</td>
                      </tr>
                    ))}
                    {vista.unidades.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">No hay unidades con alícuota en este edificio.</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50/60">
                {vista.ya_emitido ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-sm font-bold text-green-700"><CheckCircle2 size={18} /> Este mes ya fue emitido: las cuotas están en la cobranza de cada unidad.</p>
                    <button onClick={() => { const p = historial.find((h) => h.periodo === periodo && h.estado === 'emitido'); if (p) setVerCuotas(p); }} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50">Ver cuotas y recibos</button>
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                    <div className="flex flex-wrap gap-4 items-end">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Vencimiento de las cuotas</label>
                        <input type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                      </div>
                      {!vista.alicuotas_completas && vista.unidades.length > 0 && (
                        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer pb-2">
                          <input type="checkbox" checked={forzar} onChange={(e) => setForzar(e.target.checked)} className="rounded border-slate-300 text-primary-600" />
                          Emitir igual repartiendo en proporción a las alícuotas que hay
                        </label>
                      )}
                    </div>
                    {esAdmin ? (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        disabled={vista.unidades.length === 0 || Number(vista.total_gastos_usd) <= 0 || (!vista.alicuotas_completas && !forzar)}
                        onClick={() => setConfirmandoEmision(true)}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 disabled:opacity-50 shadow-md"
                      >
                        <Send size={16} /> Emitir {vista.unidades.length} recibos
                      </motion.button>
                    ) : <p className="text-xs text-slate-400">Solo un administrador puede emitir los recibos.</p>}
                  </div>
                )}
              </div>
            </Card>
          )}

          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">Historial de {edificio?.nombre}</h2>
            {cargandoHistorial ? <TableSkeleton rows={3} /> : historial.length === 0 ? (
              <p className="text-sm text-slate-400 bg-white border border-slate-200 rounded-2xl p-6 text-center">Todavía no has emitido ningún mes de este edificio.</p>
            ) : (
              <Card padding="none" className="overflow-hidden"><DataTable columns={columnas} data={historial} resultLabel="períodos" pageSize={12} /></Card>
            )}
          </div>
        </>
      )}

      {verCuotas && <CuotasPeriodoModal periodo={verCuotas} onClose={() => setVerCuotas(null)} />}
      <ConfirmDialog
        isOpen={confirmandoEmision}
        title={`Emitir ${periodoLabel(periodo)}`}
        message={vista ? `Se crearán ${vista.unidades.length} cuotas por un total de ${usd(vista.total_a_distribuir_usd)}, con vencimiento el ${fechaCorta(vencimiento)}. Después de emitir no podrás cambiar los gastos de este mes (sí anular el período si nadie ha pagado).` : ''}
        confirmLabel="Emitir recibos"
        loading={emitiendo}
        onConfirm={emitir}
        onCancel={() => setConfirmandoEmision(false)}
      />
      <ConfirmDialog
        isOpen={!!aAnular}
        title="Anular período"
        message={`¿Anular ${aAnular ? periodoLabel(aAnular.periodo) : ''}? Se anulan todas sus cuotas. Solo es posible si ninguna tiene pagos aplicados.`}
        confirmLabel="Anular"
        danger
        loading={anulando}
        onConfirm={anular}
        onCancel={() => setAAnular(null)}
      />
    </div>
  );
}
