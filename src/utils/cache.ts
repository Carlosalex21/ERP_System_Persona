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

  const data = await fetcher();
  store.set(key, { data, expiresAt: now + ttlMs });
  return data;
}

/**
 * Invalida todas las claves que comiencen con un prefijo (o una clave exacta).
 * Debe llamarse tras cualquier mutación para forzar el refetch.
 * @param prefix - Prefijo o clave exacta a invalidar.
 */
export function invalidateCache(prefix: string): void {
  for (const key of Array.from(store.keys())) {
    if (key === prefix || key.startsWith(`${prefix}:`)) {
      store.delete(key);
    }
  }
}

/**
 * Limpia toda la caché. Útil al cerrar sesión o cambiar de tenant.
 */
export function clearCache(): void {
  store.clear();
}
