import type { MetadataRoute } from 'next';

/**
 * Manifest de la PWA -- Next.js lo sirve en `/manifest.webmanifest` en la
 * RAÍZ del dominio (el middleware excluye rutas con punto, ver
 * `src/middleware.ts`), así que es el mismo manifest para todos los
 * subdominios de tenant. `start_url` e `icons` son relativos a propósito:
 * el navegador los resuelve contra el origen desde el que se instaló (el
 * subdominio del tenant), así que cada negocio termina abriendo SU panel
 * (`/admin`) al tocar el ícono, aunque el nombre/branding del manifest sea
 * genérico -- personalizar nombre/ícono por tenant queda para más adelante
 * (necesitaría un endpoint público de marca del tenant).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ERPSystem — Panel de Gestión',
    short_name: 'ERPSystem',
    description: 'Inventario, ventas, facturación, nómina y más -- gestiona tu negocio desde el teléfono.',
    start_url: '/admin',
    scope: '/',
    display: 'standalone',
    background_color: '#0d1745',
    theme_color: '#1f40c9',
    orientation: 'portrait-primary',
    lang: 'es',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
