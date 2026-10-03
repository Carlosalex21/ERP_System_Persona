import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { notFound } from 'next/navigation';

import { getPropiedadPublica, type PropiedadPublica } from '@/services/inmueblesPublicService';
import { getEmpresaInfoPublico, type PublicEmpresaInfo } from '@/services/publicCatalogService';
import DetallePropiedad from './DetallePropiedad';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ tenantId: string; id: string }> };

async function cargar(tenantId: string, id: string): Promise<PropiedadPublica | null> {
  if (!/^\d+$/.test(id)) return null;
  try {
    return await getPropiedadPublica(tenantId, id);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tenantId, id } = await params;
  const p = await cargar(tenantId, id);
  if (!p) return { title: 'Propiedad no disponible' };
  return { title: p.titulo_visible, description: p.descripcion.slice(0, 160) || undefined, openGraph: p.portada_url ? { images: [p.portada_url] } : undefined };
}

export default async function PropiedadPage({ params }: Params): Promise<ReactElement> {
  const { tenantId, id } = await params;
  const propiedad = await cargar(tenantId, id);
  if (!propiedad) notFound();
  let empresa: PublicEmpresaInfo | null = null;
  try { empresa = await getEmpresaInfoPublico(tenantId); } catch { /* el detalle funciona sin la info de contacto */ }
  return <DetallePropiedad subdominio={tenantId} propiedad={propiedad} empresa={empresa} />;
}
