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
/** Moneda en la que el backend expresó los montos de un reporte (ver `apps.reportes.core.moneda_reporte`). */
export interface MonedaDeReporte {
  codigo: string;
  simbolo: string;
  es_base: boolean;
  tasa_vigente: string;
}

/** `?moneda=` de los reportes: la base del tenant o la de referencia (USD). */
export type MonedaParam = 'base' | 'referencia';

export interface DashboardReporte {
  moneda: MonedaDeReporte;
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
export const getDashboardReportes = async (
  moneda: MonedaParam = 'base', almacenIds?: number[],
): Promise<DashboardReporte> => {
  const response = await apiPrivada.get<DashboardReporte>('/reportes/dashboard/', {
    params: { moneda, ...(almacenIds?.length ? { almacenes: almacenIds.join(',') } : {}) },
  });
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
  /** El total en la moneda de referencia (USD) con la tasa del día de la factura; null si no hay moneda de referencia. */
  total_referencia?: string | null;
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

// ---------------------------------------------------------------------------
// Centro de Alertas: cuentas por cobrar/pagar vencidas o por vencer, y
// productos con bajo stock -- una sola lista ordenada por urgencia.
// ---------------------------------------------------------------------------

export type TipoAlerta = 'cxc' | 'cxp' | 'stock' | 'lote' | 'seguimiento' | 'reclamo' | 'garantia';
export type NivelAlerta = 'urgente' | 'atencion';

export interface AlertaItem {
  tipo: TipoAlerta;
  nivel: NivelAlerta;
  titulo: string;
  descripcion: string;
  link: string;
  dias: number | null;
  /** Solo presente en alertas de tipo 'stock' (ver `Producto.almacen`) -- las demás no tienen sucursal asociada en el modelo actual. */
  almacen_id?: number | null;
}

export interface AlertasReporte {
  alertas: AlertaItem[];
  total: number;
  urgentes: number;
}

export const getAlertas = async (almacenIds?: number[]): Promise<AlertasReporte> => {
  const response = await apiPrivada.get<AlertasReporte>('/reportes/alertas/', {
    params: almacenIds?.length ? { almacenes: almacenIds.join(',') } : undefined,
  });
  return response.data;
};

// ---------------------------------------------------------------------------
// Analítica / BI: tendencia mensual, comparativa mes-contra-mes y proyección
// simple del próximo mes -- ver `apps.reportes.core.analitica_service`.
// ---------------------------------------------------------------------------

export interface MesTendencia {
  anio: number;
  mes: number;
  label: string;
  total: number;
  num_facturas: number;
}

export interface ComparativaMensual {
  total_mes_actual: number;
  total_mes_anterior_mismo_tramo: number;
  dias_comparados: number;
  /** `null` cuando no hay base de comparación (mes anterior en cero). */
  variacion_pct: number | null;
}

export interface ProyeccionMensual {
  anio: number;
  mes: number;
  label: string;
  total_estimado: number;
  tendencia: 'creciente' | 'decreciente' | 'estable';
}

export interface TopProductoAnalitica {
  producto__nombre: string | null;
  variante__nombre: string | null;
  cantidad_total: number;
  ingresos_total: string | number;
}

export interface VentaPorDiaSemana {
  dia: string;
  total: number;
  num_facturas: number;
}

export interface AnaliticaReporte {
  moneda: MonedaDeReporte;
  tendencia_mensual: MesTendencia[];
  comparativa_mensual: ComparativaMensual;
  /** `null` cuando hay menos de 3 meses cerrados con historial -- no hay base para proyectar. */
  proyeccion_proximo_mes: ProyeccionMensual | null;
  top_productos: TopProductoAnalitica[];
  ventas_por_dia_semana: VentaPorDiaSemana[];
}

/** @param meses Cuántos meses hacia atrás incluir en la tendencia (3-24, default 12). */
export const getAnalitica = async (meses = 12, moneda: MonedaParam = 'base'): Promise<AnaliticaReporte> => {
  const response = await apiPrivada.get<AnaliticaReporte>('/reportes/analitica/', { params: { meses, moneda } });
  return response.data;
};
