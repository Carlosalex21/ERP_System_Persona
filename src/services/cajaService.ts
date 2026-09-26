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

export interface MovimientoPreview {
  id: number;
  fecha: string;
  monto: string;
  referencia: string | null;
  factura_correlativo: string | null;
}

export interface PrevisualizacionCierreMoneda {
  moneda_id: number;
  moneda_codigo: string;
  moneda_simbolo: string | null;
  monto_apertura: string;
  total_ventas_efectivo: string;
  monto_cierre_esperado: string;
  movimientos: MovimientoPreview[];
}

export interface PrevisualizacionCierre {
  sesion_id: number;
  fecha_apertura: string;
  monedas: PrevisualizacionCierreMoneda[];
}

/**
 * Calcula el cuadre del turno abierto SIN cerrarlo -- el detalle (qué
 * ventas en efectivo componen cada total) que justifica la cifra antes de
 * confirmar el cierre.
 */
export const previsualizarCierreCaja = async (): Promise<PrevisualizacionCierre> => {
  const response = await apiPrivada.get<PrevisualizacionCierre>('/facturacion/caja/cierre-preview/');
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

export interface MovimientoCaja {
  id: number;
  tipo: 'ingreso' | 'egreso';
  caja_sesion: number | null;
  banco: number | null;
  banco_nombre: string | null;
  moneda: number;
  moneda_codigo: string;
  moneda_simbolo: string | null;
  monto: string;
  concepto: string;
  usuario: number;
  usuario_nombre: string;
  fecha: string;
}

export interface MovimientoCajaRequest {
  tipo: 'ingreso' | 'egreso';
  moneda: number;
  monto: string;
  concepto: string;
  banco?: number | null;
  caja_sesion?: number | null;
}

/** Registra un ingreso/egreso manual de caja (ej. "llevé el efectivo contado al banco"). */
export const crearMovimientoCaja = async (data: MovimientoCajaRequest): Promise<MovimientoCaja> => {
  const response = await apiPrivada.post<MovimientoCaja>('/facturacion/movimientos-caja/', data);
  return response.data;
};

/** Histórico de movimientos manuales de caja (solo admin). */
export const getMovimientosCaja = async (filtros?: { fecha_desde?: string; fecha_hasta?: string }): Promise<MovimientoCaja[]> => {
  const response = await apiPrivada.get<MovimientoCaja[]>('/facturacion/movimientos-caja/', { params: filtros });
  return response.data;
};

export interface ReporteDiaCajaBancos {
  fecha: string;
  cobros: Cobro[];
  movimientos: MovimientoCaja[];
  total_cobros: string;
  total_ingresos: string;
  total_egresos: string;
  saldo_neto: string;
}

/**
 * Reporte de caja y bancos agrupado por día: cobros + movimientos
 * manuales en una sola línea de tiempo, con el saldo neto de cada día.
 */
export const getReporteCajaBancos = async (filtros?: { fecha_desde?: string; fecha_hasta?: string }): Promise<ReporteDiaCajaBancos[]> => {
  const response = await apiPrivada.get<ReporteDiaCajaBancos[]>('/facturacion/reporte-caja-bancos/', { params: filtros });
  return response.data;
};
