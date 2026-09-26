/** @file Servicio de Postventa: garantías (generadas solas) y reclamos/tickets de soporte. */
import { apiPrivada } from './api';
import type {
  Garantia, ReclamoPostventa, CrearReclamoRequest, EstadoReclamoPostventa,
} from '@/types/api';

export const getGarantias = async (estado?: 'vigente' | 'vencida'): Promise<Garantia[]> => {
  const response = await apiPrivada.get<Garantia[]>('/postventa/garantias/', { params: estado ? { estado } : undefined });
  return response.data;
};

export const getReclamos = async (estado?: EstadoReclamoPostventa): Promise<ReclamoPostventa[]> => {
  const response = await apiPrivada.get<ReclamoPostventa[]>('/postventa/reclamos/', { params: estado ? { estado } : undefined });
  return response.data;
};

export const crearReclamo = async (data: CrearReclamoRequest): Promise<ReclamoPostventa> => {
  const response = await apiPrivada.post<ReclamoPostventa>('/postventa/reclamos/', data);
  return response.data;
};

export const cambiarEstadoReclamo = async (
  id: number, estado: EstadoReclamoPostventa, resolucion?: string,
): Promise<ReclamoPostventa> => {
  const response = await apiPrivada.post<ReclamoPostventa>(`/postventa/reclamos/${id}/cambiar-estado/`, { estado, resolucion });
  return response.data;
};
