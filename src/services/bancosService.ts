/**
 * @file Servicio para las entidades bancarias (`Banco`) -- un método de
 * pago no-efectivo apunta a un banco fijo, para poder cuadrar el reporte
 * de Cobros contra el estado de cuenta real de cada banco.
 */
import { apiPrivada } from '@/services/api';
import { Banco, BancoRequest } from '@/types/api';

export const getBancos = async (): Promise<Banco[]> => {
  const response = await apiPrivada.get<Banco[]>('/pagos/bancos/');
  return response.data;
};

export const createBanco = async (data: BancoRequest): Promise<Banco> => {
  const response = await apiPrivada.post<Banco>('/pagos/bancos/', data);
  return response.data;
};

export const updateBanco = async (id: number, data: Partial<BancoRequest>): Promise<Banco> => {
  const response = await apiPrivada.patch<Banco>(`/pagos/bancos/${id}/`, data);
  return response.data;
};

export const deleteBanco = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/pagos/bancos/${id}/`);
};
