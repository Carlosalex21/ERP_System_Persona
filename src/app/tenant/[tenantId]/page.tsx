import type { ReactElement } from 'react';
import { getCatalogoPublico, type PublicProducto } from '@/services/publicCatalogService';
import StorefrontClient from './StorefrontClient';

// ISR: la página se sirve pre-renderizada y se revalida cada 60s en vez de
// depender 100% de un fetch en el cliente (mejor SEO/TTFB por tenant, sin
// necesitar `generateStaticParams` -- los tenants se crean en runtime).
export const revalidate = 60;

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
