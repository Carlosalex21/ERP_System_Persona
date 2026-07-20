/**
 * @file Servicio para encapsular la lógica de API para el módulo de Facturación/POS.
 */
import { apiPrivada } from './api';
import { Factura, FacturaRequest, MetodoPago } from '@/types/api';

/**
 * Crea una nueva factura (cierra una venta).
 * @param {FacturaRequest} data - Los datos de la factura a crear.
 * @returns {Promise<Factura>}
 */
export const createFactura = async (data: FacturaRequest): Promise<Factura> => {
  const response = await apiPrivada.post<Factura>('/facturacion/lista/', data);
  return response.data;
};

/**
 * Obtiene la lista de métodos de pago activos.
 * @returns {Promise<MetodoPago[]>}
 */
export const getMetodosDePago = async (): Promise<MetodoPago[]> => {
  const response = await apiPrivada.get<MetodoPago[]>('/facturacion/metodos-pago/');
  return response.data;
};

/**
 * Procesa el pago de una factura, lo que finaliza la venta y ajusta el stock.
 * @param {number} facturaId - El ID de la factura a pagar.
 * @param {number} metodoPagoId - El ID del método de pago.
 * @returns {Promise<any>}
 */
export const registrarPago = async (facturaId: number, metodoPagoId: number, montoRecibido: string): Promise<any> => {
  const response = await apiPrivada.post('/facturacion/pago/', {
    factura_id: facturaId,
    metodo_pago: metodoPagoId,
    monto_recibido: montoRecibido,
  });
  return response.data;
};