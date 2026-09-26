/**
 * @file Acceso público (sin sesión) al pedido de una mesa vía el QR --
 * mismo patrón que `publicCatalogService.ts`: axios directo con el
 * subdominio explícito, porque un visitante anónimo no tiene tenant en
 * el `window` (es un link que puede llegar por WhatsApp, sin haber
 * navegado antes por el sitio).
 */
import axios from 'axios';

const DEV_PORT = 8000;
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || `http://localhost:${DEV_PORT}`;
const TENANT_BASE_DOMAIN = process.env.NEXT_PUBLIC_TENANT_DOMAIN || `localhost:${DEV_PORT}`;

function baseUrl(subdominio: string): string {
  if (typeof window === 'undefined') {
    return `${API_ORIGIN}/api/v1`;
  }
  if (process.env.NEXT_PUBLIC_API_SAME_ORIGIN === 'true') {
    return '/api/v1';
  }
  return `http://${subdominio}.localhost:${DEV_PORT}/api/v1`;
}

function tenantHeaders(subdominio: string): Record<string, string> | undefined {
  if (typeof window === 'undefined') {
    return { Host: `${subdominio}.${TENANT_BASE_DOMAIN}` };
  }
  return undefined;
}

interface ApiEnvelope<T> {
  data: T;
  meta: Record<string, unknown>;
  errors: unknown;
}

export interface PublicMesaItem {
  id: number;
  nombre: string;
  cantidad: number;
  precio_unitario: string;
  subtotal: string;
  persona_asignada: number | null;
  preparado: boolean;
}

export interface DesglosePersona {
  persona: number;
  subtotal: string;
  total_con_propina: string;
}

export interface PublicPedidoMesa {
  mesa_numero: string;
  estado: 'abierto' | 'cerrado';
  items: PublicMesaItem[];
  total: string;
  division_personas: number;
  propina_pct: string;
  mesero_solicitado: boolean;
  cuenta_solicitada: boolean;
  /** Datos de pago (banco, titular, teléfono, etc.) de quien va a cobrarle al resto del grupo -- texto libre, compartido entre todos los que escanearon el QR. */
  datos_pago_anfitrion: string;
  /** `true` si ya hay un PIN fijado -- el valor del PIN nunca viaja aquí (ver `pin_anfitrion_nuevo`, que solo aparece la vez que se crea). */
  tiene_pin_anfitrion: boolean;
  comprobante_pago: string | null;
  desglose_por_persona: DesglosePersona[];
  /** Solo presente en la respuesta que ACABA de fijar el PIN por primera vez -- anótalo, no vuelve a aparecer. */
  pin_anfitrion_nuevo?: string;
}

export const getPedidoMesaPublico = async (subdominio: string, token: string): Promise<PublicPedidoMesa> => {
  const response = await axios.get<ApiEnvelope<PublicPedidoMesa>>(
    `${baseUrl(subdominio)}/restaurantes/publico/${token}/`,
    { headers: tenantHeaders(subdominio) },
  );
  return response.data.data;
};

export const actualizarDivisionPublico = async (
  subdominio: string,
  token: string,
  data: { division_personas?: number; propina_pct?: number; datos_pago_anfitrion?: string; pin_anfitrion?: string },
): Promise<PublicPedidoMesa> => {
  const response = await axios.patch<ApiEnvelope<PublicPedidoMesa>>(
    `${baseUrl(subdominio)}/restaurantes/publico/${token}/`,
    data,
    { headers: tenantHeaders(subdominio) },
  );
  return response.data.data;
};

export const llamarMeseroPublico = async (subdominio: string, token: string): Promise<void> => {
  await axios.post(
    `${baseUrl(subdominio)}/restaurantes/publico/${token}/llamar-mesero/`,
    {},
    { headers: tenantHeaders(subdominio) },
  );
};

export const pedirCuentaPublico = async (subdominio: string, token: string): Promise<void> => {
  await axios.post(
    `${baseUrl(subdominio)}/restaurantes/publico/${token}/pedir-cuenta/`,
    {},
    { headers: tenantHeaders(subdominio) },
  );
};

export const asignarPersonaPublico = async (
  subdominio: string, token: string, itemId: number, personaAsignada: number | null,
): Promise<PublicPedidoMesa> => {
  const response = await axios.post<ApiEnvelope<PublicPedidoMesa>>(
    `${baseUrl(subdominio)}/restaurantes/publico/${token}/asignar-persona/`,
    { item_id: itemId, persona_asignada: personaAsignada },
    { headers: tenantHeaders(subdominio) },
  );
  return response.data.data;
};

export const subirComprobantePagoPublico = async (subdominio: string, token: string, archivo: File): Promise<PublicPedidoMesa> => {
  const formData = new FormData();
  formData.append('comprobante_pago', archivo);
  const response = await axios.post<ApiEnvelope<PublicPedidoMesa>>(
    `${baseUrl(subdominio)}/restaurantes/publico/${token}/comprobante-pago/`,
    formData,
    { headers: { ...tenantHeaders(subdominio), 'Content-Type': 'multipart/form-data' } },
  );
  return response.data.data;
};
