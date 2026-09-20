/** @file Servicio del módulo de Farmacia: lotes y vencimientos. */
import { apiPrivada } from './api';

export interface LoteProducto {
  id: number;
  producto: number;
  producto_nombre: string;
  producto_sku: string | null;
  numero_lote: string | null;
  fecha_vencimiento: string;
  cantidad: number;
  activo: boolean;
  dias_para_vencer: number;
  vencido: boolean;
  /** Cuánto stock del producto todavía no está asignado a ningún lote. */
  stock_sin_lotear: number;
}

export interface LoteProductoRequest {
  producto: number;
  numero_lote?: string;
  fecha_vencimiento: string;
  cantidad: number;
}

/** `dias` filtra a lotes que vencen dentro de esa ventana (incluye los ya vencidos); omitir para traer todos). */
export const getLotes = async (dias?: number): Promise<LoteProducto[]> => {
  const response = await apiPrivada.get<LoteProducto[]>('/farmacia/lotes/', { params: dias != null ? { dias } : undefined });
  return response.data;
};

export const createLote = async (data: LoteProductoRequest): Promise<LoteProducto> => {
  const response = await apiPrivada.post<LoteProducto>('/farmacia/lotes/', data);
  return response.data;
};

export const updateLote = async (id: number, data: Partial<LoteProductoRequest>): Promise<LoteProducto> => {
  const response = await apiPrivada.patch<LoteProducto>(`/farmacia/lotes/${id}/`, data);
  return response.data;
};

export const deleteLote = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/farmacia/lotes/${id}/`);
};
