/**
 * @file Servicio para encapsular la lógica de API para el módulo de Configuración
 * (IVA, Monedas, Tasas de Cambio, Estrategia Fiscal).
 * Las lecturas usan caché en memoria (TTL) para evitar refetch en cada navegación.
 */
import Cookies from 'js-cookie';
import { apiPrivada, refreshAccessToken } from '@/services/api';
import {
  Iva,
  IvaRequest,
  Moneda,
  MonedaRequest,
  PatchedMonedaRequest,
  TasaCambio,
  TasaCambioRequest,
  PatchedTasaCambioRequest,
  TaxStrategyInfo,
  ConfiguracionEmpresa,
  ConfiguracionEmpresaRequest,
  ConfiguracionCorrelativo,
  ConfiguracionCorrelativoRequest,
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
 * Obtiene la lista completa de configuraciones de IVA.
 * @returns {Promise<Iva[]>}
 */
export const getIvaConfigs = async (): Promise<Iva[]> => {
  return cachedGet('config:iva', async () => {
    const response = await apiPrivada.get<Iva[]>('/configuracion/iva/');
    return response.data;
  });
};

/**
 * Crea una nueva configuración de IVA.
 * @param {IvaRequest} data - Los datos del IVA a crear.
 * @returns {Promise<Iva>}
 */
export const createIvaConfig = async (data: IvaRequest): Promise<Iva> => {
  const response = await apiPrivada.post<Iva>('/configuracion/iva/', data);
  invalidateCache('config:iva');
  return response.data;
};

/**
 * Elimina una configuración de IVA por su ID.
 * @param {number} id - El ID del IVA a eliminar.
 */
export const deleteIvaConfig = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/configuracion/iva/${id}/`);
  invalidateCache('config:iva');
};

// ---------------------------------------------------------------------------
// Monedas (Multi-Moneda)
// ---------------------------------------------------------------------------

/**
 * Obtiene la lista de monedas configuradas del tenant.
 * @returns {Promise<Moneda[]>}
 */
export const getMonedas = async (): Promise<Moneda[]> => {
  return cachedGet('config:monedas', () => conRespaldoOffline('monedas', async () => {
    const response = await apiPrivada.get<Moneda[]>('/configuracion/monedas/');
    return response.data;
  }));
};

/**
 * Crea una nueva moneda.
 * @param {MonedaRequest} data - Datos de la moneda (código ISO 4217, nombre, etc.).
 * @returns {Promise<Moneda>}
 */
export const createMoneda = async (data: MonedaRequest): Promise<Moneda> => {
  const response = await apiPrivada.post<Moneda>('/configuracion/monedas/', data);
  invalidateCache('config:monedas');
  return response.data;
};

/**
 * Actualiza una moneda existente.
 * @param {number} id - ID de la moneda.
 * @param {PatchedMonedaRequest} data - Campos a actualizar.
 * @returns {Promise<Moneda>}
 */
export const updateMoneda = async (id: number, data: PatchedMonedaRequest): Promise<Moneda> => {
  const response = await apiPrivada.patch<Moneda>(`/configuracion/monedas/${id}/`, data);
  invalidateCache('config:monedas');
  return response.data;
};

/**
 * Elimina una moneda.
 * @param {number} id - ID de la moneda a eliminar.
 */
export const deleteMoneda = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/configuracion/monedas/${id}/`);
  invalidateCache('config:monedas');
};

// ---------------------------------------------------------------------------
// Tasas de Cambio (Historial)
// ---------------------------------------------------------------------------

/**
 * Obtiene el historial de tasas de cambio.
 * @returns {Promise<TasaCambio[]>}
 */
export const getTasasCambio = async (): Promise<TasaCambio[]> => {
  return cachedGet('config:tasas', async () => {
    const response = await apiPrivada.get<TasaCambio[]>('/configuracion/tasas-cambio/');
    return response.data;
  });
};

/**
 * Registra una nueva tasa de cambio para una moneda.
 * @param {TasaCambioRequest} data - Datos de la tasa (moneda, tasa, fuente).
 * @returns {Promise<TasaCambio>}
 */
export const createTasaCambio = async (data: TasaCambioRequest): Promise<TasaCambio> => {
  const response = await apiPrivada.post<TasaCambio>('/configuracion/tasas-cambio/', data);
  invalidateCache('config:tasas');
  return response.data;
};

/**
 * Actualiza una tasa de cambio existente.
 * @param {number} id - ID de la tasa.
 * @param {PatchedTasaCambioRequest} data - Campos a actualizar.
 * @returns {Promise<TasaCambio>}
 */
export const updateTasaCambio = async (id: number, data: PatchedTasaCambioRequest): Promise<TasaCambio> => {
  const response = await apiPrivada.patch<TasaCambio>(`/configuracion/tasas-cambio/${id}/`, data);
  invalidateCache('config:tasas');
  return response.data;
};

/**
 * Elimina una tasa de cambio.
 * @param {number} id - ID de la tasa a eliminar.
 */
export const deleteTasaCambio = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/configuracion/tasas-cambio/${id}/`);
  invalidateCache('config:tasas');
};

/**
 * Fuerza una consulta inmediata a DolarAPI para traer la tasa oficial del
 * BCV (solo aplica a tenants de Venezuela con USD configurado). El sistema
 * ya la trae sola una vez al día con el uso normal; este botón es para
 * refrescarla al instante sin esperar a que otra pantalla la dispare.
 * @returns {Promise<TasaCambio>}
 */
export const actualizarTasaBcv = async (): Promise<TasaCambio> => {
  const response = await apiPrivada.post<TasaCambio>('/configuracion/tasas-cambio/actualizar-bcv/');
  invalidateCache('config:tasas');
  invalidateCache('config:tasas:actual');
  return response.data;
};

// ---------------------------------------------------------------------------
// Estrategia Fiscal (SENIAT / DIAN / SUNAT)
// ---------------------------------------------------------------------------

/**
 * Consulta la estrategia fiscal activa del tenant (impuestos y retenciones).
 * @param {string} country - Código de país (VE/CO/PE). Por defecto 'VE'.
 * @returns {Promise<TaxStrategyInfo>}
 */
export const getTaxStrategy = async (country: string = 'VE'): Promise<TaxStrategyInfo> => {
  return cachedGet(`config:tax:${country}`, async () => {
    const response = await apiPrivada.get<TaxStrategyInfo>(
      `/configuracion/tax-strategy/?country=${encodeURIComponent(country)}`,
    );
    return response.data;
  });
};

// ---------------------------------------------------------------------------
// Tasas de Cambio Actuales (por moneda)
// ---------------------------------------------------------------------------

/**
 * Estructura que representa la tasa vigente de una moneda en el tenant.
 * `tasa` es "1.000000" para la moneda base o null si no se ha registrado.
 */
export interface TasaCambioActual {
  codigo: string;
  nombre: string;
  simbolo: string | null;
  tasa: string | null;
  es_base: boolean;
}

/**
 * Devuelve las tasas de cambio vigentes indexadas por código de moneda.
 * `GET /configuracion/tasas-cambio/actual/`
 * @returns {Promise<Record<string, TasaCambioActual>>}
 */
export const getTasasCambioActual = async (): Promise<Record<string, TasaCambioActual>> => {
  return cachedGet('config:tasas:actual', () => conRespaldoOffline('tasas_actuales', async () => {
    const response = await apiPrivada.get<Record<string, TasaCambioActual>>(
      '/configuracion/tasas-cambio/actual/',
    );
    return response.data;
  }));
};

// ---------------------------------------------------------------------------
// Datos de la Empresa (nombre comercial, RIF, teléfono, logo)
// ---------------------------------------------------------------------------

/**
 * Obtiene los datos de la empresa del tenant (nombre, RIF, teléfono, logo).
 * @returns {Promise<ConfiguracionEmpresa>}
 */
export const getConfiguracionEmpresa = async (): Promise<ConfiguracionEmpresa> => {
  const response = await apiPrivada.get<ConfiguracionEmpresa>('/configuracion/empresa/');
  return response.data;
};

/**
 * Actualiza los datos de la empresa. Usa `fetch` nativo (no axios) cuando
 * hay un logo nuevo: axios en esta app no arma bien el `Content-Type` con
 * `boundary` para `FormData` (ver nota en `inventoryService.createProducto`,
 * mismo bug), así que subir un archivo por axios corrompe el archivo en el
 * backend sin importar cuán válido sea.
 * @param {Partial<ConfiguracionEmpresaRequest>} data - Campos a actualizar.
 * @returns {Promise<ConfiguracionEmpresa>}
 */
export const updateConfiguracionEmpresa = async (
  data: Partial<ConfiguracionEmpresaRequest>,
): Promise<ConfiguracionEmpresa> => {
  if (!data.logo) {
    const response = await apiPrivada.patch<ConfiguracionEmpresa>('/configuracion/empresa/', data);
    return response.data;
  }

  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      formData.append(key, value as string | Blob);
    }
  });

  const url = `${resolveApiBaseUrl()}/configuracion/empresa/`;
  const post = (token: string | undefined) =>
    fetch(url, {
      method: 'PATCH',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

  let res = await post(Cookies.get('access_token'));
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed.ok) {
      res = await post(refreshed.access);
    }
  }

  const envelope = await res.json();
  if (!res.ok) {
    const error = new Error('Error al actualizar la empresa') as Error & { response?: unknown };
    error.response = { status: res.status, data: envelope };
    throw error;
  }
  return envelope.data as ConfiguracionEmpresa;
};

/**
 * Obtiene la numeración de facturas (correlativo) del tenant.
 * @returns {Promise<ConfiguracionCorrelativo>}
 */
export const getConfiguracionCorrelativo = async (): Promise<ConfiguracionCorrelativo> => {
  const response = await apiPrivada.get<ConfiguracionCorrelativo>('/configuracion/correlativo/');
  return response.data;
};

/**
 * Ajusta la numeración de facturas -- requiere la contraseña del usuario
 * porque un error aquí puede duplicar un correlativo ya emitido (el backend
 * también rechaza retroceder el número una vez que el tenant ya facturó).
 * @param {Partial<ConfiguracionCorrelativoRequest>} data - Campos a actualizar, más `password`.
 * @returns {Promise<ConfiguracionCorrelativo>}
 */
export const updateConfiguracionCorrelativo = async (
  data: Partial<ConfiguracionCorrelativoRequest>,
): Promise<ConfiguracionCorrelativo> => {
  const response = await apiPrivada.patch<ConfiguracionCorrelativo>('/configuracion/correlativo/', data);
  return response.data;
};
