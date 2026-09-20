"use client";

import type { ReactElement } from 'react';

interface Categoria {
  id: number;
  nombre: string;
  cantidad: number;
}

interface CategoryFilterProps {
  categorias: Categoria[];
  seleccionada: number | null;
  onSeleccionar: (id: number | null) => void;
  totalProductos: number;
}

/**
 * Chips de categoría del catálogo público -- filtra client-side sobre el
 * mismo catálogo ya cargado (igual que el buscador de texto), así que
 * cambiar de categoría es instantáneo, sin ida y vuelta al backend.
 * No se muestra si el tenant no tiene productos categorizados: para un
 * catálogo chico no aporta nada y solo sería ruido visual.
 */
export default function CategoryFilter({ categorias, seleccionada, onSeleccionar, totalProductos }: CategoryFilterProps): ReactElement | null {
  if (categorias.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
      <button
        type="button"
        onClick={() => onSeleccionar(null)}
        className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${
          seleccionada === null
            ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
            : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:text-primary-700'
        }`}
      >
        Todas · {totalProductos}
      </button>
      {categorias.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSeleccionar(cat.id)}
          className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${
            seleccionada === cat.id
              ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:text-primary-700'
          }`}
        >
          {cat.nombre} · {cat.cantidad}
        </button>
      ))}
    </div>
  );
}
