/**
 * @file Servicio del portal de clientes B2B autenticados.
 * Distinto de `clientesService.ts` (que es para que el TENANT administre su
 * red de clientes B2B) -- este es el lado del propio cliente B2B viendo su
 * catálogo con precio negociado y comprando.
 */
import { apiPrivada } from './api';

export interface B2BNivelPrecio {
  id: number;
  nombre: string;
  porcentaje_descuento: string;
  monto_minimo_periodo: string;
}

export interface B2BProximoNivel {
  nivel: B2BNivelPrecio;
  monto_faltante: string;
}

export interface B2BPerfil {
  razon_social: string;
  rif: string;
  email_contacto: string;
  telefono_contacto: string;
  nivel_precio: B2BNivelPrecio | null;
  nivel_precio_actualizado_en: string | null;
  total_comprado_periodo: string;
  proximo_nivel: B2BProximoNivel | null;
  limite_credito: string;
  credito_usado: string;
  /** `null` = el cliente todavía no tiene línea de crédito configurada (sin límite). */
  credito_disponible: string | null;
  estado: 'pendiente' | 'activo' | 'inactivo' | 'bloqueado';
}

export interface B2BVariante {
  id: number;
  nombre: string;
  sku: string | null;
  precio_lista: string;
  precio_con_descuento: string;
  stock_disponible: number;
}

export interface B2BProducto {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo: 'simple' | 'variable';
  /** `null` para productos 'variable': el precio real está en cada variante. */
  precio_lista: string | null;
  precio_con_descuento: string | null;
  stock_disponible: number | null;
  variantes: B2BVariante[];
  imagen_url?: string | null;
}

interface PaginatedB2BProductos {
  count: number;
  next: string | null;
  previous: string | null;
  results: B2BProducto[];
}

export interface B2BOrderItemRequest {
  producto_id: number;
  variante_id?: number;
  cantidad: number;
}

export interface B2BOrderResponse {
  message: string;
  correlativo: string | null;
  total: string;
}

export interface B2BSugerenciaReposicion {
  producto_id: number;
  producto_nombre: string;
  cantidad_habitual: number;
  dias_entre_pedidos: number;
  ultima_compra: string;
  dias_estimados_restantes: number;
  urgente: boolean;
}

/** Devuelve el perfil B2B del usuario autenticado (403 si no tiene uno). */
export const getB2BPerfil = async (): Promise<B2BPerfil> => {
  const response = await apiPrivada.get<B2BPerfil>('/clientes/b2b/profile/');
  return response.data;
};

/** Catálogo del tenant con el precio ya ajustado al nivel de precio del cliente. */
export const getB2BCatalogo = async (page = 1): Promise<PaginatedB2BProductos> => {
  const response = await apiPrivada.get<PaginatedB2BProductos>(`/clientes/b2b/catalogo/?page=${page}`);
  return response.data;
};

/** Crea un pedido B2B; cada línea se cobra al precio con descuento del cliente. */
export const crearPedidoB2B = async (items: B2BOrderItemRequest[]): Promise<B2BOrderResponse> => {
  const response = await apiPrivada.post<B2BOrderResponse>('/clientes/b2b/pedidos/', { items });
  return response.data;
};

/** Sugerencias de reposición según el ritmo histórico de compra del cliente. */
export const getSugerenciasReposicion = async (): Promise<B2BSugerenciaReposicion[]> => {
  const response = await apiPrivada.get<B2BSugerenciaReposicion[]>('/clientes/b2b/sugerencias-reposicion/');
  return response.data;
};
