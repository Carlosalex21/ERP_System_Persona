"use client";

import toast from 'react-hot-toast';
import { contarFacturasPorEstado, getFacturasPendientesRecientes } from '@/services/facturacionService';
import type { Factura } from '@/types/api';
import { crearRecursoEnVivo, useRecursoEnVivo } from '@/utils/recursoEnVivo';

const POLL_MS = 20000;
const LIMITE_RECIENTES = 5;

interface PedidosPendientes {
  count: number;
  recientes: Factura[];
}

/**
 * Pedidos pendientes (facturas del catálogo público sin confirmar), con un
 * aviso cuando llega uno nuevo mientras el admin está en el panel. Una sola
 * consulta compartida por el sidebar y la campana (ver `recursoEnVivo`).
 */
const pedidosPendientes = crearRecursoEnVivo<PedidosPendientes>(
  async () => {
    const [count, recientes] = await Promise.all([
      contarFacturasPorEstado('pendiente'),
      getFacturasPendientesRecientes(LIMITE_RECIENTES),
    ]);
    return { count, recientes };
  },
  {
    intervaloMs: POLL_MS,
    alCambiar: (nuevo, anterior) => {
      if (anterior && nuevo.count > anterior.count) {
        const diferencia = nuevo.count - anterior.count;
        toast.success(
          diferencia === 1 ? '¡Nuevo pedido recibido en tu catálogo!' : `¡${diferencia} pedidos nuevos recibidos!`,
          { icon: '🛍️', id: 'pedido-nuevo' },
        );
      }
    },
  },
);

/** Solo el número de pedidos pendientes (badge del menú). */
export function usePedidosPendientes(): number {
  return useRecursoEnVivo(pedidosPendientes).data?.count ?? 0;
}

/** Número + últimos pedidos pendientes (desplegable de la campana). */
export function usePedidosPendientesDetalle() {
  const { data, cargando } = useRecursoEnVivo(pedidosPendientes);
  return {
    count: data?.count ?? 0,
    pedidos: data?.recientes ?? [],
    cargando,
    recargar: pedidosPendientes.recargar,
  };
}
