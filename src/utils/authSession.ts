/**
 * @file Único punto que lee/escribe/borra los tokens de sesión.
 *
 * Antes cada pantalla (login, demo, superadmin, inventario, dashboard, B2B,
 * suscripción vencida...) repetía su propio `Cookies.set/remove` con las
 * mismas opciones copiadas a mano. Centralizarlo aquí garantiza que todas
 * usen el mismo dominio/flags y que un cierre de sesión en una pestaña se
 * propague a las demás pestañas abiertas del mismo navegador.
 */
import Cookies from 'js-cookie';

import { cookieSecureFlag, getSharedCookieDomain } from '@/utils/cookieDomain';
import { limpiarCacheReferencia } from '@/utils/offlineDb';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

const CANAL_SESION = 'erp-sesion';

type MensajeSesion = { tipo: 'logout' };

export function getAccessToken(): string | undefined {
  return Cookies.get(ACCESS_COOKIE);
}

export function getRefreshToken(): string | undefined {
  return Cookies.get(REFRESH_COOKIE);
}

/** Guarda el par de tokens. `refresh` es opcional (un refresh sin rotación solo trae `access`). */
export function guardarSesion(access: string, refresh?: string | null): void {
  const opciones = { domain: getSharedCookieDomain(), secure: cookieSecureFlag(), sameSite: 'Lax' as const };
  Cookies.set(ACCESS_COOKIE, access, { ...opciones, expires: 1 });
  if (refresh) {
    Cookies.set(REFRESH_COOKIE, refresh, { ...opciones, expires: 7 });
  }
}

/** Borra solo los tokens (sin avisar a otras pestañas) -- ej. antes de un login nuevo. */
export function borrarTokens(): void {
  const domain = getSharedCookieDomain();
  Cookies.remove(ACCESS_COOKIE, { domain });
  Cookies.remove(REFRESH_COOKIE, { domain });
}

function canal(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  return new BroadcastChannel(CANAL_SESION);
}

/**
 * Cierre de sesión completo: tokens + caché offline con datos de clientes
 * (el POS suele ser un equipo compartido) + aviso a las demás pestañas.
 */
export function cerrarSesion(): void {
  borrarTokens();
  void limpiarCacheReferencia();
  const bc = canal();
  bc?.postMessage({ tipo: 'logout' } satisfies MensajeSesion);
  bc?.close();
}

/** Suscribe a cierres de sesión hechos en OTRA pestaña. Devuelve la función para desuscribirse. */
export function onLogoutEnOtraPestana(callback: () => void): () => void {
  const bc = canal();
  if (!bc) return () => undefined;
  bc.onmessage = (evento: MessageEvent<MensajeSesion>) => {
    if (evento.data?.tipo === 'logout') callback();
  };
  return () => bc.close();
}
