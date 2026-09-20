import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Dominio base (sin subdominio de tenant) -- en desarrollo es
// 'localhost:3000' (los navegadores resuelven `*.localhost` solos); en
// producción viene de `NEXT_PUBLIC_BASE_DOMAIN` (ver `.env` y
// `utils/tenantUrl.ts`, que usa la misma variable del lado del cliente).
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  const currentHost = hostname.replace(`.${BASE_DOMAIN}`, '');

  // Si están en el dominio principal (sin subdominio de tenant)
  if (currentHost === BASE_DOMAIN || currentHost === 'www') {
    return NextResponse.rewrite(new URL(`/main${url.pathname}`, req.url));
  }

  // Si están en un subdominio de un cliente (ej. ferreteria.midominio.com)
  return NextResponse.rewrite(new URL(`/tenant/${currentHost}${url.pathname}`, req.url));
}

export const config = {
  matcher: [
    /*
     * Ignora las rutas de la API, archivos estáticos y Next.js internos
     * para que el middleware no consuma recursos innecesarios. Antes solo
     * excluía `favicon.ico` a mano -- cualquier OTRO archivo servido tal
     * cual desde `public/` (ej. `/marketing/demo-panel-real.gif`) no
     * matcheaba ninguna página real tras el rewrite a `/main/...` o
     * `/tenant/<host>/...`, así que Next lo resolvía como 404 en vez de
     * servir el archivo. `.*\\..*` excluye cualquier ruta con una
     * extensión (un archivo), ya que ninguna página de la app tiene punto
     * en su path.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};