/**
 * @file Servicio para el turno de caja del POS (apertura/cierre por
 * usuario) y el reporte de Cobros.
 */
import { apiPrivada } from '@/services/api';

export interface CajaSesionMonto {
  id: number;
  moneda: number;
  moneda_codigo: string;
  moneda_simbolo: string;
  monto_apertura: string;
  monto_cierre_esperado: string | null;
  monto_cierre_declarado: string | null;
  diferencia: string | null;
}

export interface CajaSesion {
  id: number;
  usuario: number;
  usuario_nombre: string;
  fecha_apertura: string;
  fecha_cierre: string | null;
  observaciones_cierre: string;
  activo: boolean;
  montos: CajaSesionMonto[];
}

/** Turno de caja abierto del usuario actual, o null si no tiene uno. */
export const getCajaActual = async (): Promise<CajaSesion | null> => {
  const response = await apiPrivada.get<CajaSesion | null>('/facturacion/caja/actual/');
  return response.data;
};

/** Abre un turno de caja. `montosApertura`: {moneda_id: monto}. */
export const abrirCaja = async (montosApertura: Record<number, string>): Promise<CajaSesion> => {
  const response = await apiPrivada.post<CajaSesion>('/facturacion/caja/abrir/', { montos_apertura: montosApertura });
  return response.data;
};

/** Cierra el turno abierto. `montosDeclarados`: {moneda_id: monto_contado}. */
export const cerrarCaja = async (montosDeclarados: Record<number, string>, observaciones?: string): Promise<CajaSesion> => {
  const response = await apiPrivada.post<CajaSesion>('/facturacion/caja/cerrar/', {
    montos_declarados: montosDeclarados,
    observaciones,
  });
  return response.data;
};

/** Historial de turnos de caja (todos los usuarios) -- para que un admin audite cierres anteriores. */
export const getHistorialCaja = async (): Promise<CajaSesion[]> => {
  const response = await apiPrivada.get<CajaSesion[]>('/facturacion/caja/historial/');
  return response.data;
};

export interface Cobro {
  id: number;
  factura: number | null;
  factura_correlativo: string | null;
  monto: string;
  monto_recibido: string | null;
  vuelto: string;
  metodo_pago: number | null;
  metodo_pago_nombre: string | null;
  banco_nombre: string | null;
  moneda_codigo: string | null;
  referencia: string | null;
  fecha: string | null;
  estado: string;
  cajero_nombre: string | null;
}

/** Reporte de Cobros (pagos registrados), opcionalmente filtrado. */
export const getCobros = async (filtros?: {
  fecha_desde?: string;
  fecha_hasta?: string;
  banco_id?: number;
  metodo_pago_id?: number;
}): Promise<Cobro[]> => {
  const response = await apiPrivada.get<Cobro[]>('/facturacion/cobros/', { params: filtros });
  return response.data;
};
