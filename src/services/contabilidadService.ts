/** @file Servicio del módulo de Contabilidad (partida doble): empresas, plan de cuentas, asientos y reportes. */
import { apiPrivada } from './api';

export interface EmpresaContable {
  id: number;
  nombre: string;
  identificacion_fiscal: string | null;
  cliente: number | null;
  cliente_nombre: string | null;
  activo: boolean;
  fecha_creacion: string;
  es_negocio_propio: boolean;
  cuenta_cobro_default: number | null;
  cuenta_ingreso_default: number | null;
  cuenta_iva_default: number | null;
}

export interface EmpresaContableRequest {
  nombre: string;
  identificacion_fiscal?: string | null;
  cliente?: number | null;
  es_negocio_propio?: boolean;
  cuenta_cobro_default?: number | null;
  cuenta_ingreso_default?: number | null;
  cuenta_iva_default?: number | null;
}

export type TipoCuenta = 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'costo' | 'gasto';
export type NaturalezaCuenta = 'deudora' | 'acreedora';

export interface CuentaContable {
  id: number;
  empresa: number;
  codigo: string;
  nombre: string;
  tipo: TipoCuenta;
  naturaleza: NaturalezaCuenta;
  cuenta_padre: number | null;
  acepta_movimiento: boolean;
  activo: boolean;
}

export interface CuentaContableRequest {
  empresa: number;
  codigo: string;
  nombre: string;
  tipo: TipoCuenta;
  cuenta_padre?: number | null;
  acepta_movimiento?: boolean;
}

export interface AsientoContableDetalle {
  id: number;
  cuenta: number;
  cuenta_codigo: string;
  cuenta_nombre: string;
  debe: string;
  haber: string;
  descripcion: string | null;
  orden: number;
}

export type EstadoAsiento = 'borrador' | 'contabilizado' | 'anulado';
export type OrigenAsiento = 'manual' | 'honorarios' | 'venta' | 'cierre';

export interface AsientoContable {
  id: number;
  empresa: number;
  numero: number;
  fecha: string;
  descripcion: string;
  estado: EstadoAsiento;
  origen: OrigenAsiento;
  comprobante: string | null;
  usuario: number | null;
  usuario_nombre: string | null;
  fecha_creacion: string;
  fecha_anulacion: string | null;
  detalles: AsientoContableDetalle[];
  total: string;
}

export interface LineaAsientoRequest {
  cuenta_id: number;
  debe?: number;
  haber?: number;
  descripcion?: string;
}

export interface CrearAsientoRequest {
  empresa: number;
  fecha: string;
  descripcion: string;
  lineas: LineaAsientoRequest[];
  estado?: 'borrador' | 'contabilizado';
}

export interface MovimientoLibroMayor {
  asiento_id: number;
  asiento_numero: number;
  fecha: string;
  descripcion: string;
  debe: string;
  haber: string;
  saldo: string;
}

export interface LibroMayorResponse {
  cuenta: { id: number; codigo: string; nombre: string };
  movimientos: MovimientoLibroMayor[];
  saldo_final: string;
}

export interface FilaBalanceComprobacion {
  cuenta_id: number;
  codigo: string;
  nombre: string;
  debe: string;
  haber: string;
  saldo: string;
}

export interface EstadosFinancierosResponse {
  balance_general: {
    activo: FilaBalanceComprobacion[];
    pasivo: FilaBalanceComprobacion[];
    patrimonio: FilaBalanceComprobacion[];
    total_activo: string;
    total_pasivo: string;
    total_patrimonio: string;
    utilidad_periodo: string;
    cuadra: boolean;
  };
  estado_resultados: {
    ingresos: FilaBalanceComprobacion[];
    costos: FilaBalanceComprobacion[];
    gastos: FilaBalanceComprobacion[];
    total_ingresos: string;
    total_costos: string;
    total_gastos: string;
    utilidad_periodo: string;
  };
}

// --- Empresas Contables ---

export const getEmpresasContables = async (): Promise<EmpresaContable[]> => {
  const response = await apiPrivada.get<EmpresaContable[]>('/contabilidad/empresas/');
  return response.data;
};

export const createEmpresaContable = async (data: EmpresaContableRequest): Promise<EmpresaContable> => {
  const response = await apiPrivada.post<EmpresaContable>('/contabilidad/empresas/', data);
  return response.data;
};

export const updateEmpresaContable = async (id: number, data: Partial<EmpresaContableRequest>): Promise<EmpresaContable> => {
  const response = await apiPrivada.patch<EmpresaContable>(`/contabilidad/empresas/${id}/`, data);
  return response.data;
};

export const deleteEmpresaContable = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/contabilidad/empresas/${id}/`);
};

// --- Plan de Cuentas ---

export const getCuentasContables = async (empresaId: number): Promise<CuentaContable[]> => {
  const response = await apiPrivada.get<CuentaContable[]>('/contabilidad/cuentas/', { params: { empresa: empresaId } });
  return response.data;
};

export const createCuentaContable = async (data: CuentaContableRequest): Promise<CuentaContable> => {
  const response = await apiPrivada.post<CuentaContable>('/contabilidad/cuentas/', data);
  return response.data;
};

export const updateCuentaContable = async (id: number, data: Partial<CuentaContableRequest>): Promise<CuentaContable> => {
  const response = await apiPrivada.patch<CuentaContable>(`/contabilidad/cuentas/${id}/`, data);
  return response.data;
};

export const deleteCuentaContable = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/contabilidad/cuentas/${id}/`);
};

// --- Asientos Contables ---

export const getAsientosContables = async (empresaId: number): Promise<AsientoContable[]> => {
  const response = await apiPrivada.get<AsientoContable[]>('/contabilidad/asientos/', { params: { empresa: empresaId } });
  return response.data;
};

export const crearAsientoContable = async (data: CrearAsientoRequest): Promise<AsientoContable> => {
  const response = await apiPrivada.post<AsientoContable>('/contabilidad/asientos/', data);
  return response.data;
};

export const anularAsientoContable = async (id: number): Promise<AsientoContable> => {
  const response = await apiPrivada.post<AsientoContable>(`/contabilidad/asientos/${id}/anular/`);
  return response.data;
};

export const contabilizarAsientoBorrador = async (id: number): Promise<AsientoContable> => {
  const response = await apiPrivada.post<AsientoContable>(`/contabilidad/asientos/${id}/contabilizar/`);
  return response.data;
};

export const subirComprobanteAsiento = async (id: number, archivo: File): Promise<AsientoContable> => {
  const formData = new FormData();
  formData.append('comprobante', archivo);
  const response = await apiPrivada.post<AsientoContable>(`/contabilidad/asientos/${id}/comprobante/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const guardarAsientoComoPlantilla = async (asientoId: number, nombre: string): Promise<AsientoPlantilla> => {
  const response = await apiPrivada.post<AsientoPlantilla>(`/contabilidad/asientos/${asientoId}/guardar-como-plantilla/`, { nombre });
  return response.data;
};

// --- Plantillas de Asiento ---

export interface AsientoPlantillaLinea {
  id: number;
  cuenta: number;
  cuenta_codigo: string;
  cuenta_nombre: string;
  debe: string;
  haber: string;
  descripcion: string | null;
  orden: number;
}

export interface AsientoPlantilla {
  id: number;
  empresa: number;
  nombre: string;
  descripcion_asiento: string;
  activo: boolean;
  fecha_creacion: string;
  lineas: AsientoPlantillaLinea[];
}

export const getPlantillasAsiento = async (empresaId: number): Promise<AsientoPlantilla[]> => {
  const response = await apiPrivada.get<AsientoPlantilla[]>('/contabilidad/plantillas/', { params: { empresa: empresaId } });
  return response.data;
};

export const eliminarPlantillaAsiento = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/contabilidad/plantillas/${id}/`);
};

// --- Cierre de Ejercicio ---

export interface CerrarEjercicioRequest {
  fecha_desde: string;
  fecha_hasta: string;
  cuenta_patrimonio_id: number;
}

export const cerrarEjercicio = async (empresaId: number, data: CerrarEjercicioRequest): Promise<AsientoContable> => {
  const response = await apiPrivada.post<AsientoContable>(`/contabilidad/empresas/${empresaId}/cerrar-ejercicio/`, data);
  return response.data;
};

// --- Conciliación Bancaria ---

export interface MovimientoConciliacion {
  detalle_id: number;
  asiento_id: number;
  asiento_numero: number;
  fecha: string;
  descripcion: string;
  debe: string;
  haber: string;
  conciliado: boolean;
  fecha_conciliacion: string | null;
}

export interface ConciliacionBancariaResponse {
  cuenta: { id: number; codigo: string; nombre: string };
  movimientos: MovimientoConciliacion[];
  saldo_libros: string;
  saldo_conciliado: string;
  diferencia: string;
}

export const getConciliacionBancaria = async (empresaId: number, cuentaId: number, hasta?: string): Promise<ConciliacionBancariaResponse> => {
  const response = await apiPrivada.get<ConciliacionBancariaResponse>('/contabilidad/conciliacion-bancaria/', {
    params: { empresa: empresaId, cuenta: cuentaId, hasta },
  });
  return response.data;
};

export const marcarMovimientoConciliado = async (empresaId: number, detalleId: number, conciliado: boolean): Promise<void> => {
  await apiPrivada.post('/contabilidad/conciliacion-bancaria/', { empresa: empresaId, detalle_id: detalleId, conciliado });
};

// --- Reportes ---

export const getLibroMayor = async (empresaId: number, cuentaId: number, desde?: string, hasta?: string): Promise<LibroMayorResponse> => {
  const response = await apiPrivada.get<LibroMayorResponse>('/contabilidad/reportes/libro-mayor/', {
    params: { empresa: empresaId, cuenta: cuentaId, desde, hasta },
  });
  return response.data;
};

export const getBalanceComprobacion = async (empresaId: number, desde?: string, hasta?: string): Promise<FilaBalanceComprobacion[]> => {
  const response = await apiPrivada.get<FilaBalanceComprobacion[]>('/contabilidad/reportes/balance-comprobacion/', {
    params: { empresa: empresaId, desde, hasta },
  });
  return response.data;
};

export const getEstadosFinancieros = async (empresaId: number, desde?: string, hasta?: string): Promise<EstadosFinancierosResponse> => {
  const response = await apiPrivada.get<EstadosFinancierosResponse>('/contabilidad/reportes/estados-financieros/', {
    params: { empresa: empresaId, desde, hasta },
  });
  return response.data;
};

// --- Facturación de Honorarios ---

export interface LineaHonorarioRequest {
  producto_id: number;
  cantidad?: number;
  monto: number;
}

export interface FacturarHonorariosRequest {
  lineas: LineaHonorarioRequest[];
  metodo_pago_id: number;
  cuenta_cobro_id: number;
  cuenta_ingreso_id: number;
  condicion_pago?: 'contado' | 'credito';
  moneda_id?: number;
}

export interface FacturarHonorariosResponse {
  mensaje: string;
  factura_id: number;
  correlativo: string | null;
  asiento_id: number | null;
  asiento_numero: number | null;
}

export const facturarHonorarios = async (empresaId: number, data: FacturarHonorariosRequest): Promise<FacturarHonorariosResponse> => {
  const response = await apiPrivada.post<FacturarHonorariosResponse>(`/contabilidad/empresas/${empresaId}/facturar-honorarios/`, data);
  return response.data;
};

// --- Exportar Reportes (PDF/Excel) ---

/** Descarga un reporte contable ya generado por el backend y dispara la descarga en el navegador. */
const descargarReporte = async (url: string, params: Record<string, string | number | undefined>, nombreArchivo: string): Promise<void> => {
  const response = await apiPrivada.get(url, { params, responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30_000);
};

export type FormatoExportacion = 'pdf' | 'excel';

const extensionPara = (formato: FormatoExportacion) => (formato === 'excel' ? 'xlsx' : 'pdf');

export const exportarBalanceComprobacion = (
  empresaId: number, formato: FormatoExportacion, desde?: string, hasta?: string,
): Promise<void> => descargarReporte(
  '/contabilidad/reportes/balance-comprobacion/exportar/',
  { empresa: empresaId, desde, hasta, formato },
  `balance_comprobacion.${extensionPara(formato)}`,
);

export const exportarEstadosFinancieros = (
  empresaId: number, formato: FormatoExportacion, desde?: string, hasta?: string,
): Promise<void> => descargarReporte(
  '/contabilidad/reportes/estados-financieros/exportar/',
  { empresa: empresaId, desde, hasta, formato },
  `estados_financieros.${extensionPara(formato)}`,
);

export const exportarLibroMayor = (
  empresaId: number, cuentaId: number, formato: FormatoExportacion, desde?: string, hasta?: string,
): Promise<void> => descargarReporte(
  '/contabilidad/reportes/libro-mayor/exportar/',
  { empresa: empresaId, cuenta: cuentaId, desde, hasta, formato },
  `libro_mayor.${extensionPara(formato)}`,
);
