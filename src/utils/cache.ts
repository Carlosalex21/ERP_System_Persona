/**
 * @file Caché en memoria con TTL para peticiones GET.
 * El sistema se sentía lento porque cada página refetcheaba todos los datos
 * al montar sin caché. Con esta utilidad, las respuestas GET de listas se
 * cachean por unos segundos, y se invalidan al hacer mutaciones (POST/PUT/PATCH/DELETE).
 *
 * Uso:
 *   const productos = await cachedGet('productos', getProductos, 15_000);
 *   invalidateCache('productos'); // tras crear/editar/eliminar
 */
"use client";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
/**
 * Peticiones en vuelo por clave: si dos componentes piden lo mismo a la vez
 * (ej. el layout y la página montando juntos), comparten UNA sola petición
 * en vez de duplicarla contra el backend.
 */
const enVuelo = new Map<string, Promise<unknown>>();

/**
 * Devuelve un valor cacheado o ejecuta el fetcher y guarda el resultado.
 * @param key - Clave única (p. ej. 'productos', 'monedas', 'categorias').
 * @param fetcher - Función que obtiene los datos si no están en caché.
 * @param ttlMs - Tiempo de vida en milisegundos (por defecto 15s).
 */
export async function cachedGet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 15_000,
): Promise<T> {
  const now = Date.now();
  const entry = store.get(key);

  if (entry && entry.expiresAt > now) {
    return entry.data as T;
  }

  const pendiente = enVuelo.get(key);
  if (pendiente) return pendiente as Promise<T>;

  const promesa = fetcher()
    .then((data) => {
      store.set(key, { data, expiresAt: Date.now() + ttlMs });
      return data;
    })
    .finally(() => enVuelo.delete(key));
  enVuelo.set(key, promesa);
  return promesa;
}

/** Último valor cacheado (aunque haya expirado) -- para pintar algo al instante mientras se revalida. */
export function peekCache<T>(key: string): T | undefined {
  return store.get(key)?.data as T | undefined;
}

/**
 * Invalida todas las claves que comiencen con un prefijo (o una clave exacta).
 * Debe llamarse tras cualquier mutación para forzar el refetch.
 * @param prefix - Prefijo o clave exacta a invalidar.
 */
export function invalidateCache(prefix: string): void {
  for (const mapa of [store, enVuelo]) {
    for (const key of Array.from(mapa.keys())) {
      if (key === prefix || key.startsWith(`${prefix}:`)) {
        mapa.delete(key);
      }
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<string>(EVENTO_CACHE_INVALIDADA, { detail: prefix }));
  }
}

/** Se emite tras cada `invalidateCache` (detail = prefijo) -- para que un contexto global recargue lo suyo. */
export const EVENTO_CACHE_INVALIDADA = 'erp:cache-invalidada';

/**
 * Limpia toda la caché. Útil al cerrar sesión o cambiar de tenant.
 */
export function clearCache(): void {
  store.clear();
  enVuelo.clear();
}
