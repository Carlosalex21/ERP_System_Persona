/**
 * @file Servicio para encapsular la lógica de API para el módulo de Configuración (IVA, etc.).
 */
import { apiPrivada } from '@/services/api';
import { Iva, IvaRequest } from '@/types/api';

/**
 * Obtiene la lista completa de configuraciones de IVA.
 * @returns {Promise<Iva[]>}
 */
export const getIvaConfigs = async (): Promise<Iva[]> => {
  const response = await apiPrivada.get<Iva[]>('/configuracion/iva/');
  return response.data;
};

/**
 * Crea una nueva configuración de IVA.
 * @param {IvaRequest} data - Los datos del IVA a crear.
 * @returns {Promise<Iva>}
 */
export const createIvaConfig = async (data: IvaRequest): Promise<Iva> => {
  const response = await apiPrivada.post<Iva>('/configuracion/iva/', data);
  return response.data;
};

/**
 * Elimina una configuración de IVA por su ID.
 * @param {number} id - El ID del IVA a eliminar.
 */
export const deleteIvaConfig = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/configuracion/iva/${id}/`);
};