/**
 * @file Perfil del tenant actual (`/tenants/profile/`). Por ahora solo se usa
 * para marcar el tutorial de bienvenida como completado -- el resto del
 * perfil se lee directamente en `SessionContext`.
 */
import { apiPrivada } from '@/services/api';

/** Marca el onboarding del tenant como completado (no vuelve a mostrarse el tour). */
export const marcarOnboardingCompletado = async (): Promise<{ onboarding_completado: boolean }> => {
  const response = await apiPrivada.patch<{ onboarding_completado: boolean }>('/tenants/profile/', {
    onboarding_completado: true,
  });
  return response.data;
};
