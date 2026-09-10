/**
 * @file Este servicio encapsula toda la lógica para interactuar con el API de Inventario.
 * Las lecturas usan caché en memoria (TTL) para evitar refetch en cada navegación;
 * las mutaciones invalidan la caché para forzar datos frescos.
 */
import { apiPrivada } from '@/services/api';
import { Producto, ProductoRequest, Almacen, Categoria, CategoriaRequest, Variacionproducto, AlmacenRequest,VariacionproductoRequest } from '@/types/api';
import { cachedGet, invalidateCache } from '@/utils/cache';

/**
 * Obtiene la lista completa de productos del tenant.
 * @returns {Promise<Producto[]>} Una promesa que se resuelve en un array de Productos.
 */
export const getProductos = async (): Promise<Producto[]> => {
  return cachedGet('inventario:productos', async () => {
    const response = await apiPrivada.get<Producto[]>('/inventario/productos/');
    return response.data;
  });
};

/**
 * Utilidad interna para armar el FormData de un producto/variante.
 */
function buildFormData(data: Record<string, unknown>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (key === 'imagen' && value instanceof File) {
        formData.append(key, value);
      } else if (Array.isArray(value)) {
        value.forEach(item => formData.append(`${key}[]`, item));
      } else {
        formData.append(key, String(value));
      }
    }
  });
  return formData;
}

/**
 * Crea un nuevo producto.
 * Maneja la subida de imagen si se proporciona.
 * @param {ProductoRequest} data - Los datos del producto a crear.
 * @returns {Promise<Producto>} Una promesa que se resuelve con el producto recién creado.
 */
export const createProducto = async (data: ProductoRequest): Promise<Producto> => {
  const formData = buildFormData(data as unknown as Record<string, unknown>);
  const response = await apiPrivada.post<Producto>('/inventario/productos/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  invalidateCache('inventario:productos');
  return response.data;
};

/**
 * Elimina un producto por su ID.
 * @param {number} id - El ID del producto a eliminar.
 * @returns {Promise<void>}
 */
export const deleteProducto = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/inventario/productos/${id}/`);
  invalidateCache('inventario:productos');
};

/**
 * Crea un nuevo almacén.
 * @param {AlmacenRequest} data - Los datos del almacén a crear.
 * @returns {Promise<Almacen>}
 */
export const createAlmacen = async (data: AlmacenRequest): Promise<Almacen> => {
  const response = await apiPrivada.post<Almacen>('/inventario/almacenes/', data);
  invalidateCache('inventario:almacenes');
  return response.data;
};

/**
 * Elimina un almacén por su ID.
 * @param {number} id - El ID del almacén a eliminar.
 * @returns {Promise<void>}
 */
export const deleteAlmacen = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/inventario/almacenes/${id}/`);
  invalidateCache('inventario:almacenes');
};

/**
 * Actualiza un almacén existente.
 * @param {number} id - El ID del almacén a actualizar.
 * @param {Partial<AlmacenRequest>} data - Los datos parciales a actualizar.
 * @returns {Promise<Almacen>} Una promesa que se resuelve con el almacén actualizado.
 */
export const updateAlmacen = async (id: number, data: Partial<AlmacenRequest>): Promise<Almacen> => {
  const response = await apiPrivada.patch<Almacen>(`/inventario/almacenes/${id}/`, data);
  invalidateCache('inventario:almacenes');
  return response.data;
};

/**
 * Crea una nueva variante de producto.
 * @param {VariacionproductoRequest} data - Los datos de la variante a crear.
 * @returns {Promise<Variacionproducto>}
 */
export const createVarianteProducto = async (data: VariacionproductoRequest): Promise<Variacionproducto> => {
  const response = await apiPrivada.post<Variacionproducto>('/inventario/variantes/', data);
  invalidateCache('inventario:productos');
  return response.data;
};

/**
 * Obtiene la lista completa de almacenes.
 * @returns {Promise<Almacen[]>}
 */
export const getAlmacenes = async (): Promise<Almacen[]> => {
  return cachedGet('inventario:almacenes', async () => {
    const response = await apiPrivada.get<Almacen[]>('/inventario/almacenes/');
    return response.data;
  });
};

/**
 * Obtiene la lista completa de categorías.
 * @returns {Promise<Categoria[]>}
 */
export const getCategorias = async (): Promise<Categoria[]> => {
  return cachedGet('inventario:categorias', async () => {
    const response = await apiPrivada.get<Categoria[]>('/inventario/categorias/');
    return response.data;
  });
};

/**
 * Crea una nueva categoría.
 * @param {CategoriaRequest} data - Los datos de la categoría a crear.
 * @returns {Promise<Categoria>} Una promesa que se resuelve con la categoría recién creada.
 */
export const createCategoria = async (data: CategoriaRequest): Promise<Categoria> => {
  const response = await apiPrivada.post<Categoria>('/inventario/categorias/', data);
  invalidateCache('inventario:categorias');
  return response.data;
};

/**
 * Actualiza una categoría existente.
 * @param {number} id - El ID de la categoría a actualizar.
 * @param {Partial<CategoriaRequest>} data - Los datos parciales a actualizar.
 * @returns {Promise<Categoria>} Una promesa que se resuelve con la categoría actualizada.
 */
export const updateCategoria = async (id: number, data: Partial<CategoriaRequest>): Promise<Categoria> => {
  const response = await apiPrivada.patch<Categoria>(`/inventario/categorias/${id}/`, data);
  invalidateCache('inventario:categorias');
  return response.data;
};

/**
 * Elimina una categoría por su ID.
 * @param {number} id - El ID de la categoría a eliminar.
 * @returns {Promise<void>}
 */
export const deleteCategoria = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/inventario/categorias/${id}/`);
  invalidateCache('inventario:categorias');
};

/**
 * Sube un archivo para la carga masiva de productos.
 * @param {File} file - El archivo .csv o .xlsx a subir.
 * @returns {Promise<{ message: string }>} Una promesa que se resuelve con el mensaje de la API.
 */
export const bulkUploadProductos = async (file: File): Promise<{ message: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiPrivada.post<{ message: string }>('/inventario/productos/bulk-upload/', formData);
  invalidateCache('inventario:productos');
  return response.data;
};
