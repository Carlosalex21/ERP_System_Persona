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
  nombre: string;
  cantidad: number;
  precio_unitario: string;
  subtotal: string;
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
  data: { division_personas?: number; propina_pct?: number },
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
