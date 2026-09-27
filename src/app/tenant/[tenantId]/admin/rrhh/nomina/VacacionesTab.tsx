"use client";

import React, { useState, useEffect, useCallback, type ReactElement } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, Loader2, Plus, Calculator, Trash2, Settings2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, EmptyState, TableSkeleton, Badge, ActionButton } from '@/components/ui';
import { exportarCSV } from '@/utils/exportarDatos';
import {
  getManagedUsers, getVacacionesEmpleado, eliminarVacacionTomada,
  getConfiguracionRRHH, updateConfiguracionRRHH,
} from '@/services/rrhhService';
import RegistrarVacacionModal from './RegistrarVacacionModal';
import LiquidacionModal from './LiquidacionModal';
import type { UserManaged, VacacionesResumen, ConfiguracionRRHH } from '@/types/api';

function ConfiguracionVacaciones(): ReactElement {
  const [abierto, setAbierto] = useState(false);
  const [config, setConfig] = useState<ConfiguracionRRHH | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { getConfiguracionRRHH().then(setConfig).catch(() => {}); }, []);

  const guardar = async (): Promise<void> => {
    if (!config) return;
    setGuardando(true);
    try {
      setConfig(await updateConfiguracionRRHH({
        dias_vacaciones_por_anio: Number(config.dias_vacaciones_por_anio),
        dias_prestaciones_por_anio: Number(config.dias_prestaciones_por_anio),
        dias_periodo_sueldo_base: Number(config.dias_periodo_sueldo_base),
      }));
      toast.success('Configuración guardada.');
      setAbierto(false);
    } catch {
      toast.error('No se pudo guardar la configuración.');
    } finally {
      setGuardando(false);
    }
  };

  if (!config) return <></>;

  return (
    <Card>
      <button type="button" onClick={() => setAbierto((v) => !v)} className="w-full flex items-center justify-between text-sm font-bold text-slate-700">
        <span className="flex items-center gap-2"><Settings2 size={16} /> Parámetros de vacaciones y prestaciones</span>
        {abierto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {abierto && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Días de vacaciones / año</label>
            <input
              type="number" min={0} value={config.dias_vacaciones_por_anio}
              onChange={(e) => setConfig({ ...config, dias_vacaciones_por_anio: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Días de prestaciones / año</label>
            <input
              type="number" min={0} value={config.dias_prestaciones_por_anio}
              onChange={(e) => setConfig({ ...config, dias_prestaciones_por_anio: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Días que representa el Sueldo Base</label>
            <input
              type="number" min={1} value={config.dias_periodo_sueldo_base}
              onChange={(e) => setConfig({ ...config, dias_periodo_sueldo_base: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <p className="text-[11px] text-slate-400 mb-2">Ajusta estos valores según la legislación de tu país -- el sistema no asume ninguna tasa legal por defecto más allá de estos parámetros.</p>
            <ActionButton loading={guardando} onClick={guardar}>Guardar</ActionButton>
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * Vacaciones acumuladas/tomadas por empleado (según su fecha de
 * contratación y los días/año configurados en RRHH) y la calculadora de
 * liquidación -- separado de "Períodos" porque esto no depende de generar
 * una nómina, es un saldo que se consulta en cualquier momento.
 */
export default function VacacionesTab(): ReactElement {
  const [empleados, setEmpleados] = useState<UserManaged[]>([]);
  const [cargando, setCargando] = useState(true);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [resumenes, setResumenes] = useState<Record<number, VacacionesResumen>>({});
  const [cargandoResumen, setCargandoResumen] = useState<number | null>(null);
  const [eliminando, setEliminando] = useState<number | null>(null);
  const [modalVacacionPara, setModalVacacionPara] = useState<UserManaged | null>(null);
  const [modalLiquidacionPara, setModalLiquidacionPara] = useState<UserManaged | null>(null);
  const [preparandoExport, setPreparandoExport] = useState(false);

  const cargar = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      setEmpleados((await getManagedUsers()).filter((e) => e.is_active));
    } catch {
      toast.error('No se pudieron cargar los empleados.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const cargarResumen = async (empleado: UserManaged): Promise<void> => {
    if (expandido === empleado.usuario_id) { setExpandido(null); return; }
    setExpandido(empleado.usuario_id);
    if (resumenes[empleado.usuario_id]) return;
    setCargandoResumen(empleado.usuario_id);
    try {
      const resumen = await getVacacionesEmpleado(empleado.usuario_id);
      setResumenes((prev) => ({ ...prev, [empleado.usuario_id]: resumen }));
    } catch {
      toast.error('No se pudo cargar el resumen de vacaciones.');
    } finally {
      setCargandoResumen(null);
    }
  };

  const actualizarResumen = (usuarioId: number, resumen: VacacionesResumen): void => {
    setResumenes((prev) => ({ ...prev, [usuarioId]: resumen }));
  };

  // Trae el resumen de los empleados que todavía no se han expandido -- para
  // que "Exportar" incluya a todos, no solo a los que el admin ya abrió.
  const prepararExport = async (): Promise<Record<number, VacacionesResumen>> => {
    setPreparandoExport(true);
    try {
      const faltantes = empleados.filter((e) => !resumenes[e.usuario_id]);
      const nuevos = await Promise.all(faltantes.map((e) => getVacacionesEmpleado(e.usuario_id)));
      const combinados = { ...resumenes };
      faltantes.forEach((e, i) => { combinados[e.usuario_id] = nuevos[i]; });
      setResumenes(combinados);
      return combinados;
    } catch {
      toast.error('No se pudo preparar el reporte.');
      return resumenes;
    } finally {
      setPreparandoExport(false);
    }
  };

  const exportar = async (): Promise<void> => {
    const combinados = await prepararExport();
    const filas = empleados.map((e) => ({ empleado: e, resumen: combinados[e.usuario_id] }));
    exportarCSV(
      filas,
      [
        { label: 'Empleado', value: (f) => `${f.empleado.first_name} ${f.empleado.last_name}` },
        { label: 'Fecha de Contratación', value: (f) => f.empleado.fecha_contratacion || '' },
        { label: 'Antigüedad (años)', value: (f) => f.resumen?.antiguedad_anios ?? '' },
        { label: 'Días Acumulados', value: (f) => f.resumen?.dias_acumulados ?? '' },
        { label: 'Días Tomados', value: (f) => f.resumen?.dias_tomados ?? '' },
        { label: 'Días Disponibles', value: (f) => f.resumen?.dias_disponibles ?? '' },
      ],
      'reporte-vacaciones',
    );
  };

  const quitarTomada = async (usuarioId: number, vacacionId: number): Promise<void> => {
    setEliminando(vacacionId);
    try {
      await eliminarVacacionTomada(vacacionId);
      actualizarResumen(usuarioId, await getVacacionesEmpleado(usuarioId));
    } catch {
      toast.error('No se pudo quitar el registro.');
    } finally {
      setEliminando(null);
    }
  };

  if (cargando) return <TableSkeleton rows={5} />;

  if (empleados.length === 0) {
    return (
      <div className="space-y-6">
        <ConfiguracionVacaciones />
        <Card>
          <EmptyState icon={<CalendarDays size={28} />} title="Sin empleados activos" description="Invita empleados desde la pestaña Empleados para ver sus vacaciones aquí." />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfiguracionVacaciones />
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={exportar}
          disabled={preparandoExport}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          {preparandoExport ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Exportar reporte
        </button>
      </div>
      <Card padding="none" className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <th className="p-4"></th>
              <th className="p-4">Empleado</th>
              <th className="p-4">Fecha de contratación</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {empleados.map((e) => {
              const resumen = resumenes[e.usuario_id];
              return (
                <React.Fragment key={e.usuario_id}>
                  <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => cargarResumen(e)}>
                    <td className="p-4 text-slate-400">{expandido === e.usuario_id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                    <td className="p-4 font-bold text-slate-800">{e.first_name} {e.last_name}</td>
                    <td className="p-4 text-slate-500">
                      {e.fecha_contratacion ? new Date(e.fecha_contratacion).toLocaleDateString('es-VE', { timeZone: 'UTC' }) : (
                        <Badge tone="amber">Sin fecha de contratación</Badge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={(ev) => { ev.stopPropagation(); setModalVacacionPara(e); }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700"
                        >
                          <Plus size={13} /> Vacación
                        </button>
                        <button
                          type="button"
                          onClick={(ev) => { ev.stopPropagation(); setModalLiquidacionPara(e); }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700"
                        >
                          <Calculator size={13} /> Liquidación
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandido === e.usuario_id && (
                    <tr>
                      <td colSpan={4} className="p-0 bg-slate-50">
                        {cargandoResumen === e.usuario_id ? (
                          <div className="flex justify-center py-6"><Loader2 className="animate-spin text-primary-600" size={20} /></div>
                        ) : resumen ? (
                          <div className="px-8 py-4 space-y-3">
                            <div className="flex flex-wrap gap-6 text-xs">
                              <div><span className="text-slate-400 font-bold uppercase block">Antigüedad</span>{parseFloat(resumen.antiguedad_anios).toFixed(2)} años</div>
                              <div><span className="text-slate-400 font-bold uppercase block">Acumulados</span>{resumen.dias_acumulados} días</div>
                              <div><span className="text-slate-400 font-bold uppercase block">Tomados</span>{resumen.dias_tomados} días</div>
                              <div>
                                <span className="text-slate-400 font-bold uppercase block">Disponibles</span>
                                <span className={resumen.dias_disponibles < 0 ? 'text-red-600 font-bold' : ''}>{resumen.dias_disponibles} días</span>
                              </div>
                            </div>
                            {resumen.tomadas.length > 0 && (
                              <table className="w-full text-xs mt-2">
                                <thead>
                                  <tr className="text-slate-400 font-bold uppercase text-[9px]">
                                    <th className="py-1 text-left">Período</th>
                                    <th className="py-1 text-right">Días</th>
                                    <th className="py-1 text-left">Observaciones</th>
                                    <th className="py-1"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {resumen.tomadas.map((t) => (
                                    <tr key={t.id}>
                                      <td className="py-1.5">
                                        {new Date(t.fecha_inicio).toLocaleDateString('es-VE', { timeZone: 'UTC' })} — {new Date(t.fecha_fin).toLocaleDateString('es-VE', { timeZone: 'UTC' })}
                                      </td>
                                      <td className="py-1.5 text-right font-mono">{t.dias}</td>
                                      <td className="py-1.5 text-slate-500">{t.observaciones || '—'}</td>
                                      <td className="py-1.5 text-right">
                                        <button
                                          type="button"
                                          onClick={() => quitarTomada(e.usuario_id, t.id)}
                                          disabled={eliminando === t.id}
                                          className="text-slate-400 hover:text-red-500 disabled:opacity-40"
                                        >
                                          {eliminando === t.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </Card>

      {modalVacacionPara && (
        <RegistrarVacacionModal
          empleado={modalVacacionPara}
          onClose={() => setModalVacacionPara(null)}
          onSaved={(resumen) => { actualizarResumen(modalVacacionPara.usuario_id, resumen); setExpandido(modalVacacionPara.usuario_id); setModalVacacionPara(null); }}
        />
      )}
      {modalLiquidacionPara && (
        <LiquidacionModal empleado={modalLiquidacionPara} onClose={() => setModalLiquidacionPara(null)} />
      )}
    </div>
  );
}
