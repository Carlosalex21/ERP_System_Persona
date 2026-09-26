/**
 * @file Selector de variante/presentación antes de agregar un producto al
 * carrito del POS -- solo aparece para productos que de verdad tienen
 * variantes (tipo='variable') o presentaciones cargadas; un producto simple
 * sin ninguna de las dos se sigue agregando directo, sin este paso extra.
 */
"use client";

import { type ReactElement } from 'react';
import { X, Layers, Package } from 'lucide-react';
import { AppModal } from '@/components/ui';
import type { Producto } from '@/types/api';

interface ProductVariantModalProps {
  producto: Producto;
  onClose: () => void;
  onSelectVariante: (varianteId: number) => void;
  onSelectPresentacion: (presentacionId: number) => void;
}

export default function ProductVariantModal({
  producto,
  onClose,
  onSelectVariante,
  onSelectPresentacion,
}: ProductVariantModalProps): ReactElement {
  const variantesActivas = (producto.variantes || []);
  const presentacionesActivas = (producto.presentaciones || []).filter((p) => p.activo);

  return (
    <AppModal isOpen onClose={onClose} title={producto.nombre} icon={<Layers size={20} />} size="md">
      <div className="space-y-4">
        {variantesActivas.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Elige la variante</h4>
            <div className="grid grid-cols-2 gap-2">
              {variantesActivas.map((v) => {
                const stock = v.cantidad ?? 0;
                const agotado = stock < 1;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={agotado}
                    onClick={() => onSelectVariante(v.id)}
                    className="text-left px-3 py-2.5 rounded-xl border-2 border-slate-200 hover:border-primary-400 hover:bg-primary-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-transparent"
                  >
                    <p className="text-sm font-bold text-slate-800 truncate">{v.nombre}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-bold text-primary-600">
                        {v.precio ? `$${parseFloat(v.precio).toFixed(2)}` : `$${parseFloat(producto.precio || '0').toFixed(2)}`}
                      </span>
                      <span className={`text-[10px] font-bold ${agotado ? 'text-red-500' : 'text-slate-400'}`}>
                        {agotado ? 'Agotado' : `${stock} disp.`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {presentacionesActivas.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
              <Package size={13} /> Elige la presentación
            </h4>
            <div className="space-y-1.5">
              {presentacionesActivas.map((p) => {
                const precioFinal = p.precio ? parseFloat(p.precio) : parseFloat(producto.precio || '0') * p.factor_conversion;
                const stockBase = producto.cantidad || 0;
                const unidadesDisponibles = Math.floor(stockBase / p.factor_conversion);
                const agotado = unidadesDisponibles < 1;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={agotado}
                    onClick={() => onSelectPresentacion(p.id)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border-2 border-slate-200 hover:border-primary-400 hover:bg-primary-50 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-transparent"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{p.nombre}</p>
                      <p className="text-[11px] text-slate-400">
                        {p.factor_conversion} {p.factor_conversion === 1 ? 'unidad base' : 'unidades base'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary-600">${precioFinal.toFixed(2)}</p>
                      <p className={`text-[10px] font-bold ${agotado ? 'text-red-500' : 'text-slate-400'}`}>
                        {agotado ? 'Agotado' : `${unidadesDisponibles} disp.`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
        >
          <X size={14} /> Cancelar
        </button>
      </div>
    </AppModal>
  );
}
