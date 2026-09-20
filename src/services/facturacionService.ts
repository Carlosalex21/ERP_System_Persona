/**
 * @file Servicio para encapsular la lógica de API para el módulo de Facturación/POS
 * y los documentos fiscales SENIAT (notas de crédito/débito, libros, retenciones).
 * Las lecturas usan caché en memoria (TTL) para evitar refetch en cada navegación.
 */
import { apiPrivada, apiRequest } from './api';
import {
  Factura,
  FacturaRequest,
  MetodoPago,
  MetodoPagoRequest,
  NotaCredito,
  NotaCreditoRequest,
  PatchedNotaCreditoRequest,
  NotaDebito,
  NotaDebitoRequest,
  PatchedNotaDebitoRequest,
  LibroCompraVenta,
  LibroCompraVentaRequest,
  PatchedLibroCompraVentaRequest,
  Retencion,
  RetencionRequest,
  PatchedRetencionRequest,
  Transaccionpago,
  PagoRequestLinea,
} from '@/types/api';
import { cachedGet, invalidateCache } from '@/utils/cache';
import { conRespaldoOffline } from '@/utils/offlineCache';

/**
 * Crea una nueva factura (cierra una venta).
 * @param {FacturaRequest} data - Los datos de la factura a crear.
 * @returns {Promise<Factura>}
 */
export const createFactura = async (data: FacturaRequest): Promise<Factura> => {
  const response = await apiPrivada.post<Factura>('/facturacion/lista/', data);
  invalidateCache('facturacion:facturas');
  return response.data;
};

/**
 * Descarga el PDF de una factura y lo abre en una pestaña nueva (o fuerza
 * la descarga si `descargar` es true). El endpoint exige autenticación, así
 * que no se puede enlazar directo con un `<a href>` -- se pide como blob
 * con el token ya inyectado por `apiPrivada` y se abre desde un object URL.
 * @param {number} facturaId - ID de la factura.
 * @param {{ paperSize?: '58' | '80'; descargar?: boolean }} [opciones]
 */
export const verFacturaPdf = async (
  facturaId: number,
  opciones?: { paperSize?: '58' | '80'; descargar?: boolean },
): Promise<void> => {
  const params = new URLSearchParams();
  if (opciones?.paperSize) params.set('paper_size', opciones.paperSize);
  if (opciones?.descargar) params.set('download', '1');
  const query = params.toString();

  const response = await apiPrivada.get(`/facturacion/factura-imprimir/${facturaId}/${query ? `?${query}` : ''}`, {
    responseType: 'blob',
  });
  const blobUrl = window.URL.createObjectURL(response.data as Blob);

  if (opciones?.descargar) {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `factura_${facturaId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } else {
    window.open(blobUrl, '_blank');
  }
  // Libera el object URL después de darle tiempo a la pestaña/descarga de tomarlo.
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30_000);
};

/**
 * Descarga el PDF de una factura y devuelve un object URL para previsualizarlo
 * embebido (ej. en un `<iframe>` dentro de un modal), en vez de abrirlo en una
 * pestaña nueva. Quien llama es responsable de liberar el URL con
 * `window.URL.revokeObjectURL` cuando ya no lo necesite (ej. al cerrar el modal).
 * @param {number} facturaId - ID de la factura.
 * @param {'58' | '80'} [paperSize] - Tamaño de papel térmico, o vacío para hoja completa.
 * @returns {Promise<string>} Object URL del PDF.
 */
export const obtenerFacturaPdfBlobUrl = async (
  facturaId: number,
  paperSize?: '58' | '80',
): Promise<string> => {
  const params = new URLSearchParams();
  if (paperSize) params.set('paper_size', paperSize);
  const query = params.toString();

  const response = await apiPrivada.get(`/facturacion/factura-imprimir/${facturaId}/${query ? `?${query}` : ''}`, {
    responseType: 'blob',
  });
  return window.URL.createObjectURL(response.data as Blob);
};

/** Genera el PDF de una Nota de Crédito y devuelve una blob URL para previsualizarlo/descargarlo. */
export const obtenerNotaCreditoPdfBlobUrl = async (notaId: number): Promise<string> => {
  const response = await apiPrivada.get(`/facturacion/nota-credito-imprimir/${notaId}/`, { responseType: 'blob' });
  return window.URL.createObjectURL(response.data as Blob);
};

/** Genera el PDF de una Nota de Débito y devuelve una blob URL para previsualizarlo/descargarlo. */
export const obtenerNotaDebitoPdfBlobUrl = async (notaId: number): Promise<string> => {
  const response = await apiPrivada.get(`/facturacion/nota-debito-imprimir/${notaId}/`, { responseType: 'blob' });
  return window.URL.createObjectURL(response.data as Blob);
};

/**
 * Obtiene la lista de métodos de pago activos.
 * @returns {Promise<MetodoPago[]>}
 */
export const getMetodosDePago = async (): Promise<MetodoPago[]> => {
  return cachedGet('facturacion:metodos-pago', () => conRespaldoOffline('metodos_pago', async () => {
    const response = await apiPrivada.get<MetodoPago[]>('/facturacion/metodos-pago/');
    return response.data;
  }));
};

/**
 * Crea un nuevo método de pago.
 * @param {MetodoPagoRequest} data - Los datos del método de pago a crear.
 * @returns {Promise<MetodoPago>}
 */
export const createMetodoPago = async (data: MetodoPagoRequest): Promise<MetodoPago> => {
  const response = await apiPrivada.post<MetodoPago>('/facturacion/metodos-pago/', data);
  invalidateCache('facturacion:metodos-pago');
  return response.data;
};

/**
 * Actualiza un método de pago existente.
 * @param {number} id - El ID del método de pago a actualizar.
 * @param {Partial<MetodoPagoRequest>} data - Los datos parciales a actualizar.
 * @returns {Promise<MetodoPago>}
 */
export const updateMetodoPago = async (
  id: number,
  data: Partial<MetodoPagoRequest>,
): Promise<MetodoPago> => {
  const response = await apiPrivada.patch<MetodoPago>(`/facturacion/metodos-pago/${id}/`, data);
  invalidateCache('facturacion:metodos-pago');
  return response.data;
};

/**
 * Elimina un método de pago por su ID.
 * @param {number} id - El ID del método de pago a eliminar.
 */
export const deleteMetodoPago = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/facturacion/metodos-pago/${id}/`);
  invalidateCache('facturacion:metodos-pago');
};

/**
 * Registra uno o varios pagos sobre una factura (soporta pago dividido
 * entre varios métodos y abonos parciales a crédito -- si la suma de
 * `pagos` no cubre el total, la factura queda pendiente con el saldo
 * reducido en vez de exigir el monto completo de una sola vez).
 * @param {number} facturaId - El ID de la factura a pagar.
 * @param {PagoRequestLinea[]} pagos - Una o más líneas de pago.
 * @returns {Promise<{ mensaje: string; factura: Factura; saldo_pendiente: string }>}
 */
export const registrarPago = async (
  facturaId: number,
  pagos: PagoRequestLinea[],
): Promise<{ mensaje: string; factura: Factura; saldo_pendiente: string }> => {
  const response = await apiPrivada.post('/facturacion/pago/', {
    factura_id: facturaId,
    pagos,
  });
  invalidateCache('facturacion:facturas');
  return response.data;
};

/** Marca una factura como "pagar luego" (cuenta pendiente), sin registrar ningún pago todavía. */
export const marcarFacturaPendiente = async (
  facturaId: number,
  metodoPagoId: number | null,
  datosAdicionales?: { nombre_cliente?: string; comentario?: string },
): Promise<{ mensaje: string; factura: Factura }> => {
  const response = await apiPrivada.post('/facturacion/pago/', {
    factura_id: facturaId,
    pagos: [],
    estado: 'pendiente',
    datos_adicionales: { ...datosAdicionales, metodo_pago_id: metodoPagoId },
  });
  invalidateCache('facturacion:facturas');
  return response.data;
};

/**
 * Transacciones de pago registradas desde el POS (efectivo, Pago Móvil,
 * transferencia, Zelle, tarjeta), opcionalmente filtradas por factura --
 * para mostrar la referencia junto al pedido en el panel de Pedidos, igual
 * que `getTransaccionesPasarela` hace para los pedidos del catálogo público.
 */
export const getTransaccionesPago = async (facturaId?: number): Promise<Transaccionpago[]> => {
  const response = await apiPrivada.get<Transaccionpago[]>('/facturacion/transacciones/', {
    params: facturaId ? { factura: facturaId } : undefined,
  });
  return response.data;
};

// ---------------------------------------------------------------------------
// Anulación de Facturas
// ---------------------------------------------------------------------------

/**
 * Anula una factura y restaura el stock.
 * @param {number} facturaId - ID de la factura a anular.
 * @returns {Promise<{ message: string }>}
 */
export const anularFactura = async (facturaId: number): Promise<{ message: string }> => {
  const response = await apiPrivada.post<{ message: string }>(
    `/facturacion/facturas/${facturaId}/anular/`,
  );
  invalidateCache('facturacion:facturas');
  return response.data;
};

/**
 * Actualiza el estado de una factura (ej. confirmar el pago de un pedido
 * del catálogo público, que llega con estado 'pendiente').
 * @param {number} facturaId - ID de la factura.
 * @param {string} estado - Nuevo estado (ej. 'pagado').
 * @returns {Promise<Factura>}
 */
export const actualizarEstadoFactura = async (facturaId: number, estado: string): Promise<Factura> => {
  const response = await apiPrivada.patch<Factura>(`/facturacion/lista/${facturaId}/`, { estado });
  invalidateCache('facturacion:facturas');
  return response.data;
};

// ---------------------------------------------------------------------------
// Notas de Crédito (SENIAT)
// ---------------------------------------------------------------------------

/**
 * Obtiene la lista de notas de crédito.
 * @returns {Promise<NotaCredito[]>}
 */
export const getNotasCredito = async (): Promise<NotaCredito[]> => {
  return cachedGet('facturacion:notas-credito', async () => {
    const response = await apiPrivada.get<NotaCredito[]>('/facturacion/notas-credito/');
    return response.data;
  });
};

/**
 * Crea una nota de crédito.
 * @param {NotaCreditoRequest} data - Datos de la nota de crédito.
 * @returns {Promise<NotaCredito>}
 */
export const createNotaCredito = async (data: NotaCreditoRequest): Promise<NotaCredito> => {
  const response = await apiPrivada.post<NotaCredito>('/facturacion/notas-credito/', data);
  invalidateCache('facturacion:notas-credito');
  return response.data;
};

/**
 * Actualiza una nota de crédito parcialmente.
 * @param {number} id - ID de la nota.
 * @param {PatchedNotaCreditoRequest} data - Campos a actualizar.
 * @returns {Promise<NotaCredito>}
 */
export const updateNotaCredito = async (
  id: number,
  data: PatchedNotaCreditoRequest,
): Promise<NotaCredito> => {
  const response = await apiPrivada.patch<NotaCredito>(`/facturacion/notas-credito/${id}/`, data);
  invalidateCache('facturacion:notas-credito');
  return response.data;
};

/**
 * Elimina una nota de crédito.
 * @param {number} id - ID de la nota a eliminar.
 */
export const deleteNotaCredito = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/facturacion/notas-credito/${id}/`);
  invalidateCache('facturacion:notas-credito');
};

// ---------------------------------------------------------------------------
// Notas de Débito (SENIAT)
// ---------------------------------------------------------------------------

/**
 * Obtiene la lista de notas de débito.
 * @returns {Promise<NotaDebito[]>}
 */
export const getNotasDebito = async (): Promise<NotaDebito[]> => {
  return cachedGet('facturacion:notas-debito', async () => {
    const response = await apiPrivada.get<NotaDebito[]>('/facturacion/notas-debito/');
    return response.data;
  });
};

/**
 * Crea una nota de débito.
 * @param {NotaDebitoRequest} data - Datos de la nota de débito.
 * @returns {Promise<NotaDebito>}
 */
export const createNotaDebito = async (data: NotaDebitoRequest): Promise<NotaDebito> => {
  const response = await apiPrivada.post<NotaDebito>('/facturacion/notas-debito/', data);
  invalidateCache('facturacion:notas-debito');
  return response.data;
};

/**
 * Actualiza una nota de débito parcialmente.
 * @param {number} id - ID de la nota.
 * @param {PatchedNotaDebitoRequest} data - Campos a actualizar.
 * @returns {Promise<NotaDebito>}
 */
export const updateNotaDebito = async (
  id: number,
  data: PatchedNotaDebitoRequest,
): Promise<NotaDebito> => {
  const response = await apiPrivada.patch<NotaDebito>(`/facturacion/notas-debito/${id}/`, data);
  invalidateCache('facturacion:notas-debito');
  return response.data;
};

/**
 * Elimina una nota de débito.
 * @param {number} id - ID de la nota a eliminar.
 */
export const deleteNotaDebito = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/facturacion/notas-debito/${id}/`);
  invalidateCache('facturacion:notas-debito');
};

// ---------------------------------------------------------------------------
// Libros de Compra y Venta (SENIAT)
// ---------------------------------------------------------------------------

/**
 * Obtiene el libro de compras y ventas.
 * @param {Record<string, unknown>} [params] - Filtros opcionales (tipo_libro, fecha_operacion).
 * @returns {Promise<LibroCompraVenta[]>}
 */
export const getLibrosCompraVenta = async (
  params?: Record<string, unknown>,
): Promise<LibroCompraVenta[]> => {
  const cacheKey = `facturacion:libros:${JSON.stringify(params ?? {})}`;
  return cachedGet(cacheKey, async () => {
    const response = await apiPrivada.get<LibroCompraVenta[]>('/facturacion/libro-compra-venta/', {
      params,
    });
    return response.data;
  });
};

/**
 * Registra una nueva línea en el libro de compras o ventas.
 * @param {LibroCompraVentaRequest} data - Datos de la línea del libro.
 * @returns {Promise<LibroCompraVenta>}
 */
export const createLibroCompraVenta = async (
  data: LibroCompraVentaRequest,
): Promise<LibroCompraVenta> => {
  const response = await apiPrivada.post<LibroCompraVenta>('/facturacion/libro-compra-venta/', data);
  invalidateCache('facturacion:libros');
  return response.data;
};

/**
 * Actualiza una línea del libro de compras/ventas.
 * @param {number} id - ID de la línea.
 * @param {PatchedLibroCompraVentaRequest} data - Campos a actualizar.
 * @returns {Promise<LibroCompraVenta>}
 */
export const updateLibroCompraVenta = async (
  id: number,
  data: PatchedLibroCompraVentaRequest,
): Promise<LibroCompraVenta> => {
  const response = await apiPrivada.patch<LibroCompraVenta>(`/facturacion/libro-compra-venta/${id}/`, data);
  invalidateCache('facturacion:libros');
  return response.data;
};

/**
 * Elimina una línea del libro de compras/ventas.
 * @param {number} id - ID de la línea a eliminar.
 */
export const deleteLibroCompraVenta = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/facturacion/libro-compra-venta/${id}/`);
  invalidateCache('facturacion:libros');
};

// ---------------------------------------------------------------------------
// Comprobantes de Retención (SENIAT)
// ---------------------------------------------------------------------------

/**
 * Obtiene la lista de comprobantes de retención.
 * @returns {Promise<Retencion[]>}
 */
export const getRetenciones = async (): Promise<Retencion[]> => {
  return cachedGet('facturacion:retenciones', async () => {
    const response = await apiPrivada.get<Retencion[]>('/facturacion/retenciones/');
    return response.data;
  });
};

/**
 * Crea un comprobante de retención.
 * @param {RetencionRequest} data - Datos del comprobante.
 * @returns {Promise<Retencion>}
 */
export const createRetencion = async (data: RetencionRequest): Promise<Retencion> => {
  const response = await apiPrivada.post<Retencion>('/facturacion/retenciones/', data);
  invalidateCache('facturacion:retenciones');
  return response.data;
};

/**
 * Actualiza un comprobante de retención.
 * @param {number} id - ID del comprobante.
 * @param {PatchedRetencionRequest} data - Campos a actualizar.
 * @returns {Promise<Retencion>}
 */
export const updateRetencion = async (id: number, data: PatchedRetencionRequest): Promise<Retencion> => {
  const response = await apiPrivada.patch<Retencion>(`/facturacion/retenciones/${id}/`, data);
  invalidateCache('facturacion:retenciones');
  return response.data;
};

/**
 * Elimina un comprobante de retención.
 * @param {number} id - ID del comprobante a eliminar.
 */
export const deleteRetencion = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/facturacion/retenciones/${id}/`);
  invalidateCache('facturacion:retenciones');
};

// ---------------------------------------------------------------------------
// Facturas (listado para selects / visor)
// ---------------------------------------------------------------------------

/**
 * Obtiene la lista completa de facturas del tenant.
 * @returns {Promise<Factura[]>}
 */
export const getFacturas = async (): Promise<Factura[]> => {
  return cachedGet('facturacion:facturas', async () => {
    const response = await apiPrivada.get<Factura[]>('/facturacion/lista/');
    return response.data;
  });
};

/**
 * Historial de facturas de un cliente puntual (ej. las facturas de
 * honorarios que un contador le emitió a una `EmpresaContable` enlazada) --
 * sin pasar por caché, para que siempre refleje la última factura emitida.
 * @param {number} clienteId - ID del cliente.
 * @returns {Promise<Factura[]>}
 */
export const getFacturasPorCliente = async (clienteId: number): Promise<Factura[]> => {
  const response = await apiPrivada.get<Factura[]>('/facturacion/lista/', {
    params: { cliente: clienteId, page_size: 100 },
  });
  return response.data;
};

/**
 * Cuenta las facturas en un estado dado (ej. 'pendiente') sin traer el
 * listado completo -- usado para el badge de "Pedidos" del panel.
 * @param {string} estado - Estado a contar.
 * @returns {Promise<number>}
 */
export const contarFacturasPorEstado = async (estado: string): Promise<number> => {
  const response = await apiRequest<Factura[]>({
    method: 'GET',
    url: '/facturacion/lista/',
    params: { estado, page_size: 1 },
  });
  const pagination = response.meta?.pagination as { count?: number } | undefined;
  return pagination?.count ?? (Array.isArray(response.data) ? response.data.length : 0);
};

/**
 * Últimos N pedidos pendientes (para el desplegable de notificaciones del
 * panel, no solo el contador del badge).
 */
export const getFacturasPendientesRecientes = async (limit = 5): Promise<Factura[]> => {
  const response = await apiRequest<Factura[]>({
    method: 'GET',
    url: '/facturacion/lista/',
    params: { estado: 'pendiente', page_size: limit },
  });
  return Array.isArray(response.data) ? response.data : [];
};

// ---------------------------------------------------------------------------
// Reporte de Libros de Compra/Venta
// ---------------------------------------------------------------------------

/**
 * Genera el reporte de libros de compra/venta en un rango de fechas.
 * `GET /facturacion/libro-compra-venta/reportes/`
 * @param {Object} params - Filtros del reporte (tipo_libro, fecha_desde, fecha_hasta).
 * @returns {Promise<LibroCompraVenta[]>}
 */
export const getReporteLibros = async (params: {
  tipo_libro?: 'compra' | 'venta';
  fecha_desde?: string;
  fecha_hasta?: string;
}): Promise<LibroCompraVenta[]> => {
  const cacheKey = `facturacion:libros-reporte:${JSON.stringify(params)}`;
  return cachedGet(cacheKey, async () => {
    const response = await apiPrivada.get<LibroCompraVenta[]>(
      '/facturacion/libro-compra-venta/reportes/',
      { params },
    );
    return response.data;
  });
};
