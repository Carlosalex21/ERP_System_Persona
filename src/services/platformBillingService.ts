/**
 * @file Cobro de suscripciones SaaS: el dueño de un tenant le paga A LA
 * PLATAFORMA (no al revés). Venezuela paga manual (Pago Móvil/Zelle,
 * confirmado a mano por el superadmin); el resto de países paga con Stripe
 * Checkout contra la cuenta de Stripe de la propia plataforma.
 *
 * No confundir con `pagosOnlineService.ts`, que es la pasarela que cada
 * tenant configura para cobrarle a SUS PROPIOS clientes finales.
 */
import { apiPublica, apiPrivada, apiRequest } from '@/services/api';
import {
  Plan,
  MiCliente,
  PlatformPaymentInfo,
  PlatformPaymentConfig,
  PlatformPaymentConfigRequest,
  CrearPagoSuscripcionRequest,
  CrearPagoSuscripcionResponse,
  SubscriptionPayment,
  PlatformSettings,
  PlatformSettingsRequest,
  PeriodoSuscripcionInfo,
} from '@/types/api';

/** Lista pública de planes activos (sin autenticación). */
export const getPlanesPublicos = async (): Promise<Plan[]> => {
  const response = await apiPublica.get<Plan[]>('/tenants/plans/');
  return response.data;
};

/** El `Client` (tenant) del usuario autenticado. */
export const getMiCliente = async (): Promise<MiCliente> => {
  const response = await apiPrivada.get<MiCliente>('/tenants/mi-cliente/');
  return response.data;
};

/** Períodos de facturación disponibles (mensual/trimestral/anual) con su descuento real. */
export const getPeriodosSuscripcion = async (): Promise<PeriodoSuscripcionInfo[]> => {
  const response = await apiPublica.get<PeriodoSuscripcionInfo[]>('/tenants/periodos-suscripcion/');
  return response.data;
};

/** Datos públicos de cobro de la plataforma (Pago Móvil/Zelle/Stripe pk). */
export const getPlatformPaymentInfo = async (): Promise<PlatformPaymentInfo> => {
  const response = await apiPublica.get<PlatformPaymentInfo>('/tenants/payment-info/');
  return response.data;
};

/**
 * Tasa oficial BCV del día (Bs. por USD), para mostrar el equivalente en
 * bolívares del monto de la suscripción -- Pago Móvil solo admite
 * bolívares y antes el tenant tenía que calcularlo por su cuenta.
 * `tasa` es `null` si la fuente externa (dolarapi.com) no respondió.
 */
export const getTasaBcvPlataforma = async (): Promise<{ tasa: string | null }> => {
  const response = await apiPublica.get<{ tasa: string | null }>('/tenants/tasa-bcv/');
  return response.data;
};

/** Inicia el pago de una suscripción. Si es Stripe, devuelve `checkout_url` para redirigir. */
export const crearPagoSuscripcion = async (
  data: CrearPagoSuscripcionRequest,
): Promise<CrearPagoSuscripcionResponse> => {
  const response = await apiPrivada.post<CrearPagoSuscripcionResponse>('/tenants/pagos-suscripcion/', data);
  return response.data;
};

/**
 * Igual que `crearPagoSuscripcion`, pero para llamarse DESDE el propio panel
 * del tenant (autenticado como empleado/admin del tenant, no como el dueño
 * en el esquema público) -- no lleva `client_id`, el backend usa
 * `request.tenant` directamente. Ver `/admin/suscripcion`.
 */
export const crearPagoSuscripcionDesdeAdmin = async (
  data: Omit<CrearPagoSuscripcionRequest, 'client_id'>,
): Promise<CrearPagoSuscripcionResponse> => {
  const response = await apiPrivada.post<CrearPagoSuscripcionResponse>('/tenants/pagos-suscripcion-admin/', data);
  return response.data;
};

// ---------------------------------------------------------------------------
// Superadmin: configuración de cobro de la plataforma y confirmación manual
// de pagos de suscripción pendientes (Pago Móvil/Zelle).
// ---------------------------------------------------------------------------

export const getPlatformPaymentConfig = async (): Promise<PlatformPaymentConfig> => {
  const response = await apiPrivada.get<PlatformPaymentConfig>('/tenants/payment-config/');
  return response.data;
};

export const updatePlatformPaymentConfig = async (
  data: PlatformPaymentConfigRequest,
): Promise<PlatformPaymentConfig> => {
  const response = await apiPrivada.patch<PlatformPaymentConfig>('/tenants/payment-config/', data);
  return response.data;
};

export const getSubscriptionPayments = async (estado?: string): Promise<SubscriptionPayment[]> => {
  const result = await apiRequest<SubscriptionPayment[]>({
    url: '/tenants/subscription-payments/',
    method: 'GET',
    params: estado ? { estado } : undefined,
  });
  return result.data;
};

export const confirmarPagoSuscripcion = async (id: number): Promise<SubscriptionPayment> => {
  const response = await apiPrivada.post<SubscriptionPayment>(`/tenants/subscription-payments/${id}/confirmar/`);
  return response.data;
};

export const rechazarPagoSuscripcion = async (id: number, motivo?: string): Promise<SubscriptionPayment> => {
  const response = await apiPrivada.post<SubscriptionPayment>(`/tenants/subscription-payments/${id}/rechazar/`, {
    motivo: motivo || '',
  });
  return response.data;
};

// --- Configuración global de la plataforma (cupo de registros gratis, días de gracia) ---

export const getPlatformSettings = async (): Promise<PlatformSettings> => {
  const response = await apiPrivada.get<PlatformSettings>('/tenants/settings/');
  return response.data;
};

export const updatePlatformSettings = async (data: PlatformSettingsRequest): Promise<PlatformSettings> => {
  const response = await apiPrivada.patch<PlatformSettings>('/tenants/settings/', data);
  return response.data;
};
