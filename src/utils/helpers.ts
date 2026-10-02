import { mensajesDeError } from '@/utils/mensajesError';
/**
 * @file Funciones de utilidad genéricas para el frontend.
 */

/**
 * Busca el nombre de un elemento en una lista por su ID.
 * @param {Array<any>} lista - La lista de elementos donde buscar.
 * @param {any} id - El ID del elemento a buscar.
 * @returns {string} El nombre del elemento o un string indicando el ID si no se encuentra.
 */
export const getNombreById = (lista: any[], id: any): string => {
  if (!id || !lista || lista.length === 0) return '';
  const item = lista.find(i => i.id == id); // Usar '==' para comparar string con number si es necesario
  return item ? item.nombre : `ID: ${id}`;
};

/**
 * Extrae los mensajes de error de la envoltura estándar `{data, meta, errors}`
 * del backend. Los errores llegan como `{ code, detail, field }`.
 * @param {unknown} error - El error capturado (normalmente un AxiosError).
 * @returns {string[]} - Lista de detalles legibles para mostrar con toast.
 */
export const getApiErrorMessages = (error: unknown): string[] => mensajesDeError(error);

/**
 * Formatea un monto Decimal (string) a un número flotante seguro.
 * @param {string | number | null | undefined} value - Valor a parsear.
 * @returns {number}
 */
export const parseDecimal = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Formatea un número como moneda usando Intl.NumberFormat.
 * @param {number | string} value - Valor a formatear.
 * @param {string} [currency='USD'] - Código ISO 4217.
 * @returns {string}
 */
export const formatCurrency = (value: number | string, currency: string = 'USD'): string => {
  const numeric = typeof value === 'string' ? parseDecimal(value) : value;
  try {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return numeric.toFixed(2);
  }
};
