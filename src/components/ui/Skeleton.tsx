/**
 * @file Componentes de "skeleton" (esqueleto) para estados de carga.
 * Mejoran la percepción de velocidad: en vez de un spinner que da vueltas,
 * se muestra una estructura fantasma que luego se rellena con datos reales.
 */
import type { ReactElement } from 'react';

interface SkeletonProps {
  className?: string;
}

/** Bloque rectangular con animación de pulso. */
export function Skeleton({ className = '' }: SkeletonProps): ReactElement {
  return <div className={`animate-pulse bg-slate-200/70 rounded-lg ${className}`} />;
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
