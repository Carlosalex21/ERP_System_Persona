/**
 * Construcción de URLs entre subdominios de tenant (login, tienda pública,
 * activación B2B, redirecciones post-pago, etc.).
 *
 * En desarrollo, cada tenant vive en `<subdominio>.localhost:3000` -- los
 * navegadores resuelven `*.localhost` solos, sin configurar nada. En
 * producción no hay ese DNS especial: el dominio base y si se usa HTTPS
 * vienen de `NEXT_PUBLIC_BASE_DOMAIN`/`NEXT_PUBLIC_USE_HTTPS` (ver `.env`),
 * para no hardcodear un dominio de ejemplo que nunca coincide con el real.
 */

const DEV_BASE_DOMAIN = 'localhost:3000';

export function getBaseDomain(): string {
  return process.env.NEXT_PUBLIC_BASE_DOMAIN || DEV_BASE_DOMAIN;
}

export function getProtocol(): 'http' | 'https' {
  return process.env.NEXT_PUBLIC_USE_HTTPS === 'true' ? 'https' : 'http';
}

/** URL completa (con protocolo) al subdominio de un tenant, con un path opcional (ej. '/login'). */
export function tenantUrl(subdominio: string, path = ''): string {
  return `${getProtocol()}://${subdominio}.${getBaseDomain()}${path}`;
}

/** URL completa al dominio principal (sin subdominio de tenant), con un path opcional. */
export function mainUrl(path = ''): string {
  return `${getProtocol()}://${getBaseDomain()}${path}`;
}

/**
 * Subdominio del tenant actual, leído del propio `window.location` -- para
 * armar un link (ej. la URL del QR de una mesa) sin depender de que el
 * componente reciba el subdominio por prop. `null` en el servidor (no hay
 * `window`) o si por alguna razón el host no calza con `getBaseDomain()`.
 */
export function getTenantSubdomain(): string | null {
  if (typeof window === 'undefined') return null;
  const base = getBaseDomain().split(':')[0];
  const host = window.location.hostname;
  if (!host.endsWith(`.${base}`)) return null;
  return host.slice(0, -(`.${base}`.length));
}
