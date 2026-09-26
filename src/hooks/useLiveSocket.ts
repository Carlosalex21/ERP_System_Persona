"use client";

/**
 * @file Conexión WebSocket con reconexión automática -- para reemplazar el
 * polling de mesas/pedidos por push real (ver `apps.restaurantes.consumers`
 * en el backend).
 *
 * A propósito NO reemplaza el polling existente en cada pantalla que lo usa:
 * este hook es la vía RÁPIDA (push instantáneo), y el polling que ya tenía
 * cada componente queda como red de seguridad de baja frecuencia por si el
 * WebSocket no puede conectar (red que lo bloquea, navegador viejo, Redis
 * caído en el backend, etc.) -- así una función que ya funcionaba nunca
 * queda peor que antes, solo mejora cuando el WS está disponible.
 */
import { useEffect, useRef, useState } from 'react';
import { getWebSocketUrl } from '@/utils/websocket';

const REINTENTOS_DELAYS_MS = [1000, 2000, 4000, 8000, 15000];

interface UseLiveSocketOptions<T> {
  /** Ruta del WebSocket (ej. `/ws/restaurantes/mesas/`), o `null` para no conectar todavía. */
  path: string | null;
  onMessage: (data: T) => void;
}

/** `true` mientras hay una conexión de WebSocket viva -- para que la pantalla pueda, por ejemplo, bajar la frecuencia de su polling de respaldo. */
export function useLiveSocket<T = unknown>({ path, onMessage }: UseLiveSocketOptions<T>): boolean {
  const [conectado, setConectado] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!path) {
      setConectado(false);
      return;
    }

    let socket: WebSocket | null = null;
    let intentoReconexion = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cerradoPorLimpieza = false;

    const conectar = (): void => {
      const url = getWebSocketUrl(path);
      if (!url) return;
      socket = new WebSocket(url);

      socket.onopen = () => {
        intentoReconexion = 0;
        setConectado(true);
      };

      socket.onmessage = (evento) => {
        try {
          onMessageRef.current(JSON.parse(evento.data));
        } catch {
          // Mensaje no-JSON inesperado -- se ignora, el polling de respaldo cubre el hueco.
        }
      };

      socket.onclose = () => {
        setConectado(false);
        if (cerradoPorLimpieza) return;
        const delay = REINTENTOS_DELAYS_MS[Math.min(intentoReconexion, REINTENTOS_DELAYS_MS.length - 1)];
        intentoReconexion += 1;
        timeoutId = setTimeout(conectar, delay);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    conectar();

    return () => {
      cerradoPorLimpieza = true;
      if (timeoutId) clearTimeout(timeoutId);
      socket?.close();
    };
  }, [path]);

  return conectado;
}
