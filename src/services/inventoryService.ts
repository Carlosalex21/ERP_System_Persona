/**
 * @file Este servicio encapsula toda la lógica para interactuar con el API de Inventario.
 * Las lecturas usan caché en memoria (TTL) para evitar refetch en cada navegación;
 * las mutaciones invalidan la caché para forzar datos frescos.
 */
import Cookies from 'js-cookie';
import { apiPrivada, refreshAccessToken } from '@/services/api';
import {
  Producto, ProductoRequest, Almacen, Categoria, CategoriaRequest, Variacionproducto, AlmacenRequest, VariacionproductoRequest,
  AjusteInventario, AjusteInventarioRequest, PresentacionProducto, PresentacionProductoRequest, ProductoBulkUploadResult,
} from '@/types/api';
import { cachedGet, invalidateCache } from '@/utils/cache';
import { conRespaldoOffline } from '@/utils/offlineCache';

/** Resuelve la baseURL igual que el interceptor de `apiPrivada` (multi-tenant por subdominio). */
function resolveApiBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  if (typeof window === 'undefined') return `${apiUrl}/api/v1`;
  if (process.env.NEXT_PUBLIC_API_SAME_ORIGIN === 'true') return '/api/v1';
  const tenant = window.location.hostname.split('.')[0];
  if (tenant && tenant !== 'www' && tenant !== 'localhost') {
    return `http://${tenant}.localhost:8000/api/v1`;
  }
  return `${apiUrl}/api/v1`;
}

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
  // `apiPrivada` (axios) fija `Content-Type: application/json` por defecto
  // en la instancia. Con un `FormData` eso debería limpiarse solo, pero en
  // la práctica -- con este adaptador/versión de axios -- el resultado real
  // era un `Content-Type` sin el `boundary` real o un body vacío (Django
  // recibía "imagen dañada" o "no era un archivo" sin importar la imagen).
  // `fetch` nativo sí arma el `Content-Type` con boundary correctamente al
  // pasarle un `FormData`, así que se usa aquí puntualmente para el único
  // endpoint que sube archivos.
  const url = `${resolveApiBaseUrl()}/inventario/productos/`;
  const post = (token: string | undefined) =>
    fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

  let res = await post(Cookies.get('access_token'));
  // El access token vive 15 min; un formulario largo (con imagen) puede
  // superarlo. `apiPrivada` refresca sola vía interceptor, pero este envío
  // usa `fetch` nativo (ver nota abajo) y queda fuera de ese interceptor,
  // así que replicamos un único reintento con refresh aquí.
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed.ok) {
      res = await post(refreshed.access);
    }
  }

  const envelope = await res.json();
  if (!res.ok) {
    const error = new Error('Error al crear el producto') as Error & { response?: unknown };
    error.response = { status: res.status, data: envelope };
    throw error;
  }
  invalidateCache('inventario:productos');
  return envelope.data as Producto;
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
  const url = `${resolveApiBaseUrl()}/inventario/productos/${id}/`;
  const patch = (token: string | undefined) =>
    fetch(url, {
      method: 'PATCH',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

  let res = await patch(Cookies.get('access_token'));
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed.ok) {
      res = await patch(refreshed.access);
    }
  }

  const envelope = await res.json();
  if (!res.ok) {
    const error = new Error('Error al actualizar el producto') as Error & { response?: unknown };
    error.response = { status: res.status, data: envelope };
    throw error;
  }
  invalidateCache('inventario:productos');
  return envelope.data as Producto;
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
