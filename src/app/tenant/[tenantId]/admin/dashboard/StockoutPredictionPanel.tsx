import type { ReactElement } from 'react';
import { TrendingDown, Flame } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui';
import type { PrediccionQuiebreStock } from './types';

function Fila({ producto }: { producto: PrediccionQuiebreStock }): ReactElement {
  const urgente = producto.dias_restantes <= 3;
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${urgente ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
        {urgente ? <Flame size={16} /> : <TrendingDown size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{producto.nombre}</p>
        <p className="text-[11px] text-slate-400 truncate">
          {producto.cantidad} und. en stock · vende ~{producto.venta_diaria_promedio}/día
        </p>
      </div>
      <span className={`text-sm font-black shrink-0 ${urgente ? 'text-red-600' : 'text-amber-600'}`}>
        {producto.dias_restantes <= 0 ? 'Hoy' : `${producto.dias_restantes}d`}
      </span>
    </div>
  );
}

/**
 * A diferencia de `LowStockPanel` (umbral fijo sobre la cantidad actual),
 * esto proyecta a cuántos días de agotarse está cada producto según su
 * propia velocidad de venta -- ver `dashboard_service.obtener_prediccion_quiebre_stock`.
 * Puede marcar productos que `LowStockPanel` todavía no marcaría (mucho
 * stock pero rotación muy rápida) o dejar fuera productos con stock
 * técnicamente "bajo" pero que casi no se venden.
 */
export default function StockoutPredictionPanel({ productos }: { productos: PrediccionQuiebreStock[] }): ReactElement {
  return (
    <Card>
      <CardHeader
        title="Predicción de Quiebre de Stock"
        action={<span className="px-2 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold">próximos 7 días</span>}
      />
      <div className="divide-y divide-slate-100">
        {productos.length ? (
          productos.map((p, i) => <Fila key={i} producto={p} />)
        ) : (
          <p className="text-center text-slate-400 text-sm py-8">Ningún producto se proyecta agotado esta semana.</p>
        )}
      </div>
    </Card>
  );
}
