/**
 * @file Listados paginados del lado del servidor.
 *
 * El backend responde `{ data: [...], meta: { pagination: {...} } }`. Con
 * `?page=` y `?page_size=` devuelve solo esa página; sin ellos devuelve la
 * lista completa (hasta 5000), que es lo que usan los selectores y el POS.
 * Las tablas que crecen sin límite (facturas, auditoría, ajustes, compras)
 * piden página a página con `getPagina`.
 */
import { apiRequest } from '@/services/api';

export interface Pagina<T> {
  items: T[];
  /** Total de registros que cumplen el filtro (no solo los de esta página). */
  total: number;
  pagina: number;
  totalPaginas: number;
}

interface MetaPaginacion {
  count?: number;
  page?: number;
  total_pages?: number;
}

export const TAMANO_PAGINA = 20;

/** Pide una página de `url` con los filtros indicados. */
export async function getPagina<T>(
  url: string,
  filtros: Record<string, string | number | boolean | undefined | null> = {},
  pagina = 1,
  tamano = TAMANO_PAGINA,
): Promise<Pagina<T>> {
  const params: Record<string, string | number | boolean> = { page: pagina, page_size: tamano };
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== null && valor !== '') params[clave] = valor;
  }
  const response = await apiRequest<T[]>({ method: 'GET', url, params });
  const meta = (response.meta?.pagination ?? {}) as MetaPaginacion;
  const items = Array.isArray(response.data) ? response.data : [];
  return {
    items,
    total: meta.count ?? items.length,
    pagina: meta.page ?? pagina,
    totalPaginas: Math.max(meta.total_pages ?? 1, 1),
  };
}
