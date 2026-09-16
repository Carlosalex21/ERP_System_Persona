/**
 * @file Estado de carga del Dashboard, con la misma forma que el contenido
 * real (tarjetas, gráfico, listas) -- reemplaza el spinner de pantalla
 * completa que antes tapaba todo el layout: ahora el usuario ve de una vez
 * la estructura de su dashboard "vacía" en vez de un giro sin contexto, y
 * no hay salto de layout cuando los datos reales llegan.
 */
import type { ReactElement } from 'react';
import { Card, CardHeader, StatCardSkeleton, ChartSkeleton, ListSkeleton } from '@/components/ui';

export default function DashboardSkeleton(): ReactElement {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Ventas del Mes" />
          <ChartSkeleton />
        </Card>
        <Card>
          <CardHeader title="Top Productos" />
          <ListSkeleton rows={4} />
        </Card>
      </div>

      <Card>
        <CardHeader title="Alertas de Stock Bajo" />
        <ListSkeleton rows={3} />
      </Card>
    </div>
  );
}
