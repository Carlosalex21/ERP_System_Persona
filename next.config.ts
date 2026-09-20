import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empaqueta solo el server de Next.js + las dependencias que en verdad usa
  // en runtime (analizado desde el build) en `.next/standalone` -- sin esto,
  // la imagen Docker de producción tendría que copiar `node_modules`
  // completo (cientos de MB de paquetes que solo hacen falta en build time).
  output: 'standalone',

  // El backend ya manda `X-Frame-Options: DENY` para la API/admin de
  // Django (ver `settings.py`), pero eso no cubre las páginas de ESTE
  // frontend (el panel/POS que el usuario realmente ve) -- sin esto,
  // cualquier sitio podía incrustar el panel en un <iframe> y montar un
  // ataque de clickjacking sobre la sesión ya logueada del empleado.
  async headers() {
    // Origen de la landing (dominio raíz, sin subdominio de tenant) -- mismas
    // variables que ya usa `utils/tenantUrl.ts` del lado del cliente. Es el
    // ÚNICO origen al que se le permite incrustar la raíz del catálogo
    // público (ver excepción de abajo y `LiveCatalogWindow` en la landing).
    const protocolo = process.env.NEXT_PUBLIC_USE_HTTPS === 'true' ? 'https' : 'http';
    const dominioBase = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
    const origenLanding = `${protocolo}://${dominioBase}`;

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        ],
      },
      {
        // Excepción MUY acotada: la raíz del catálogo público (storefront)
        // de cualquier tenant puede incrustarse en un <iframe>, pero SOLO
        // desde nuestra propia landing -- nunca desde un sitio de terceros.
        // No toca `/admin` ni ninguna otra ruta, que siguen con
        // `frame-ancestors 'none'` de arriba (los navegadores usan la regla
        // más específica que matchee la ruta, no ambas a la vez).
        source: '/',
        headers: [
          { key: 'Content-Security-Policy', value: `frame-ancestors 'self' ${origenLanding}` },
        ],
      },
    ];
  },
};

export default nextConfig;
