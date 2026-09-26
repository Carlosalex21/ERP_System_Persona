"use client";

import type { ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingCart, X, Trash2, Minus, Plus, ArrowRight, MessageCircle, Package } from 'lucide-react';
import type { PublicProducto } from '@/services/publicCatalogService';

export interface ItemCarrito {
  producto: PublicProducto;
  cantidad: number;
  cartKey: string;
  varianteId?: number | null;
  presentacionId?: number | null;
  nombreCarrito: string;
  precioLinea: string;
  stockLinea: number;
}

interface CartDrawerProps {
  abierto: boolean;
  onClose: () => void;
  carrito: ItemCarrito[];
  onModificarCantidad: (cartKey: string, delta: number) => void;
  onEliminarItem: (cartKey: string) => void;
  simboloProducto: (producto: PublicProducto) => string;
  totalItems: number;
  totalCarrito: number;
  ivaTotalCarrito: number;
  baseImponibleCarrito: number;
  monedaBaseSimbolo: string;
  formatearEquivalenteBase: (montoBase: number) => string | null;
  onCheckout: () => void;
  onPedidoWhatsApp: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/** Drawer lateral del carrito de compra del catálogo público. */
export default function CartDrawer({
  abierto,
  onClose,
  carrito,
  onModificarCantidad,
  onEliminarItem,
  simboloProducto,
  totalItems,
  totalCarrito,
  ivaTotalCarrito,
  baseImponibleCarrito,
  monedaBaseSimbolo,
  formatearEquivalenteBase,
  onCheckout,
  onPedidoWhatsApp,
}: CartDrawerProps): ReactElement {
  return (
    <AnimatePresence>
      {abierto && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 shadow-2xl flex flex-col"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
                <ShoppingCart size={20} className="text-primary-600" /> Mi Pedido
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {carrito.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <ShoppingCart size={48} className="opacity-20" />
                  <p>Tu carrito está vacío</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {carrito.map(item => (
                    <motion.div
                      key={item.cartKey}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="flex gap-4 bg-white p-3 border border-slate-100 rounded-xl shadow-sm"
                    >
                      <div className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                        {item.producto.imagen_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- imagen dinámica servida por el backend del tenant.
                          <img src={item.producto.imagen_url} alt={item.producto.nombre} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <Package size={24} className="text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <h5 className="font-bold text-slate-800 text-sm leading-tight pr-2">{item.nombreCarrito}</h5>
                          <button
                            onClick={() => onEliminarItem(item.cartKey)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                            aria-label="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-black text-primary-700 text-sm">
                            {simboloProducto(item.producto)} {(parseFloat(item.precioLinea) * item.cantidad).toFixed(2)}
                          </span>
                          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                            <button onClick={() => onModificarCantidad(item.cartKey, -1)} className="text-slate-500 hover:text-slate-800" aria-label="Disminuir">
                              <Minus size={14} />
                            </button>
                            <span className="font-bold text-slate-800 text-xs w-4 text-center">{item.cantidad}</span>
                            <button onClick={() => onModificarCantidad(item.cartKey, 1)} className="text-slate-500 hover:text-slate-800" aria-label="Aumentar">
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {carrito.length > 0 && (
              <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-3">
                {ivaTotalCarrito > 0 && (
                  <div className="space-y-1 text-xs text-slate-500 border-b border-slate-200 pb-2">
                    <div className="flex justify-between">
                      <span>Base imponible</span>
                      <span>{monedaBaseSimbolo} {baseImponibleCarrito.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IVA</span>
                      <span>{monedaBaseSimbolo} {ivaTotalCarrito.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Total ({totalItems} items)</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900">{monedaBaseSimbolo} {totalCarrito.toFixed(2)}</span>
                    {formatearEquivalenteBase(totalCarrito) && (
                      <p className="text-xs text-slate-400">≈ {formatearEquivalenteBase(totalCarrito)}</p>
                    )}
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onCheckout}
                  className="w-full bg-primary-600 text-white py-4 rounded-xl font-black text-base shadow-lg hover:bg-primary-700 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowRight size={20} /> Finalizar Pedido
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onPedidoWhatsApp}
                  className="w-full bg-green-500 text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle size={18} /> Pedir por WhatsApp
                </motion.button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
