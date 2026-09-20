"use client";

import { useMemo, useState, type ReactElement } from 'react';
import { ArrowDownAZ, ArrowDownWideNarrow, ArrowUpWideNarrow, Package, SlidersHorizontal } from 'lucide-react';
import { Stagger, StaggerItem, Skeleton } from '@/components/ui';
import type { PublicProducto } from '@/services/publicCatalogService';
import ProductCard from './ProductCard';

type Orden = 'relevancia' | 'precio_asc' | 'precio_desc' | 'nombre';

interface ProductGridProps {
  productos: PublicProducto[];
  cargando: boolean;
  simbolo: (producto: PublicProducto) => string;
  equivalente: (producto: PublicProducto, precio: number) => string | null;
  /** Precio del producto ya convertido a la moneda base -- para poder
   *  ordenar por precio de forma coherente aunque cada producto esté
   *  cargado en una moneda distinta (ver `aMonedaBase` en el padre). */
  precioEnBase: (producto: PublicProducto) => number;
  cantidadPorProducto: Map<number, number>;
  onAdd: (producto: PublicProducto) => void;
  onIncrement: (id: number) => void;
  onDecrement: (id: number) => void;
}

const OPCIONES_ORDEN: { valor: Orden; etiqueta: string; icon: ReactElement }[] = [
  { valor: 'relevancia', etiqueta: 'Relevancia', icon: <SlidersHorizontal size={14} /> },
  { valor: 'precio_asc', etiqueta: 'Precio: menor a mayor', icon: <ArrowUpWideNarrow size={14} /> },
  { valor: 'precio_desc', etiqueta: 'Precio: mayor a menor', icon: <ArrowDownWideNarrow size={14} /> },
  { valor: 'nombre', etiqueta: 'Nombre A-Z', icon: <ArrowDownAZ size={14} /> },
];

function ProductCardSkeleton(): ReactElement {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
      <Skeleton className="h-48 w-full" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Grilla de productos del catálogo público, con orden, esqueleto de carga y entrada en cascada. */
export default function ProductGrid({
  productos,
  cargando,
  simbolo,
  equivalente,
  precioEnBase,
  cantidadPorProducto,
  onAdd,
  onIncrement,
  onDecrement,
}: ProductGridProps): ReactElement {
  const [orden, setOrden] = useState<Orden>('relevancia');
  const [menuOrdenAbierto, setMenuOrdenAbierto] = useState(false);

  const productosOrdenados = useMemo(() => {
    if (orden === 'relevancia') return productos;
    const copia = [...productos];
    if (orden === 'precio_asc') copia.sort((a, b) => precioEnBase(a) - precioEnBase(b));
    else if (orden === 'precio_desc') copia.sort((a, b) => precioEnBase(b) - precioEnBase(a));
    else if (orden === 'nombre') copia.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return copia;
  }, [productos, orden, precioEnBase]);

  if (cargando && productos.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Package size={48} className="mx-auto mb-4 opacity-30" />
        <p>No se encontraron productos.</p>
      </div>
    );
  }

  const opcionActual = OPCIONES_ORDEN.find(o => o.valor === orden) ?? OPCIONES_ORDEN[0];

  return (
    <div>
      <div className="relative flex justify-end mb-5">
        <button
          type="button"
          onClick={() => setMenuOrdenAbierto(v => !v)}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm hover:border-primary-300 hover:text-primary-700 transition-colors"
        >
          {opcionActual.icon} {opcionActual.etiqueta}
        </button>
        {menuOrdenAbierto && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOrdenAbierto(false)} />
            <div className="absolute right-0 top-full mt-2 z-20 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden w-56">
              {OPCIONES_ORDEN.map(opcion => (
                <button
                  key={opcion.valor}
                  type="button"
                  onClick={() => { setOrden(opcion.valor); setMenuOrdenAbierto(false); }}
                  className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-left transition-colors ${
                    opcion.valor === orden ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opcion.icon} {opcion.etiqueta}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <Stagger className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {productosOrdenados.map(producto => (
          <StaggerItem key={producto.id} className="h-full">
            <ProductCard
              producto={producto}
              simbolo={simbolo(producto)}
              equivalente={equivalente(producto, parseFloat(producto.precio_venta))}
              cantidadEnCarrito={cantidadPorProducto.get(producto.id) ?? 0}
              onAdd={onAdd}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
            />
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
