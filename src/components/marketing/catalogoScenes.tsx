"use client";

import { useEffect, useState, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Package, ShoppingCart, MessageCircle, CheckCircle2, Smartphone } from 'lucide-react';
import { FakeCursor } from './demoPrimitives';
import type { DemoScene } from './DemoWindow';

const DUR = 5.6;

const PRODUCTOS = [
  { nombre: 'Camisa Oxford', usd: 18, bs: 14985 },
  { nombre: 'Pantalón Chino', usd: 22.5, bs: 18731 },
  { nombre: 'Gorra Snapback', usd: 9, bs: 7492 },
  { nombre: 'Zapatos Cuero', usd: 34, bs: 28304 },
];

function SceneExplorar(): ReactElement {
  return (
    <div className="relative h-full p-4 sm:p-6">
      <FakeCursor durationS={DUR} stops={[{ x: 30, y: 25 }, { x: 70, y: 55 }, { x: 30, y: 25 }]} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-slate-400">tunegocio.erpsystem.com</span>
        <div className="relative">
          <ShoppingCart size={16} className="text-slate-500" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {PRODUCTOS.map((p, i) => (
          <motion.div
            key={p.nombre}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + i * 0.1 }}
            className="rounded-xl border border-slate-200 overflow-hidden bg-white"
          >
            <div className="h-16 bg-primary-50 flex items-center justify-center">
              <Package size={22} className="text-primary-300" />
            </div>
            <div className="p-2.5">
              <p className="text-[11px] font-bold text-slate-700 truncate">{p.nombre}</p>
              <p className="text-sm font-black text-slate-900">${p.usd.toFixed(2)}</p>
              <p className="text-[9px] text-slate-400">≈ Bs. {p.bs.toLocaleString('es-VE')}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SceneCarrito(): ReactElement {
  const items = PRODUCTOS.slice(0, 2);
  const subtotal = items.reduce((s, p) => s + p.usd, 0);
  const base = subtotal / 1.16;
  const iva = subtotal - base;

  return (
    <div className="relative h-full p-4 sm:p-6">
      <FakeCursor durationS={DUR} stops={[{ x: 80, y: 15 }, { x: 50, y: 80 }, { x: 50, y: 80 }]} />
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Tu carrito</p>
      <div className="bg-white rounded-xl border border-slate-200 p-3.5">
        <div className="space-y-2 mb-3">
          {items.map((p, i) => (
            <motion.div
              key={p.nombre}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-slate-600 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0"><Package size={14} className="text-primary-400" /></span>
                {p.nombre}
              </span>
              <span className="font-bold text-slate-800">${p.usd.toFixed(2)}</span>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="border-t border-dashed border-slate-200 pt-2.5 space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400"><span>Base imponible</span><span>${base.toFixed(2)}</span></div>
          <div className="flex justify-between text-[10px] text-slate-400"><span>IVA (16%)</span><span>${iva.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm font-black text-slate-900"><span>Total</span><span>${subtotal.toFixed(2)}</span></div>
          <p className="text-[9px] text-slate-400 text-right">≈ Bs. {(subtotal * 832.49).toLocaleString('es-VE', { maximumFractionDigits: 0 })}</p>
        </motion.div>
      </div>
    </div>
  );
}

function SceneCheckout(): ReactElement {
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    setEnviado(false);
    const t = setTimeout(() => setEnviado(true), 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative h-full p-4 sm:p-6 flex flex-col items-center justify-center text-center">
      <FakeCursor durationS={DUR} stops={[{ x: 50, y: 70 }, { x: 50, y: 70 }, { x: 50, y: 70 }]} />
      <AnimatePresence mode="wait">
        {!enviado ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-[220px]">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-3">
              <Smartphone size={24} />
            </div>
            <p className="text-sm font-bold text-slate-800">Datos de entrega</p>
            <div className="mt-3 space-y-2">
              <div className="h-8 rounded-lg bg-slate-100 border border-slate-200" />
              <div className="h-8 rounded-lg bg-slate-100 border border-slate-200" />
              <div className="h-9 rounded-lg bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5">
                <MessageCircle size={13} /> Confirmar por WhatsApp
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-200">
              <CheckCircle2 size={28} />
            </div>
            <p className="text-sm font-bold text-slate-800">¡Pedido enviado!</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">El negocio recibe el pedido formateado directo en su WhatsApp, listo para confirmar.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const CATALOGO_SCENES: DemoScene[] = [
  { id: 'explorar', tab: 'Explorar', render: SceneExplorar },
  { id: 'carrito', tab: 'Carrito', render: SceneCarrito },
  { id: 'checkout', tab: 'Checkout', render: SceneCheckout },
];
