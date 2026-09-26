import type { ReactElement } from 'react';
import { ChevronRight, Package } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui';
import type { ProductoVendido } from './types';

function Fila({ producto, formatear }: { producto: ProductoVendido; formatear: (monto: number) => string }): ReactElement {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
        <Package size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{producto.nombre}</p>
        <p className="text-[11px] text-slate-400">{producto.cantidad} unidades vendidas</p>
      </div>
      <span className="text-sm font-black text-green-600 shrink-0">{formatear(producto.total)}</span>
    </div>
  );
}

export default function TopProductsPanel({ productos, formatear }: { productos: ProductoVendido[]; formatear: (monto: number) => string }): ReactElement {
  return (
    <Card>
      <CardHeader title="Top Productos" action={<ChevronRight size={16} className="text-slate-400" />} />
      <div className="divide-y divide-slate-100">
        {productos.length ? (
          productos.map((p, i) => <Fila key={i} producto={p} formatear={formatear} />)
        ) : (
          <p className="text-center text-slate-400 text-sm py-8">Aún no hay datos de ventas.</p>
        )}
      </div>
    </Card>
  );
}
