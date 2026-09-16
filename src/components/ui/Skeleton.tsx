/**
 * @file Componentes de "skeleton" (esqueleto) para estados de carga.
 * Mejoran la percepción de velocidad: en vez de un spinner que da vueltas,
 * se muestra una estructura fantasma que luego se rellena con datos reales.
 */
import type { CSSProperties, ReactElement } from 'react';

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

/** Bloque rectangular con animación de pulso. */
export function Skeleton({ className = '', style }: SkeletonProps): ReactElement {
  return <div className={`animate-pulse bg-slate-200/70 rounded-lg ${className}`} style={style} />;
}

/** Skeleton para una tarjeta de estadística. */
export function StatCardSkeleton(): ReactElement {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  );
}

/** Skeleton para una tabla (cabecera + N filas). */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }): ReactElement {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex gap-4 items-center">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-20 hidden sm:block" />
            <Skeleton className="h-6 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton para un gráfico de barras (dashboard, reportes). */
export function ChartSkeleton({ bars = 7 }: { bars?: number }): ReactElement {
  const alturas = Array.from({ length: bars }, (_, i) => 35 + ((i * 37) % 55));
  return (
    <div className="flex items-end justify-between gap-2 h-40 mt-4">
      {alturas.map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-t-lg rounded-b-none" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

/** Skeleton para una lista de filas (ícono + texto + valor) -- top productos, alertas, pedidos recientes, etc. */
export function ListSkeleton({ rows = 4 }: { rows?: number }): ReactElement {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5">
          <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-2.5 w-2/5" />
          </div>
          <Skeleton className="h-4 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton para un formulario de configuración (label + campo, N filas). */
export function FormSkeleton({ rows = 4 }: { rows?: number }): ReactElement {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  );
}

/** Skeleton para lista en tarjetas (almacenes, etc.). */
export function CardGridSkeleton({ count = 6 }: { count?: number }): ReactElement {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-6 w-6" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
