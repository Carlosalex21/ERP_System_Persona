"use client";

import { useSession } from '@/context/SessionContext';

/**
 * Hook para obtener la información del tenant actual desde el contexto de sesión.
 * Este hook reemplaza la versión simulada anterior.
 * @returns {{ tenant: TenantProfile | null, isLoading: boolean }}
 */
export function useTenant() {
  const { tenant, isLoading } = useSession();
  return { tenant, isLoading };
}