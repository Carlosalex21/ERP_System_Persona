/**
 * @file Suscripción a Web Push para el staff de restaurante -- avisa
 * "llaman al mesero"/"piden la cuenta" aunque la pestaña no esté enfocada
 * (ver `apps.restaurantes.push_notifications` en el backend y
 * `public/sw.js`, el service worker que muestra la notificación).
 */
import { registrarPushSubscription } from '@/services/restaurantesService';

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushDisponible(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Pide permiso (si hace falta), registra el service worker, se suscribe al
 * push del navegador y manda la suscripción al backend. Devuelve `false` sin
 * lanzar error si el navegador no soporta push o el usuario niega el
 * permiso -- es una mejora opcional, nunca debe romper la pantalla que la usa.
 */
export async function activarNotificacionesPush(): Promise<boolean> {
  if (!pushDisponible()) return false;
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return false;

  try {
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') return false;

    const registro = await navigator.serviceWorker.register('/sw.js');
    let suscripcion = await registro.pushManager.getSubscription();
    if (!suscripcion) {
      suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(vapidKey) as BufferSource,
      });
    }

    const json = suscripcion.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
    await registrarPushSubscription({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
    return true;
  } catch {
    return false;
  }
}

/** `true` si ya hay una suscripción activa en ESTE navegador (para no mostrar el botón de activar de nuevo). */
export async function tieneNotificacionesActivas(): Promise<boolean> {
  if (!pushDisponible()) return false;
  try {
    const registro = await navigator.serviceWorker.getRegistration();
    if (!registro) return false;
    const suscripcion = await registro.pushManager.getSubscription();
    return !!suscripcion;
  } catch {
    return false;
  }
}
