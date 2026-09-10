/**
 * @file Servicio para encapsular la lógica de API del módulo de Reportes (Dashboard).
 */
import { apiPrivada } from '@/services/api';

/** Estructura flexible del dashboard agregado que devuelve el backend. */
export interface DashboardReporte {
  userInfo?: Record<string, unknown> | null;
  resumen?: Record<string, unknown> | null;
  graficoVentas?: unknown;
  productosMasVendidos?: Array<Record<string, unknown>>;
  productosBajoStock?: Array<Record<string, unknown>>;
  infoGeneral?: Record<string, unknown> | null;
  [key: string]: unknown;
}

/**
 * Obtiene los datos agregados para el dashboard principal del tenant.
 * @returns {Promise<DashboardReporte>} Una promesa que se resuelve con los datos del dashboard.
 */
export const getDashboardReportes = async (): Promise<DashboardReporte> => {
  const response = await apiPrivada.get<DashboardReporte>('/reportes/dashboard/');
  return response.data;
};
