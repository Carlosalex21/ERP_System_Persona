/**
 * @file Servicio para encapsular la lógica de API para el módulo de Clientes.
 */
import { apiPrivada } from '@/services/api';
import { Cliente, ClienteB2B, ClienteB2BRequest, ClienteRequest, NivelPrecio, NivelPrecioRequest, PatchedNivelPrecioRequest, ClienteBulkUploadResult, TipoDocumentoOpcion } from '@/types/api';
import { conRespaldoOffline } from '@/utils/offlineCache';

/**
 * Obtiene la lista completa de clientes del tenant.
 * Con respaldo en IndexedDB: si no hay conexión, devuelve el último listado
 * guardado en vez de romper el POS (ver `conRespaldoOffline`).
 * @returns {Promise<Cliente[]>} Una promesa que se resuelve en un array de Clientes.
 */
export const getClientes = async (): Promise<Cliente[]> => {
  return conRespaldoOffline('clientes', async () => {
    const response = await apiPrivada.get<Cliente[]>('/clientes/');
    return response.data;
  });
};

/**
 * Obtiene la lista de clientes de la red B2B del tenant (con su nivel de
 * precio, línea de crédito y total comprado en el período).
 * @returns {Promise<ClienteB2B[]>} Una promesa que se resuelve en un array de Clientes B2B.
 */
export const getB2BClientes = async (): Promise<ClienteB2B[]> => {
  const response = await apiPrivada.get<ClienteB2B[]>('/clientes/b2b/clientes/');
  return response.data;
};

/**
 * Actualiza un cliente B2B (típicamente: nivel de precio, línea de crédito o estado).
 * @param {number} id - ID del ClienteB2B.
 * @param {ClienteB2BRequest} data - Campos a actualizar.
 */
export const updateClienteB2B = async (id: number, data: ClienteB2BRequest): Promise<ClienteB2B> => {
  const response = await apiPrivada.patch<ClienteB2B>(`/clientes/b2b/clientes/${id}/`, data);
  return response.data;
};

// --- Niveles de Precio B2B ---

/** Lista los niveles de precio B2B configurados (para asignar a clientes y definir umbrales de auto-ascenso). */
export const getNivelesPrecio = async (): Promise<NivelPrecio[]> => {
  const response = await apiPrivada.get<NivelPrecio[]>('/clientes/b2b/niveles-precio/');
  return response.data;
};

export const createNivelPrecio = async (data: NivelPrecioRequest): Promise<NivelPrecio> => {
  const response = await apiPrivada.post<NivelPrecio>('/clientes/b2b/niveles-precio/', data);
  return response.data;
};

export const updateNivelPrecio = async (id: number, data: PatchedNivelPrecioRequest): Promise<NivelPrecio> => {
  const response = await apiPrivada.patch<NivelPrecio>(`/clientes/b2b/niveles-precio/${id}/`, data);
  return response.data;
};

export const deleteNivelPrecio = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/clientes/b2b/niveles-precio/${id}/`);
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

/** Actualiza los datos de un cliente existente (ej. marcarlo contribuyente especial, cambiar días de crédito). */
export const updateCliente = async (id: number, data: Partial<ClienteRequest>): Promise<Cliente> => {
  const response = await apiPrivada.patch<Cliente>(`/clientes/${id}/`, data);
  return response.data;
};

/** Baja lógica de un cliente (nunca se borra de verdad -- ver `ClienteRetrieveUpdateDestroyView.perform_destroy`). */
export const desactivarCliente = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/clientes/${id}/`);
};

/** Tipos de documento de identidad válidos para el país fiscal del tenant (ej. V/E/J/G en Venezuela). */
export const getTiposDocumento = async (): Promise<{ pais_codigo: string; tipos_documento: TipoDocumentoOpcion[] }> => {
  const response = await apiPrivada.get<{ pais_codigo: string; tipos_documento: TipoDocumentoOpcion[] }>('/clientes/tipos-documento/');
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

/**
 * Sube un archivo para la carga masiva de clientes (retail). Procesa de
 * forma síncrona: la respuesta ya trae el resumen completo.
 * @param {File} file - El archivo .csv o .xlsx a subir.
 * @returns {Promise<ClienteBulkUploadResult>}
 */
export const bulkUploadClientes = async (file: File): Promise<ClienteBulkUploadResult> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiPrivada.post<ClienteBulkUploadResult>('/clientes/bulk-upload/', formData);
  return response.data;
};

/** URL para descargar la plantilla CSV de carga masiva de clientes. */
export const descargarPlantillaClientes = async (): Promise<Blob> => {
  const response = await apiPrivada.get('/clientes/bulk-upload/plantilla/', { responseType: 'blob' });
  return response.data;
};
