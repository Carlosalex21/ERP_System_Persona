/**
 * @file Servicio para encapsular la lógica de API del módulo de Reportes (Dashboard).
 */
import { apiPrivada } from '@/services/api';

/**
 * Forma exacta que devuelve `apps.reportes.core.dashboard_service.
 * obtener_metricas_dashboard` -- antes esto era un tipo "flexible" con
 * `[key: string]: unknown` y el consumidor adivinaba nombres de campo que
 * nunca coincidían con los reales, dejando el dashboard siempre en 0.
 */
export interface DashboardReporte {
  userInfo: { nombre: string };
  resumen: {
    total_vendido: string | number;
    total_pagado: string | number;
    total_pendiente: string | number;
    num_transacciones: number;
    /** % de variación de `total_vendido` vs. el período anterior de igual duración. `null` si no hay base de comparación. */
    variacion_ventas_pct: number | null;
  };
  graficoVentas: {
    labels: string[];
    data: number[];
  };
  productosMasVendidos: Array<{
    producto__nombre: string | null;
    variante__nombre: string | null;
    cantidad_total: number;
    ingresos_total: string | number;
  }>;
  productosBajoStock: Array<{ nombre: string; cantidad: number }>;
  /** Productos que, a su ritmo de venta de los últimos 30 días, se agotarían en 7 días o menos. */
  prediccionQuiebreStock: Array<{
    nombre: string;
    sku: string | null;
    cantidad: number;
    venta_diaria_promedio: number;
    dias_restantes: number;
  }>;
  infoGeneral: {
    clientes: number;
    productos: number;
    ordenes_periodo: number;
    valor_inventario: string | number;
    productos_bajo_stock_count: number;
  };
  /** Solo presente para tenants tipo_negocio='contador' (ver `apps.contabilidad.services.obtener_metricas_dashboard_contador`). */
  contabilidad?: {
    empresas_activas: number;
    asientos_contabilizados_mes: number;
    honorarios_facturados_mes: string | number;
    cierres_realizados: number;
  };
}

/**
 * Obtiene los datos agregados para el dashboard principal del tenant.
 * @returns {Promise<DashboardReporte>} Una promesa que se resuelve con los datos del dashboard.
 */
export const getDashboardReportes = async (): Promise<DashboardReporte> => {
  const response = await apiPrivada.get<DashboardReporte>('/reportes/dashboard/');
  return response.data;
};

export interface VentaReporte {
  id: number;
  correlativo: string;
  fecha_operacion: string;
  cliente_nombre: string;
  /** Monto en la moneda en que se emitió ESTA factura (puede variar de una fila a otra). */
  total: string;
  moneda_codigo: string | null;
  /** El mismo monto ya convertido a la moneda base del tenant, con la tasa congelada en la factura -- el que se debe sumar/reportar como cifra fiscal. */
  total_base: string;
  estado: string;
}

/**
 * Obtiene el listado de ventas (facturas) en un rango de fechas.
 * @param fechaInicio Fecha de inicio en formato YYYY-MM-DD.
 * @param fechaFin Fecha de fin en formato YYYY-MM-DD.
 */
export const getReporteVentas = async (fechaInicio: string, fechaFin: string): Promise<VentaReporte[]> => {
  const response = await apiPrivada.get<VentaReporte[]>('/reportes/ventas/', {
    params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
  });
  return response.data;
};

export interface CierreCajaTransaccion {
  id: number;
  correlativo: string;
  fecha_operacion: string;
  cliente_nombre: string;
  total: string;
  moneda_codigo: string | null;
  total_base: string;
  estado: string;
  metodo_pago_nombre: string;
}

/** Total de caja de UNA moneda -- nunca se mezcla con el de otra. */
export interface TotalCajaPorMoneda {
  moneda_codigo: string;
  moneda_simbolo: string;
  total: string;
}

export interface CierreCajaReporte {
  report_date: string;
  /** Desglosado por moneda -- un cajero necesita saber cuánto debe tener de CADA una en la gaveta, no un solo número mezclándolas. */
  total_caja: TotalCajaPorMoneda[];
  transactions: CierreCajaTransaccion[];
}

/**
 * Obtiene el cierre de caja de un día específico (hoy si no se especifica fecha).
 * @param date Fecha en formato YYYY-MM-DD; si se omite, el backend usa el día actual.
 */
export const getCierreCaja = async (date?: string): Promise<CierreCajaReporte> => {
  const response = await apiPrivada.get<CierreCajaReporte>('/reportes/cierre-caja/', {
    params: date ? { date } : undefined,
  });
  return response.data;
};
