/**
 * @file Ítem individual del carrito del POS, memoizado para evitar
 * re-renderizados innecesarios cuando cambia otro ítem o un total ajeno.
 */
"use client";

import { memo, type ReactElement } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';

import type { CartItem } from './SaleCart';

interface CartLineItemProps {
  item: CartItem;
  /** Símbolo de la moneda activa para mostrar el precio. */
  currencySymbol: string;
  onRemove: (productId: number) => void;
  onIncrement: (productId: number) => void;
  onDecrement: (productId: number) => void;
  onQuantityChange: (productId: number, newQuantity: number) => void;
}

/**
 * Renderiza una línea del carrito. Memoizado: solo se re-renderiza si cambian
 * sus props (`item`, handlers o símbolo de moneda).
 */
const CartLineItem = memo(function CartLineItem({
  item,
  currencySymbol,
  onRemove,
  onIncrement,
  onDecrement,
  onQuantityChange,
}: CartLineItemProps): ReactElement {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border">
      <div className="flex-grow min-w-0">
        <p className="font-bold text-sm text-slate-800 truncate">{item.nombre}</p>
        <p className="text-xs text-slate-500">
          {currencySymbol}
          {parseFloat(item.precio || '0').toFixed(2)}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onDecrement(item.id)}
          disabled={item.quantity <= 1}
          aria-label="Disminuir cantidad"
          className="w-7 h-7 flex items-center justify-center border rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Minus size={14} />
        </button>

        <input
          type="number"
          value={item.quantity}
          onChange={(e) => onQuantityChange(item.id, parseInt(e.target.value, 10) || 1)}
          className="w-12 text-center text-sm font-bold border rounded-md py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          min="1"
          aria-label="Cantidad"
        />

        <button
          type="button"
          onClick={() => onIncrement(item.id)}
          aria-label="Aumentar cantidad"
          className="w-7 h-7 flex items-center justify-center border rounded-md text-slate-500 hover:bg-slate-100"
        >
          <Plus size={14} />
        </button>

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label="Quitar del carrito"
          className="text-slate-400 hover:text-red-500 p-1"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
});

export default CartLineItem;
