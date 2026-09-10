/**
 * @file Servicio para el catálogo público de un tenant (sin autenticación).
 * El catálogo se sirve en el subdominio del tenant y permite a los clientes
 * finales ver productos y crear pedidos sin estar logueados.
 */
import axios from 'axios';

/** Producto expuesto en el catálogo público. */
export interface PublicProducto {
  id: number;
  nombre: string;
  descripcion?: string;
  /** Precio de venta (string decimal). */
  precio_venta: string;
  imagen_url?: string | null;
}

/** Item de un pedido público. */
export interface PublicOrderItemRequest {
  variacion_id: number;
  cantidad: number;
}

/** Payload para crear un pedido desde el catálogo público. */
export interface PublicCreateOrderRequest {
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion: string;
  items: PublicOrderItemRequest[];
}

/** Respuesta paginada del catálogo público. */
export interface PaginatedPublicProductoList {
  count: number;
  next: string | null;
  previous: string | null;
  results: PublicProducto[];
}

const DEV_PORT = 8000;

/**
 * Construye la base URL del catálogo público del tenant (subdominio).
 * En desarrollo se resuelve como `http://{subdominio}.localhost:8000`.
 */
function baseUrl(subdominio: string): string {
  return `http://${subdominio}.localhost:${DEV_PORT}/api/v1`;
}

/**
 * Obtiene el catálogo público de productos del tenant.
 * @param {string} subdominio - El subdominio/tenantId.
 * @param {number} page - Página a consultar.
 * @returns {Promise<PaginatedPublicProductoList>}
 */
export const getCatalogoPublico = async (
  subdominio: string,
  page = 1,
): Promise<PaginatedPublicProductoList> => {
  const response = await axios.get<PaginatedPublicProductoList>(
    `${baseUrl(subdominio)}/public/catalogo/?page=${page}`,
  );
  return response.data;
};

/**
 * Crea un nuevo pedido desde el catálogo público.
 * @param {string} subdominio - El subdominio/tenantId.
 * @param {PublicCreateOrderRequest} data - Datos del pedido.
 * @returns {Promise<Record<string, unknown>>}
 */
export const crearPedidoPublico = async (
  subdominio: string,
  data: PublicCreateOrderRequest,
): Promise<Record<string, unknown>> => {
  const response = await axios.post<Record<string, unknown>>(
    `${baseUrl(subdominio)}/public/ordenar/`,
    data,
  );
  return response.data;
};
