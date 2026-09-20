"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { Receipt, Plus, Trash2 } from 'lucide-react';
import { AppModal, ActionButton } from '@/components/ui';
import { cerrarOrdenServicio, type OrdenServicio, type LineaCierreOrden } from '@/services/serviciosService';
import { getProductos } from '@/services/inventoryService';
import { getMetodosDePago } from '@/services/facturacionService';
import { getMonedas } from '@/services/configuracionService';
import { useNotify } from '@/hooks/useNotify';
import type { Producto, MetodoPago, Moneda } from '@/types/api';

interface CerrarOrdenModalProps {
  orden: OrdenServicio;
  onClose: () => void;
  onCerrada: () => void;
}

/** Una línea en construcción en el formulario -- `monto` es texto mientras se edita. */
interface LineaForm {
  key: number;
  productoId: string;
  cantidad: string;
  monto: string;
}

export default function CerrarOrdenModal({ orden, onClose, onCerrada }: CerrarOrdenModalProps): ReactElement {
  const notify = useNotify();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  // Arranca con una línea vacía -- casi siempre la mano de obra -- y el
  // admin agrega más si vendió algún repuesto real en esta orden.
  const [lineas, setLineas] = useState<LineaForm[]>([{ key: 0, productoId: '', cantidad: '1', monto: orden.costo_estimado || '' }]);
  const [metodoPagoId, setMetodoPagoId] = useState('');
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [monedaId, setMonedaId] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getProductos().then(setProductos).catch(() => setProductos([]));
    getMetodosDePago().then(setMetodosPago).catch(() => setMetodosPago([]));
    getMonedas().then((lista) => {
      setMonedas(lista);
      const base = lista.find((m) => m.es_predeterminada);
      if (base) setMonedaId(String(base.id));
    }).catch(() => setMonedas([]));
  }, []);

  const monedaSeleccionada = monedas.find((m) => String(m.id) === monedaId);
  const simboloMoneda = monedaSeleccionada?.simbolo || monedaSeleccionada?.codigo || '$';

  const actualizarLinea = (key: number, campo: keyof Omit<LineaForm, 'key'>, valor: string): void => {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)));
  };

  const agregarLinea = (): void => {
    setLineas((prev) => [...prev, { key: Date.now(), productoId: '', cantidad: '1', monto: '' }]);
  };

  const quitarLinea = (key: number): void => {
    setLineas((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  };

  const total = lineas.reduce((suma, l) => suma + (Number(l.monto) || 0) * (Number(l.cantidad) || 0), 0);

  const confirmar = async (): Promise<void> => {
    const lineasValidas: LineaCierreOrden[] = [];
    for (const l of lineas) {
      if (!l.productoId && !l.monto) continue; // línea vacía sin tocar -- se ignora
      if (!l.productoId || !l.monto || Number(l.monto) <= 0) {
        notify.error('Completa el producto y el monto de cada línea (o elimínala).');
        return;
      }
      lineasValidas.push({ producto_id: Number(l.productoId), cantidad: Number(l.cantidad) || 1, monto: Number(l.monto) });
    }
    if (lineasValidas.length === 0) {
      notify.error('Agrega al menos una línea (mano de obra o repuesto) para facturar.');
      return;
    }
    if (!metodoPagoId) {
      notify.error('Selecciona el método de pago.');
      return;
    }
    setGuardando(true);
    try {
      await cerrarOrdenServicio(orden.id, {
        lineas: lineasValidas,
        metodo_pago_id: Number(metodoPagoId),
        ...(monedaId ? { moneda_id: Number(monedaId) } : {}),
      });
      notify.success('Orden facturada y cobrada.');
      onCerrada();
    } catch {
      notify.error('No se pudo cerrar la orden.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={`Cerrar Orden OS-${orden.numero}`}
      icon={<Receipt size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={confirmar}>Facturar y Cobrar</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Agrega una línea por cada cosa a cobrar: la mano de obra (ej. &ldquo;Servicio Técnico&rdquo;) y, si vendiste algún repuesto real en esta orden (ej. &ldquo;Batería nueva&rdquo;), una línea más por cada uno.
        </p>

        <div className="space-y-3">
          {lineas.map((linea) => (
            <div key={linea.key} className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <div className="flex-1 min-w-0 space-y-2">
                <select
                  value={linea.productoId}
                  onChange={(e) => actualizarLinea(linea.key, 'productoId', e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                >
                  <option value="">Producto/servicio...</option>
                  {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={linea.cantidad}
                    onChange={(e) => actualizarLinea(linea.key, 'cantidad', e.target.value)}
                    placeholder="Cant."
                    className="w-16 px-2 py-1.5 border rounded-lg text-xs"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={linea.monto}
                    onChange={(e) => actualizarLinea(linea.key, 'monto', e.target.value)}
                    placeholder={`Monto (${simboloMoneda})`}
                    className="flex-1 min-w-0 px-2 py-1.5 border rounded-lg text-xs"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => quitarLinea(linea.key)}
                disabled={lineas.length === 1}
                className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30 shrink-0"
                aria-label="Quitar línea"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={agregarLinea}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 border-dashed border-slate-200 text-xs font-bold text-slate-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
        >
          <Plus size={14} /> Agregar línea (ej. un repuesto vendido)
        </button>

        {monedas.length > 1 && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Moneda a cobrar</label>
            <div className="flex flex-wrap gap-2">
              {monedas.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMonedaId(String(m.id))}
                  className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-colors ${
                    monedaId === String(m.id) ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {m.codigo}{m.es_predeterminada ? ' (Base)' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-1">
          <span className="text-sm font-bold text-slate-500">Total</span>
          <span className="text-lg font-black text-slate-900">{simboloMoneda} {total.toFixed(2)}</span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método de Pago</label>
          <select value={metodoPagoId} onChange={(e) => setMetodoPagoId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">Selecciona...</option>
            {metodosPago.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>
      </div>
    </AppModal>
  );
}
