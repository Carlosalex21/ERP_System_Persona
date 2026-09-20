/** @file Servicio del módulo de Taller/Servicios: órdenes de servicio. */
import { apiPrivada } from './api';

export type EstadoOrdenServicio = 'recibido' | 'en_proceso' | 'listo' | 'entregado' | 'cancelado';

export interface OrdenServicio {
  id: number;
  numero: string;
  cliente: number;
  cliente_nombre: string;
  equipo: string;
  descripcion_falla: string | null;
  diagnostico: string | null;
  estado: EstadoOrdenServicio;
  tecnico: number | null;
  tecnico_nombre: string | null;
  costo_estimado: string | null;
  factura: number | null;
  token_publico: string;
  fecha_recepcion: string;
  fecha_entrega_estimada: string | null;
  fecha_entrega_real: string | null;
}

export interface OrdenServicioRequest {
  cliente: number;
  equipo: string;
  descripcion_falla?: string;
  diagnostico?: string;
  estado?: EstadoOrdenServicio;
  tecnico?: number | null;
  costo_estimado?: number | null;
  fecha_entrega_estimada?: string | null;
}

export const getOrdenesServicio = async (estado?: string): Promise<OrdenServicio[]> => {
  const response = await apiPrivada.get<OrdenServicio[]>('/servicios/ordenes/', { params: estado ? { estado } : undefined });
  return response.data;
};

export const createOrdenServicio = async (data: OrdenServicioRequest): Promise<OrdenServicio> => {
  const response = await apiPrivada.post<OrdenServicio>('/servicios/ordenes/', data);
  return response.data;
};

export const updateOrdenServicio = async (id: number, data: Partial<OrdenServicioRequest>): Promise<OrdenServicio> => {
  const response = await apiPrivada.patch<OrdenServicio>(`/servicios/ordenes/${id}/`, data);
  return response.data;
};

export const deleteOrdenServicio = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/servicios/ordenes/${id}/`);
};

export interface LineaCierreOrden {
  producto_id: number;
  cantidad: number;
  monto: number;
}

export const cerrarOrdenServicio = async (
  id: number,
  data: { lineas: LineaCierreOrden[]; metodo_pago_id: number; condicion_pago?: 'contado' | 'credito'; moneda_id?: number },
): Promise<{ mensaje: string; factura_id: number; correlativo: string | null }> => {
  const response = await apiPrivada.post(`/servicios/ordenes/${id}/cerrar/`, data);
  return response.data;
};
