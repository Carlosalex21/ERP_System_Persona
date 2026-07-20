/**
 * @file Este servicio encapsula toda la lógica para interactuar con el API de Inventario.
 */
import { apiPrivada } from '@/services/api';
import { Producto, ProductoRequest, Almacen, Categoria, Variacionproducto, VariacionproductoRequest } from '@/types/api';

/**
 * Obtiene la lista completa de productos del tenant.
 * @returns {Promise<Producto[]>} Una promesa que se resuelve en un array de Productos.
 */
export const getProductos = async (): Promise<Producto[]> => {
  const response = await apiPrivada.get<Producto[]>('/inventario/productos/');
  return response.data;
};

/**
 * Crea un nuevo producto.
 * Maneja la subida de imagen si se proporciona.
 * @param {ProductoRequest} data - Los datos del producto a crear.
 * @returns {Promise<Producto>} Una promesa que se resuelve con el producto recién creado.
 */
export const createProducto = async (data: ProductoRequest): Promise<Producto> => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (key === 'imagen' && value instanceof File) {
        formData.append(key, value);
      } else if (Array.isArray(value)) {
        // Manejar arrays, por ejemplo, para atributos si fueran parte de ProductoRequest
        value.forEach(item => formData.append(`${key}[]`, item));
      }
      else {
        formData.append(key, String(value));
      }
    }
  });

  const response = await apiPrivada.post<Producto>('/inventario/productos/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Elimina un producto por su ID.
 * @param {number} id - El ID del producto a eliminar.
 * @returns {Promise<void>}
 */
export const deleteProducto = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/inventario/productos/${id}/`);
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
 * Elimina un almacén por su ID.
 * @param {number} id - El ID del almacén a eliminar.
 * @returns {Promise<void>}
 */
export const deleteAlmacen = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/inventario/almacenes/${id}/`);
};
/**
 * Crea una nueva variante de producto.
 * @param {VariacionproductoRequest} data - Los datos de la variante a crear.
 * @returns {Promise<Variacionproducto>}
 */
export const createVarianteProducto = async (data: VariacionproductoRequest): Promise<Variacionproducto> => {
  const response = await apiPrivada.post<Variacionproducto>('/inventario/variantes/', data);
  return response.data;
};

/**
 * Obtiene la lista completa de almacenes.
 * @returns {Promise<Almacen[]>}
 */
export const getAlmacenes = async (): Promise<Almacen[]> => {
  const response = await apiPrivada.get<Almacen[]>('/inventario/almacenes/');
  return response.data;
};

/**
 * Obtiene la lista completa de categorías.
 * @returns {Promise<Categoria[]>}
 */
export const getCategorias = async (): Promise<Categoria[]> => {
  const response = await apiPrivada.get<Categoria[]>('/inventario/categorias/');
  return response.data;
};

// NOTA: Las funciones para actualizar (updateProducto, updateVariante, etc.) seguirían un patrón similar.

/**
 * Sube un archivo para la carga masiva de productos.
 * @param {File} file - El archivo .csv o .xlsx a subir.
 * @returns {Promise<{ message: string }>} Una promesa que se resuelve con el mensaje de la API.
 */
export const bulkUploadProductos = async (file: File): Promise<{ message: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  // El backend espera la petición en el subdominio del tenant, `apiPrivada` ya está configurada para ello.
  const response = await apiPrivada.post<{ message: string }>('/inventario/productos/bulk-upload/', formData, {
    // El navegador asignará automáticamente el 'Content-Type: multipart/form-data' con el boundary correcto.
  });
  return response.data;
};