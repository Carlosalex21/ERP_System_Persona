/**
 * @file Este servicio encapsula toda la lógica para interactuar con el API de Configuración.
 */
import { apiPrivada } from '@/services/api';
import { Iva, IvaRequest, Almacen, AlmacenRequest, Categoria, CategoriaRequest } from '@/types/api';
import { conRespaldoOffline } from '@/utils/offlineCache';

/**
 * Obtiene la lista completa de configuraciones de IVA. Con respaldo en
 * IndexedDB para que el POS pueda seguir calculando impuestos sin conexión.
 * @returns {Promise<Iva[]>}
 */
export const getIvas = async (): Promise<Iva[]> => {
  return conRespaldoOffline('ivas', async () => {
    const response = await apiPrivada.get<Iva[]>('/configuracion/iva/');
    return response.data;
  });
};

/**
 * Crea una nueva configuración de IVA.
 * @param {IvaRequest} data - Los datos de la configuración de IVA a crear.
 * @returns {Promise<Iva>}
 */
export const createIva = async (data: IvaRequest): Promise<Iva> => {
  const response = await apiPrivada.post<Iva>('/configuracion/iva/', data);
  return response.data;
};

/**
 * Crea un nuevo almacén.
 * @param {AlmacenRequest} data - Los datos del almacén a crear.
 * @returns {Promise<Almacen>}
 */
export const createAlmacen = async (data: AlmacenRequest): Promise<Almacen> => {
  const response = await apiPrivada.post<Almacen>('/inventario/almacenes/', data);
  return response.data;
};

/**
 * Crea una nueva categoría.
 * @param {CategoriaRequest} data - Los datos de la categoría a crear.
 * @returns {Promise<Categoria>}
 */
export const createCategoria = async (data: CategoriaRequest): Promise<Categoria> => {
  const response = await apiPrivada.post<Categoria>('/inventario/categorias/', data);
  return response.data;
};

// NOTA: Las funciones para actualizar y eliminar seguirían un patrón similar.