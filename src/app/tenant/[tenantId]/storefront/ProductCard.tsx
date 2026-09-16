"use client";

import type { ReactElement } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus } from 'lucide-react';
import type { PublicProducto } from '@/services/publicCatalogService';

interface ProductCardProps {
  producto: PublicProducto;
  simbolo: string;
  equivalente: string | null;
  onAdd: (producto: PublicProducto) => void;
}

/** Tarjeta de producto del catálogo público: imagen, precio y CTA de agregar al carrito. */
export default function ProductCard({ producto, simbolo, equivalente, onAdd }: ProductCardProps): ReactElement {
  const agotado = producto.stock_disponible <= 0;

  return (
    <motion.div
      whileHover={agotado ? undefined : { y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl flex flex-col h-full"
    >
      <div className="h-48 bg-slate-50 flex items-center justify-center relative overflow-hidden">
        {producto.imagen_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- imagen dinámica servida por el backend del tenant.
          <img
            src={producto.imagen_url}
            alt={producto.nombre}
            className={`w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500 ${agotado ? 'grayscale opacity-60' : ''}`}
            loading="lazy"
          />
        ) : (
          <Package size={56} className="text-slate-300" />
        )}
        {agotado && (
          <span className="absolute top-3 left-3 bg-slate-900/80 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
            Agotado
          </span>
        )}
        {!agotado && producto.stock_disponible <= 3 && (
          <span className="absolute top-3 left-3 bg-accent-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
            ¡Últimas {producto.stock_disponible}!
          </span>
        )}
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <h4 className="font-bold text-slate-800 text-lg leading-tight mb-1 group-hover:text-primary-600 transition-colors">
          {producto.nombre}
        </h4>
        {producto.descripcion && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3">{producto.descripcion}</p>
        )}
        <div className="mt-auto pt-4 flex items-center justify-between">
          <div>
            <span className="text-xl font-black text-slate-900">
              {simbolo} {parseFloat(producto.precio_venta).toFixed(2)}
            </span>
            {equivalente && <p className="text-xs text-slate-400">≈ {equivalente}</p>}
            {producto.iva_porcentaje > 0 && (
              <p className="text-[10px] text-slate-400">IVA ({producto.iva_porcentaje}%) incluido</p>
            )}
          </div>
          <motion.button
            whileTap={agotado ? undefined : { scale: 0.85 }}
            onClick={() => onAdd(producto)}
            disabled={agotado}
            className="bg-slate-100 text-primary-700 w-10 h-10 rounded-full flex items-center justify-center font-bold hover:bg-primary-600 hover:text-white transition-colors shadow-sm disabled:opacity-40 disabled:hover:bg-slate-100 disabled:hover:text-primary-700 disabled:cursor-not-allowed"
            aria-label="Agregar al carrito"
          >
            <Plus size={20} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
