/**
 * @file Página del Dashboard (wrapper).
 * Aplica `next/dynamic` con `ssr: false` para cargar la vista del dashboard
 * (gráficos/tablas) únicamente en el cliente.
 */
"use client";

import dynamic from 'next/dynamic';
import { use, type ReactElement } from 'react';

// La vista del dashboard se importa dinámicamente y solo se hidrata en el cliente.
const DashboardView = dynamic(() => import('./dashboard/DashboardView'), { ssr: false });

export default function AdminDashboardPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}): ReactElement {
  const { tenantId } = use(params);

  return <DashboardView tenantId={tenantId} />;
}
