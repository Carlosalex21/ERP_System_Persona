"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Sparkles, Trophy, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';

import { Card, CardHeader } from '@/components/ui';
import { getAnalitica, type AnaliticaReporte } from '@/services/reportesService';
import { parseDecimal } from '@/utils/helpers';

function formatoMoneda(valor: number): string {
  return valor.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function TendenciaMensualChart({ data }: { data: AnaliticaReporte['tendencia_mensual'] }): ReactElement {
  const sinDatos = data.every((d) => d.total === 0);
  const maxValor = Math.max(...data.map((d) => d.total), 1);

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title="Tendencia de Ventas Mensual"
        action={<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Últimos {data.length} meses</span>}
      />
      {sinDatos ? (
        <div className="flex items-center justify-center h-40 mt-4 text-sm text-slate-400">
          Aún no hay historial de ventas suficiente.
        </div>
      ) : (
        <div className="overflow-x-auto mt-4">
          <div className="flex items-end justify-between gap-2 h-44 min-w-max px-0.5">
            {data.map((punto, idx) => {
              const altura = Math.max((punto.total / maxValor) * 100, 3);
              const esActual = idx === data.length - 1;
              return (
                <div key={`${punto.anio}-${punto.mes}`} className="w-12 shrink-0 flex flex-col items-center gap-1 group">
                  <span className="text-[9px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    ${formatoMoneda(punto.total)}
                  </span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${altura}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    className={`w-full max-w-[28px] rounded-t-lg origin-bottom transition-[background,transform] group-hover:scale-y-105 ${
                      esActual
                        ? 'bg-gradient-to-t from-amber-500 to-amber-300'
                        : 'bg-gradient-to-t from-primary-600 to-primary-400 group-hover:from-primary-700 group-hover:to-primary-500'
                    }`}
                    title={`${punto.label}: $${formatoMoneda(punto.total)} (${punto.num_facturas} facturas)`}
                  />
                  <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">{punto.label}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-2">El mes en curso (ámbar) todavía no ha terminado.</p>
        </div>
      )}
    </Card>
  );
}

function ComparativaCard({ comparativa }: { comparativa: AnaliticaReporte['comparativa_mensual'] }): ReactElement {
  const pct = comparativa.variacion_pct;
  const Icono = pct === null ? Minus : pct >= 0 ? TrendingUp : TrendingDown;
  const color = pct === null ? 'text-slate-400' : pct >= 0 ? 'text-emerald-600' : 'text-red-500';

  return (
    <Card>
      <CardHeader title="Mes Actual vs. Mes Anterior" action={<Icono size={16} className={color} />} />
      <div className="mt-3 space-y-2">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Este mes (mismo tramo de días)</p>
            <p className="text-2xl font-black text-slate-900 font-mono">${formatoMoneda(comparativa.total_mes_actual)}</p>
          </div>
          {pct !== null && (
            <span className={`text-sm font-black ${color}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%</span>
          )}
        </div>
        <p className="text-xs text-slate-400">
          vs. ${formatoMoneda(comparativa.total_mes_anterior_mismo_tramo)} en los primeros {comparativa.dias_comparados} días del mes anterior
        </p>
      </div>
    </Card>
  );
}

function ProyeccionCard({ proyeccion }: { proyeccion: AnaliticaReporte['proyeccion_proximo_mes'] }): ReactElement {
  return (
    <Card>
      <CardHeader title="Proyección Próximo Mes" action={<Sparkles size={16} className="text-primary-500" />} />
      {proyeccion === null ? (
        <p className="mt-3 text-sm text-slate-400">Se necesitan al menos 3 meses de historial cerrado para proyectar.</p>
      ) : (
        <div className="mt-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase">{proyeccion.label}, estimado</p>
          <p className="text-2xl font-black text-primary-700 font-mono">${formatoMoneda(proyeccion.total_estimado)}</p>
          <p className="text-xs text-slate-400 mt-1 capitalize">
            Tendencia {proyeccion.tendencia === 'creciente' ? 'creciente 📈' : proyeccion.tendencia === 'decreciente' ? 'decreciente 📉' : 'estable ➡️'}
          </p>
        </div>
      )}
    </Card>
  );
}

function TopProductosCard({ productos }: { productos: AnaliticaReporte['top_productos'] }): ReactElement {
  return (
    <Card>
      <CardHeader title="Top Productos (últimos 3 meses)" action={<Trophy size={16} className="text-amber-500" />} />
      {productos.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Sin ventas en el período.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {productos.map((p, idx) => (
            <li key={idx} className="flex items-center justify-between text-sm border-b border-slate-50 last:border-0 pb-2 last:pb-0">
              <span className="text-slate-700 truncate pr-2">
                {p.producto__nombre}{p.variante__nombre ? ` (${p.variante__nombre})` : ''}
              </span>
              <span className="font-black text-primary-700 font-mono shrink-0">${formatoMoneda(parseDecimal(p.ingresos_total))}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function VentasPorDiaSemanaCard({ dias }: { dias: AnaliticaReporte['ventas_por_dia_semana'] }): ReactElement {
  const maxValor = Math.max(...dias.map((d) => d.total), 1);
  const mejorDia = dias.reduce((mejor, d) => (d.total > mejor.total ? d : mejor), dias[0]);

  return (
    <Card>
      <CardHeader title="Ventas por Día de la Semana" action={<CalendarDays size={16} className="text-slate-400" />} />
      <p className="text-xs text-slate-400 mt-1">
        {mejorDia.total > 0 ? <>Tu mejor día suele ser el <span className="font-bold text-slate-600">{mejorDia.dia}</span>.</> : 'Aún sin suficientes datos.'}
      </p>
      <div className="mt-3 flex items-end justify-between gap-1.5 h-28">
        {dias.map((d) => {
          const altura = Math.max((d.total / maxValor) * 100, 3);
          return (
            <div key={d.dia} className="flex-1 flex flex-col items-center gap-1 group">
              <div
                className="w-full max-w-[20px] rounded-t-md bg-gradient-to-t from-sky-500 to-sky-300 transition-transform group-hover:scale-y-105 origin-bottom"
                style={{ height: `${altura}%` }}
                title={`${d.dia}: $${formatoMoneda(d.total)}`}
              />
              <span className="text-[9px] font-semibold text-slate-500">{d.dia.slice(0, 3)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function AnaliticaTab(): ReactElement {
  const [data, setData] = useState<AnaliticaReporte | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setData(await getAnalitica(12));
    } catch {
      toast.error('No se pudo cargar la analítica de ventas.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando || !data) {
    return <Card><div className="p-8 text-center text-slate-400 text-sm">Cargando analítica...</div></Card>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TendenciaMensualChart data={data.tendencia_mensual} />
      <ComparativaCard comparativa={data.comparativa_mensual} />
      <ProyeccionCard proyeccion={data.proyeccion_proximo_mes} />
      <TopProductosCard productos={data.top_productos} />
      <VentasPorDiaSemanaCard dias={data.ventas_por_dia_semana} />
    </div>
  );
}
