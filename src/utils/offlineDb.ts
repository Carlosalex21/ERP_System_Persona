/**
 * @file Almacenamiento local (IndexedDB) para el modo offline del POS.
 *
 * Dos usos distintos, dos "object stores":
 *  - `cache_referencia`: snapshot de los datos maestros que el POS necesita
 *    para seguir funcionando sin red (productos, clientes, monedas, tasas,
 *    métodos de pago). Es de solo-lectura desde la perspectiva del POS: se
 *    sobrescribe cada vez que una petición online tiene éxito.
 *  - `cola_ventas`: la cola real de ventas hechas sin conexión, pendientes
 *    de sincronizar con el backend. Cada entrada tiene su propio id
 *    (generado en el cliente) y un estado.
 *
 * No se usa ninguna librería (`idb`, etc.) -- son pocas operaciones simples
 * y mantenerlo sin dependencias evita otra pieza que pueda romperse con
 * actualizaciones de Next/React.
 */

const DB_NAME = 'erp_pos_offline';
const DB_VERSION = 1;
const STORE_CACHE = 'cache_referencia';
const STORE_COLA = 'cola_ventas';

let dbPromise: Promise<IDBDatabase> | null = null;

function abrirDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB no disponible en este entorno.'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_CACHE)) {
          db.createObjectStore(STORE_CACHE);
        }
        if (!db.objectStoreNames.contains(STORE_COLA)) {
          db.createObjectStore(STORE_COLA, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

function conStore<T>(
  storeName: string,
  modo: IDBTransactionMode,
  accion: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return abrirDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, modo);
        const store = tx.objectStore(storeName);
        const req = accion(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

// --- Cache de datos de referencia (productos, clientes, monedas, etc.) ---

export async function guardarCache<T>(clave: string, valor: T): Promise<void> {
  try {
    await conStore(STORE_CACHE, 'readwrite', (store) => store.put(valor, clave));
  } catch {
    // El guardado en caché es un "nice to have" -- si IndexedDB falla (modo
    // privado, cuota llena, etc.) no debe romper el flujo online normal.
  }
}

export async function leerCache<T>(clave: string): Promise<T | null> {
  try {
    const valor = await conStore<T | undefined>(STORE_CACHE, 'readonly', (store) => store.get(clave));
    return valor ?? null;
  } catch {
    return null;
  }
}

/**
 * Borra el caché de datos de referencia (clientes, precios, etc.) -- se
 * llama al cerrar sesión. Un POS es normalmente un terminal COMPARTIDO
 * entre varios cajeros por turno (ver `cajaService`: el turno de caja es
 * por usuario, no por terminal); sin esto, el nombre/teléfono/dirección de
 * cada cliente y toda la lista de precios quedaban en IndexedDB sin
 * límite de tiempo, legibles por el siguiente cajero que use el mismo
 * navegador. NO toca `cola_ventas` a propósito: una venta hecha sin
 * conexión debe sobrevivir el cierre de sesión hasta que de verdad se
 * sincronice con el backend, la haya hecho el cajero que cierra sesión o
 * el que entra después.
 */
export async function limpiarCacheReferencia(): Promise<void> {
  try {
    await conStore(STORE_CACHE, 'readwrite', (store) => store.clear());
  } catch {
    // Igual que el resto de este archivo: si IndexedDB falla, no debe
    // romper el flujo de logout.
  }
}

// --- Cola de ventas pendientes de sincronizar ---

export type EstadoSyncVenta = 'pendiente' | 'sincronizando' | 'error';

export interface VentaPendiente {
  id: string;
  creadaEn: string;
  facturaPayload: unknown;
  /** Una o más líneas de pago (pago dividido entre métodos), ver `PagoRequestLinea`. */
  pagos: { metodo_pago_id: number; monto: string; monto_recibido?: string; referencia?: string }[];
  monedaCodigo: string;
  total: string;
  estadoSync: EstadoSyncVenta;
  /** Se llena tras crear la factura remota -- evita duplicarla si un reintento falla justo después, en el paso de registrar el pago. */
  facturaIdRemota?: number;
  errorMensaje?: string;
}

export async function encolarVenta(venta: VentaPendiente): Promise<void> {
  await conStore(STORE_COLA, 'readwrite', (store) => store.put(venta));
}

export async function listarVentasPendientes(): Promise<VentaPendiente[]> {
  try {
    return await conStore<VentaPendiente[]>(STORE_COLA, 'readonly', (store) => store.getAll());
  } catch {
    return [];
  }
}

export async function actualizarVentaPendiente(id: string, cambios: Partial<VentaPendiente>): Promise<void> {
  const db = await abrirDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_COLA, 'readwrite');
    const store = tx.objectStore(STORE_COLA);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const actual = getReq.result as VentaPendiente | undefined;
      if (!actual) { resolve(); return; }
      const putReq = store.put({ ...actual, ...cambios });
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function eliminarVentaPendiente(id: string): Promise<void> {
  await conStore(STORE_COLA, 'readwrite', (store) => store.delete(id));
}
