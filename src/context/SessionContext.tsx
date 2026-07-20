"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiPrivada } from '@/services/api';

/**
 * Define la estructura de los datos del perfil del tenant que se obtendrán de la API.
 */
export interface TenantProfile {
  nombre_empresa: string;
  tipo_negocio: 'retail' | 'b2b';
  onboarding_completado: boolean;
  schema_name: string;
}

interface SessionContextType {
  tenant: TenantProfile | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

/**
 * El Provider que envuelve las partes de la aplicación que necesitan acceso a los datos del tenant.
 * Se encarga de obtener y almacenar el perfil del tenant autenticado.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTenantProfile = async () => {
      try {
        const response = await apiPrivada.get<TenantProfile>('/tenants/profile/');
        setTenant(response.data);
      } catch (error) {
        console.error("Error al obtener el perfil del tenant:", error);
        setTenant(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenantProfile();
  }, []);

  return (
    <SessionContext.Provider value={{ tenant, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession debe ser usado dentro de un SessionProvider');
  }
  return context;
}