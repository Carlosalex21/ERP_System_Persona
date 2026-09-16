"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { contarFacturasPorEstado, getFacturasPendientesRecientes } from '@/services/facturacionService';
import type { Factura } from '@/types/api';

const POLL_MS = 20000;

/**
 * Cuenta los pedidos pendientes (facturas del catálogo público sin
 * confirmar) y avisa con un toast cuando llega uno nuevo mientras el admin
 * está en el panel -- sin esto, un pedido nuevo solo se notaba si alguien
 * entraba a revisar manualmente.
 */
export function usePedidosPendientes(): number {
  const [count, setCount] = useState(0);
  const previousCount = useRef<number | null>(null);

  useEffect(() => {
    let cancelado = false;

    const poll = async () => {
      try {
        const nuevo = await contarFacturasPorEstado('pendiente');
        if (cancelado) return;
        if (previousCount.current !== null && nuevo > previousCount.current) {
          const diferencia = nuevo - previousCount.current;
          toast.success(
            diferencia === 1 ? '¡Nuevo pedido recibido en tu catálogo!' : `¡${diferencia} pedidos nuevos recibidos!`,
            { icon: '🛍️' },
          );
        }
        previousCount.current = nuevo;
        setCount(nuevo);
      } catch {
        // Silencioso: un fallo de red no debe interrumpir el panel.
      }
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelado = true;
      clearInterval(interval);
    };
  }, []);

  return count;
}

/**
 * Igual que `usePedidosPendientes`, pero además trae el detalle de los
 * últimos pedidos pendientes -- para pintar un desplegable real en la
 * campana del panel en vez de solo un badge numérico que no muestra nada
 * al hacer clic.
 */
export function usePedidosPendientesDetalle(limite = 5) {
  const [count, setCount] = useState(0);
  const [pedidos, setPedidos] = useState<Factura[]>([]);
  const [cargando, setCargando] = useState(true);
  const previousCount = useRef<number | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [nuevo, recientes] = await Promise.all([
        contarFacturasPorEstado('pendiente'),
        getFacturasPendientesRecientes(limite),
      ]);
      if (previousCount.current !== null && nuevo > previousCount.current) {
        const diferencia = nuevo - previousCount.current;
        toast.success(
          diferencia === 1 ? '¡Nuevo pedido recibido en tu catálogo!' : `¡${diferencia} pedidos nuevos recibidos!`,
          { icon: '🛍️' },
        );
      }
      previousCount.current = nuevo;
      setCount(nuevo);
      setPedidos(recientes);
    } catch {
      // Silencioso: un fallo de red no debe interrumpir el panel.
    } finally {
      setCargando(false);
    }
  }, [limite]);

  useEffect(() => {
    let cancelado = false;
    const poll = async () => {
      if (!cancelado) await cargar();
    };
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelado = true;
      clearInterval(interval);
    };
  }, [cargar]);

  return { count, pedidos, cargando, recargar: cargar };
}
