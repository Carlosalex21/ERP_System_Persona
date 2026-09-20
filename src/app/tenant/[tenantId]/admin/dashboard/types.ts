/** @file Tipos compartidos entre las piezas del Dashboard. */

export interface VentasChartPoint {
  label: string;
  valor: number;
}

export interface ProductoVendido {
  nombre: string;
  cantidad: number;
  total: number;
}

export interface ProductoBajoStock {
  nombre: string;
  cantidad: number;
  sku?: string;
}

/** Producto en riesgo de agotarse pronto según su ritmo de venta reciente -- ver `dashboard_service.obtener_prediccion_quiebre_stock`. */
export interface PrediccionQuiebreStock {
  nombre: string;
  sku: string | null;
  cantidad: number;
  venta_diaria_promedio: number;
  dias_restantes: number;
}
