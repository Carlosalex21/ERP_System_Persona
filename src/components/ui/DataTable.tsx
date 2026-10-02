/**
 * @file Tabla de datos reutilizable sobre TanStack Table.
 *
 * Antes, cada listado (inventario, facturación, reportes) traía su propia
 * tabla HTML a mano: sin orden por columna y sin paginación real (se
 * cargaban y renderizaban TODOS los resultados a la vez). Este componente
 * centraliza orden + paginación en un solo lugar, para no repetir esa
 * lógica página por página.
 */
"use client";

import { useState, type ReactElement, type ReactNode } from 'react';
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  /** Filas por página (por defecto 10). */
  pageSize?: number;
  /** Contenido a mostrar cuando `data` está vacío. */
  emptyState?: ReactNode;
  /** Etiqueta para el conteo de resultados (ej. "productos", "facturas"). */
  resultLabel?: string;
  /**
   * Paginación del lado del servidor: `data` ya es SOLO la página actual y la
   * tabla no recorta ni ordena por su cuenta (ordenar una sola página
   * engañaría: parecería el orden de todo el listado).
   */
  paginacionServidor?: {
    pagina: number;
    totalPaginas: number;
    total: number;
    onCambiarPagina: (pagina: number) => void;
    /** Mientras llega la nueva página: atenúa la tabla y bloquea los botones. */
    cargando?: boolean;
  };
}

export function DataTable<T>({
  columns,
  data,
  pageSize = 10,
  emptyState,
  resultLabel = 'resultados',
  paginacionServidor,
}: DataTableProps<T>): ReactElement {
  const [sorting, setSorting] = useState<SortingState>([]);
  const enServidor = paginacionServidor !== undefined;

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    enableSorting: !enServidor,
    getCoreRowModel: getCoreRowModel(),
    ...(enServidor
      ? { manualPagination: true }
      : { getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel() }),
    initialState: { pagination: { pageSize } },
  });

  const rows = table.getRowModel().rows;

  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div>
      <div className={`overflow-x-auto transition-opacity ${paginacionServidor?.cargando ? 'opacity-50 pointer-events-none' : ''}`}>
        <table className="w-full text-left text-sm">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr
                key={headerGroup.id}
                className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider"
              >
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className={`p-4 first:pl-6 ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-slate-700' : ''}`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {/* `flex w-full` + `[&>div]:w-full` (antes `inline-flex`) --
                        para que un header como
                        `() => <div className="text-right">Acciones</div>` de verdad
                        quede alineado a la derecha: un span `inline-flex` se encoge
                        al ancho de su contenido, así que ese `text-right` interno no
                        tenía contra qué alinearse (el div hijo también se encogía) y
                        la columna de acciones quedaba visualmente desalineada del
                        botón de abajo en TODAS las tablas que usan este patrón, no
                        solo una. Forzar el div hijo a `w-full` es lo que hace que el
                        `text-right`/`text-center` de cada columna por fin surta efecto. */}
                    <span className="flex w-full items-center gap-1 [&>div]:w-full">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() &&
                        (header.column.getIsSorted() === 'asc' ? (
                          <ChevronUp size={12} />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <ChevronDown size={12} />
                        ) : (
                          <ChevronsUpDown size={12} className="opacity-40" />
                        ))}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(row => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="p-4 first:pl-6">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {enServidor && paginacionServidor.totalPaginas > 1 && (
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Página {paginacionServidor.pagina} de {paginacionServidor.totalPaginas} · {paginacionServidor.total} {resultLabel}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => paginacionServidor.onCambiarPagina(paginacionServidor.pagina - 1)}
              disabled={paginacionServidor.pagina <= 1 || paginacionServidor.cargando}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => paginacionServidor.onCambiarPagina(paginacionServidor.pagina + 1)}
              disabled={paginacionServidor.pagina >= paginacionServidor.totalPaginas || paginacionServidor.cargando}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              aria-label="Página siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {!enServidor && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()} · {data.length} {resultLabel}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              aria-label="Página siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
