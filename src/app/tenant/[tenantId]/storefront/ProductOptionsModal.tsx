"use client";

import { type ReactElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, Package } from 'lucide-react';
import type { PublicProducto } from '@/services/publicCatalogService';

interface ProductOptionsModalProps {
  producto: PublicProducto;
  simbolo: string;
  onClose: () => void;
  onSelectVariante: (varianteId: number) => void;
  onSelectPresentacion: (presentacionId: number) => void;
}

/**
 * Selector de variante/presentación en el catálogo público -- se muestra al
 * tocar "Agregar" en un producto que tiene alguna de las dos cargadas (ver
 * `ProductCard`, que para esos productos nunca agrega directo).
 */
export default function ProductOptionsModal({
  producto,
  simbolo,
  onClose,
  onSelectVariante,
  onSelectPresentacion,
}: ProductOptionsModalProps): ReactElement {
  const variantes = producto.variantes || [];
  const presentaciones = producto.presentaciones || [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">{producto.nombre}</h3>
            <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700">
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {variantes.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                  <Layers size={13} /> Elige la variante
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {variantes.map((v) => {
                    const agotado = v.stock_disponible <= 0;
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
                          <span className="text-xs font-bold text-primary-600">{simbolo} {parseFloat(v.precio).toFixed(2)}</span>
                          <span className={`text-[10px] font-bold ${agotado ? 'text-red-500' : 'text-slate-400'}`}>
                            {agotado ? 'Agotado' : `${v.stock_disponible} disp.`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {presentaciones.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                  <Package size={13} /> Elige la presentación
                </h4>
                <div className="space-y-1.5">
                  {presentaciones.map((p) => {
                    const unidadesDisponibles = Math.floor(producto.stock_disponible / p.factor_conversion);
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
                            {p.factor_conversion} {p.factor_conversion === 1 ? 'unidad' : 'unidades'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-primary-600">{simbolo} {parseFloat(p.precio).toFixed(2)}</p>
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
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
