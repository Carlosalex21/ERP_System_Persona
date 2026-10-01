"use client";

/**
 * @file Qué sucursal(es) quiere ver el dueño en el dashboard y el Centro de
 * Alertas -- "todas" o un subconjunto que elige.
 *
 * La unidad real de "sucursal" en el sistema hoy es `Almacen` (tiene stock
 * vía `Inventario`, ventas vía `Factura.almacen`, y ya es lo que cuenta el
 * límite de plan `limite_sucursales`) -- `rrhh.Sucursal` es solo la ficha de
 * contacto del empleado, sin stock ni ventas asociadas, así que no sirve
 * como unidad de reporte.
 *
 * Mismo patrón que `MonedaVistaContext`: contexto global montado una vez en
 * el layout del admin, preferencia persistida por tenant en localStorage,
 * para que el Dashboard, la página de Alertas y la campanita de alertas en
 * el topbar compartan la misma selección sin pasarla a mano por props.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useSession } from '@/context/SessionContext';
import { getAlmacenes } from '@/services/inventoryService';
import type { Almacen } from '@/types/api';

interface SucursalFiltroContextType {
  /** Almacenes/sucursales activos del tenant. */
  almacenes: Almacen[];
  /** [] = todas (sin filtrar). */
  seleccionIds: number[];
  setSeleccionIds: (ids: number[]) => void;
  todasSeleccionadas: boolean;
  /** Listo para pasar directo a `getDashboardReportes`/`getAlertas` -- `undefined` cuando están todas. */
  paramAlmacenes: number[] | undefined;
  /** Solo tiene sentido mostrar el selector si hay más de una sucursal registrada. */
  mostrarSelector: boolean;
}

const SucursalFiltroContext = createContext<SucursalFiltroContextType | undefined>(undefined);

function claveStorage(schema: string | undefined): string {
  return `erp:sucursal-filtro:${schema ?? 'default'}`;
}

function leerGuardado(schema: string | undefined): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(claveStorage(schema));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

export function SucursalFiltroProvider({ children }: { children: ReactNode }) {
  const { tenant } = useSession();
  const schema = tenant?.schema_name;
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [seleccionIds, setSeleccionIdsState] = useState<number[]>([]);
  const [restaurado, setRestaurado] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    getAlmacenes().then((lista) => setAlmacenes(lista.filter((a) => a.activo))).catch(() => setAlmacenes([]));
  }, [tenant]);

  // Se restaura UNA vez que ya se sabe el schema (antes de eso, `claveStorage`
  // apuntaría a la clave genérica "default" y se perdería la preferencia real).
  useEffect(() => {
    if (!schema || restaurado) return;
    setSeleccionIdsState(leerGuardado(schema));
    setRestaurado(true);
  }, [schema, restaurado]);

  const setSeleccionIds = useCallback((ids: number[]) => {
    setSeleccionIdsState(ids);
    try {
      window.localStorage.setItem(claveStorage(schema), JSON.stringify(ids));
    } catch {
      // Sin almacenamiento solo se pierde la preferencia al recargar.
    }
  }, [schema]);

  const valor = useMemo<SucursalFiltroContextType>(() => ({
    almacenes,
    seleccionIds,
    setSeleccionIds,
    todasSeleccionadas: seleccionIds.length === 0,
    paramAlmacenes: seleccionIds.length > 0 ? seleccionIds : undefined,
    mostrarSelector: almacenes.length > 1,
  }), [almacenes, seleccionIds, setSeleccionIds]);

  return <SucursalFiltroContext.Provider value={valor}>{children}</SucursalFiltroContext.Provider>;
}

export function useSucursalFiltro(): SucursalFiltroContextType {
  const ctx = useContext(SucursalFiltroContext);
  if (!ctx) throw new Error('useSucursalFiltro debe usarse dentro de SucursalFiltroProvider');
  return ctx;
}
