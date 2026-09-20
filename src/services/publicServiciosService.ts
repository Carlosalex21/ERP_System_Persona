/**
 * @file Acceso público (sin sesión) al seguimiento de una orden de servicio
 * vía el QR/link -- mismo patrón que `publicMesaService.ts`.
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

export interface PublicOrdenServicio {
  numero: string;
  equipo: string;
  estado: 'recibido' | 'en_proceso' | 'listo' | 'entregado' | 'cancelado';
  fecha_recepcion: string;
  fecha_entrega_estimada: string | null;
  fecha_entrega_real: string | null;
}

export const getOrdenServicioPublico = async (subdominio: string, token: string): Promise<PublicOrdenServicio> => {
  const response = await axios.get<ApiEnvelope<PublicOrdenServicio>>(
    `${baseUrl(subdominio)}/servicios/publico/${token}/`,
    { headers: tenantHeaders(subdominio) },
  );
  return response.data.data;
};
