/**
 * @file Utilidades de manejo de errores de API con notificaciones visuales.
 *
 * El backend devuelve errores estandarizados en la envoltura
 * `{ data, meta, errors }`, donde `errors` es un array de
 * `{ code, detail, field }`. Estas utilidades leen esa estructura y
 * renderizan cada `detail` en un toast visual (react-hot-toast).
 */
import { toast } from 'react-hot-toast';

import type { ApiError } from '@/types/api';
import { mensajesDeError } from '@/utils/mensajesError';

/** Estructura de un AxiosError normalizado por los interceptores de `api.ts`. */
export interface AppAxiosError {
  response?: {
    data?: {
      errors?: ApiError[];
    };
  };
  apiErrors?: ApiError[];
}

/**
 * Extrae los errores estandarizados `{ code, detail, field }` de un error de
 * la API. Soporta tanto la envoltura `response.data.errors` como la propiedad
 * `apiErrors` que inyectan los interceptores de `api.ts`.
 *
 * @param {unknown} error - El error capturado.
 * @returns {ApiError[]} Lista de errores estandarizados.
 */
export const extractApiErrors = (error: unknown): ApiError[] => {
  if (typeof error !== 'object' || error === null) return [];

  const err = error as AppAxiosError;
  const fromResponse = err.response?.data?.errors;
  const fromInterceptor = err.apiErrors;

  if (Array.isArray(fromResponse) && fromResponse.length > 0) {
    return fromResponse.filter((e): e is ApiError => Boolean(e?.detail));
  }
  if (Array.isArray(fromInterceptor) && fromInterceptor.length > 0) {
    return fromInterceptor.filter((e): e is ApiError => Boolean(e?.detail));
  }
  return [];
};

/**
 * Muestra los errores de la API como toasts comprensibles (ver
 * `utils/mensajesError.ts`: etiquetas de campo, mensajes por codigo HTTP,
 * errores tecnicos ocultos). Si no hay nada aprovechable, muestra `fallback`.
 */
export const toastApiError = (
  error: unknown,
  fallback = 'Ocurrió un error al procesar la solicitud.',
): void => {
  const mensajes = mensajesDeError(error, { fallback });
  mensajes.forEach((mensaje, index) => {
    // `id` = el propio texto: si la misma falla se dispara dos veces seguidas
    // (doble clic, reintento) no se apilan toasts identicos.
    if (index === 0) toast.error(mensaje, { id: mensaje });
    else toast(mensaje, { id: mensaje, icon: '⚠️' });
  });
};
