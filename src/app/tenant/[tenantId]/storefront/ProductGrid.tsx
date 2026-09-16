"use client";

import type { ReactElement } from 'react';
import { Package } from 'lucide-react';
import { Stagger, StaggerItem, Skeleton } from '@/components/ui';
import type { PublicProducto } from '@/services/publicCatalogService';
import ProductCard from './ProductCard';

interface ProductGridProps {
  productos: PublicProducto[];
  cargando: boolean;
  simbolo: (producto: PublicProducto) => string;
  equivalente: (producto: PublicProducto, precio: number) => string | null;
  onAdd: (producto: PublicProducto) => void;
}

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

/** Grilla de productos del catálogo público, con esqueleto de carga y entrada en cascada. */
export default function ProductGrid({ productos, cargando, simbolo, equivalente, onAdd }: ProductGridProps): ReactElement {
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

  return (
    <Stagger className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {productos.map(producto => (
        <StaggerItem key={producto.id} className="h-full">
          <ProductCard
            producto={producto}
            simbolo={simbolo(producto)}
            equivalente={equivalente(producto, parseFloat(producto.precio_venta))}
            onAdd={onAdd}
          />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
