/**
 * @file Servicio para encapsular la lógica de API para el módulo de Clientes.
 */
import { apiPrivada } from '@/services/api';
import { Cliente, ClienteB2B, ClienteRequest } from '@/types/api';

/**
 * Obtiene la lista completa de clientes del tenant.
 * @returns {Promise<Cliente[]>} Una promesa que se resuelve en un array de Clientes.
 */
export const getClientes = async (): Promise<Cliente[]> => {
  const response = await apiPrivada.get<Cliente[]>('/clientes/');
  return response.data;
};

/**
 * Obtiene la lista de clientes de la red B2B del tenant.
 * El backend expone los clientes bajo `/clientes/`; se reutiliza el listado.
 * @returns {Promise<ClienteB2B[]>} Una promesa que se resuelve en un array de Clientes B2B.
 */
export const getB2BClientes = async (): Promise<ClienteB2B[]> => {
  const response = await apiPrivada.get<ClienteB2B[]>('/clientes/');
  return response.data;
};

/**
 * Crea un nuevo cliente.
 * @param {ClienteRequest} data - Los datos del cliente a crear.
 * @returns {Promise<Cliente>} Una promesa que se resuelve con el cliente recién creado.
 */
export const createCliente = async (data: ClienteRequest): Promise<Cliente> => {
  const response = await apiPrivada.post<Cliente>('/clientes/', data);
  return response.data;
};

/**
 * Sube un archivo para la carga masiva de clientes B2B.
 * @param {File} file - El archivo .csv o .xlsx a subir.
 * @returns {Promise<{ message: string }>} Una promesa que se resuelve con el mensaje de la API.
 */
export const bulkUploadClientesB2B = async (file: File): Promise<{ message: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  // El backend espera la petición en el subdominio del tenant, `apiPrivada` ya está configurada para ello.
  const response = await apiPrivada.post<{ message: string }>('/clientes/b2b/bulk-upload/', formData, {
    // El navegador asignará automáticamente el 'Content-Type: multipart/form-data' con el boundary correcto.
  });
  return response.data;
};
