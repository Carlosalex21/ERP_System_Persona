"use client";

import type { ReactElement } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Store, Search } from 'lucide-react';

interface StorefrontHeroProps {
  nombreTienda: string;
  totalItems: number;
  onCartClick: () => void;
  filtro: string;
  onFiltroChange: (valor: string) => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/** Navbar + hero de bienvenida del catálogo público: primera impresión de la tienda para el cliente. */
export default function StorefrontHero({ nombreTienda, totalItems, onCartClick, filtro, onFiltroChange }: StorefrontHeroProps): ReactElement {
  return (
    <>
      {/* NAVBAR */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-md shrink-0">
              <Store size={20} />
            </div>
            <h1 className="text-xl font-black tracking-tight uppercase text-slate-800 truncate">
              {nombreTienda}
            </h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onCartClick}
            className="relative p-2 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors shrink-0"
            aria-label="Abrir carrito"
          >
            <ShoppingCart size={24} />
            {totalItems > 0 && (
              <motion.span
                key={totalItems}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                className="absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-white shadow-sm"
              >
                {totalItems}
              </motion.span>
            )}
          </motion.button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ink-950 via-primary-900 to-primary-800 text-white py-16 px-4">
        <motion.div
          aria-hidden
          className="absolute -bottom-24 -right-24 w-80 h-80 bg-primary-500/30 rounded-full blur-3xl"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="absolute -top-16 -left-16 w-64 h-64 bg-accent-500/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <div className="max-w-7xl mx-auto relative z-10 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-3 leading-tight">
              Bienvenido a {nombreTienda}
            </h2>
            <p className="text-primary-200 text-base sm:text-lg">Compra fácil y haz tu pedido en segundos.</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
            className="relative w-full sm:w-80"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={filtro}
              onChange={e => onFiltroChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:bg-white focus:text-slate-900 focus:placeholder-slate-400 transition-all"
            />
          </motion.div>
        </div>
      </section>
    </>
  );
}
