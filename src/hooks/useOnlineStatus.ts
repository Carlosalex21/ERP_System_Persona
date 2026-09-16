"use client";

import { useEffect, useState } from 'react';

/**
 * Estado de conexión del navegador (`navigator.onLine` + eventos
 * `online`/`offline`). No es 100% infalible (solo refleja si hay una
 * interfaz de red activa, no si internet realmente responde), pero es la
 * señal correcta para el caso que nos importa: wifi caído o sin datos.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const marcarOnline = () => setOnline(true);
    const marcarOffline = () => setOnline(false);
    window.addEventListener('online', marcarOnline);
    window.addEventListener('offline', marcarOffline);
    return () => {
      window.removeEventListener('online', marcarOnline);
      window.removeEventListener('offline', marcarOffline);
    };
  }, []);

  return online;
}
