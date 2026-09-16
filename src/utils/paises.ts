/**
 * @file Metadatos de los países soportados por el motor fiscal
 * (ver apps.configuracion.core.tax_strategy en el backend). Centralizado
 * aquí para no repetir el mapeo en cada componente que muestra el país del
 * tenant (Sidebar, Topbar, Dashboard, registro).
 */
export type PaisCodigo = 'VE' | 'CO' | 'PE';

export interface PaisInfo {
  codigo: PaisCodigo;
  nombre: string;
  moneda: string;
  impuesto: string;
}

export const PAISES: Record<PaisCodigo, PaisInfo> = {
  VE: { codigo: 'VE', nombre: 'Venezuela', moneda: 'Bs.', impuesto: 'IVA' },
  CO: { codigo: 'CO', nombre: 'Colombia', moneda: 'COP', impuesto: 'IVA' },
  PE: { codigo: 'PE', nombre: 'Perú', moneda: 'S/', impuesto: 'IGV' },
};

export function getPaisInfo(codigo?: string | null): PaisInfo {
  return PAISES[(codigo as PaisCodigo) ?? 'VE'] ?? PAISES.VE;
}
