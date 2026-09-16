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
