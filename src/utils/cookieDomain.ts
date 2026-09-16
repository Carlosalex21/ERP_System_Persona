/**
 * @file Dominio compartido para las cookies de sesión (`access_token`/
 * `refresh_token`) -- SOLO en producción.
 *
 * Se intentó compartir la cookie entre subdominios también en desarrollo
 * (`domain: '.localhost'`), pero Chrome RECHAZA por completo cualquier
 * cookie cuyo atributo `Domain` sea `localhost`/`.localhost` (no la degrada
 * a host-only, la descarta entera) -- eso rompía el login del panel del
 * tenant. Por eso aquí solo se comparte en el dominio real de producción
 * (`.erpsystem.com`), donde SÍ es un dominio registrable normal y el
 * navegador lo permite. En local, cada login sigue siendo host-only (cada
 * subdominio tiene su propia sesión) -- la forma correcta de ver el plan
 * desde el panel del tenant es `/admin/suscripcion` (mismo origen, sin
 * depender de compartir cookies), no cruzar al dominio raíz.
 */
export function getSharedCookieDomain(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const host = window.location.hostname;
  if (host === 'erpsystem.com' || host.endsWith('.erpsystem.com')) return '.erpsystem.com';
  return undefined;
}
