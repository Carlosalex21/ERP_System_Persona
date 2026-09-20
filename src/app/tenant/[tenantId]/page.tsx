import type { ReactElement } from 'react';
import { getCatalogoPublico, type PublicProducto } from '@/services/publicCatalogService';
import StorefrontClient from './StorefrontClient';

// NO usar ISR (`revalidate`) acá: la revalidación en segundo plano de
// Next.js pierde el Host/dominio original de la petición que generó cada
// versión cacheada -- la re-ejecuta internamente contra su propia dirección
// (`127.0.0.1:3000`), que el middleware multi-tenant (`src/middleware.ts`)
// entonces trata como un tenant literal "127.0.0.1:3000". El fetch del
// catálogo con ESE "subdominio" siempre falla, y el catálogo del tenant
// real queda mostrando 0 productos hasta la siguiente visita que dispare un
// render fresco -- esto es justo el bug reportado ("agregué productos y no
// aparecen"). `force-dynamic` renderiza en cada petición (con el Host real
// de esa petición), sin ese riesgo -- sigue siendo SSR para SEO/TTFB, solo
// que sin la capa de caché entre peticiones.
export const dynamic = 'force-dynamic';

export default async function TiendaPublica({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}): Promise<ReactElement> {
  const { tenantId } = await params;
  const subdominio = tenantId ?? '';

  let productosIniciales: PublicProducto[] = [];
  try {
    const data = await getCatalogoPublico(subdominio);
    productosIniciales = (data.results || []).filter(p => parseFloat(p.precio_venta) > 0);
  } catch (err) {
    // Se degrada a catálogo vacío: StorefrontClient reintenta desde el cliente.
    console.error('Error precargando catálogo público en el servidor:', err);
  }

  return <StorefrontClient subdominio={subdominio} productosIniciales={productosIniciales} />;
}
