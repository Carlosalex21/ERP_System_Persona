"use client";

import React, { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Plus, Wallet, ChevronDown, ChevronRight, CheckCircle2, Loader2, Printer, Settings2, ListChecks, CircleDollarSign, X } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { PageHeader, Card, EmptyState, TableSkeleton, Badge, ActionButton } from '@/components/ui';
import { getPeriodosNomina, pagarPeriodoNomina, verReciboNominaPdf, quitarConceptoNominaEmpleado } from '@/services/rrhhService';
import type { PeriodoNomina, NominaEmpleado } from '@/types/api';
import GenerarNominaModal from './GenerarNominaModal';
import ConceptosNominaTab from './ConceptosNominaTab';
import AgregarConceptoManualModal from './AgregarConceptoManualModal';
import { useMonedaVista } from '@/context/MonedaVistaContext';

function PeriodosNominaTab(): ReactElement {
  const { formatear } = useMonedaVista();
  const [periodos, setPeriodos] = useState<PeriodoNomina[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [pagando, setPagando] = useState<number | null>(null);
  const [imprimiendo, setImprimiendo] = useState<number | null>(null);
  const [conceptoModalPara, setConceptoModalPara] = useState<NominaEmpleado | null>(null);
  const [quitandoConcepto, setQuitandoConcepto] = useState<number | null>(null);

  // Reemplaza UNA línea de empleado ya actualizada (tras agregar/quitar un
  // concepto manual) sin tener que recargar todo el período -- recalcula
  // `total_nomina` en el cliente para que no quede desactualizado.
  const actualizarEmpleadoEnEstado = useCallback((actualizado: NominaEmpleado): void => {
    setPeriodos((prev) => prev.map((p) => {
      if (!p.empleados.some((e) => e.id === actualizado.id)) return p;
      const empleados = p.empleados.map((e) => (e.id === actualizado.id ? actualizado : e));
      const total_nomina = String(empleados.reduce((acc, e) => acc + parseFloat(e.total_pagar), 0));
      return { ...p, empleados, total_nomina };
    }));
  }, []);

  const quitarConcepto = async (nominaEmpleadoId: number, conceptoId: number): Promise<void> => {
    setQuitandoConcepto(conceptoId);
    try {
      actualizarEmpleadoEnEstado(await quitarConceptoNominaEmpleado(nominaEmpleadoId, conceptoId));
    } catch {
      toast.error('No se pudo quitar el concepto.');
    } finally {
      setQuitandoConcepto(null);
    }
  };

  const cargar = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      setPeriodos(await getPeriodosNomina());
    } catch {
      toast.error('No se pudieron cargar los períodos de nómina.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const pagar = async (periodo: PeriodoNomina): Promise<void> => {
    setPagando(periodo.id);
    try {
      await pagarPeriodoNomina(periodo.id);
      toast.success('Nómina pagada -- se generó el asiento contable automático.');
      await cargar();
    } catch {
      toast.error('No se pudo pagar la nómina.');
    } finally {
      setPagando(null);
    }
  };

  const imprimirRecibo = async (nominaEmpleadoId: number): Promise<void> => {
    setImprimiendo(nominaEmpleadoId);
    try {
      await verReciboNominaPdf(nominaEmpleadoId);
    } catch {
      toast.error('No se pudo generar el recibo de pago.');
    } finally {
      setImprimiendo(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setModalAbierto(true)}
          className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
        >
          <Plus size={18} /> Generar Nómina
        </motion.button>
      </div>

      {cargando ? (
        <TableSkeleton rows={5} />
      ) : periodos.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet size={28} />}
            title="Aún no has generado ninguna nómina"
            description="Asigna un sueldo base a tus empleados desde Empleados y genera tu primer período."
            action={<ActionButton onClick={() => setModalAbierto(true)}><Plus size={16} /> Generar Nómina</ActionButton>}
          />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-4"></th>
                <th className="p-4">Período</th>
                <th className="p-4 text-center">Empleados</th>
                <th className="p-4 text-right">Total Nómina</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periodos.map((p) => (
                <React.Fragment key={p.id}>
                  <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpandido((prev) => (prev === p.id ? null : p.id))}>
                    <td className="p-4 text-slate-400">{expandido === p.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                    <td className="p-4 font-bold text-slate-800">
                      {new Date(p.fecha_desde).toLocaleDateString('es-VE', { timeZone: 'UTC' })} — {new Date(p.fecha_hasta).toLocaleDateString('es-VE', { timeZone: 'UTC' })}
                    </td>
                    <td className="p-4 text-center font-mono text-slate-600">{p.empleados.length}</td>
                    <td className="p-4 text-right font-black text-primary-700 font-mono">{formatear(parseFloat(p.total_nomina))}</td>
                    <td className="p-4 text-center">
                      <Badge tone={p.estado === 'pagada' ? 'green' : 'slate'}>{p.estado === 'pagada' ? 'Pagada' : 'Borrador'}</Badge>
                    </td>
                    <td className="p-4 text-right">
                      {p.estado === 'borrador' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); pagar(p); }}
                          disabled={pagando === p.id}
                          className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700 font-bold text-xs disabled:opacity-40"
                        >
                          {pagando === p.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Pagar Nómina
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandido === p.id && (
                    <tr key={`${p.id}-detalle`}>
                      <td colSpan={6} className="p-0 bg-slate-50">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-400 font-bold uppercase text-[9px]">
                              <th className="px-8 py-2 text-left">Empleado</th>
                              <th className="px-4 py-2 text-right">Sueldo Base</th>
                              <th className="px-4 py-2 text-right">Ausencias</th>
                              <th className="px-4 py-2 text-right">Horas Extra</th>
                              <th className="px-4 py-2 text-right">Bonos</th>
                              <th className="px-4 py-2 text-right">Deducciones</th>
                              <th className="px-4 py-2 text-right">Total a Pagar</th>
                              <th className="px-4 py-2 text-center">Recibo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {p.empleados.map((e) => (
                              <tr key={e.id}>
                                <td className="px-8 py-2 font-bold text-slate-700">
                                  {e.usuario_nombre}
                                  {e.numero_empleado && <span className="text-slate-400 font-normal"> ({e.numero_empleado})</span>}
                                  {(e.conceptos.length > 0 || p.estado === 'borrador') && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {e.conceptos.map((c) => (
                                        <span
                                          key={c.id}
                                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                            c.tipo === 'bono' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                                          }`}
                                        >
                                          {c.nombre}: {c.tipo === 'bono' ? '+' : '-'}{formatear(parseFloat(c.monto))}
                                          {c.concepto === null && p.estado === 'borrador' && (
                                            <button
                                              type="button"
                                              onClick={(ev) => { ev.stopPropagation(); quitarConcepto(e.id, c.id); }}
                                              disabled={quitandoConcepto === c.id}
                                              title="Quitar este concepto"
                                              className="hover:text-red-800 disabled:opacity-40"
                                            >
                                              <X size={10} />
                                            </button>
                                          )}
                                        </span>
                                      ))}
                                      {p.estado === 'borrador' && (
                                        <button
                                          type="button"
                                          onClick={(ev) => { ev.stopPropagation(); setConceptoModalPara(e); }}
                                          title="Agregar concepto puntual (ej. una comisión)"
                                          className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-dashed border-primary-300 text-primary-600 hover:bg-primary-50"
                                        >
                                          <CircleDollarSign size={10} /> Concepto
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-slate-500">{formatear(parseFloat(e.sueldo_base))}</td>
                                <td className="px-4 py-2 text-right font-mono text-red-500">
                                  {parseFloat(e.deduccion_ausencias) > 0 ? `-${formatear(parseFloat(e.deduccion_ausencias))} (${e.dias_ausencia}d)` : '—'}
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-emerald-600">
                                  {parseFloat(e.pago_horas_extra) > 0 ? `+${formatear(parseFloat(e.pago_horas_extra))} (${parseFloat(e.horas_extra)}h)` : '—'}
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-emerald-600">
                                  {parseFloat(e.bonificaciones) > 0 ? `+${formatear(parseFloat(e.bonificaciones))}` : '—'}
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-red-500">
                                  {parseFloat(e.otras_deducciones) > 0 ? `-${formatear(parseFloat(e.otras_deducciones))}` : '—'}
                                </td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-slate-800">{formatear(parseFloat(e.total_pagar))}</td>
                                <td className="px-4 py-2 text-center">
                                  <button
                                    onClick={(ev) => { ev.stopPropagation(); imprimirRecibo(e.id); }}
                                    disabled={imprimiendo === e.id}
                                    title="Ver/imprimir recibo de pago"
                                    className="text-slate-400 hover:text-primary-600 disabled:opacity-40"
                                  >
                                    {imprimiendo === e.id ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {modalAbierto && (
        <GenerarNominaModal onClose={() => setModalAbierto(false)} onSaved={() => { setModalAbierto(false); cargar(); }} />
      )}

      {conceptoModalPara && (
        <AgregarConceptoManualModal
          nominaEmpleado={conceptoModalPara}
          onClose={() => setConceptoModalPara(null)}
          onSaved={(actualizado) => { actualizarEmpleadoEnEstado(actualizado); setConceptoModalPara(null); }}
        />
      )}
    </div>
  );
}

export default function NominaPage(): ReactElement {
  const [tab, setTab] = useState<'periodos' | 'conceptos'>('periodos');

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Wallet size={20} />}
        title="Nómina"
        description="Genera un período eligiendo el rango de fechas -- se calcula solo, descontando ausencias y sumando horas extra reales, y al pagarlo genera su asiento contable automático."
      />

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab('periodos')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            tab === 'periodos' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <ListChecks size={16} /> Períodos
        </button>
        <button
          onClick={() => setTab('conceptos')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            tab === 'conceptos' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Settings2 size={16} /> Bonos y Deducciones
        </button>
      </div>

      {tab === 'periodos' ? <PeriodosNominaTab /> : <ConceptosNominaTab />}
    </div>
  );
}
