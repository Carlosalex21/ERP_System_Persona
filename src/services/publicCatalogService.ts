/**
 * @file Servicio para el catálogo público de un tenant (sin autenticación).
 * El catálogo se sirve en el subdominio del tenant y permite a los clientes
 * finales ver productos y crear pedidos sin estar logueados.
 */
import axios from 'axios';

/** Una variante (talla/color/etc.) comprable desde el catálogo público. */
export interface PublicVariacion {
  id: number;
  nombre: string;
  precio: string;
  stock_disponible: number;
  imagen_url?: string | null;
}

/** Una presentación (Unidad/Bulto x12/Docena/etc.) comprable desde el catálogo público. */
export interface PublicPresentacion {
  id: number;
  nombre: string;
  factor_conversion: number;
  precio: string;
  es_default: boolean;
}

/** Producto expuesto en el catálogo público. */
export interface PublicProducto {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo?: 'simple' | 'variable' | 'servicio';
  /** Precio de venta -- final, con IVA incluido (string decimal). */
  precio_venta: string;
  /** Base imponible (precio sin IVA), para el desglose fiscal. */
  base_imponible: string | null;
  /** Monto de IVA incluido en `precio_venta`. */
  iva_monto: string | null;
  /** Porcentaje de IVA aplicado (ej. 16). */
  iva_porcentaje: number;
  /** Código de la moneda en la que está expresado `precio_venta` (ej. 'USD'). */
  moneda_codigo: string | null;
  /** Símbolo de esa misma moneda (ej. '$'), para mostrar junto al precio. */
  moneda_simbolo: string | null;
  /** Stock realmente vendible (cantidad total menos reservas vigentes). */
  stock_disponible: number;
  imagen_url?: string | null;
  categoria_id?: number | null;
  categoria_nombre?: string | null;
  /** Solo para `tipo='variable'` -- vacío en cualquier otro caso. */
  variantes?: PublicVariacion[];
  /** Presentaciones activas de este producto (unidad/bulto/docena/etc.), si tiene alguna cargada. */
  presentaciones?: PublicPresentacion[];
}

/** Item de un pedido público. */
export interface PublicOrderItemRequest {
  producto_id: number;
  /** Opcionales -- vienen de `producto.variantes`/`producto.presentaciones`; nunca coexisten entre sí. */
  variante_id?: number;
  presentacion_id?: number;
  cantidad: number;
}

/** Payload para crear un pedido desde el catálogo público. */
export interface PublicCreateOrderRequest {
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion: string;
  items: PublicOrderItemRequest[];
  /** Método de pago manual elegido (Pago Móvil/Zelle), si el cliente ya pagó. */
  metodo_pago_config_id?: number | null;
  /** Referencia/comprobante del pago, si aplica. */
  referencia_pago?: string;
}

/** Datos de un método de pago (Pago Móvil/Zelle/Stripe) para el checkout. */
export interface PublicMetodoPago {
  id: number;
  nombre: string;
  instrucciones?: string | null;
  pago_movil_config: { banco: string; cedula: string; telefono: string } | null;
  zelle_config: { email_zelle: string; nombre_beneficiario: string } | null;
  /** true si este método es Stripe (paga con tarjeta, se redirige a Stripe Checkout). */
  es_stripe: boolean;
}

/** Respuesta paginada del catálogo público. */
export interface PaginatedPublicProductoList {
  count: number;
  next: string | null;
  previous: string | null;
  results: PublicProducto[];
}

const DEV_PORT = 8000;
/** Origen real del backend (una sola app Django sirve TODOS los tenants). */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || `http://localhost:${DEV_PORT}`;
/** Dominio base + puerto usado para armar el Host de cada tenant (debe calzar con `TENANT_DOMAIN` del backend). */
const TENANT_BASE_DOMAIN = process.env.NEXT_PUBLIC_TENANT_DOMAIN || `localhost:${DEV_PORT}`;

/**
 * Construye la base URL del catálogo público del tenant (subdominio).
 *
 * En el navegador, `http://{subdominio}.localhost:8000` resuelve solo (los
 * navegadores modernos tratan `*.localhost` como loopback). En el SERVIDOR
 * (este archivo se llama también desde un Server Component para ISR) NO hay
 * ese DNS especial -- Node.js intenta resolver `puriempaques.localhost` como
 * un dominio real y falla con `ENOTFOUND`. Ahí nos conectamos directo al
 * origen del backend y dejamos que el header `Host` (ver `tenantHeaders`)
 * le diga a django-tenants qué tenant es, igual que ya hace cualquier
 * request que SÍ llega por el subdominio real.
 */
export function baseUrl(subdominio: string): string {
  if (typeof window === 'undefined') {
    return `${API_ORIGIN}/api/v1`;
  }
  // Producción: mismo origen que el frontend, el reverse proxy enruta
  // `/api/` al backend -- ver el mismo criterio en `services/api.ts`.
  if (process.env.NEXT_PUBLIC_API_SAME_ORIGIN === 'true') {
    return '/api/v1';
  }
  return `http://${subdominio}.localhost:${DEV_PORT}/api/v1`;
}

/** Headers extra necesarios solo en el servidor (ver `baseUrl`). */
export function tenantHeaders(subdominio: string): Record<string, string> | undefined {
  if (typeof window === 'undefined') {
    return { Host: `${subdominio}.${TENANT_BASE_DOMAIN}` };
  }
  return undefined;
}

/**
 * Envelope estándar del backend (ver `apps.core.renderers.StandardJSONRenderer`).
 * Las instancias `apiPrivada`/`apiPublica` de `services/api.ts` lo desenvuelven
 * automáticamente vía un interceptor, pero este servicio usa `axios` directo
 * (necesita construir la URL a partir de un subdominio explícito, incluso en
 * el Server Component que hace el fetch inicial para ISR, donde no hay
 * `window` para que `apiPublica` detecte el tenant solo) -- así que el
 * desenvolvimiento hay que hacerlo aquí a mano.
 */
interface ApiEnvelope<T> {
  data: T;
  meta: Record<string, unknown>;
  errors: unknown;
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
  const response = await axios.get<ApiEnvelope<PaginatedPublicProductoList>>(
    `${baseUrl(subdominio)}/public/catalogo/?page=${page}`,
    { headers: tenantHeaders(subdominio) },
  );
  return response.data.data;
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
  const response = await axios.post<ApiEnvelope<Record<string, unknown>>>(
    `${baseUrl(subdominio)}/public/ordenar/`,
    data,
    { headers: tenantHeaders(subdominio) },
  );
  return response.data.data;
};

/**
 * Obtiene los métodos de pago manuales (Pago Móvil/Zelle) activos del
 * tenant, para mostrarlos en el checkout del catálogo público.
 * @param {string} subdominio - El subdominio/tenantId.
 * @returns {Promise<PublicMetodoPago[]>}
 */
export const getMetodosPagoPublico = async (subdominio: string): Promise<PublicMetodoPago[]> => {
  const response = await axios.get<ApiEnvelope<PublicMetodoPago[]>>(
    `${baseUrl(subdominio)}/public/metodos-pago/`,
    { headers: tenantHeaders(subdominio) },
  );
  return response.data.data;
};

/** Nombre comercial, teléfono de contacto y logo del tenant (para el hero del catálogo y el botón de WhatsApp). */
export interface PublicEmpresaInfo {
  nombre_comercial: string;
  telefono: string | null;
  logo_url: string | null;
  /** Para adaptar el copy del storefront (ej. "Menú" en vez de "Catálogo" para un restaurante). */
  tipo_negocio?: 'retail' | 'b2b' | 'restaurante' | 'farmacia' | 'servicios' | 'condominios' | 'inmobiliaria' | null;
}

export const getEmpresaInfoPublico = async (subdominio: string): Promise<PublicEmpresaInfo> => {
  const response = await axios.get<ApiEnvelope<PublicEmpresaInfo>>(
    `${baseUrl(subdominio)}/public/info/`,
    { headers: tenantHeaders(subdominio) },
  );
  return response.data.data;
};

/** Tasa vigente de una moneda frente a la moneda base del tenant. */
export interface PublicTasaMoneda {
  codigo: string;
  nombre: string;
  simbolo: string | null;
  /** null si la moneda no tiene tasa cargada todavía. */
  tasa: string | null;
  es_base: boolean;
}

/**
 * Tasas de cambio vigentes de todas las monedas del tenant (sin
 * autenticación) -- para mostrar el precio también en otra moneda en el
 * catálogo público (ej. equivalente en USD de un precio en Bs).
 */
export const getTasasPublico = async (subdominio: string): Promise<Record<string, PublicTasaMoneda>> => {
  const response = await axios.get<ApiEnvelope<Record<string, PublicTasaMoneda>>>(
    `${baseUrl(subdominio)}/public/tasas/`,
    { headers: tenantHeaders(subdominio) },
  );
  return response.data.data;
};

/**
 * Crea una Stripe Checkout Session para un pedido ya creado y devuelve la
 * URL de Stripe a la que redirigir al cliente para pagar con tarjeta.
 * @param {string} subdominio - El subdominio/tenantId.
 * @param {number} facturaId - ID del pedido (devuelto por `crearPedidoPublico`).
 * @param {string} accessToken - `access_token` devuelto por `crearPedidoPublico`
 *   para ESE mismo pedido -- prueba que quien pide la sesión de pago es
 *   quien creó el pedido, no un visitante adivinando `facturaId` (ver el
 *   mismo comentario en el backend, `CrearSesionStripeView`).
 */
export const crearSesionStripe = async (
  subdominio: string,
  facturaId: number,
  accessToken: string,
): Promise<{ checkout_url: string }> => {
  const successUrl = `${window.location.origin}/${subdominio}?pago=exitoso`;
  const cancelUrl = `${window.location.origin}/${subdominio}?pago=cancelado`;
  const response = await axios.post<ApiEnvelope<{ checkout_url: string }>>(
    `${baseUrl(subdominio)}/public/pagos/stripe/sesion/`,
    { factura_id: facturaId, access_token: accessToken, success_url: successUrl, cancel_url: cancelUrl },
    { headers: tenantHeaders(subdominio) },
  );
  return response.data.data;
};
