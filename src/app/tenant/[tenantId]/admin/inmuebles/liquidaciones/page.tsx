"use client";

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Ban, ChevronDown, ChevronRight, Download, HandCoins, Landmark, Plus, Trash2, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { ActionButton, AppModal, Badge, Card, ConfirmDialog, EmptyState, PageHeader, TableSkeleton } from '@/components/ui';
import SelectorCliente from '@/components/inmuebles/SelectorCliente';
import SelectorUnidad from '@/components/inmuebles/SelectorUnidad';
import { fechaCorta, hoyISO, periodoLabel, usd } from '@/components/inmuebles/formato';
import {
  anularLiquidacion, crearGastoPropiedad, eliminarGastoPropiedad, generarLiquidacion, getGastosPropiedad, getLiquidaciones,
  pagarLiquidacion, pdfLiquidacion, previsualizarLiquidacion, type GastoPropiedad, type Liquidacion, type VistaPreviaLiquidacion,
} from '@/services/inmueblesService';
import { toastApiError } from '@/utils/errors';

const campo = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const etiqueta = 'block text-xs font-bold text-slate-500 uppercase mb-1';
const TONO = { borrador: 'amber', pagada: 'green', anulada: 'red' } as const;
const TEXTO = { borrador: 'Por pagar', pagada: 'Pagada', anulada: 'Anulada' } as const;
const chip = (activo: boolean): string => `px-3.5 py-1.5 rounded-lg text-xs font-bold ${activo ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`;

export default function LiquidacionesPage(): ReactElement {
  const [pestana, setPestana] = useState<'liquidaciones' | 'gastos'>('liquidaciones');
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [gastos, setGastos] = useState<GastoPropiedad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierta, setAbierta] = useState<number | null>(null);

  const [nueva, setNueva] = useState(false);
  const [propietario, setPropietario] = useState<number | null>(null);
  const [vista, setVista] = useState<VistaPreviaLiquidacion | null>(null);
  const [observaciones, setObservaciones] = useState('');

  const [pagando, setPagando] = useState<Liquidacion | null>(null);
  const [fechaPago, setFechaPago] = useState(hoyISO());
  const [referencia, setReferencia] = useState('');
  const [anulando, setAnulando] = useState<Liquidacion | null>(null);

  const [nuevoGasto, setNuevoGasto] = useState(false);
  const [gUnidad, setGUnidad] = useState<number | null>(null);
  const [gFecha, setGFecha] = useState(hoyISO());
  const [gDescripcion, setGDescripcion] = useState('');
  const [gMonto, setGMonto] = useState('');
  const [gastoEliminar, setGastoEliminar] = useState<GastoPropiedad | null>(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async (): Promise<void> => {
    try {
      const [l, g] = await Promise.all([getLiquidaciones({ ordering: '-id' }), getGastosPropiedad({})]);
      setLiquidaciones(l);
      setGastos(g);
    } catch (e) {
      toastApiError(e, 'No se pudieron cargar las liquidaciones.');
    } finally {
      setCargando(false);
    }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos externos
  useEffect(() => { void cargar(); }, [cargar]);

  const elegirPropietario = async (id: number | null): Promise<void> => {
    setPropietario(id);
    setVista(null);
    if (!id) return;
    try {
      setVista(await previsualizarLiquidacion(id));
    } catch (e) {
      toastApiError(e, 'No se pudo calcular la liquidación.');
    }
  };

  const generar = async (): Promise<void> => {
    if (!propietario) return;
    setProcesando(true);
    try {
      await generarLiquidacion({ propietario, observaciones: observaciones.trim() });
      toast.success('Liquidación generada.');
      setNueva(false); setPropietario(null); setVista(null); setObservaciones('');
      void cargar();
    } catch (e) {
      toastApiError(e, 'No se pudo generar la liquidación.');
    } finally {
      setProcesando(false);
    }
  };

  const pagar = async (): Promise<void> => {
    if (!pagando) return;
    setProcesando(true);
    try {
      await pagarLiquidacion(pagando.id, { fecha: fechaPago, referencia: referencia.trim() });
      toast.success('Liquidación marcada como pagada al propietario.');
      setPagando(null); setReferencia('');
      void cargar();
    } catch (e) {
      toastApiError(e, 'No se pudo registrar el pago.');
    } finally {
      setProcesando(false);
    }
  };

  const anular = async (): Promise<void> => {
    if (!anulando) return;
    setProcesando(true);
    try {
      await anularLiquidacion(anulando.id);
      toast.success('Liquidación anulada; sus cobros quedan disponibles para la próxima.');
      setAnulando(null);
      void cargar();
    } catch (e) {
      toastApiError(e, 'No se pudo anular.');
    } finally {
      setProcesando(false);
    }
  };

  const guardarGasto = async (): Promise<void> => {
    if (!gUnidad) return void toast.error('Selecciona la propiedad.');
    if (!gDescripcion.trim()) return void toast.error('Describe el gasto.');
    if (!(Number(gMonto) > 0)) return void toast.error('Indica el monto en USD.');
    setProcesando(true);
    try {
      await crearGastoPropiedad({ unidad: gUnidad, fecha: gFecha, descripcion: gDescripcion.trim(), monto_usd: String(gMonto) });
      toast.success('Gasto registrado; se descontará en la próxima liquidación.');
      setNuevoGasto(false); setGUnidad(null); setGDescripcion(''); setGMonto('');
      void cargar();
    } catch (e) {
      toastApiError(e, 'No se pudo guardar el gasto.');
    } finally {
      setProcesando(false);
    }
  };

  const eliminarGasto = async (): Promise<void> => {
    if (!gastoEliminar) return;
    try {
      await eliminarGastoPropiedad(gastoEliminar.id);
      toast.success('Gasto eliminado.');
      setGastoEliminar(null);
      void cargar();
    } catch (e) {
      toastApiError(e, 'No se pudo eliminar el gasto.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Landmark size={20} />}
        title="Liquidaciones a propietarios"
        description="Lo cobrado de los alquileres, menos tu honorario y los gastos de la propiedad: lo que le debes entregar al dueño."
        actions={
          pestana === 'liquidaciones'
            ? <motion.button whileTap={{ scale: 0.96 }} onClick={() => setNueva(true)} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2 shadow-md"><Plus size={18} /> Nueva liquidación</motion.button>
            : <motion.button whileTap={{ scale: 0.96 }} onClick={() => setNuevoGasto(true)} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2 shadow-md"><Plus size={18} /> Nuevo gasto</motion.button>
        }
      />
      <div className="flex gap-2">
        <button onClick={() => setPestana('liquidaciones')} className={chip(pestana === 'liquidaciones')}>Liquidaciones</button>
        <button onClick={() => setPestana('gastos')} className={chip(pestana === 'gastos')}>Gastos de propiedades</button>
      </div>

      {cargando ? <TableSkeleton rows={4} /> : pestana === 'liquidaciones' ? (
        liquidaciones.length === 0 ? (
          <EmptyState icon={<Landmark size={28} />} title="Aún no hay liquidaciones" description="Cuando cobres cánones de alquiler, aquí calculas lo que le corresponde a cada propietario." action={<button onClick={() => setNueva(true)} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2"><Plus size={16} /> Nueva liquidación</button>} />
        ) : (
          <div className="space-y-3">
            {liquidaciones.map((l) => (
              <Card key={l.id} padding="none" className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <button onClick={() => setAbierta(abierta === l.id ? null : l.id)} className="p-1 text-slate-400" aria-label="Ver detalle">{abierta === l.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</button>
                  <div className="flex-1 min-w-[180px]"><p className="font-bold text-slate-900">{l.propietario_nombre}</p><p className="text-xs text-slate-500">{periodoLabel(l.periodo)}{l.fecha_pago ? ` · pagada el ${fechaCorta(l.fecha_pago)}` : ''}</p></div>
                  <div className="text-right text-xs text-slate-500 hidden md:block"><p>Cobrado {usd(l.total_cobrado_usd)}</p><p>Honorario −{usd(l.honorario_usd)} · Gastos −{usd(l.gastos_usd)}</p></div>
                  <div className="text-right"><p className="text-[10px] uppercase font-bold text-slate-400">Neto al propietario</p><p className="font-mono font-black text-lg text-slate-900">{usd(l.neto_usd)}</p></div>
                  <Badge tone={TONO[l.estado]}>{TEXTO[l.estado]}</Badge>
                  <div className="flex">
                    <button onClick={() => pdfLiquidacion(l.id).catch((e) => toastApiError(e, 'No se pudo generar el PDF.'))} className="p-2 text-slate-400 hover:text-primary-600" title="Descargar PDF" aria-label="Descargar PDF"><Download size={16} /></button>
                    {l.estado === 'borrador' && <button onClick={() => { setFechaPago(hoyISO()); setPagando(l); }} className="p-2 text-slate-400 hover:text-green-600" title="Marcar como pagada" aria-label="Marcar como pagada"><HandCoins size={16} /></button>}
                    {l.estado !== 'anulada' && <button onClick={() => setAnulando(l)} className="p-2 text-slate-400 hover:text-red-500" title="Anular" aria-label="Anular"><Ban size={16} /></button>}
                  </div>
                </div>
                {abierta === l.id && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 space-y-1">
                    {l.lineas.map((ln) => (
                      <div key={ln.id} className="flex justify-between text-sm"><span className="text-slate-600">{ln.unidad_codigo} · {ln.descripcion}</span><span className={`font-mono tabular-nums ${ln.tipo === 'canon' ? 'text-slate-800' : 'text-red-600'}`}>{ln.tipo === 'canon' ? '' : '−'}{usd(ln.monto_usd)}</span></div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )
      ) : gastos.length === 0 ? (
        <EmptyState icon={<Wrench size={28} />} title="Sin gastos de propiedades" description="Registra reparaciones o servicios que pagaste por cuenta del propietario para descontarlos en su liquidación." action={<button onClick={() => setNuevoGasto(true)} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2"><Plus size={16} /> Nuevo gasto</button>} />
      ) : (
        <Card padding="none" className="overflow-hidden divide-y divide-slate-100">
          {gastos.map((g) => (
            <div key={g.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{g.descripcion}</p><p className="text-xs text-slate-500">{g.unidad_codigo} · {g.propietario_nombre ?? 'Sin propietario'} · {fechaCorta(g.fecha)}</p></div>
              <span className="font-mono tabular-nums font-bold text-slate-900">{usd(g.monto_usd)}</span>
              {g.liquidacion ? <Badge tone="green">Liquidado</Badge> : <><Badge tone="amber">Pendiente</Badge><button onClick={() => setGastoEliminar(g)} className="p-2 text-slate-400 hover:text-red-500" aria-label="Eliminar gasto"><Trash2 size={16} /></button></>}
            </div>
          ))}
        </Card>
      )}

      {nueva && (
        <AppModal isOpen onClose={() => setNueva(false)} title="Nueva liquidación" icon={<Landmark size={20} />} size="lg"
          footer={<><ActionButton variant="secondary" onClick={() => setNueva(false)}>Cancelar</ActionButton><ActionButton onClick={generar} loading={procesando} disabled={!vista?.hay_movimientos}>Generar liquidación</ActionButton></>}>
          <div className="space-y-4">
            <SelectorCliente etiqueta="Propietario" value={propietario} onChange={(id) => void elegirPropietario(id)} permitirCrear={false} placeholder="Busca al dueño del inmueble" />
            {propietario && !vista && <p className="text-sm text-slate-400">Calculando...</p>}
            {vista && !vista.hay_movimientos && <p className="text-sm text-amber-600 bg-amber-50 rounded-xl px-4 py-3">Este propietario no tiene cánones cobrados ni gastos pendientes por liquidar.</p>}
            {vista?.hay_movimientos && (
              <>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {vista.lineas.map((ln, i) => <div key={i} className="flex justify-between px-4 py-2 text-sm"><span className="text-slate-600">{ln.descripcion}</span><span className={`font-mono tabular-nums ${ln.tipo === 'canon' ? 'text-slate-800' : 'text-red-600'}`}>{ln.tipo === 'canon' ? '' : '−'}{usd(ln.monto_usd)}</span></div>)}
                  <div className="flex justify-between px-4 py-3 bg-slate-50 rounded-b-xl"><span className="font-bold text-slate-700">Neto a entregar</span><span className="font-mono font-black text-slate-900">{usd(vista.neto_usd)}</span></div>
                </div>
                <div><label className={etiqueta}>Observaciones</label><input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={campo} placeholder="Opcional" /></div>
              </>
            )}
          </div>
        </AppModal>
      )}

      {pagando && (
        <AppModal isOpen onClose={() => setPagando(null)} title="Pago al propietario" icon={<HandCoins size={20} />} size="sm"
          footer={<><ActionButton variant="secondary" onClick={() => setPagando(null)}>Cancelar</ActionButton><ActionButton onClick={pagar} loading={procesando}>Marcar como pagada</ActionButton></>}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Entregar {usd(pagando.neto_usd)} a {pagando.propietario_nombre}.</p>
            <div><label className={etiqueta}>Fecha</label><input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className={campo} /></div>
            <div><label className={etiqueta}>Referencia de la transferencia</label><input value={referencia} onChange={(e) => setReferencia(e.target.value)} className={campo} /></div>
          </div>
        </AppModal>
      )}

      {nuevoGasto && (
        <AppModal isOpen onClose={() => setNuevoGasto(false)} title="Gasto de propiedad" icon={<Wrench size={20} />} size="md"
          footer={<><ActionButton variant="secondary" onClick={() => setNuevoGasto(false)}>Cancelar</ActionButton><ActionButton onClick={guardarGasto} loading={procesando}>Guardar</ActionButton></>}>
          <div className="space-y-4">
            <SelectorUnidad value={gUnidad} onChange={(id) => setGUnidad(id)} etiqueta="Propiedad" />
            <div className="grid grid-cols-2 gap-4">
              <div><label className={etiqueta}>Fecha</label><input type="date" value={gFecha} onChange={(e) => setGFecha(e.target.value)} className={campo} /></div>
              <div><label className={etiqueta}>Monto (USD) *</label><input type="number" min={0} step="0.01" value={gMonto} onChange={(e) => setGMonto(e.target.value)} className={campo} /></div>
              <div className="col-span-2"><label className={etiqueta}>Descripción *</label><input value={gDescripcion} onChange={(e) => setGDescripcion(e.target.value)} className={campo} placeholder="Ej: Reparación de tubería" /></div>
            </div>
          </div>
        </AppModal>
      )}

      <ConfirmDialog isOpen={!!anulando} title="Anular liquidación" message="Los cobros y gastos incluidos quedan libres para entrar en una nueva liquidación." confirmLabel="Anular" danger loading={procesando} onConfirm={anular} onCancel={() => setAnulando(null)} />
      <ConfirmDialog isOpen={!!gastoEliminar} title="Eliminar gasto" message={`¿Eliminar "${gastoEliminar?.descripcion}"?`} confirmLabel="Eliminar" danger onConfirm={eliminarGasto} onCancel={() => setGastoEliminar(null)} />
    </div>
  );
}
