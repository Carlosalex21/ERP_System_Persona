"use client";

/**
 * @file Moneda en la que el usuario quiere VER los montos del panel.
 *
 * Antes cada pantalla le pegaba un "$" fijo a cualquier número, estuviera en
 * dólares o en bolívares, y al "cambiar a Bs." solo cambiaba el símbolo sin
 * convertir el monto. Este contexto es la única fuente de verdad:
 *
 * - `vista`: 'referencia' (normalmente USD) o 'base' (Bs./COP/S/), elegida
 *   con el selector de la barra superior y recordada por navegador.
 * - `convertir` / `formatear`: llevan un monto de CUALQUIER moneda (la de un
 *   producto, una factura...) a la moneda de vista, a la tasa vigente.
 * - `formatearDocumento`: para facturas/notas, que ya traen su total en
 *   moneda base congelado a la tasa del día de emisión -- se respeta ese
 *   valor en vez de recalcularlo a la tasa de hoy.
 * - `paramMoneda`: el valor para `?moneda=` de los endpoints de reportes, que
 *   convierten en el servidor con la tasa histórica de cada factura.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useSession } from '@/context/SessionContext';
import { getTasasCambioActual, type TasaCambioActual } from '@/services/configuracionService';
import { EVENTO_CACHE_INVALIDADA } from '@/utils/cache';

export type VistaMoneda = 'base' | 'referencia';

export interface MonedaInfo {
  codigo: string;
  simbolo: string;
  /** Unidades de moneda base por 1 unidad de esta moneda (1 para la base). */
  tasa: number;
  esBase: boolean;
}

interface MonedaVistaContextType {
  vista: VistaMoneda;
  setVista: (vista: VistaMoneda) => void;
  /** Moneda en la que se están mostrando los montos. */
  moneda: MonedaInfo;
  base: MonedaInfo;
  /** `null` si el tenant no tiene una segunda moneda con tasa cargada (no hay nada que alternar). */
  referencia: MonedaInfo | null;
  /** false mientras cargan las tasas: los montos convertidos aún no son fiables. */
  listo: boolean;
  /** Valor para el query param `?moneda=` de los reportes del backend. */
  paramMoneda: VistaMoneda;
  /** Convierte `monto` (en `codigoOrigen`; vacío = moneda base) a la moneda de vista. */
  convertir: (monto: number | string | null | undefined, codigoOrigen?: string | null) => number;
  /** Igual que `convertir`, pero ya formateado con el símbolo ("$ 1.234,56"). */
  formatear: (monto: number | string | null | undefined, codigoOrigen?: string | null) => string;
  /** Formatea un monto que YA está en la moneda de vista (ej. lo devolvió un reporte con `?moneda=`). */
  formatearEnVista: (monto: number | string | null | undefined) => string;
  /**
   * Formatea SIN convertir, con el símbolo de la moneda base -- para libros
   * contables y fiscales, que legalmente se llevan en moneda base y no
   * deben re-expresarse a la tasa de hoy.
   */
  formatearEnBase: (monto: number | string | null | undefined) => string;
  /**
   * Monto de un documento (factura/nota) con moneda propia: usa su `total`
   * si ya está en la moneda de vista, su `total_base` si la vista es la
   * base, y en otro caso convierte `total_base` a la tasa vigente.
   */
  formatearDocumento: (total: number | string | null | undefined, totalBase: number | string | null | undefined, codigoDocumento?: string | null) => string;
}

const LOCALE_POR_PAIS: Record<string, string> = { VE: 'es-VE', CO: 'es-CO', PE: 'es-PE' };
const SIMBOLO_BASE_POR_PAIS: Record<string, { codigo: string; simbolo: string }> = {
  VE: { codigo: 'VES', simbolo: 'Bs.' },
  CO: { codigo: 'COP', simbolo: 'COP' },
  PE: { codigo: 'PEN', simbolo: 'S/' },
};

const MonedaVistaContext = createContext<MonedaVistaContextType | undefined>(undefined);

function aNumero(valor: number | string | null | undefined): number {
  const n = typeof valor === 'number' ? valor : parseFloat(String(valor ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

function aMonedaInfo(t: TasaCambioActual): MonedaInfo {
  return { codigo: t.codigo, simbolo: t.simbolo || t.codigo, tasa: t.es_base ? 1 : aNumero(t.tasa), esBase: t.es_base };
}

function claveStorage(schema: string | undefined): string {
  return `erp:moneda-vista:${schema ?? 'default'}`;
}

function leerVistaGuardada(schema: string | undefined): VistaMoneda | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(claveStorage(schema));
    return v === 'base' || v === 'referencia' ? v : null;
  } catch {
    return null;
  }
}

export function MonedaVistaProvider({ children }: { children: ReactNode }) {
  const { tenant } = useSession();
  const schema = tenant?.schema_name;
  const [tasas, setTasas] = useState<Record<string, TasaCambioActual> | null>(null);
  const [vistaElegida, setVistaElegida] = useState<VistaMoneda | null>(null);

  useEffect(() => {
    if (!tenant) return;
    let vigente = true;
    const cargar = (): void => {
      getTasasCambioActual()
        .then((data) => { if (vigente) setTasas(data); })
        .catch(() => { if (vigente) setTasas((previas) => previas ?? {}); });
    };
    cargar();
    // Si alguien actualiza una tasa (pantalla de tasas, POS), todo el panel
    // pasa a convertir con la nueva sin recargar la página.
    const alInvalidar = (e: Event): void => {
      if ((e as CustomEvent<string>).detail?.startsWith('config:tasas')) cargar();
    };
    window.addEventListener(EVENTO_CACHE_INVALIDADA, alInvalidar);
    return () => {
      vigente = false;
      window.removeEventListener(EVENTO_CACHE_INVALIDADA, alInvalidar);
    };
  }, [tenant]);

  const { base, referencia } = useMemo(() => {
    const lista = Object.values(tasas ?? {});
    const porDefecto = SIMBOLO_BASE_POR_PAIS[tenant?.pais_codigo ?? 'VE'] ?? SIMBOLO_BASE_POR_PAIS.VE;
    const baseT = lista.find((t) => t.es_base);
    const conTasa = lista.filter((t) => !t.es_base && aNumero(t.tasa) > 0);
    const refT = conTasa.find((t) => t.codigo === 'USD') ?? conTasa[0];
    return {
      base: baseT ? aMonedaInfo(baseT) : { ...porDefecto, tasa: 1, esBase: true },
      referencia: refT ? aMonedaInfo(refT) : null,
    };
  }, [tasas, tenant?.pais_codigo]);

  // Por defecto se ve en la moneda de referencia ($) si existe -- es como
  // se pensaban los precios en casi todo el panel hasta ahora.
  const vista: VistaMoneda = referencia
    ? (vistaElegida ?? leerVistaGuardada(schema) ?? 'referencia')
    : 'base';
  const moneda = vista === 'referencia' && referencia ? referencia : base;

  const setVista = useCallback((nueva: VistaMoneda) => {
    setVistaElegida(nueva);
    try {
      window.localStorage.setItem(claveStorage(schema), nueva);
    } catch {
      // Sin almacenamiento solo se pierde la preferencia al recargar.
    }
  }, [schema]);

  const valor = useMemo<MonedaVistaContextType>(() => {
    const porCodigo = new Map<string, MonedaInfo>();
    for (const t of Object.values(tasas ?? {})) porCodigo.set(t.codigo, aMonedaInfo(t));
    const fmt = new Intl.NumberFormat(LOCALE_POR_PAIS[tenant?.pais_codigo ?? 'VE'] ?? 'es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const conSimbolo = (n: number, simbolo: string = moneda.simbolo): string => `${simbolo} ${fmt.format(n)}`;

    const convertir = (monto: number | string | null | undefined, codigoOrigen?: string | null): number => {
      const n = aNumero(monto);
      const origen = codigoOrigen ? porCodigo.get(codigoOrigen) : base;
      if (!origen || origen.codigo === moneda.codigo) return n;
      if (!origen.tasa || !moneda.tasa) return n;
      return (n * origen.tasa) / moneda.tasa;
    };

    return {
      vista,
      setVista,
      moneda,
      base,
      referencia,
      listo: tasas !== null,
      paramMoneda: moneda.esBase ? 'base' : 'referencia',
      convertir,
      formatear: (monto, codigoOrigen) => conSimbolo(convertir(monto, codigoOrigen)),
      formatearEnVista: (monto) => conSimbolo(aNumero(monto)),
      formatearEnBase: (monto) => conSimbolo(aNumero(monto), base.simbolo),
      formatearDocumento: (total, totalBase, codigoDocumento) => {
        if (codigoDocumento && codigoDocumento === moneda.codigo) return conSimbolo(aNumero(total));
        if (totalBase !== null && totalBase !== undefined && totalBase !== '') {
          return conSimbolo(convertir(totalBase, base.codigo));
        }
        return conSimbolo(convertir(total, codigoDocumento));
      },
    };
  }, [tasas, tenant?.pais_codigo, moneda, base, referencia, vista, setVista]);

  return <MonedaVistaContext.Provider value={valor}>{children}</MonedaVistaContext.Provider>;
}

export function useMonedaVista(): MonedaVistaContextType {
  const ctx = useContext(MonedaVistaContext);
  if (!ctx) throw new Error('useMonedaVista debe usarse dentro de MonedaVistaProvider');
  return ctx;
}
