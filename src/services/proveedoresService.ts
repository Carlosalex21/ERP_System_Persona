/**
 * @file Servicio para encapsular la lógica de API del módulo de Proveedores.
 */
import { apiPrivada } from '@/services/api';
import { Proveedor, ProveedorRequest } from '@/types/api';

/**
 * Obtiene la lista de proveedores activos del tenant.
 * @returns {Promise<Proveedor[]>}
 */
export const getProveedores = async (): Promise<Proveedor[]> => {
  const response = await apiPrivada.get<Proveedor[]>('/proveedores/proveedores/');
  return response.data;
};

/**
 * Crea un nuevo proveedor.
 * @param {ProveedorRequest} data - Los datos del proveedor a crear.
 * @returns {Promise<Proveedor>}
 */
export const createProveedor = async (data: ProveedorRequest): Promise<Proveedor> => {
  const response = await apiPrivada.post<Proveedor>('/proveedores/proveedores/', data);
  return response.data;
};

/**
 * Actualiza un proveedor existente.
 * @param {number} id - El ID del proveedor a actualizar.
 * @param {ProveedorRequest} data - Los datos actualizados del proveedor.
 * @returns {Promise<Proveedor>}
 */
export const updateProveedor = async (id: number, data: ProveedorRequest): Promise<Proveedor> => {
  const response = await apiPrivada.put<Proveedor>(`/proveedores/proveedores/${id}/`, data);
  return response.data;
};

/**
 * Elimina (desactiva) un proveedor por su ID.
 * @param {number} id - El ID del proveedor a eliminar.
 */
export const deleteProveedor = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/proveedores/proveedores/${id}/`);
};
