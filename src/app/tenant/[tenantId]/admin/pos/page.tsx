/**
 * @file Página del Punto de Venta (POS).
 * Wrapper ligero que aplica `next/dynamic` con `ssr: false` para cargar el
 * contenedor principal del POS únicamente en el cliente (lazy loading).
 */
"use client";

import dynamic from 'next/dynamic';
import { use, type ReactElement } from 'react';

// El contenedor del POS se importa dinámicamente y solo se hidrata en el cliente.
const PosView = dynamic(() => import('./PosView'), { ssr: false });

/**
 * Página de POS. Resuelve el `tenantId` y renderiza la vista dinámica.
 * @returns {ReactElement} El componente de la página POS.
 */
export default function PosPage({ params }: { params: Promise<{ tenantId: string }> }): ReactElement {
  const { tenantId } = use(params);

  return <PosView tenantId={tenantId} />;
}
