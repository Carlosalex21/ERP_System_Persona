"use client";

import { useEffect, useState, type ReactElement } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  DollarSign, Boxes, TrendingUp, ShoppingCart,
  Check, MousePointer2, Package, MessageCircle,
} from 'lucide-react';

/**
 * Mockup animado del producto que se reproduce solo -- simula a alguien
 * navegando el sistema (dashboard, cobrando en el POS, comprando en el
 * catálogo público) sin depender de un video real grabado. Encadena 3
 * "escenas" que avanzan automáticamente; cada una se anima con un cursor
 * falso que se mueve y "hace clic" en los elementos relevantes.
 */

type EscenaId = 'dashboard' | 'pos' | 'catalogo';

const ESCENAS: { id: EscenaId; tab: string }[] = [
  { id: 'dashboard', tab: 'Dashboard' },
  { id: 'pos', tab: 'Punto de venta' },
  { id: 'catalogo', tab: 'Catálogo público' },
];

const DURACION_ESCENA_MS = 5200;

/** Número que cuenta de 0 hasta `value` cuando el componente aparece. */
function AnimatedNumber({ value, prefix = '', decimals = 0 }: { value: number; prefix?: string; decimals?: number }): ReactElement {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => `${prefix}${v.toFixed(decimals)}`);
  const [display, setDisplay] = useState(`${prefix}${(0).toFixed(decimals)}`);

  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 });
    const unsub = rounded.on('change', setDisplay);
    return () => {
      controls.stop();
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display}</>;
}

/** Punto de cursor falso que recorre paradas (%) dentro del contenedor y "hace clic" en cada una. */
function FakeCursor({ stops }: { stops: { x: number; y: number }[] }): ReactElement {
  const xs = stops.map((s) => `${s.x}%`);
  const ys = stops.map((s) => `${s.y}%`);
  const scales = stops.map(() => [1, 1.35, 1]).flat();
  const n = stops.length;
  const times = stops.map((_, i) => i / (n - 1 || 1));

  return (
    <motion.div
      className="absolute z-30 pointer-events-none"
      initial={{ x: xs[0], y: ys[0], opacity: 0 }}
      animate={{ x: xs, y: ys, opacity: 1 }}
      transition={{ duration: DURACION_ESCENA_MS / 1000 - 0.6, times, ease: 'easeInOut' }}
      style={{ left: 0, top: 0 }}
    >
      <div className="relative -translate-x-1 -translate-y-1">
        <MousePointer2 size={22} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] fill-primary-600" />
        <motion.span
          className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-primary-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0], scale: [0.6, 1.8, 0.6] }}
          transition={{ duration: DURACION_ESCENA_MS / 1000 - 0.6, times, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  );
}

function EscenaDashboard(): ReactElement {
  return (
    <div className="relative h-full p-4 sm:p-5">
      <FakeCursor stops={[{ x: 85, y: 12 }, { x: 50, y: 60 }, { x: 85, y: 12 }]} />
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        {[
          { icon: <DollarSign size={15} />, label: 'Ventas del mes', value: 4280, prefix: '$', color: 'bg-primary-600' },
          { icon: <Boxes size={15} />, label: 'Productos', value: 312, color: 'bg-ink-800' },
          { icon: <TrendingUp size={15} />, label: 'Bajo stock', value: 6, color: 'bg-accent-500' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.12, duration: 0.5 }}
            className="bg-white rounded-xl border border-slate-200 p-3"
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white mb-2 ${s.color}`}>{s.icon}</div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">{s.label}</p>
            <p className="text-base font-black text-slate-900">
              <AnimatedNumber value={s.value} prefix={s.prefix} />
            </p>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.5 }}
        className="rounded-xl bg-white border border-slate-200 p-4"
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Ventas de la semana</p>
        <div className="flex items-end gap-2 h-20">
          {[40, 65, 50, 80, 60, 95, 75].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 0.75 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
              className="flex-1 rounded-t bg-primary-600"
              style={{ opacity: 0.55 + i / 14 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function EscenaPos(): ReactElement {
  const [carrito, setCarrito] = useState<{ nombre: string; precio: number }[]>([]);

  useEffect(() => {
    setCarrito([]);
    const t1 = setTimeout(() => setCarrito([{ nombre: 'Camisa Oversize', precio: 20 }]), 1500);
    const t2 = setTimeout(() => setCarrito((c) => [...c, { nombre: 'Pantalón', precio: 30 }]), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const total = carrito.reduce((sum, i) => sum + i.precio, 0);
  const pagado = carrito.length >= 2;

  return (
    <div className="relative h-full p-4 sm:p-5 grid grid-cols-5 gap-3">
      <FakeCursor stops={[{ x: 24, y: 20 }, { x: 24, y: 55 }, { x: 82, y: 88 }]} />
      <div className="col-span-3 grid grid-cols-2 gap-2 content-start">
        {['Camisa Oversize', 'Pantalón', 'Gorra', 'Zapatos'].map((p, i) => (
          <motion.div
            key={p}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            className="border border-slate-200 rounded-lg p-2 bg-white"
          >
            <p className="text-[10px] font-bold text-slate-700 truncate">{p}</p>
            <p className="text-[10px] font-black text-primary-600">${(15 + i * 5).toFixed(2)}</p>
          </motion.div>
        ))}
      </div>
      <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-3 flex flex-col">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2">Venta actual</p>
        <div className="flex-1 space-y-1.5">
          <AnimatePresence>
            {carrito.map((item) => (
              <motion.div
                key={item.nombre}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-between text-[10px]"
              >
                <span className="text-slate-600 truncate">{item.nombre}</span>
                <span className="font-bold text-slate-800">${item.precio.toFixed(2)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="border-t border-dashed border-slate-200 mt-2 pt-2 flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-500">Total</span>
          <span className="text-sm font-black text-slate-900">${total.toFixed(2)}</span>
        </div>
        <AnimatePresence>
          {pagado && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-2 flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg py-1.5 text-[10px] font-bold"
            >
              <Check size={12} strokeWidth={3} /> Venta registrada
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EscenaCatalogo(): ReactElement {
  const [enCarrito, setEnCarrito] = useState(0);
  const [pedido, setPedido] = useState(false);

  useEffect(() => {
    setEnCarrito(0);
    setPedido(false);
    const t1 = setTimeout(() => setEnCarrito(1), 1400);
    const t2 = setTimeout(() => setEnCarrito(2), 2500);
    const t3 = setTimeout(() => setPedido(true), 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="relative h-full p-4 sm:p-5">
      <FakeCursor stops={[{ x: 30, y: 35 }, { x: 30, y: 35 }, { x: 78, y: 15 }]} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-slate-400">tunegocio.erpsystem.com</span>
        <div className="relative">
          <ShoppingCart size={16} className="text-slate-500" />
          <AnimatePresence>
            {enCarrito > 0 && (
              <motion.span
                key={enCarrito}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-accent-500 text-white text-[9px] font-black flex items-center justify-center"
              >
                {enCarrito}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {['Camisa Oxford', 'Pantalón Chino'].map((p, i) => (
          <motion.div
            key={p}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
            className="rounded-xl border border-slate-200 overflow-hidden bg-white"
          >
            <div className="h-14 bg-primary-50 flex items-center justify-center">
              <Package size={20} className="text-primary-300" />
            </div>
            <div className="p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-700 truncate">{p}</span>
              <span className="text-[10px] font-black text-slate-900">${18 + i * 4}</span>
            </div>
          </motion.div>
        ))}
      </div>
      <AnimatePresence>
        {pedido && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-3 py-2 text-[10px] font-bold"
          >
            <MessageCircle size={13} /> Pedido enviado por WhatsApp
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const RENDER: Record<EscenaId, () => ReactElement> = {
  dashboard: EscenaDashboard,
  pos: EscenaPos,
  catalogo: EscenaCatalogo,
};

export default function ProductDemo(): ReactElement {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setIdx((i) => (i + 1) % ESCENAS.length), DURACION_ESCENA_MS);
    return () => clearInterval(interval);
  }, []);

  const escena = ESCENAS[idx];
  const Escena = RENDER[escena.id];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-2 shadow-2xl shadow-black/40">
      <div className="rounded-xl bg-slate-100 overflow-hidden">
        {/* Barra superior estilo navegador */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-200/70 border-b border-slate-300/50">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 text-[10px] font-mono text-slate-500 truncate">tutienda.erpsystem.com/admin</span>
        </div>

        {/* Pestañas de escena -- también funcionan como control manual */}
        <div className="flex items-center gap-1 px-3 pt-2.5 bg-white border-b border-slate-100">
          {ESCENAS.map((e, i) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setIdx(i)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-t-lg transition-colors ${
                i === idx ? 'bg-slate-100 text-primary-700' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {e.tab}
            </button>
          ))}
        </div>

        <div className="h-[280px] sm:h-[300px] relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={escena.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0"
            >
              <Escena />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Indicador de progreso de la escena activa */}
        <div className="flex gap-1.5 px-4 py-2.5 bg-white border-t border-slate-100">
          {ESCENAS.map((e, i) => (
            <div key={e.id} className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
              {i === idx && (
                <motion.div
                  key={escena.id}
                  className="h-full bg-primary-500"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: DURACION_ESCENA_MS / 1000, ease: 'linear' }}
                />
              )}
              {i < idx && <div className="h-full bg-primary-200" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
