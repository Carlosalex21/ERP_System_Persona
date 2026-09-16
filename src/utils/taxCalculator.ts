/**
 * @file Motor de cálculo fiscal multi-moneda del lado del cliente.
 *
 * Replica EXACTAMENTE la semántica del backend (``apps.facturacion.services.calculos_service``):
 *  - El ``precio_unitario`` se interpreta como **precio final con IVA incluido**.
 *  - Se extrae la base imponible de cada línea sin duplicar el IVA.
 *  - El descuento (porcentual o global) se aplica antes de calcular el impuesto.
 *  - La retención (ISLR) se calcula sobre la base imponible.
 *  - Si la factura es en moneda distinta a la base, se consolidan los montos
 *    ``_base`` MULTIPLICANDO por la tasa de cambio (espejo de ``conversion_service.convertir``).
 *    La tasa significa "1 unidad de esta moneda = tasa unidades de la moneda
 *    base" -- antes este archivo (y su espejo en el backend) dividían en vez
 *    de multiplicar, así que cualquier venta en una moneda no-base
 *    consolidaba un monto absurdamente pequeño en moneda base (ej. $20 a
 *    900 Bs/$ daba "Bs 0.02" en vez de "Bs 18.000").
 */

/** Redondeo bancario (half-up) a 2 decimales, espejo de ``Decimal.quantize(0.01, ROUND_HALF_UP)``. */
export const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

/** Parámetros de cálculo para una línea de factura. */
export interface ItemCalculo {
  /** Cantidad vendida. */
  cantidad: number;
  /** Precio unitario final (el backend lo interpreta con IVA incluido). */
  precio_final_unitario: number;
  /** Descuento porcentual de la línea (0-100). */
  descuento_pct?: number;
  /** Tasa de IVA en porcentaje (ej: 16). 0 = exento. */
  tasa_iva: number;
}

/** Desglose resultante de una línea. */
export interface ResultadoLinea {
  total_bruto_linea: number;
  total_linea_con_dto: number;
  monto_iva: number;
  subtotal_linea: number;
  iva_linea: number;
  total_linea: number;
}

/**
 * Calcula el desglose de una línea replicando ``calcular_linea`` del backend.
 */
export function calcularLinea(item: ItemCalculo): ResultadoLinea {
  const precioFinal = roundMoney(item.precio_final_unitario);
  const cantidad = item.cantidad || 0;
  const descuentoPct = item.descuento_pct ?? 0;

  // total_bruto_linea = precio_final * cantidad (sin redondear, como en backend).
  const totalBrutoLinea = precioFinal * cantidad;
  const totalLineaConDto = totalBrutoLinea * (1 - descuentoPct / 100);

  // Extraer la base imponible del total (que YA incluye IVA) antes de
  // calcular el impuesto -- ver el mismo comentario en `calcular_linea` del
  // backend. Aplicar `tasa/100` directamente sobre el total (en vez de
  // sobre la base extraída) sobreestima el IVA y subestima la base.
  const tasaIva = item.tasa_iva || 0;
  const baseExtraida = tasaIva > 0 ? totalLineaConDto / (1 + tasaIva / 100) : totalLineaConDto;
  const montoIva = roundMoney(baseExtraida * (tasaIva / 100));

  // Base imponible = total con descuento - IVA (descontado del precio final).
  const subtotalLinea = roundMoney(totalLineaConDto - montoIva);
  const ivaLinea = roundMoney(montoIva);
  const totalLinea = roundMoney(subtotalLinea + ivaLinea);

  return {
    total_bruto_linea: roundMoney(totalBrutoLinea),
    total_linea_con_dto: roundMoney(totalLineaConDto),
    monto_iva: montoIva,
    subtotal_linea: subtotalLinea,
    iva_linea: ivaLinea,
    total_linea: totalLinea,
  };
}

/** Contexto de moneda para la consolidación en moneda base. */
export interface MonedaCalculo {
  codigo: string;
  /** Tasa vigente: 1 unidad = tasa unidades de la moneda base. Para la base es 1. */
  tasa: number;
  es_base: boolean;
}

/** Parámetros para calcular los totales de la factura. */
export interface ParametrosTotales {
  lineas: ItemCalculo[];
  /** Descuento global a nivel de factura (monto absoluto). */
  descuento_global?: number;
  /** Porcentaje de retención ISLR (ej: 1 para 1 %). */
  retencion_pct?: number;
  /** Moneda de emisión. Si es null se asume moneda base. */
  moneda?: MonedaCalculo | null;
}

/** Total consolidado (en la moneda de emisión y en moneda base). */
export interface TotalesCalculo {
  subtotal: number;
  base_imponible: number;
  iva_total: number;
  retencion_total: number;
  total: number;

  subtotal_base: number;
  base_imponible_base: number;
  iva_base: number;
  retencion_base: number;
  total_base: number;

  tasa_cambio: number;
  es_base: boolean;
}

/**
 * Calcula los totales consolidados de la factura.
 * Replica ``recalcular_y_guardar_factura`` del backend.
 */
export function calcularTotales(params: ParametrosTotales): TotalesCalculo {
  const lineas = params.lineas ?? [];

  let subtotal = 0;
  let ivaTotal = 0;
  for (const linea of lineas) {
    const r = calcularLinea(linea);
    subtotal += r.subtotal_linea;
    ivaTotal += r.iva_linea;
  }

  subtotal = roundMoney(subtotal);
  ivaTotal = roundMoney(ivaTotal);

  const descuentoGlobal = params.descuento_global ?? 0;
  const baseImponible = roundMoney(subtotal - descuentoGlobal);

  const retencionPct = params.retencion_pct ?? 0;
  const retencionTotal = roundMoney(baseImponible * (retencionPct / 100));

  const total = roundMoney(baseImponible + ivaTotal - retencionTotal);

  const moneda = params.moneda;
  const esBase = moneda?.es_base ?? true;
  const tasa = esBase ? 1 : (moneda?.tasa ?? 1);
  // Consolidación: los montos _base se obtienen MULTIPLICANDO por la tasa (espejo de convertir()).
  const aplicarConversion = !esBase && tasa > 0;
  const conv = (m: number): number => (aplicarConversion ? roundMoney(m * tasa) : roundMoney(m));

  return {
    subtotal,
    base_imponible: baseImponible,
    iva_total: ivaTotal,
    retencion_total: retencionTotal,
    total,

    subtotal_base: conv(subtotal),
    base_imponible_base: conv(baseImponible),
    iva_base: conv(ivaTotal),
    retencion_base: conv(retencionTotal),
    total_base: conv(total),

    tasa_cambio: tasa,
    es_base: esBase,
  };
}

/** Calcula el precio final al consumidor a partir de una base imponible y una tasa de IVA. */
export function calcularPrecioFinal(baseImponible: number, tasaIva: number): number {
  return roundMoney(baseImponible * (1 + (tasaIva || 0) / 100));
}

/**
 * Extrae la base imponible a partir de un precio final (incluido IVA) y una
 * tasa -- `base = final / (1 + tasa/100)`, el mismo cálculo que
 * `Producto.base_imponible` en el backend. (Antes calculaba el IVA como
 * `final * tasa/100`, que trata el precio final como si ya fuera la base,
 * sobreestimando el IVA y subestimando la base.)
 */
export function extraerBaseImponible(precioFinal: number, tasaIva: number): number {
  const total = precioFinal || 0;
  if (!tasaIva || tasaIva === 0) return roundMoney(total);
  return roundMoney(total / (1 + tasaIva / 100));
}
