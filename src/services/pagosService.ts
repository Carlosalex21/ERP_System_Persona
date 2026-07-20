/**
 * @file Servicio para encapsular la lógica de API para el módulo de Pagos.
 */
import { apiPrivada } from '@/services/api';
import { MetodoPago, MetodoPagoRequest } from '@/types/api';

/**
 * Obtiene la lista de métodos de pago activos.
 * @returns {Promise<MetodoPago[]>}
 */
export const getMetodosDePago = async (): Promise<MetodoPago[]> => {
  const response = await apiPrivada.get<MetodoPago[]>('/facturacion/metodos-pago/');
  return response.data;
};

/**
 * Crea un nuevo método de pago.
 * @param {MetodoPagoRequest} data - Los datos del método de pago a crear.
 * @returns {Promise<MetodoPago>}
 */
export const createMetodoDePago = async (data: MetodoPagoRequest): Promise<MetodoPago> => {
  const response = await apiPrivada.post<MetodoPago>('/facturacion/metodos-pago/', data);
  return response.data;
};

/**
 * Elimina un método de pago por su ID.
 * @param {number} id - El ID del método de pago a eliminar.
 * @returns {Promise<void>}
 */
export const deleteMetodoDePago = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/facturacion/metodos-pago/${id}/`);
};