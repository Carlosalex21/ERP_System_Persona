import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import type { ApiEnvelope, ApiError } from '@/types/api';
import { cerrarSesion, getAccessToken, getRefreshToken, guardarSesion } from '@/utils/authSession';

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
  // Sin esto, un pedido del catálogo público podía quedar esperando
  // indefinidamente (ej. si la consulta externa de tasa BCV se cuelga) --
  // el checkout deshabilita su botón de cerrar mientras el pedido está en
  // vuelo (ver `CheckoutModal`), así que sin un límite de tiempo el cliente
  // quedaría atrapado sin poder cerrar el modal ni saber qué pasó.
  timeout: 20000,
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
  // Producción: el navegador llama a la API en el MISMO origen que el
  // frontend (ej. `https://tienda1.midominio.com/api/v1/...`) -- el reverse
  // proxy (nginx) enruta `/api/` al backend. Esto evita CORS entre
  // subdominios y permite un solo certificado TLS por subdominio de tenant,
  // en vez de exponer el backend en su propio host:puerto. Ver
  // `NEXT_PUBLIC_API_SAME_ORIGIN` en `.env`.
  if (process.env.NEXT_PUBLIC_API_SAME_ORIGIN === 'true') {
    return '/api/v1';
  }
  const hostname = window.location.hostname;
  const tenant = hostname.split('.')[0];
  if (tenant && tenant !== 'www' && tenant !== 'localhost') {
    return `http://${tenant}.localhost:8000/api/v1`;
  }
  return `${API_URL}/api/v1`;
}

// ---------------------------------------------------------------------------
// Interceptor de peticiones (privado): inyecta JWT y ajusta la baseURL.
// ---------------------------------------------------------------------------
apiPrivada.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
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
// Refresco de sesión: si el access token expira, se renueva con el refresh
// token y se reintenta la petición original (una sola vez).
//
// El backend ROTA el refresh token en cada uso (ROTATE_REFRESH_TOKENS +
// BLACKLIST_AFTER_ROTATION): si dos refrescos salen con el mismo token, el
// segundo recibe 401 "blacklisted". Antes eso pasaba en cuanto la misma
// cuenta estaba abierta en varias pestañas/ventanas (cada una refrescaba
// por su lado) o cuando un servicio con `fetch` nativo llamaba a su propio
// refresh en paralelo con el interceptor -- la pestaña perdedora borraba las
// cookies (compartidas por todas) y la sesión quedaba "pegada" hasta cerrar
// sesión a mano. Ahora hay UN solo refresco en vuelo por pestaña (promesa
// compartida) y UNO por navegador (Web Locks); quien espera el lock y
// encuentra que otra pestaña ya rotó el token simplemente usa el nuevo.
// ---------------------------------------------------------------------------

/** Resultado del refresco: ok => pudimos renovar; hard => token inválido definitivo. */
export type RefreshResult =
  | { ok: true; access: string; refresh?: string }
  | { ok: false; hard: boolean };

/** Número máximo de reintentos ante fallos transitorios del endpoint de refresh. */
const MAX_REFRESH_RETRIES = 2;
/** Retardo base (ms) entre reintentos; crece linealmente. */
const REFRESH_RETRY_DELAY_MS = 400;
const REFRESH_LOCK_NAME = 'erp-token-refresh';

/** Pequeña espera no bloqueante para el backoff de reintentos. */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Ejecuta `fn` en exclusión mutua con las demás pestañas del mismo origen (si el navegador lo soporta). */
async function conBloqueoEntrePestanas<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(REFRESH_LOCK_NAME, fn) as Promise<T>;
  }
  return fn();
}

/** Llamada real al endpoint de refresh, con reintentos ante fallos transitorios. */
async function pedirNuevoPar(refreshToken: string): Promise<RefreshResult> {
  for (let attempt = 0; attempt <= MAX_REFRESH_RETRIES; attempt++) {
    try {
      // `apiPublica` ya resuelve la baseURL a `.../api/v1`: aquí va solo la
      // ruta relativa (poner el prefijo duplicado daba 404).
      const response = await apiPublica.post<{ access?: string; refresh?: string }>(
        '/auth/token/refresh/',
        { refresh: refreshToken },
      );
      const { access, refresh } = response.data;
      if (!access) return { ok: false, hard: true };
      guardarSesion(access, refresh);
      return { ok: true, access, refresh: refresh ?? undefined };
    } catch (error) {
      const status = (error as AxiosError).response?.status;
      // 401/403 del refresh => el refresh token ya no es válido (fallo duro).
      if (status === 401 || status === 403) {
        return { ok: false, hard: true };
      }
      if (attempt < MAX_REFRESH_RETRIES) {
        await sleep(REFRESH_RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }
  // Fallo transitorio persistente (red, 5xx) => NO es un problema de
  // autenticación: no se desloguea a un cajero en plena venta.
  return { ok: false, hard: false };
}

let refreshEnCurso: Promise<RefreshResult> | null = null;

/**
 * Renueva el par de tokens. Seguro de llamar desde cualquier parte y en
 * paralelo: todas las llamadas simultáneas comparten el mismo refresco.
 */
export function refreshAccessToken(): Promise<RefreshResult> {
  if (refreshEnCurso) return refreshEnCurso;

  const refreshAlPedir = getRefreshToken();
  refreshEnCurso = conBloqueoEntrePestanas(async (): Promise<RefreshResult> => {
    const refreshActual = getRefreshToken();
    const accessActual = getAccessToken();
    if (!refreshActual) return { ok: false, hard: true };
    // Mientras esperábamos el lock, otra pestaña ya rotó el par: basta
    // con usar el que dejó en las cookies (compartidas).
    if (refreshActual !== refreshAlPedir && accessActual) {
      return { ok: true, access: accessActual, refresh: refreshActual };
    }
    return pedirNuevoPar(refreshActual);
  }).finally(() => {
    refreshEnCurso = null;
  });
  return refreshEnCurso;
}

/** Sesión muerta de verdad: limpia todo y manda al login del subdominio actual. */
function expulsarAlLogin(): void {
  cerrarSesion();
  if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/login')) {
    window.location.href = `${window.location.origin}/login`;
  }
}

apiPrivada.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalConfig = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // La suscripción del tenant venció (ver `SubscriptionGateMiddleware` en
    // el backend, que bloquea con 402 antes de llegar a cualquier vista) --
    // no tiene sentido reintentar ni refrescar el token, hay que mandar al
    // dueño a la pantalla de "renueva tu plan".
    if (
      error.response?.status === 402 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.endsWith('/suscripcion-vencida')
    ) {
      window.location.href = `${window.location.origin}/suscripcion-vencida`;
      return new Promise(() => {}); // corta la cadena: ya estamos navegando fuera.
    }

    if (
      error.response?.status !== 401 ||
      !originalConfig ||
      originalConfig._retry ||
      originalConfig.url?.includes('/auth/token/')
    ) {
      return Promise.reject(error);
    }

    originalConfig._retry = true;

    // Otra pestaña (o un refresco anterior de esta) ya dejó un access nuevo
    // en las cookies: reintentamos con él sin gastar otro refresh.
    const enviado = String(originalConfig.headers.Authorization ?? '').replace(/^Bearer /, '');
    const vigente = getAccessToken();
    if (vigente && vigente !== enviado) {
      originalConfig.headers.Authorization = `Bearer ${vigente}`;
      return apiPrivada(originalConfig);
    }

    const refreshResult = await refreshAccessToken();
    if (refreshResult.ok) {
      originalConfig.headers.Authorization = `Bearer ${refreshResult.access}`;
      return apiPrivada(originalConfig);
    }

    // Solo deslogueamos ante un fallo DURO de autenticación.
    if (refreshResult.hard) {
      expulsarAlLogin();
    }
    return Promise.reject(error);
  },
);

/**
 * Envía un `FormData` (subida de archivos) al API privado con `fetch` nativo.
 *
 * axios, con el `Content-Type: application/json` fijo de la instancia, no
 * armaba bien el `boundary` del multipart (el backend recibía "imagen
 * dañada"); `fetch` sí. Como queda fuera de los interceptores de axios,
 * aquí se replica lo mismo: token actual, un reintento tras refrescar
 * (usando el MISMO refresco compartido) y la envoltura `{data, errors}`.
 */
export async function enviarMultipart<T>(
  method: 'POST' | 'PATCH' | 'PUT',
  path: string,
  formData: FormData,
  mensajeError = 'No se pudo guardar la información.',
): Promise<T> {
  const url = `${resolveBaseURL()}${path}`;
  const enviar = (token: string | undefined) =>
    fetch(url, {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

  let res = await enviar(getAccessToken());
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed.ok) {
      res = await enviar(refreshed.access);
    } else if (refreshed.hard) {
      expulsarAlLogin();
    }
  }

  const envelope = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(mensajeError) as Error & { response?: unknown; apiErrors?: ApiError[] };
    error.response = { status: res.status, data: envelope };
    if (Array.isArray(envelope?.errors)) error.apiErrors = envelope.errors;
    throw error;
  }
  return (isEnvelope(envelope) ? envelope.data : envelope) as T;
}

/** Utilidad para consumir la envoltura estándar en peticiones manuales. */
export async function apiRequest<T = unknown>(
  config: AxiosRequestConfig,
): Promise<NormalizedResponse<T>> {
  const response = await apiPrivada.request<unknown, NormalizedResponse<T>>(config);
  return response;
}
