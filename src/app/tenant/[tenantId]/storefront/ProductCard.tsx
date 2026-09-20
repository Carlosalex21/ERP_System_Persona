"use client";

import type { ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Package, Plus, Minus, Sparkles } from 'lucide-react';
import type { PublicProducto } from '@/services/publicCatalogService';

interface ProductCardProps {
  producto: PublicProducto;
  simbolo: string;
  equivalente: string | null;
  cantidadEnCarrito: number;
  onAdd: (producto: PublicProducto) => void;
  onIncrement: (id: number) => void;
  onDecrement: (id: number) => void;
}

/** Tarjeta de producto del catálogo público: imagen, precio y controles de carrito. */
export default function ProductCard({
  producto,
  simbolo,
  equivalente,
  cantidadEnCarrito,
  onAdd,
  onIncrement,
  onDecrement,
}: ProductCardProps): ReactElement {
  const agotado = producto.stock_disponible <= 0;
  const enCarrito = cantidadEnCarrito > 0;
  const alTope = cantidadEnCarrito >= producto.stock_disponible;

  return (
    <motion.div
      whileHover={agotado ? undefined : { y: -8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={`relative bg-white rounded-2xl border overflow-hidden group flex flex-col h-full transition-shadow duration-300 ${
        agotado
          ? 'border-slate-100 shadow-sm'
          : 'border-slate-100 shadow-sm hover:shadow-[0_20px_45px_-15px_rgba(79,70,229,0.35)] hover:border-primary-200'
      }`}
    >
      <div className="h-48 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center relative overflow-hidden">
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
        {/* Velo degradado para que el título "flote" sobre la imagen en hover, dando más sensación de profundidad. */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {agotado && (
          <span className="absolute top-3 left-3 bg-slate-900/80 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
            Agotado
          </span>
        )}
        {!agotado && producto.stock_disponible <= 3 && (
          <motion.span
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-3 left-3 flex items-center gap-1 bg-accent-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md shadow-accent-500/30"
          >
            <Sparkles size={10} /> ¡Últimas {producto.stock_disponible}!
          </motion.span>
        )}
        {enCarrito && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className="absolute top-3 right-3 bg-primary-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md shadow-primary-600/30"
          >
            En tu carrito · {cantidadEnCarrito}
          </motion.span>
        )}
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <h4 className="font-bold text-slate-800 text-lg leading-tight mb-1 group-hover:text-primary-600 transition-colors">
          {producto.nombre}
        </h4>
        {producto.descripcion && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3">{producto.descripcion}</p>
        )}
        <div className="mt-auto pt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xl font-black text-slate-900">
              {simbolo} {parseFloat(producto.precio_venta).toFixed(2)}
            </span>
            {equivalente && <p className="text-xs text-slate-400">≈ {equivalente}</p>}
            {producto.iva_porcentaje > 0 && (
              <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wide text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                IVA ({producto.iva_porcentaje}%) incluido
              </span>
            )}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {enCarrito ? (
              <motion.div
                key="stepper"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                className="flex items-center gap-1 bg-primary-50 border border-primary-100 rounded-full p-1 shrink-0"
              >
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => onDecrement(producto.id)}
                  className="w-7 h-7 rounded-full bg-white text-primary-700 flex items-center justify-center shadow-sm hover:bg-primary-100"
                  aria-label="Quitar una unidad"
                >
                  <Minus size={14} />
                </motion.button>
                <span className="w-5 text-center text-sm font-black text-primary-800 tabular-nums">
                  {cantidadEnCarrito}
                </span>
                <motion.button
                  whileTap={alTope ? undefined : { scale: 0.85 }}
                  onClick={() => onIncrement(producto.id)}
                  disabled={alTope}
                  className="w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-sm hover:bg-primary-700 disabled:opacity-40 disabled:hover:bg-primary-600"
                  aria-label="Agregar una unidad más"
                >
                  <Plus size={14} />
                </motion.button>
              </motion.div>
            ) : (
              <motion.button
                key="add"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                whileHover={agotado ? undefined : { scale: 1.04 }}
                whileTap={agotado ? undefined : { scale: 0.92 }}
                onClick={() => onAdd(producto)}
                disabled={agotado}
                className="flex items-center gap-1.5 bg-slate-900 text-white pl-3 pr-3.5 h-10 rounded-full font-bold text-xs shadow-sm hover:bg-primary-600 hover:shadow-lg hover:shadow-primary-600/30 transition-colors disabled:opacity-40 disabled:hover:bg-slate-900 disabled:hover:shadow-none disabled:cursor-not-allowed shrink-0"
                aria-label="Agregar al carrito"
              >
                <Plus size={16} /> Agregar
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
