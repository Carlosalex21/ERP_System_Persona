/**
 * @file Este servicio encapsula toda la lógica para interactuar con el API de Inventario.
 * Las lecturas usan caché en memoria (TTL) para evitar refetch en cada navegación;
 * las mutaciones invalidan la caché para forzar datos frescos.
 */
import { apiPrivada, enviarMultipart } from '@/services/api';
import {
  Producto, ProductoRequest, Almacen, Categoria, CategoriaRequest, Variacionproducto, AlmacenRequest, VariacionproductoRequest,
  AjusteInventario, AjusteInventarioRequest, AjusteInventarioEditRequest, PresentacionProducto, PresentacionProductoRequest, ProductoBulkUploadResult,
  Inventario, TrasladoInventario, TrasladoInventarioRequest,
} from '@/types/api';
import { cachedGet, invalidateCache } from '@/utils/cache';
import { conRespaldoOffline } from '@/utils/offlineCache';

/**
 * Obtiene la lista completa de productos del tenant.
 * @returns {Promise<Producto[]>} Una promesa que se resuelve en un array de Productos.
 */
export const getProductos = async (): Promise<Producto[]> => {
  return cachedGet('inventario:productos', () => conRespaldoOffline('productos', async () => {
    const response = await apiPrivada.get<Producto[]>('/inventario/productos/');
    return response.data;
  }));
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
  // Multipart vía `fetch` nativo (ver `enviarMultipart` en services/api.ts).
  const producto = await enviarMultipart<Producto>('POST', '/inventario/productos/', formData, 'Error al crear el producto');
  invalidateCache('inventario:productos');
  return producto;
};

/**
 * Actualiza un producto existente. Igual que `createProducto`, usa `fetch`
 * nativo (no axios) para que el `Content-Type: multipart/form-data` con
 * `boundary` se arme bien cuando se envía una imagen nueva.
 * @param {number} id - El ID del producto a actualizar.
 * @param {Partial<ProductoRequest>} data - Los campos a actualizar.
 * @returns {Promise<Producto>}
 */
export const updateProducto = async (id: number, data: Partial<ProductoRequest>): Promise<Producto> => {
  const formData = buildFormData(data as unknown as Record<string, unknown>);
  const producto = await enviarMultipart<Producto>('PATCH', `/inventario/productos/${id}/`, formData, 'Error al actualizar el producto');
  invalidateCache('inventario:productos');
  return producto;
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
 * Crea una presentación de venta (Unidad, Caja x12, Bulto x50...) para un producto.
 * @param {PresentacionProductoRequest} data - Los datos de la presentación a crear.
 * @returns {Promise<PresentacionProducto>}
 */
export const createPresentacionProducto = async (data: PresentacionProductoRequest): Promise<PresentacionProducto> => {
  const response = await apiPrivada.post<PresentacionProducto>('/inventario/presentaciones/', data);
  invalidateCache('inventario:productos');
  return response.data;
};

/**
 * Actualiza una presentación de venta existente.
 * @param {number} id - El ID de la presentación a actualizar.
 * @param {Partial<PresentacionProductoRequest>} data - Los campos a actualizar.
 * @returns {Promise<PresentacionProducto>}
 */
export const updatePresentacionProducto = async (id: number, data: Partial<PresentacionProductoRequest>): Promise<PresentacionProducto> => {
  const response = await apiPrivada.patch<PresentacionProducto>(`/inventario/presentaciones/${id}/`, data);
  invalidateCache('inventario:productos');
  return response.data;
};

/**
 * Elimina (baja lógica) una presentación de venta.
 * @param {number} id - El ID de la presentación a eliminar.
 * @returns {Promise<void>}
 */
export const deletePresentacionProducto = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/inventario/presentaciones/${id}/`);
  invalidateCache('inventario:productos');
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
 * Sube un archivo para la carga masiva de productos. Procesa de forma
 * síncrona: la respuesta ya trae el resumen completo (creados/actualizados/
 * errores por fila), no solo un "procesando en segundo plano".
 * @param {File} file - El archivo .csv o .xlsx a subir.
 * @returns {Promise<ProductoBulkUploadResult>}
 */
export const bulkUploadProductos = async (file: File): Promise<ProductoBulkUploadResult> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiPrivada.post<ProductoBulkUploadResult>('/inventario/productos/bulk-upload/', formData);
  invalidateCache('inventario:productos');
  return response.data;
};

/** URL para descargar la plantilla CSV de carga masiva de productos. */
export const descargarPlantillaProductos = async (): Promise<Blob> => {
  const response = await apiPrivada.get('/inventario/productos/bulk-upload/plantilla/', { responseType: 'blob' });
  return response.data;
};

// ---------------------------------------------------------------------------
// Ajustes de inventario (entrada/salida manual de stock)
// ---------------------------------------------------------------------------

/** Lista los ajustes de inventario (más recientes primero). */
export const getAjustesInventario = async (): Promise<AjusteInventario[]> => {
  const response = await apiPrivada.get<AjusteInventario[]>('/inventario/ajustes/');
  return response.data;
};

/**
 * Crea un ajuste de inventario (cabecera + líneas) y aplica de inmediato el
 * movimiento de stock de cada línea. Invalida la caché de productos: las
 * cantidades mostradas en el listado de inventario cambian al instante.
 */
export const crearAjusteInventario = async (data: AjusteInventarioRequest): Promise<AjusteInventario> => {
  const response = await apiPrivada.post<AjusteInventario>('/inventario/ajustes/', data);
  invalidateCache('inventario:productos');
  return response.data;
};

/**
 * Corrige la metadata de un ajuste YA aplicado (motivo, proveedor, número de
 * documento/control, fecha del documento, observaciones) -- nunca el
 * movimiento de stock en sí (tipo/almacén/líneas). Si el ajuste ya generó
 * una Cuenta por Pagar, el backend la reajusta con la fecha corregida.
 */
export const editarAjusteInventario = async (id: number, data: AjusteInventarioEditRequest): Promise<AjusteInventario> => {
  const response = await apiPrivada.patch<AjusteInventario>(`/inventario/ajustes/${id}/`, data);
  return response.data;
};

// ---------------------------------------------------------------------------
// Traslados de inventario entre almacenes (directo e inmediato, sin estado
// "en tránsito")
// ---------------------------------------------------------------------------

/** Desglose de stock por almacén; sin `almacenId` trae todo el inventario físico. */
export const getInventarioPorAlmacen = async (almacenId?: number): Promise<Inventario[]> => {
  const response = await apiPrivada.get<Inventario[]>('/inventario/inventario-fisico/', {
    params: almacenId ? { almacen: almacenId } : undefined,
  });
  return response.data;
};

/** Lista los traslados de inventario (más recientes primero). */
export const getTraslados = async (): Promise<TrasladoInventario[]> => {
  const response = await apiPrivada.get<TrasladoInventario[]>('/inventario/traslados/');
  return response.data;
};

/**
 * Crea un traslado de inventario (cabecera + líneas) y mueve el stock de
 * inmediato entre los dos almacenes -- no queda pendiente de confirmación.
 * Invalida la caché de productos: el desglose por almacén cambia al instante.
 */
export const crearTraslado = async (data: TrasladoInventarioRequest): Promise<TrasladoInventario> => {
  const response = await apiPrivada.post<TrasladoInventario>('/inventario/traslados/', data);
  invalidateCache('inventario:productos');
  return response.data;
};
