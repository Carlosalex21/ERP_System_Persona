/**
 * @file Envuelve una petición GET para que, si falla por falta de conexión,
 * devuelva el último dato bueno guardado en IndexedDB en vez de romper la
 * pantalla. El caché en memoria (`cachedGet`, TTL de 15s) no sirve para esto
 * porque no sobrevive un refresh ni un corte de red más largo que su TTL.
 */
import axios from 'axios';
import { guardarCache, leerCache } from './offlineDb';

/** True si el error es de conectividad (no llegó respuesta del servidor), no un error de datos/validación. */
export function esErrorDeRed(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  return axios.isAxiosError(error) && !error.response;
}

export async function conRespaldoOffline<T>(clave: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const datos = await fetcher();
    void guardarCache(clave, datos);
    return datos;
  } catch (error) {
    if (esErrorDeRed(error)) {
      const datosCache = await leerCache<T>(clave);
      if (datosCache !== null) return datosCache;
    }
    throw error;
  }
}
