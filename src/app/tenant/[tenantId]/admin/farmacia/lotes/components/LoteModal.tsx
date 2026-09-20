"use client";

import { useState, useEffect, useMemo, type ReactElement } from 'react';
import { FlaskConical } from 'lucide-react';
import { AppModal, ActionButton } from '@/components/ui';
import { createLote, type LoteProducto } from '@/services/farmaciaService';
import { getProductos } from '@/services/inventoryService';
import { useNotify } from '@/hooks/useNotify';
import type { Producto } from '@/types/api';

interface LoteModalProps {
  /** Lotes ya registrados -- para calcular cuánto stock de cada producto ya está loteado. */
  lotesExistentes: LoteProducto[];
  onClose: () => void;
  onCreated: () => void;
}

function extraerMensajeError(error: any): string {
  const data = error?.response?.data;
  if (data?.cantidad) return Array.isArray(data.cantidad) ? data.cantidad[0] : data.cantidad;
  if (typeof data === 'string') return data;
  return 'No se pudo registrar el lote.';
}

export default function LoteModal({ lotesExistentes, onClose, onCreated }: LoteModalProps): ReactElement {
  const notify = useNotify();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoId, setProductoId] = useState('');
  const [numeroLote, setNumeroLote] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getProductos().then(setProductos).catch(() => setProductos([]));
  }, []);

  // Stock del producto elegido que todavía no está asignado a ningún lote --
  // antes no se mostraba nada, así que era fácil lotear de más (el mismo
  // stock varias veces) sin darse cuenta.
  const stockDisponible = useMemo(() => {
    if (!productoId) return null;
    const producto = productos.find((p) => String(p.id) === productoId);
    if (!producto) return null;
    const yaLoteado = lotesExistentes
      .filter((l) => l.producto === Number(productoId) && l.activo)
      .reduce((suma, l) => suma + l.cantidad, 0);
    return (producto.cantidad || 0) - yaLoteado;
  }, [productoId, productos, lotesExistentes]);

  const guardar = async (): Promise<void> => {
    if (!productoId || !fechaVencimiento) {
      notify.error('Selecciona el producto y la fecha de vencimiento.');
      return;
    }
    const cantidadNum = cantidad ? Number(cantidad) : 0;
    if (stockDisponible !== null && cantidadNum > stockDisponible) {
      notify.error(`Solo quedan ${stockDisponible} unidades sin lotear de este producto.`);
      return;
    }
    setGuardando(true);
    try {
      await createLote({
        producto: Number(productoId),
        numero_lote: numeroLote || undefined,
        fecha_vencimiento: fechaVencimiento,
        cantidad: cantidadNum,
      });
      notify.success('Lote registrado.');
      onCreated();
    } catch (error) {
      notify.error(extraerMensajeError(error));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Nuevo Lote"
      icon={<FlaskConical size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={guardar}>Guardar</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Producto</label>
          <select value={productoId} onChange={(e) => setProductoId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">Selecciona un producto...</option>
            {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">N° de Lote (opcional)</label>
            <input type="text" value={numeroLote} onChange={(e) => setNumeroLote(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cantidad</label>
            <input
              type="number"
              min={0}
              max={stockDisponible ?? undefined}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            {stockDisponible !== null && (
              <p className={`mt-1 text-[11px] font-bold ${stockDisponible <= 0 ? 'text-red-500' : 'text-slate-400'}`}>
                {stockDisponible > 0 ? `Disponible sin lotear: ${stockDisponible}` : 'Ya loteaste todo el stock de este producto.'}
              </p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha de Vencimiento</label>
          <input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
      </div>
    </AppModal>
  );
}
