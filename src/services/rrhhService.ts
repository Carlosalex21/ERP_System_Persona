/**
 * @file Servicio para encapsular la lógica de API para el módulo de RRHH.
 */
import { apiPrivada } from '@/services/api';
import { UserManaged, UserManagedRequest, Rol, Sucursal, SucursalRequest } from '@/types/api';

/**
 * Obtiene la lista de usuarios gestionados (empleados) del tenant.
 * @returns {Promise<UserManaged[]>}
 */
export const getManagedUsers = async (): Promise<UserManaged[]> => {
  const response = await apiPrivada.get<UserManaged[]>('/auth/management/');
  return response.data;
};

/**
 * Crea un nuevo usuario gestionado (empleado).
 * @param {UserManagedRequest} data - Los datos del nuevo empleado.
 * @returns {Promise<UserManaged>}
 */
export const createManagedUser = async (data: UserManagedRequest): Promise<UserManaged> => {
  const response = await apiPrivada.post<UserManaged>('/auth/management/', data);
  return response.data;
};

/**
 * Obtiene la lista de sucursales del tenant.
 * @returns {Promise<Sucursal[]>}
 */
export const getSucursales = async (): Promise<Sucursal[]> => {
  const response = await apiPrivada.get<Sucursal[]>('/rrhh/sucursales/');
  return response.data;
};

/**
 * Crea una nueva sucursal.
 * @param {SucursalRequest} data - Los datos de la sucursal a crear.
 * @returns {Promise<Sucursal>} Una promesa que se resuelve con la sucursal recién creada.
 */
export const createSucursal = async (data: SucursalRequest): Promise<Sucursal> => {
  const response = await apiPrivada.post<Sucursal>('/rrhh/sucursales/', data);
  return response.data;
};

/**
 * Elimina una sucursal por su ID.
 * @param {number} id - El ID de la sucursal a eliminar.
 * @returns {Promise<void>}
 */
export const deleteSucursal = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/rrhh/sucursales/${id}/`);
};