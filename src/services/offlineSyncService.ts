/**
 * @file Motor de sincronización de las ventas hechas sin conexión en el POS.
 *
 * Cada venta encolada offline necesita DOS llamadas para completarse
 * (`createFactura` + `registrarPago`, ver `PosView.tsx`) y el backend no
 * tiene un endpoint que haga ambas cosas en un solo POST ni una clave de
 * idempotencia -- si repitiéramos las dos llamadas a ciegas en cada
 * reintento, una factura ya creada (pero cuyo pago falló) se duplicaría.
 * Por eso cada `VentaPendiente` recuerda `facturaIdRemota` en cuanto el
 * primer paso tiene éxito: un reintento retoma desde `registrarPago`, nunca
 * vuelve a crear la factura.
 */
import { createFactura, registrarPago } from '@/services/facturacionService';
import { extractApiErrors } from '@/utils/errors';
import {
  listarVentasPendientes,
  actualizarVentaPendiente,
  eliminarVentaPendiente,
  type VentaPendiente,
} from '@/utils/offlineDb';
import type { FacturaRequest } from '@/types/api';

function mensajeDeError(error: unknown): string {
  const errores = extractApiErrors(error);
  if (errores.length > 0) return errores[0].detail;
  return error instanceof Error ? error.message : 'Error desconocido al sincronizar.';
}

export interface ResultadoSync {
  exitosas: number;
  fallidas: number;
}

let sincronizando = false;

/**
 * Procesa la cola de ventas pendientes en orden (la más antigua primero).
 * Si ya hay una sincronización en curso, no arranca una segunda en paralelo
 * (ej. el evento `online` del navegador y un botón "Sincronizar ahora"
 * disparándose casi al mismo tiempo).
 */
export async function sincronizarVentasPendientes(): Promise<ResultadoSync> {
  if (sincronizando) return { exitosas: 0, fallidas: 0 };
  sincronizando = true;

  let exitosas = 0;
  let fallidas = 0;
  try {
    const pendientes = (await listarVentasPendientes())
      .filter((v) => v.estadoSync !== 'sincronizando')
      .sort((a, b) => a.creadaEn.localeCompare(b.creadaEn));

    for (const venta of pendientes) {
      await actualizarVentaPendiente(venta.id, { estadoSync: 'sincronizando', errorMensaje: undefined });
      try {
        let facturaId = venta.facturaIdRemota;
        if (!facturaId) {
          const factura = await createFactura(venta.facturaPayload as FacturaRequest);
          facturaId = factura.id;
          await actualizarVentaPendiente(venta.id, { facturaIdRemota: facturaId });
        }
        await registrarPago(facturaId, venta.pagos);
        await eliminarVentaPendiente(venta.id);
        exitosas += 1;
      } catch (error) {
        fallidas += 1;
        await actualizarVentaPendiente(venta.id, { estadoSync: 'error', errorMensaje: mensajeDeError(error) });
      }
    }
  } finally {
    sincronizando = false;
  }
  return { exitosas, fallidas };
}

export type { VentaPendiente };
