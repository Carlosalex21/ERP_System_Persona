"use client";

import toast from 'react-hot-toast';
import { getAlertas, type AlertasReporte } from '@/services/reportesService';
import { crearRecursoEnVivo, useRecursoEnVivo } from '@/utils/recursoEnVivo';

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
  return {
    alertas: data?.alertas ?? [],
    total: data?.total ?? 0,
    urgentes: data?.urgentes ?? 0,
    cargando,
    recargar: alertas.recargar,
  };
}
