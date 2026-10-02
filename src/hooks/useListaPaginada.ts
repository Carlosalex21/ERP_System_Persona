"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Pagina } from '@/services/paginacion';

/**
 * Estado de una tabla paginada en el servidor.
 *
 * `cargarPagina` debe estar memorizada (`useCallback`) y depender de los
 * filtros: cuando cambia su identidad (el usuario filtró algo) la lista vuelve
 * sola a la página 1. Las respuestas que llegan fuera de orden (el usuario
 * pasó rápido de página) se descartan para no pisar la más reciente.
 */
export function useListaPaginada<T>(cargarPagina: (pagina: number) => Promise<Pagina<T>>) {
  // La página elegida se guarda junto a la función de carga (= filtros) para la
  // que se eligió: si los filtros cambian, esa elección deja de valer y se
  // vuelve a la 1 sin necesidad de un efecto que haga `setState`.
  const [seleccion, setSeleccion] = useState({ pagina: 1, para: cargarPagina });
  const pagina = seleccion.para === cargarPagina ? seleccion.pagina : 1;

  const [datos, setDatos] = useState<Pagina<T> | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const ultimaPeticion = useRef(0);

  const irAPagina = useCallback(
    (nueva: number) => setSeleccion({ pagina: Math.max(nueva, 1), para: cargarPagina }),
    [cargarPagina],
  );

  const cargar = useCallback(
    async (paginaACargar: number, silencioso = false): Promise<void> => {
      const id = ++ultimaPeticion.current;
      if (!silencioso) setCargando(true);
      try {
        const resultado = await cargarPagina(paginaACargar);
        if (id !== ultimaPeticion.current) return;
        setDatos(resultado);
        setError(null);
      } catch (e) {
        if (id !== ultimaPeticion.current) return;
        const status = (e as { response?: { status?: number } })?.response?.status;
        // La página ya no existe (se borró el último registro de la última página).
        if (status === 404 && paginaACargar > 1) {
          setSeleccion({ pagina: paginaACargar - 1, para: cargarPagina });
          return;
        }
        setError(e);
      } finally {
        if (id === ultimaPeticion.current && !silencioso) setCargando(false);
      }
    },
    [cargarPagina],
  );

  useEffect(() => {
    // Carga de datos externos al montar o al cambiar página/filtros.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar(pagina);
  }, [cargar, pagina]);

  const recargar = useCallback((silencioso = false) => cargar(pagina, silencioso), [cargar, pagina]);

  return {
    items: datos?.items ?? [],
    total: datos?.total ?? 0,
    pagina,
    totalPaginas: datos?.totalPaginas ?? 1,
    cargando,
    error,
    irAPagina,
    recargar,
  };
}
