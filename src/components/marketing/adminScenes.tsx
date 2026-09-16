"use client";

import { useEffect, useState, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DollarSign, Boxes, TrendingUp, Check, Search, AlertTriangle, Clock, MessageCircle,
} from 'lucide-react';
import { AnimatedNumber, FakeCursor } from './demoPrimitives';
import type { DemoScene } from './DemoWindow';

const DUR = 5.6;

function SceneDashboard(): ReactElement {
  return (
    <div className="relative h-full p-4 sm:p-6">
      <FakeCursor durationS={DUR} stops={[{ x: 88, y: 10 }, { x: 50, y: 55 }, { x: 88, y: 10 }]} />
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { icon: <DollarSign size={16} />, label: 'Ventas del mes', value: 4280, prefix: '$', color: 'bg-primary-600' },
          { icon: <Boxes size={16} />, label: 'Productos', value: 312, color: 'bg-ink-800' },
          { icon: <TrendingUp size={16} />, label: 'Bajo stock', value: 6, color: 'bg-accent-500' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.12, duration: 0.5 }}
            className="bg-white rounded-xl border border-slate-200 p-3"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white mb-2 ${s.color}`}>{s.icon}</div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{s.label}</p>
            <p className="text-lg font-black text-slate-900">
              <AnimatedNumber value={s.value} prefix={s.prefix} />
            </p>
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="col-span-3 rounded-xl bg-white border border-slate-200 p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Ventas de la semana</p>
          <div className="flex items-end gap-2 h-24">
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="col-span-2 rounded-xl bg-white border border-slate-200 p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Top productos</p>
          <div className="space-y-2.5">
            {[{ n: 'Camisa Oxford', v: '42u' }, { n: 'Pantalón Chino', v: '31u' }, { n: 'Gorra', v: '18u' }].map((p, i) => (
              <motion.div
                key={p.n}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + i * 0.1 }}
                className="flex items-center justify-between text-[11px]"
              >
                <span className="text-slate-600 truncate">{p.n}</span>
                <span className="font-bold text-slate-800">{p.v}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ScenePos(): ReactElement {
  const [carrito, setCarrito] = useState<{ nombre: string; precio: number }[]>([]);

  useEffect(() => {
    setCarrito([]);
    const t1 = setTimeout(() => setCarrito([{ nombre: 'Camisa Oversize', precio: 20 }]), 1500);
    const t2 = setTimeout(() => setCarrito((c) => [...c, { nombre: 'Pantalón', precio: 30 }]), 2700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const total = carrito.reduce((sum, i) => sum + i.precio, 0);
  const pagado = carrito.length >= 2;

  return (
    <div className="relative h-full p-4 sm:p-6 grid grid-cols-5 gap-4">
      <FakeCursor durationS={DUR} stops={[{ x: 22, y: 18 }, { x: 22, y: 50 }, { x: 82, y: 90 }]} />
      <div className="col-span-3 grid grid-cols-2 gap-2.5 content-start">
        {['Camisa Oversize', 'Pantalón', 'Gorra', 'Zapatos', 'Chaqueta', 'Bolso'].map((p, i) => (
          <motion.div
            key={p}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            className="border border-slate-200 rounded-lg p-2.5 bg-white"
          >
            <p className="text-[11px] font-bold text-slate-700 truncate">{p}</p>
            <p className="text-[11px] font-black text-primary-600">${(15 + i * 5).toFixed(2)}</p>
          </motion.div>
        ))}
      </div>
      <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-3.5 flex flex-col">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Venta actual</p>
        <div className="flex-1 space-y-1.5">
          <AnimatePresence>
            {carrito.map((item) => (
              <motion.div
                key={item.nombre}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-between text-[11px]"
              >
                <span className="text-slate-600 truncate">{item.nombre}</span>
                <span className="font-bold text-slate-800">${item.precio.toFixed(2)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="border-t border-dashed border-slate-200 mt-2 pt-2 flex justify-between items-center">
          <span className="text-[11px] font-bold text-slate-500">Total</span>
          <span className="text-base font-black text-slate-900">${total.toFixed(2)}</span>
        </div>
        <AnimatePresence>
          {pagado && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-2 flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg py-1.5 text-[11px] font-bold"
            >
              <Check size={12} strokeWidth={3} /> Venta registrada
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SceneInventario(): ReactElement {
  const filas: { nombre: string; sku: string; stock: number; estado: 'ok' | 'bajo' | 'agotado' }[] = [
    { nombre: 'Camisa Oxford', sku: 'CAM-001', stock: 42, estado: 'ok' },
    { nombre: 'Pantalón Chino', sku: 'PAN-014', stock: 4, estado: 'bajo' },
    { nombre: 'Zapatos Cuero', sku: 'ZAP-022', stock: 0, estado: 'agotado' },
    { nombre: 'Gorra Snapback', sku: 'GOR-005', stock: 27, estado: 'ok' },
  ];
  const badge = {
    ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    bajo: 'bg-accent-50 text-accent-700 border-accent-200',
    agotado: 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <div className="relative h-full p-4 sm:p-6">
      <FakeCursor durationS={DUR} stops={[{ x: 30, y: 12 }, { x: 50, y: 45 }, { x: 50, y: 45 }]} />
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 text-slate-400">
          <Search size={14} /><span className="text-xs">Buscar producto...</span>
        </div>
        <div className="divide-y divide-slate-100">
          {filas.map((f, i) => (
            <motion.div
              key={f.sku}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.12 }}
              className={`flex items-center justify-between px-4 py-3 ${f.estado === 'bajo' ? 'bg-accent-50/40' : ''}`}
            >
              <div>
                <p className="text-sm font-bold text-slate-800">{f.nombre}</p>
                <p className="text-[10px] font-mono text-slate-400">{f.sku}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${badge[f.estado]}`}>
                {f.estado === 'agotado' ? 'Agotado' : `${f.stock} und.`}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="mt-3 flex items-center gap-2 bg-accent-50 text-accent-700 border border-accent-200 rounded-lg px-3 py-2 text-[11px] font-bold"
      >
        <AlertTriangle size={13} /> 6 productos con stock bajo -- alerta automática
      </motion.div>
    </div>
  );
}

function ScenePedidos(): ReactElement {
  const [confirmado, setConfirmado] = useState(false);

  useEffect(() => {
    setConfirmado(false);
    const t = setTimeout(() => setConfirmado(true), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative h-full p-4 sm:p-6">
      <FakeCursor durationS={DUR} stops={[{ x: 85, y: 20 }, { x: 85, y: 20 }, { x: 85, y: 20 }]} />
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Pedidos entrantes</p>
      <div className="space-y-2.5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-800">María González</p>
            <p className="text-[10px] text-slate-400">Catálogo público · 2 productos · $38.00</p>
          </div>
          <AnimatePresence mode="wait">
            {!confirmado ? (
              <motion.span
                key="pendiente"
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1"
              >
                <Clock size={11} /> Pendiente
              </motion.span>
            ) : (
              <motion.span
                key="confirmado"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1"
              >
                <Check size={11} strokeWidth={3} /> Confirmado
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center justify-between opacity-70">
          <div>
            <p className="text-sm font-bold text-slate-800">Pedro Ramírez</p>
            <p className="text-[10px] text-slate-400">Punto de venta · 1 producto · $20.00</p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200">Pagado</span>
        </motion.div>
      </div>
      <AnimatePresence>
        {confirmado && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-2 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg px-3 py-2 text-[11px] font-bold"
          >
            <MessageCircle size={13} /> Notificación enviada al cliente por WhatsApp
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const ADMIN_SCENES: DemoScene[] = [
  { id: 'dashboard', tab: 'Dashboard', render: SceneDashboard },
  { id: 'pos', tab: 'Punto de venta', render: ScenePos },
  { id: 'inventario', tab: 'Inventario', render: SceneInventario },
  { id: 'pedidos', tab: 'Pedidos', render: ScenePedidos },
];
