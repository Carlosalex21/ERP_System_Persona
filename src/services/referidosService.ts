/** @file Servicio del Programa de Referidos -- ver `apps.tenants.api.views_subscription.ReferidoProgramaView`. */
import { apiPrivada } from './api';
import type { ReferidoPrograma } from '@/types/api';

export const getProgramaReferidos = async (): Promise<ReferidoPrograma> => {
  const response = await apiPrivada.get<ReferidoPrograma>('/tenants/referidos/');
  return response.data;
};
