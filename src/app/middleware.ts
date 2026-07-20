import { NextRequest, NextResponse } from 'next/server';

export const config = {
  // El matcher evita que el middleware se ejecute en rutas de API,
  // archivos estáticos de Next.js y archivos públicos.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

/**
 * Middleware para gestionar el enrutamiento multi-tenant basado en subdominios.
 * @param {NextRequest} req - La petición entrante.
 * @returns {NextResponse} La respuesta, que puede ser una reescritura de URL o la continuación de la cadena.
 */
export default function middleware(req: NextRequest): NextResponse {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || 'localhost:3000';

  // Define tu dominio principal para producción y desarrollo.
  // En desarrollo, trabajaremos con subdominios en localhost (ej: prueba.localhost:3000)
  const mainDomain = 'erpsystem.com'; // Reemplaza con tu dominio real en producción
  const devDomain = 'localhost:3000';

  // Extrae el tenantId del subdominio.
  const tenantId = hostname.replace(`.${devDomain}`, '').replace(`.${mainDomain}`, '');

  // Si el hostname es el dominio principal (sin subdominio), no hacemos nada.
  // Esto permite que las páginas públicas como /main/planes funcionen correctamente.
  if (hostname === devDomain || hostname === mainDomain || tenantId === 'www') {
    return NextResponse.next();
  }

  // Si hay un subdominio, reescribimos la URL internamente.
  // Ejemplo: una petición a `prueba.localhost:3000/admin/inventario`
  // se reescribe a `/tenant/prueba/admin/inventario` para que Next.js
  // encuentre el archivo correcto, pero el usuario sigue viendo la URL limpia.
  return NextResponse.rewrite(new URL(`/tenant/${tenantId}${url.pathname}`, req.url));
}