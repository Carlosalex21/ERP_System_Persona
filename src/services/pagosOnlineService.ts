/**
 * @file Servicio para la configuración de pagos en línea (Pago Móvil / Zelle)
 * que se muestran en el checkout del catálogo público, y las transacciones
 * de pasarela (comprobantes reportados por clientes) que el admin verifica.
 */
import { apiPrivada } from '@/services/api';
import {
  MetodoPagoConfig,
  MetodoPagoConfigRequest,
  PagoMovilConfigRequest,
  ZelleConfigRequest,
  StripeConfigRequest,
  TransaccionPasarela,
} from '@/types/api';

const BASE = '/pagos';

export const getMetodosPagoConfig = async (): Promise<MetodoPagoConfig[]> => {
  const response = await apiPrivada.get<MetodoPagoConfig[]>(`${BASE}/metodos-config/`);
  return response.data;
};

export const createMetodoPagoConfig = async (data: MetodoPagoConfigRequest): Promise<MetodoPagoConfig> => {
  const response = await apiPrivada.post<MetodoPagoConfig>(`${BASE}/metodos-config/`, data);
  return response.data;
};

export const updateMetodoPagoConfig = async (id: number, data: Partial<MetodoPagoConfigRequest>): Promise<MetodoPagoConfig> => {
  const response = await apiPrivada.patch<MetodoPagoConfig>(`${BASE}/metodos-config/${id}/`, data);
  return response.data;
};

export const deleteMetodoPagoConfig = async (id: number): Promise<void> => {
  await apiPrivada.delete(`${BASE}/metodos-config/${id}/`);
};

export const createPagoMovilConfig = async (data: PagoMovilConfigRequest) => {
  const response = await apiPrivada.post(`${BASE}/pagomovil-config/`, data);
  return response.data;
};

export const updatePagoMovilConfig = async (id: number, data: Partial<PagoMovilConfigRequest>) => {
  const response = await apiPrivada.patch(`${BASE}/pagomovil-config/${id}/`, data);
  return response.data;
};

export const createZelleConfig = async (data: ZelleConfigRequest) => {
  const response = await apiPrivada.post(`${BASE}/zelle-config/`, data);
  return response.data;
};

export const updateZelleConfig = async (id: number, data: Partial<ZelleConfigRequest>) => {
  const response = await apiPrivada.patch(`${BASE}/zelle-config/${id}/`, data);
  return response.data;
};

export const createStripeConfig = async (data: StripeConfigRequest) => {
  const response = await apiPrivada.post(`${BASE}/stripe-config/`, data);
  return response.data;
};

export const updateStripeConfig = async (id: number, data: Partial<StripeConfigRequest>) => {
  const response = await apiPrivada.patch(`${BASE}/stripe-config/${id}/`, data);
  return response.data;
};

/**
 * Transacciones de pasarela reportadas (comprobantes de Pago Móvil/Zelle),
 * opcionalmente filtradas por factura -- para mostrar la referencia junto
 * al pedido en el panel de Pedidos.
 */
export const getTransaccionesPasarela = async (facturaId?: number): Promise<TransaccionPasarela[]> => {
  const response = await apiPrivada.get<TransaccionPasarela[]>(`${BASE}/transacciones-pasarela/`, {
    params: facturaId ? { factura: facturaId } : undefined,
  });
  return response.data;
};

export const confirmarTransaccionPasarela = async (id: number): Promise<TransaccionPasarela> => {
  const response = await apiPrivada.patch<TransaccionPasarela>(`${BASE}/transacciones-pasarela/${id}/`, {
    estado: 'completado',
  });
  return response.data;
};
