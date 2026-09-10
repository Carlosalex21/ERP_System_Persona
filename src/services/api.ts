import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import Cookies from 'js-cookie';

import type { ApiEnvelope, ApiError } from '@/types/api';

// Definimos la URL base del backend en Django
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Silencia el type-check de AxiosError exportado pero usado en genéricos.
export type { AxiosError };

/**
 * Interfaz extendida de AxiosResponse para acceder a `meta` y `errors`
 * de la envoltura estándar `{data, meta, errors}` del backend.
 */
export interface NormalizedResponse<T = unknown> extends AxiosResponse {
  data: T;
  meta?: Record<string, unknown> | null;
  errors?: ApiError[] | null;
}

function isEnvelope(body: unknown): body is ApiEnvelope<unknown> {
  return (
    typeof body === 'object' &&
    body !== null &&
    'data' in (body as Record<string, unknown>)
  );
}

/**
 * Instancia pública (No requiere token).
 * Ej: login, ver planes, catálogo público.
 */
export const apiPublica: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Instancia privada (Requiere token).
 * Ej: panel de admin, POS, inventario.
 */
export const apiPrivada: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

/** Resuelve la baseURL en función del subdominio del tenant (multi-tenant). */
function resolveBaseURL(): string {
  if (typeof window === 'undefined') {
    return `${API_URL}/api/v1`;
  }
  const hostname = window.location.hostname;
  const tenant = hostname.split('.')[0];
  if (tenant && tenant !== 'www' && tenant !== 'localhost') {
    const port = window.location.port ? `:${window.location.port}` : '';
    return `http://${tenant}.localhost:8000/api/v1`;
  }
  return `${API_URL}/api/v1`;
}

// ---------------------------------------------------------------------------
// Interceptor de peticiones (privado): inyecta JWT y ajusta la baseURL.
// ---------------------------------------------------------------------------
apiPrivada.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Multi-Tenant: si estamos en un subdominio, apuntamos la API al mismo.
    if (typeof window !== 'undefined') {
      config.baseURL = resolveBaseURL();
    } else {
      config.baseURL = `${API_URL}/api/v1`;
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

apiPublica.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      config.baseURL = resolveBaseURL();
    } else {
      config.baseURL = `${API_URL}/api/v1`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ---------------------------------------------------------------------------
// Interceptor de respuestas: normaliza la envoltura `{data, meta, errors}`.
// ---------------------------------------------------------------------------
function normalizeResponse(response: AxiosResponse): AxiosResponse {
  const body: unknown = response.data;
  if (isEnvelope(body)) {
    const envelope = body as ApiEnvelope<unknown>;
    const normalized = response as NormalizedResponse;
    normalized.data = envelope.data as AxiosResponse['data'];
    normalized.meta = envelope.meta;
    // En caso de éxito los errores suelen ser null.
    normalized.errors = envelope.errors ?? null;
    return normalized;
  }
  return response;
}

function normalizeError(error: AxiosError<ApiEnvelope<unknown>>): Promise<never> {
  const envelope = error.response?.data;

  // Si el backend ya devolvió errores estandarizados, los exponemos.
  if (envelope && Array.isArray(envelope.errors)) {
    (error as AxiosError & { apiErrors?: ApiError[] }).apiErrors = envelope.errors;
  }
  return Promise.reject(error);
}

apiPrivada.interceptors.response.use(normalizeResponse, normalizeError);
apiPublica.interceptors.response.use(normalizeResponse, normalizeError);

// ---------------------------------------------------------------------------
// Refresco de sesión: si el access token expira, se intenta renovar con el
// refresh token y se reintenta la petición original (una sola vez).
// ---------------------------------------------------------------------------
let isRefreshing = false;
let pendingRequests: Array<(token: string | null) => void> = [];

/** Resultado del refresco: ok => pudimos renovar; hard => token inválido definitivo. */
type RefreshResult =
  | { ok: true; access: string; refresh?: string }
  | { ok: false; hard: boolean };

/** Número máximo de reintentos ante fallos transitorios del endpoint de refresh. */
const MAX_REFRESH_RETRIES = 2;
/** Retardo base (ms) entre reintentos; crece linealmente. */
const REFRESH_RETRY_DELAY_MS = 400;

/** Pequeña espera no bloqueante para el backoff de reintentos. */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Renueva el par de tokens. Soporta ROTATE_REFRESH_TOKENS=True: si el backend
 * devuelve un nuevo `refresh_token`, se guarda silenciosamente en las cookies.
 *
 * - Errores 401/403 del refresh => token inválido definitivo (`hard: true`).
 * - Errores transitorios (red, 5xx) => se reintenta con backoff. Si persisten,
 *   se devuelve `hard: false` para NO desloguear a un cajero en plena venta.
 */
async function refreshAccessToken(): Promise<RefreshResult> {
  const refreshToken = Cookies.get('refresh_token');
  if (!refreshToken) {
    return { ok: false, hard: true };
  }

  for (let attempt = 0; attempt <= MAX_REFRESH_RETRIES; attempt++) {
    try {
      // El interceptor de respuesta ya desenvuelve la envoltura {data, meta, errors},
      // por lo que response.data es directamente { access, refresh? }.
      // IMPORTANTE: la instancia apiPublica ya resuelve su baseURL a
      // `${API_URL}/api/v1` (o `http://<tenant>.localhost:8000/api/v1`), por lo
      // que aquí SOLO ponemos la ruta relativa. Poner '/api/v1/auth/token/refresh/'
      // duplicaba el prefijo y devolvía 404 (api/v1/api/v1/...).
      const response = await apiPublica.post<{ access?: string; refresh?: string }>(
        '/auth/token/refresh/',
        { refresh: refreshToken },
      );
      const data = response.data;
      const access = data.access ?? null;
      const refresh = data.refresh ?? null;

      if (access) {
        Cookies.set('access_token', access, { expires: 1, secure: false, sameSite: 'Lax' });
        // El backend rota el refresh token (ROTATE_REFRESH_TOKENS=True); lo guardamos si viene.
        if (refresh) {
          Cookies.set('refresh_token', refresh, { expires: 7, secure: false, sameSite: 'Lax' });
        }
        return { ok: true, access, refresh: refresh ?? undefined };
      }

      // Respuesta sin access: el token es inválido.
      return { ok: false, hard: true };
    } catch (error) {
      const status = (error as AxiosError).response?.status;

      // 401/403 del refresh => el refresh token ya no es válido (fallo duro).
      if (status === 401 || status === 403) {
        return { ok: false, hard: true };
      }

      // Fallo transitorio: reintentamos con backoff lineal.
      if (attempt < MAX_REFRESH_RETRIES) {
        await sleep(REFRESH_RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
    }
  }

  // Fallo transitorio persistente => NO es un problema de autenticación.
  return { ok: false, hard: false };
}

apiPrivada.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {

    const originalConfig = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _tenantBaseURL?: string;
    };

    if (
      error.response?.status === 401 &&
      originalConfig &&
      !originalConfig._retry &&
      !originalConfig.url?.includes('/auth/token/')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push((token) => {
            if (token) {
              originalConfig.headers.Authorization = `Bearer ${token}`;
              resolve(apiPrivada(originalConfig));
            } else {
              reject(error);
            }
          });
        });
      }

      originalConfig._retry = true;
      isRefreshing = true;

      const refreshResult = await refreshAccessToken();

      isRefreshing = false;
      pendingRequests.forEach((callback) => callback(refreshResult.ok ? refreshResult.access : null));
      pendingRequests = [];

      if (refreshResult.ok) {
        originalConfig.headers.Authorization = `Bearer ${refreshResult.access}`;
        return apiPrivada(originalConfig);
      }

      // Solo deslogueamos ante un fallo DURO de autenticación. Un 401 transitorio
      // (red caída, 5xx al renovar) NO debe expulsar al cajero en plena venta.
      if (refreshResult.hard) {
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        if (typeof window !== 'undefined') {
          // Redirige al login del subdominio actual (tenant) para no perder el
          // contexto multi-tenant. window.location.origin ya incluye el subdominio.
          window.location.href = `${window.location.origin}/login`;
        }
      }
    }

    return Promise.reject(error);
  },
);

/** Utilidad para consumir la envoltura estándar en peticiones manuales. */
export async function apiRequest<T = unknown>(
  config: AxiosRequestConfig,
): Promise<NormalizedResponse<T>> {
  const response = await apiPrivada.request<unknown, NormalizedResponse<T>>(config);
  return response;
}
