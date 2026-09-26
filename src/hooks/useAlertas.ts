"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getAlertas, type AlertaItem } from '@/services/reportesService';

const POLL_MS = 20000;

/**
 * Centro de Alertas: cuentas por cobrar/pagar vencidas o por vencer, y
 * productos con bajo stock -- mismo patrón que `usePedidosPendientesDetalle`
 * (poll cada 20s, toast cuando aparece una alerta urgente nueva mientras el
 * admin está en el panel).
 */
export function useAlertas() {
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [urgentes, setUrgentes] = useState(0);
  const [cargando, setCargando] = useState(true);
  const previousUrgentes = useRef<number | null>(null);

  const cargar = useCallback(async () => {
    try {
      const data = await getAlertas();
      if (previousUrgentes.current !== null && data.urgentes > previousUrgentes.current) {
        const diferencia = data.urgentes - previousUrgentes.current;
        toast.error(
          diferencia === 1 ? '¡Nueva alerta urgente!' : `¡${diferencia} alertas urgentes nuevas!`,
          { icon: '⚠️' },
        );
      }
      previousUrgentes.current = data.urgentes;
      setAlertas(data.alertas);
      setTotal(data.total);
      setUrgentes(data.urgentes);
    } catch {
      // Silencioso: un fallo de red no debe interrumpir el panel.
    } finally {
      setCargando(false);
    }
  }, []);

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

  return { alertas, total, urgentes, cargando, recargar: cargar };
}
