import type { ReactElement } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui';
import type { ProductoBajoStock } from './types';

function Fila({ producto }: { producto: ProductoBajoStock }): ReactElement {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
        <AlertTriangle size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{producto.nombre}</p>
        {producto.sku && <p className="text-[11px] font-mono text-slate-400 truncate">{producto.sku}</p>}
      </div>
      <span className="text-sm font-black text-orange-600 shrink-0">{producto.cantidad} und.</span>
    </div>
  );
}

export default function LowStockPanel({ productos, total }: { productos: ProductoBajoStock[]; total: number }): ReactElement {
  return (
    <Card>
      <CardHeader
        title="Alertas de Stock Bajo"
        action={<span className="px-2 py-1 rounded-full bg-orange-50 text-orange-600 text-[10px] font-bold">{total} pendientes</span>}
      />
      <div className="divide-y divide-slate-100">
        {productos.length ? (
          productos.map((p, i) => <Fila key={i} producto={p} />)
        ) : (
          <p className="text-center text-slate-400 text-sm py-8">¡Todo en orden! No hay productos con stock crítico.</p>
        )}
      </div>
    </Card>
  );
}
