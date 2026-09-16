"use client";

import { useCallback, useEffect, useState } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { listarVentasPendientes, type VentaPendiente } from '@/utils/offlineDb';
import { sincronizarVentasPendientes } from '@/services/offlineSyncService';

interface UsePendingSalesSync {
  online: boolean;
  pendientes: VentaPendiente[];
  sincronizando: boolean;
  sincronizarAhora: () => Promise<void>;
}

/**
 * Mantiene la cola de ventas pendientes visible y la sincroniza sola en
 * cuanto vuelve la conexión -- el cajero no tiene que acordarse de nada.
 */
export function usePendingSalesSync(onSyncDone?: (exitosas: number, fallidas: number) => void): UsePendingSalesSync {
  const online = useOnlineStatus();
  const [pendientes, setPendientes] = useState<VentaPendiente[]>([]);
  const [sincronizando, setSincronizando] = useState(false);

  const refrescarPendientes = useCallback(async () => {
    setPendientes(await listarVentasPendientes());
  }, []);

  const sincronizarAhora = useCallback(async () => {
    setSincronizando(true);
    try {
      const resultado = await sincronizarVentasPendientes();
      await refrescarPendientes();
      if (resultado.exitosas > 0 || resultado.fallidas > 0) onSyncDone?.(resultado.exitosas, resultado.fallidas);
    } finally {
      setSincronizando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refrescarPendientes]);

  // Sondeo liviano (solo lee IndexedDB local, sin red) para que el contador
  // de pendientes refleje una venta recién encolada por el POS sin esperar
  // a que se dispare un intento de sincronización real.
  useEffect(() => {
    refrescarPendientes();
    const intervalo = window.setInterval(refrescarPendientes, 4_000);
    return () => window.clearInterval(intervalo);
  }, [refrescarPendientes]);

  // Al volver la conexión, sincroniza automáticamente sin que el cajero
  // tenga que hacer nada.
  useEffect(() => {
    if (online) sincronizarAhora();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // `navigator.onLine` solo refleja la interfaz de red -- si el router tiene
  // luz pero el internet real (o el propio backend) está caído, el evento
  // `online` del navegador nunca se dispara aunque la conexión real vuelva
  // poco después. Este reintento periódico cubre ese caso sin que el cajero
  // tenga que acordarse de tocar "Sincronizar ahora".
  useEffect(() => {
    if (!online || pendientes.length === 0) return undefined;
    const intervalo = window.setInterval(() => { sincronizarAhora(); }, 20_000);
    return () => window.clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, pendientes.length]);

  return { online, pendientes, sincronizando, sincronizarAhora };
}
