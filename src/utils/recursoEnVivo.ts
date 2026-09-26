/**
 * @file Datos del servidor que varios componentes muestran a la vez y que
 * se refrescan solos (pedidos pendientes, alertas...).
 *
 * Antes cada componente tenía su propio `setInterval`: el sidebar y la
 * campana consultaban los pedidos pendientes por separado (el doble de
 * peticiones, y el aviso "¡Nuevo pedido!" salía dos veces), y todas las
 * pestañas abiertas seguían consultando aunque estuvieran en segundo plano.
 *
 * Un recurso en vivo hace UNA sola consulta por pestaña, compartida por
 * todos los que lo usan; se pausa mientras la pestaña está oculta, se
 * refresca al volver a ella y se detiene (y se reinicia) cuando ya nadie lo
 * usa -- por ejemplo, al cerrar sesión.
 */
import { useSyncExternalStore } from 'react';

export interface EstadoRecurso<T> {
  data: T | null;
  cargando: boolean;
}

export interface RecursoEnVivo<T> {
  subscribe: (callback: () => void) => () => void;
  getSnapshot: () => EstadoRecurso<T>;
  recargar: () => Promise<void>;
}

interface OpcionesRecurso<T> {
  intervaloMs: number;
  /** Se llama con cada dato nuevo y el anterior (ej. para avisar "llegó uno nuevo"). */
  alCambiar?: (nuevo: T, anterior: T | null) => void;
}

export function crearRecursoEnVivo<T>(fetcher: () => Promise<T>, { intervaloMs, alCambiar }: OpcionesRecurso<T>): RecursoEnVivo<T> {
  const inicial: EstadoRecurso<T> = { data: null, cargando: true };
  let estado = inicial;
  const suscriptores = new Set<() => void>();
  let temporizador: ReturnType<typeof setInterval> | null = null;
  let enVuelo: Promise<void> | null = null;
  let generacion = 0;

  const emitir = (): void => suscriptores.forEach((cb) => cb());

  const cargar = (): Promise<void> => {
    if (enVuelo) return enVuelo;
    const miGeneracion = generacion;
    enVuelo = fetcher()
      .then((data) => {
        if (miGeneracion !== generacion) return; // llegó después de un reinicio
        alCambiar?.(data, estado.data);
        estado = { data, cargando: false };
        emitir();
      })
      .catch(() => {
        // Silencioso: un fallo de red no debe interrumpir el panel.
        if (miGeneracion === generacion && estado.cargando) {
          estado = { ...estado, cargando: false };
          emitir();
        }
      })
      .finally(() => {
        enVuelo = null;
      });
    return enVuelo;
  };

  const visible = (): boolean => typeof document === 'undefined' || document.visibilityState === 'visible';
  const alCambiarVisibilidad = (): void => {
    if (visible()) void cargar();
  };

  const iniciar = (): void => {
    void cargar();
    temporizador = setInterval(() => {
      if (visible()) void cargar();
    }, intervaloMs);
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
  };

  const detener = (): void => {
    if (temporizador) clearInterval(temporizador);
    temporizador = null;
    document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    // Sin nadie mirando (ej. se cerró sesión): se descarta el estado para
    // no mostrarle datos del usuario anterior al siguiente.
    generacion += 1;
    estado = inicial;
  };

  return {
    subscribe(callback) {
      suscriptores.add(callback);
      if (suscriptores.size === 1) iniciar();
      return () => {
        suscriptores.delete(callback);
        if (suscriptores.size === 0) detener();
      };
    },
    getSnapshot: () => estado,
    recargar: cargar,
  };
}

const ESTADO_SERVIDOR: EstadoRecurso<never> = { data: null, cargando: true };

export function useRecursoEnVivo<T>(recurso: RecursoEnVivo<T>): EstadoRecurso<T> {
  return useSyncExternalStore(recurso.subscribe, recurso.getSnapshot, () => ESTADO_SERVIDOR);
}
