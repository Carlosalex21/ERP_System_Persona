/**
 * @file Resuelve la URL de WebSocket del backend -- espejo exacto de
 * `resolveBaseURL` en `services/api.ts`, cambiando `http(s)` por `ws(s)`.
 * En producción (`NEXT_PUBLIC_API_SAME_ORIGIN=true`) el WS va al MISMO
 * origen que el frontend (nginx enruta `/ws/` al backend, ver
 * `deploy/nginx/erp-system.conf`); en dev local, al puerto 8000 del
 * subdominio del tenant, igual que las llamadas HTTP normales.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function getWebSocketUrl(path: string): string {
  if (typeof window === 'undefined') return '';
  const rutaConSlash = path.startsWith('/') ? path : `/${path}`;

  if (process.env.NEXT_PUBLIC_API_SAME_ORIGIN === 'true') {
    const protocolo = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocolo}//${window.location.host}${rutaConSlash}`;
  }

  const hostname = window.location.hostname;
  const tenant = hostname.split('.')[0];
  if (tenant && tenant !== 'www' && tenant !== 'localhost') {
    return `ws://${tenant}.localhost:8000${rutaConSlash}`;
  }

  return `${API_URL.replace(/^http/, 'ws')}${rutaConSlash}`;
}
