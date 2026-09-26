"use client";

import { useEffect } from 'react';

/**
 * Registra `/sw.js` apenas carga cualquier página del sitio -- separado a
 * propósito de `activarNotificacionesPush` (que además pide permiso y
 * suscribe al Push): esto NO pide ningún permiso, solo habilita el cacheo
 * del app shell y es requisito para que Chrome/Edge ofrezcan el prompt de
 * "Instalar app" (`beforeinstallprompt` no dispara sin un service worker
 * activo). No renderiza nada.
 */
export default function ServiceWorkerRegister(): null {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Sin service worker el sitio sigue funcionando igual, solo sin
      // instalación/cache -- nunca debe interrumpir la carga de la página.
    });
  }, []);

  return null;
}
