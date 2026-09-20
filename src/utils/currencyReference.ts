/**
 * @file Referencia de un monto en la moneda base del tenant (ej. "Bs.") a
 * partir de un monto ya expresado en la otra moneda con tasa cargada (ej.
 * "$"). Mismo cálculo que ya usa el catálogo público (`StorefrontClient`),
 * extraído aquí para no duplicarlo en cada pantalla que necesite mostrar
 * "$X (≈ Bs. Y)" -- ver `PedidoMesaModal` y `/cuenta/[token]`.
 */

export interface TasaMonedaRef {
  codigo: string;
  simbolo: string | null;
  tasa: string | null;
  es_base: boolean;
}

/**
 * Dado un monto expresado en la moneda NO base del tenant, devuelve su
 * equivalente formateado en la moneda base ("Bs. 1305.32"), o `null` si no
 * hay una tasa cargada todavía (no hay nada que mostrar).
 */
export function referenciaEnMonedaBase(
  monto: number,
  tasas: Record<string, TasaMonedaRef>,
): string | null {
  const base = Object.values(tasas).find((t) => t.es_base);
  const noBase = Object.values(tasas).find((t) => !t.es_base && t.tasa);
  if (!base || !noBase?.tasa) return null;
  const tasaNum = parseFloat(noBase.tasa);
  if (!Number.isFinite(tasaNum)) return null;
  const equivalente = monto * tasaNum;
  if (!Number.isFinite(equivalente)) return null;
  return `${base.simbolo || base.codigo} ${equivalente.toFixed(2)}`;
}
