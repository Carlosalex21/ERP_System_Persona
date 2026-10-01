"use client";

import { useMemo } from 'react';
import toast from 'react-hot-toast';
import { getAlertas, type AlertasReporte } from '@/services/reportesService';
import { crearRecursoEnVivo, useRecursoEnVivo } from '@/utils/recursoEnVivo';
import { useSucursalFiltro } from '@/context/SucursalFiltroContext';

const POLL_MS = 20000;

/**
 * Centro de Alertas: cuentas por cobrar/pagar vencidas o por vencer, y
 * productos con bajo stock. Compartido por la campana y la página de
 * alertas (antes cada una consultaba por su lado y el aviso de "alerta
 * urgente" salía repetido).
 */
const alertas = crearRecursoEnVivo<AlertasReporte>(getAlertas, {
  intervaloMs: POLL_MS,
  alCambiar: (nuevo, anterior) => {
    if (anterior && nuevo.urgentes > anterior.urgentes) {
      const diferencia = nuevo.urgentes - anterior.urgentes;
      toast.error(
        diferencia === 1 ? '¡Nueva alerta urgente!' : `¡${diferencia} alertas urgentes nuevas!`,
        { icon: '⚠️', id: 'alerta-urgente' },
      );
    }
  },
});

export function useAlertas() {
  const { data, cargando } = useRecursoEnVivo(alertas);
  // El recurso en vivo es un singleton compartido (una sola consulta para
  // toda la pestaña, ver `recursoEnVivo.ts`) -- no se puede re-pedir con un
  // filtro distinto cada vez que el dueño cambia de sucursal seleccionada
  // sin perder ese ahorro. En vez de eso se filtra acá, del lado del
  // cliente: las alertas de 'stock' sí tienen `almacen_id`, las demás no
  // tienen sucursal asociada en el modelo actual y siempre se muestran.
  const { paramAlmacenes } = useSucursalFiltro();
  const filtradas = useMemo(() => {
    const todas = data?.alertas ?? [];
    if (!paramAlmacenes) return todas;
    return todas.filter((a) => a.tipo !== 'stock' || (a.almacen_id != null && paramAlmacenes.includes(a.almacen_id)));
  }, [data, paramAlmacenes]);

  return {
    alertas: filtradas,
    total: filtradas.length,
    urgentes: filtradas.filter((a) => a.nivel === 'urgente').length,
    cargando,
    recargar: alertas.recargar,
  };
}
