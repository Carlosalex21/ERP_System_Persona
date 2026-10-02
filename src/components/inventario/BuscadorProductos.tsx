"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';

import type { Producto } from '@/types/api';

/** Un producto simple o una variante, ya aplanado para buscarlo y agregarlo como línea. */
export interface ItemBuscable {
  key: string;
  productoId: number;
  varianteId: number | null;
  nombre: string;
  sku: string | null;
  codigoBarras: string | null;
  cantidadActual: number;
  costoPromedio: number;
}

export function buildItemsBuscables(productos: Producto[]): ItemBuscable[] {
  const items: ItemBuscable[] = [];
  productos.forEach((p) => {
    if (p.tipo === 'servicio') return;
    if (p.tipo === 'simple') {
      items.push({
        key: `p-${p.id}`, productoId: p.id, varianteId: null,
        nombre: p.nombre, sku: p.sku ?? null, codigoBarras: p.codigo_barras ?? null,
        cantidadActual: p.cantidad ?? 0, costoPromedio: Number(p.costo_promedio ?? 0),
      });
    } else {
      (p.variantes || []).forEach((v) => {
        items.push({
          key: `v-${v.id}`, productoId: p.id, varianteId: v.id,
          nombre: `${p.nombre} (${v.nombre})`, sku: v.sku ?? null, codigoBarras: v.codigo_barras ?? null,
          cantidadActual: v.cantidad ?? 0, costoPromedio: Number(v.costo_promedio ?? 0),
        });
      });
    }
  });
  return items;
}

interface BuscadorProductosProps {
  productos: Producto[];
  onSelect: (item: ItemBuscable) => void;
  disabled?: boolean;
  label?: string;
}

/**
 * Buscador de productos/variantes por nombre, SKU o código de barras.
 * Funciona con un lector de código de barras (que "escribe" el código y
 * dispara Enter): con un match exacto o un único resultado, agrega la línea
 * sin tocar el mouse -- se recibe mercancía escaneando producto tras producto.
 */
export default function BuscadorProductos({
  productos, onSelect, disabled = false, label = 'Agregar producto',
}: BuscadorProductosProps): ReactElement {
  const [busqueda, setBusqueda] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => buildItemsBuscables(productos), [productos]);

  // Un input deshabilitado no recibe el `autoFocus` nativo: en cuanto
  // termina de cargar, se enfoca a mano para poder escanear de una vez.
  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter((it) =>
        it.nombre.toLowerCase().includes(q) ||
        it.sku?.toLowerCase().includes(q) ||
        it.codigoBarras?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [busqueda, items]);

  const seleccionar = (item: ItemBuscable): void => {
    onSelect(item);
    setBusqueda('');
  };

  const manejarEnter = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return;
    const exacto = items.find((it) => it.codigoBarras?.toLowerCase() === texto || it.sku?.toLowerCase() === texto);
    if (exacto) return seleccionar(exacto);
    if (resultados.length === 1) return seleccionar(resultados[0]);
    if (resultados.length === 0) toast.error(`No se encontró ningún producto para "${busqueda.trim()}".`);
  };

  return (
    <div className="relative">
      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={manejarEnter}
          placeholder="Busca por nombre, SKU o código de barras... (o escanea con un lector)"
          className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm"
          disabled={disabled}
        />
      </div>
      {resultados.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {resultados.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => seleccionar(item)}
              className="w-full text-left px-4 py-2.5 hover:bg-primary-50 transition-colors flex items-center justify-between gap-3 border-b border-slate-50 last:border-0"
            >
              <span className="text-sm font-semibold text-slate-800 truncate">{item.nombre}</span>
              <span className="text-[11px] text-slate-400 shrink-0">Stock: {item.cantidadActual}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
