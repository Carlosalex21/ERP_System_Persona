"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { apiPrivada } from '@/services/api';
import { getUsuarioActual, type UsuarioActual } from '@/services/authService';
import type { TipoNegocio } from '@/utils/modulosPanel';

/**
 * Define la estructura de los datos del perfil del tenant que se obtendrán de la API.
 */
export interface TenantSubscriptionStatus {
  plan_id: number | null;
  plan_nombre: string | null;
  plan_slug: string | null;
  plan_precio: string | null;
  estado: string | null;
  fecha_fin: string | null;
  is_active: boolean;
  dias_restantes: number | null;
  es_prueba: boolean;
  /** Módulos que incluye el plan contratado (`Plan.modulos`); `null` = todos. */
  modulos_plan: string[] | null;
}

export interface TenantProfile {
  nombre_empresa: string;
  tipo_negocio: TipoNegocio;
  onboarding_completado: boolean;
  schema_name: string;
  /** País de operación (VE/CO/PE) -- determina moneda base e IVA/IGV. */
  pais_codigo: 'VE' | 'CO' | 'PE';
  subscription_status: TenantSubscriptionStatus;
}

interface SessionContextType {
  tenant: TenantProfile | null;
  /** Perfil del empleado logueado (rol, módulos ocultos) -- null mientras carga o si falló. */
  usuario: UsuarioActual | null;
  isLoading: boolean;
  /**
   * true cuando, tras terminar de cargar, no se pudo obtener el perfil del
   * tenant (token vencido y sin refresh válido, o el backend simplemente no
   * respondió). Antes esto se tragaba en silencio (`setTenant(null)` y ya) y
   * el layout seguía renderizando el panel con `tenant=null` -- cada
   * petición de cada página hija fallaba a su vez sin que nada redirigiera
   * al login, dejando al usuario atascado hasta que cerraba sesión a mano.
   */
  authError: boolean;
  /** Re-consulta el perfil del tenant (ej. tras marcar el onboarding como completado). */
  refetchTenant: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

/**
 * El Provider que envuelve las partes de la aplicación que necesitan acceso a los datos del tenant.
 * Se encarga de obtener y almacenar el perfil del tenant autenticado.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantProfile | null>(null);
  const [usuario, setUsuario] = useState<UsuarioActual | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  // Aparte del perfil del tenant (abajo): quién es el empleado logueado y
  // qué módulos debe ver según su rol (ver `Sidebar.tsx`/`admin/layout.tsx`).
  // Se degrada a "sin ocultar nada" si falla -- esto es solo la UI del
  // menú; los permisos reales de cada acción los sigue exigiendo el
  // backend (`apps.core.permissions`), así que un fallo aquí no abre
  // ningún hueco de seguridad, solo muestra de más.
  useEffect(() => {
    getUsuarioActual().then(setUsuario).catch(() => setUsuario(null));
  }, []);

  const fetchTenantProfile = useCallback(async () => {
    setIsLoading(true);
    // Un solo reintento corto: si el backend acaba de reiniciarse (ej. el
    // usuario tumbó el servidor local y lo volvió a levantar), la primera
    // petición puede rebotar con un error de red aunque el token siga
    // siendo válido -- sin este reintento, ese blip transitorio se
    // interpretaba igual que una sesión muerta.
    const intentos = 2;
    for (let intento = 0; intento < intentos; intento++) {
      try {
        const response = await apiPrivada.get<TenantProfile>('/tenants/profile/');
        setTenant(response.data);
        setAuthError(false);
        setIsLoading(false);
        return;
      } catch (error) {
        if (intento < intentos - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          continue;
        }
        console.error("Error al obtener el perfil del tenant:", error);
        setTenant(null);
        setAuthError(true);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchTenantProfile();
  }, [fetchTenantProfile]);

  return (
    <SessionContext.Provider value={{ tenant, usuario, isLoading, authError, refetchTenant: fetchTenantProfile }}>
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