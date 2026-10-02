/**
 * @file Servicio para encapsular la lógica de API del módulo de Proveedores.
 */
import { apiPrivada } from '@/services/api';
import {
  Proveedor, ProveedorRequest, CuentaPorPagar, RegistrarPagoProveedorRequest, FilaReporteCuentasPorPagar,
  OrdenCompra, CrearOrdenCompraRequest, FacturaCompra, CrearFacturaCompraRequest,
} from '@/types/api';

/**
 * Obtiene la lista de proveedores activos del tenant.
 * @returns {Promise<Proveedor[]>}
 */
export const getProveedores = async (): Promise<Proveedor[]> => {
  const response = await apiPrivada.get<Proveedor[]>('/proveedores/proveedores/');
  return response.data;
};

/**
 * Crea un nuevo proveedor.
 * @param {ProveedorRequest} data - Los datos del proveedor a crear.
 * @returns {Promise<Proveedor>}
 */
export const createProveedor = async (data: ProveedorRequest): Promise<Proveedor> => {
  const response = await apiPrivada.post<Proveedor>('/proveedores/proveedores/', data);
  return response.data;
};

/**
 * Actualiza un proveedor existente.
 * @param {number} id - El ID del proveedor a actualizar.
 * @param {ProveedorRequest} data - Los datos actualizados del proveedor.
 * @returns {Promise<Proveedor>}
 */
export const updateProveedor = async (id: number, data: ProveedorRequest): Promise<Proveedor> => {
  const response = await apiPrivada.put<Proveedor>(`/proveedores/proveedores/${id}/`, data);
  return response.data;
};

/**
 * Elimina (desactiva) un proveedor por su ID.
 * @param {number} id - El ID del proveedor a eliminar.
 */
export const deleteProveedor = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/proveedores/proveedores/${id}/`);
};

// --- Cuentas por Pagar ---

/** Cuentas por pagar -- se crean solas al registrar una factura de compra. */
export const getCuentasPorPagar = async (estado?: string): Promise<CuentaPorPagar[]> => {
  const response = await apiPrivada.get<CuentaPorPagar[]>('/proveedores/cuentas-por-pagar/', {
    params: estado ? { estado } : undefined,
  });
  return response.data;
};

export const registrarPagoProveedor = async (cuentaId: number, data: RegistrarPagoProveedorRequest): Promise<CuentaPorPagar> => {
  const response = await apiPrivada.post<CuentaPorPagar>(`/proveedores/cuentas-por-pagar/${cuentaId}/registrar-pago/`, data);
  return response.data;
};

/** Reporte de antigüedad de saldos (0-30/31-60/61-90/90+ días) agrupado por proveedor. */
export const getReporteCuentasPorPagar = async (): Promise<FilaReporteCuentasPorPagar[]> => {
  const response = await apiPrivada.get<FilaReporteCuentasPorPagar[]>('/proveedores/reportes/cuentas-por-pagar/');
  return response.data;
};

// --- Órdenes de Compra ---

export const getOrdenesCompra = async (estado?: string): Promise<OrdenCompra[]> => {
  const response = await apiPrivada.get<OrdenCompra[]>('/proveedores/ordenes-compra/', {
    params: estado ? { estado } : undefined,
  });
  return response.data;
};

export const crearOrdenCompra = async (data: CrearOrdenCompraRequest): Promise<OrdenCompra> => {
  const response = await apiPrivada.post<OrdenCompra>('/proveedores/ordenes-compra/', data);
  return response.data;
};

export const enviarOrdenCompra = async (ordenId: number): Promise<OrdenCompra> => {
  const response = await apiPrivada.post<OrdenCompra>(`/proveedores/ordenes-compra/${ordenId}/enviar/`);
  return response.data;
};

export const cancelarOrdenCompra = async (ordenId: number): Promise<OrdenCompra> => {
  const response = await apiPrivada.post<OrdenCompra>(`/proveedores/ordenes-compra/${ordenId}/cancelar/`);
  return response.data;
};

// --- Facturas de Compra ---

export interface FiltrosFacturasCompra {
  proveedor?: number;
  estado?: string;
  tipo_documento?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export const getFacturasCompra = async (filtros: FiltrosFacturasCompra = {}): Promise<FacturaCompra[]> => {
  const response = await apiPrivada.get<FacturaCompra[]>('/proveedores/facturas-compra/', { params: filtros });
  return response.data;
};

/**
 * Registra una compra: mueve el inventario, crea la cuenta por pagar, la
 * asienta, la anota en el Libro de Compras y emite la retención de IVA si se
 * indicó. Con `orden_compra_id`, además recibe esas líneas de la orden.
 */
export const crearFacturaCompra = async (data: CrearFacturaCompraRequest): Promise<FacturaCompra> => {
  const response = await apiPrivada.post<FacturaCompra>('/proveedores/facturas-compra/', data);
  return response.data;
};

export const anularFacturaCompra = async (id: number): Promise<FacturaCompra> => {
  const response = await apiPrivada.post<FacturaCompra>(`/proveedores/facturas-compra/${id}/anular/`);
  return response.data;
};
