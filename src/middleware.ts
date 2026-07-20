import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  // En tu computadora será 'localhost:3000'. En producción será 'erpsystem.com'
  const currentHost =
    process.env.NODE_ENV === 'production' && process.env.VERCEL === '1'
      ? hostname.replace(`.erpsystem.com`, '')
      : hostname.replace(`.localhost:3000`, '');

  // Si están en el dominio principal
  if (currentHost === 'erpsystem.com' || currentHost === 'www' || currentHost === 'localhost:3000') {
    return NextResponse.rewrite(new URL(`/main${url.pathname}`, req.url));
  }

  // Si están en un subdominio de un cliente (ej. ferreteria.erpsystem.com)
  return NextResponse.rewrite(new URL(`/tenant/${currentHost}${url.pathname}`, req.url));
}

export const config = {
  matcher: [
    /*
     * Ignora las rutas de la API, archivos estáticos y Next.js internos
     * para que el middleware no consuma recursos innecesarios.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};