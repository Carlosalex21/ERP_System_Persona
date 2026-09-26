/**
 * @file Gráfico de barras de ventas del Dashboard. Aislado en su propio
 * archivo porque tiene lógica propia no trivial (barras que crecen al
 * montar, tooltip, `overflow-x-auto` de respaldo) -- mantenerlo separado
 * de `DashboardView` deja ese archivo enfocado en orquestar datos, no en
 * dibujar.
 */
import type { ReactElement } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader } from '@/components/ui';
import type { VentasChartPoint } from './types';

export default function SalesChart({ data, formatear }: { data: VentasChartPoint[]; formatear: (monto: number) => string }): ReactElement {
  const sinDatos = data.length === 0 || data.every((d) => d.valor === 0);
  const maxValor = Math.max(...data.map((d) => d.valor), 1);

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title="Ventas del Mes"
        action={<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Período actual</span>}
      />

      {sinDatos ? (
        <div className="flex items-center justify-center h-40 mt-4 text-sm text-slate-400">
          Aún no hay ventas registradas en este período.
        </div>
      ) : (
        // Con muchos puntos (ej. 30 días) el contenido natural de cada
        // columna (el label de fecha) es más ancho que el espacio que le
        // toca -- sin `min-w-0` los hijos flex no se encogen por debajo de
        // ese ancho natural, así que la fila entera terminaba más ancha
        // que la tarjeta y las últimas columnas quedaban cortadas fuera
        // del cuadro. `overflow-x-auto` es el respaldo para cuando ni
        // truncando cabe todo en pantallas angostas.
        <div className="overflow-x-auto mt-4">
          <div className="flex items-stretch justify-between gap-1.5 h-48 min-w-max px-0.5 pt-5">
            {data.map((punto, idx) => {
              const altura = Math.max((punto.valor / maxValor) * 100, 4);
              return (
                <div key={idx} className="w-9 h-full shrink-0 flex flex-col items-center gap-1 group">
                  {/* El % de altura de la barra necesita un contenedor con
                      altura definida: antes la columna medía "auto" y todas
                      las barras quedaban en 0px (gráfico vacío). */}
                  <div className="relative flex-1 w-full flex items-end justify-center">
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full text-[9px] font-bold text-slate-600 bg-white/90 rounded px-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {formatear(punto.valor)}
                    </span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${altura}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.02, ease: [0.22, 1, 0.36, 1] }}
                      className="w-full max-w-[24px] rounded-t-lg bg-gradient-to-t from-primary-600 to-primary-400 group-hover:from-primary-700 group-hover:to-primary-500 origin-bottom transition-colors"
                      title={`${punto.label}: ${formatear(punto.valor)}`}
                    />
                  </div>
                  <span className="text-[9px] font-semibold text-slate-500 whitespace-nowrap">{punto.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
