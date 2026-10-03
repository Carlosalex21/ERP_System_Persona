/**
 * @file Página del Dashboard (wrapper).
 * Aplica `next/dynamic` con `ssr: false` para cargar la vista del dashboard
 * (gráficos/tablas) únicamente en el cliente. Condominios e inmobiliarias
 * tienen su propio tablero (cartera, morosidad, contratos).
 */
"use client";

import dynamic from 'next/dynamic';
import { use, type ReactElement } from 'react';

import { useSession } from '@/context/SessionContext';

// La vista del dashboard se importa dinámicamente y solo se hidrata en el cliente.
const DashboardView = dynamic(() => import('./dashboard/DashboardView'), { ssr: false });
const DashboardInmuebles = dynamic(() => import('./dashboard/DashboardInmuebles'), { ssr: false });

export default function AdminDashboardPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}): ReactElement {
  const { tenantId } = use(params);
  const { tenant, isLoading } = useSession();

  // Hasta conocer el tipo de negocio no se pinta ninguno (evita parpadear el tablero equivocado).
  if (isLoading && !tenant) return <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />;
  if (tenant?.tipo_negocio === 'condominios' || tenant?.tipo_negocio === 'inmobiliaria') {
    return <DashboardInmuebles tipo={tenant.tipo_negocio} />;
  }
  return <DashboardView tenantId={tenantId} />;
}
