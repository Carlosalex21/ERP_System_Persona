/**
 * @file API del panel de inmuebles (condominios e inmobiliaria).
 * Montos en USD como string decimal (así los devuelve el backend).
 */
import { apiPrivada, enviarMultipart } from '@/services/api';
import { getPagina, type Pagina } from '@/services/paginacion';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type TipoUnidad =
  | 'apartamento' | 'casa' | 'townhouse' | 'local' | 'oficina' | 'galpon' | 'terreno' | 'estacionamiento' | 'deposito' | 'otro';
export type EstadoUnidad = 'ocupada' | 'disponible' | 'mantenimiento';
export type OperacionUnidad = 'ninguna' | 'alquiler' | 'venta' | 'alquiler_venta';
export type TipoMedioPago = 'transferencia' | 'pago_movil' | 'zelle' | 'efectivo' | 'deposito' | 'otro';

export interface Edificio {
  id: number;
  nombre: string;
  direccion: string;
  rif: string;
  dia_vencimiento: number;
  mora_pct_mensual: string;
  dias_gracia: number;
  fondo_reserva_pct: string;
  portal_muestra_morosidad: boolean;
  activo: boolean;
  unidades_count: number;
}

export type EdificioInput = Partial<Omit<Edificio, 'id' | 'unidades_count'>> & { nombre: string };

export interface UnidadFoto {
  id: number;
  url: string;
  orden: number;
  es_portada: boolean;
}

export interface Unidad {
  id: number;
  edificio: number | null;
  edificio_nombre: string | null;
  codigo: string;
  tipo: TipoUnidad;
  estado: EstadoUnidad;
  alicuota: string;
  area_m2: string | null;
  propietario: number | null;
  propietario_nombre: string | null;
  ocupante: number | null;
  ocupante_nombre: string | null;
  operacion: OperacionUnidad;
  publicada: boolean;
  titulo: string;
  descripcion: string;
  direccion: string;
  zona: string;
  ciudad: string;
  precio_venta_usd: string | null;
  canon_usd: string | null;
  habitaciones: number | null;
  banos: number | null;
  estacionamientos: number | null;
  area_construida_m2: string | null;
  amenidades: string[];
  activo: boolean;
  portada_url: string | null;
  fotos: UnidadFoto[];
  saldo_pendiente_usd: string;
  vencido_usd: string;
}

export type UnidadInput = Partial<Omit<Unidad, 'id' | 'edificio_nombre' | 'propietario_nombre' | 'ocupante_nombre' | 'portada_url' | 'fotos' | 'saldo_pendiente_usd' | 'vencido_usd'>> & { codigo: string };

export interface MedioPago {
  id: number;
  edificio: number | null;
  edificio_nombre: string | null;
  tipo: TipoMedioPago;
  titular: string;
  documento_titular: string;
  banco: string;
  numero_cuenta: string;
  moneda: string;
  instrucciones: string;
  activo: boolean;
}

export type CategoriaGasto =
  | 'agua' | 'electricidad' | 'aseo' | 'vigilancia' | 'mantenimiento' | 'ascensor' | 'jardineria' | 'administracion' | 'seguros' | 'legales' | 'otros';

export interface GastoComun {
  id: number;
  edificio: number;
  periodo: string;
  categoria: CategoriaGasto;
  categoria_display: string;
  descripcion: string;
  monto_usd: string;
  proveedor: number | null;
  proveedor_nombre: string | null;
  fecha: string;
  comprobante_url: string | null;
}

export interface PeriodoCondominio {
  id: number;
  edificio: number;
  edificio_nombre: string;
  periodo: string;
  estado: 'emitido' | 'anulado';
  total_gastos_usd: string;
  fondo_reserva_usd: string;
  total_distribuido_usd: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  cuotas: number;
  cobrado_usd: string;
}

export interface VistaPreviaPeriodo {
  edificio_id: number;
  periodo: string;
  ya_emitido: boolean;
  gastos_cantidad: number;
  total_gastos_usd: string;
  fondo_reserva_usd: string;
  total_a_distribuir_usd: string;
  suma_alicuotas: string;
  alicuotas_completas: boolean;
  vencimiento_sugerido: string;
  unidades: { unidad_id: number; codigo: string; alicuota: string; responsable: string | null; monto_usd: string }[];
  advertencias: string[];
}

export type TipoCargo = 'cuota_condominio' | 'canon' | 'extraordinaria' | 'multa' | 'mora' | 'deposito' | 'otro';

export interface Cargo {
  id: number;
  unidad: number;
  unidad_codigo: string;
  edificio_nombre: string | null;
  pagador: number | null;
  pagador_nombre: string | null;
  tipo: TipoCargo;
  tipo_display: string;
  concepto: string;
  periodo: string;
  monto_usd: string;
  monto_pagado_usd: string;
  saldo_usd: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  estado: 'pendiente' | 'pagado' | 'anulado';
  vencido: boolean;
  periodo_condominio: number | null;
  contrato: number | null;
}

export interface Aplicacion { id: number; cargo: number; concepto: string; periodo: string; monto_usd: string }

export interface Recibo {
  id: number;
  numero: string;
  unidad: number;
  unidad_codigo: string;
  edificio_nombre: string | null;
  pagador_nombre: string | null;
  fecha: string;
  metodo: TipoMedioPago;
  metodo_display: string;
  referencia: string;
  banco: string;
  moneda_pago: string;
  monto_pago: string;
  tasa: string;
  monto_usd: string;
  monto_disponible_usd: string;
  comprobante_url: string | null;
  estado: 'confirmado' | 'anulado';
  observaciones: string;
  aplicaciones: Aplicacion[];
}

export interface RegistrarReciboInput {
  unidad: number;
  fecha: string;
  monto_pago: string;
  moneda_pago: string;
  tasa?: string | null;
  metodo: TipoMedioPago;
  referencia?: string;
  banco?: string;
  cargos?: number[];
  observaciones?: string;
  comprobante?: File | null;
}

export interface PagoReportado {
  id: number;
  unidad: number;
  unidad_codigo: string;
  edificio_nombre: string | null;
  cliente_nombre: string | null;
  metodo: TipoMedioPago;
  metodo_display: string;
  fecha_pago: string;
  referencia: string;
  banco: string;
  moneda_pago: string;
  monto_pago: string;
  nota: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  motivo_rechazo: string;
  comprobante_url: string | null;
  recibo_numero: string | null;
  cargos_detalle: { id: number; concepto: string; saldo_usd: string }[];
  fecha_creacion: string;
}

export type EstadoContrato = 'borrador' | 'vigente' | 'vencido' | 'rescindido';

export interface Contrato {
  id: number;
  unidad: number;
  unidad_codigo: string;
  edificio_nombre: string | null;
  inquilino: number;
  inquilino_nombre: string;
  propietario: number | null;
  propietario_nombre: string | null;
  estado: EstadoContrato;
  fecha_inicio: string;
  fecha_fin: string;
  canon_usd: string;
  dia_pago: number;
  deposito_usd: string;
  honorario_pct: string;
  ajuste_anual_pct: string;
  mora_pct_mensual: string;
  dias_gracia: number;
  documento_url: string | null;
  observaciones: string;
  dias_para_vencer: number | null;
}

export interface ContratoInput {
  unidad: number;
  inquilino: number;
  fecha_inicio: string;
  fecha_fin: string;
  canon_usd: string;
  dia_pago: number;
  deposito_usd: string;
  honorario_pct: string;
  ajuste_anual_pct: string;
  mora_pct_mensual: string;
  dias_gracia: number;
  observaciones?: string;
}

export interface GastoPropiedad {
  id: number;
  unidad: number;
  unidad_codigo: string;
  propietario_nombre: string | null;
  fecha: string;
  descripcion: string;
  monto_usd: string;
  liquidacion: number | null;
  comprobante_url: string | null;
}

export interface LiquidacionLinea { id: number; unidad_codigo: string; tipo: 'canon' | 'honorario' | 'gasto'; descripcion: string; monto_usd: string }

export interface Liquidacion {
  id: number;
  propietario: number;
  propietario_nombre: string;
  periodo: string;
  estado: 'borrador' | 'pagada' | 'anulada';
  total_cobrado_usd: string;
  honorario_usd: string;
  gastos_usd: string;
  neto_usd: string;
  fecha_pago: string | null;
  referencia_pago: string;
  observaciones: string;
  lineas: LiquidacionLinea[];
}

export interface VistaPreviaLiquidacion {
  propietario_id: number;
  hay_movimientos: boolean;
  total_cobrado_usd: string;
  honorario_usd: string;
  gastos_usd: string;
  neto_usd: string;
  lineas: { tipo: string; descripcion: string; monto_usd: string }[];
}

export interface ConsultaPropiedad {
  id: number;
  unidad: number | null;
  unidad_codigo: string | null;
  unidad_titulo: string | null;
  nombre: string;
  telefono: string;
  email: string;
  mensaje: string;
  estado: 'nueva' | 'contactada' | 'cerrada';
  notas: string;
  fecha_creacion: string;
}

export interface FilaMorosidad {
  unidad_id: number;
  unidad: string;
  edificio_id: number | null;
  edificio: string;
  responsable_id: number | null;
  responsable: string;
  telefono: string | null;
  total_vencido_usd: string;
  '0_30': string;
  '31_60': string;
  '61_90': string;
  mas_90: string;
  meses_vencidos: number;
  dias_atraso: number;
  deuda_mas_antigua: string;
  cargos: number;
}

export interface ReporteMorosidad {
  fecha_corte: string;
  resumen: { unidades_morosas: number; total_unidades: number; porcentaje_morosidad: string; total_vencido_usd: string };
  filas: FilaMorosidad[];
}

export interface Recordatorio {
  unidad_id: number;
  responsable_id: number | null;
  telefono: string;
  responsable: string;
  unidad: string;
  total_vencido_usd: string;
  meses_vencidos: number;
}

export interface EstadoCuenta {
  unidad_id: number;
  unidad: string;
  hasta: string;
  saldo_usd: string;
  vencido_usd: string;
  saldo_a_favor_usd: string;
  movimientos: { fecha: string; tipo: 'cargo' | 'pago'; concepto: string; periodo: string; debe: string; haber: string; saldo: string; vencimiento: string | null; referencia: string }[];
}

export interface TableroInmuebles {
  cartera_vencida_usd: string;
  cartera_por_vencer_usd: string;
  cobrado_mes_usd: string;
  facturado_mes_usd: string;
  morosidad: ReporteMorosidad['resumen'];
  top_morosos: FilaMorosidad[];
  unidades_por_estado: Record<string, number>;
  unidades_total: number;
  contratos_vigentes: number;
  contratos_por_vencer: Record<'30' | '60' | '90', number>;
  contratos_vencidos_con_inquilino: number;
  pagos_por_revisar: number;
  consultas_nuevas: number;
}

export interface ResumenImportacion { creadas: number; con_error: number; errores: { fila: number; codigo: string; error: string }[] }

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const BASE = '/inmuebles';
type Filtros = Record<string, string | number | boolean | undefined | null>;

const limpiar = (filtros: Filtros = {}): Record<string, string | number | boolean> =>
  Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Record<string, string | number | boolean>;

/** Abre un PDF del backend en otra pestaña (la descarga lleva el token, por eso pasa por axios y no por un enlace directo). */
export async function abrirPdf(ruta: string, descargarComo?: string): Promise<void> {
  const respuesta = await apiPrivada.get(`${BASE}${ruta}`, { responseType: 'blob', params: descargarComo ? { download: 1 } : undefined });
  const url = URL.createObjectURL(new Blob([respuesta.data], { type: 'application/pdf' }));
  if (descargarComo) {
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `${descargarComo}.pdf`;
    enlace.click();
  } else {
    window.open(url, '_blank', 'noopener');
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ---------------------------------------------------------------------------
// Edificios
// ---------------------------------------------------------------------------

export const getEdificios = async (): Promise<Edificio[]> => (await apiPrivada.get<Edificio[]>(`${BASE}/edificios/`, { params: { activo: true } })).data;
export const crearEdificio = async (d: EdificioInput): Promise<Edificio> => (await apiPrivada.post<Edificio>(`${BASE}/edificios/`, d)).data;
export const actualizarEdificio = async (id: number, d: Partial<EdificioInput>): Promise<Edificio> => (await apiPrivada.patch<Edificio>(`${BASE}/edificios/${id}/`, d)).data;
export const eliminarEdificio = async (id: number): Promise<void> => { await apiPrivada.delete(`${BASE}/edificios/${id}/`); };

// ---------------------------------------------------------------------------
// Unidades / propiedades (un mismo recurso con dos nombres de ruta)
// ---------------------------------------------------------------------------

export type RecursoUnidad = 'unidades' | 'propiedades';

export const getUnidades = async (filtros: Filtros = {}, recurso: RecursoUnidad = 'unidades'): Promise<Unidad[]> =>
  (await apiPrivada.get<Unidad[]>(`${BASE}/${recurso}/`, { params: limpiar({ activo: true, ...filtros }) })).data;

export const getPaginaUnidades = (filtros: Filtros, pagina: number, recurso: RecursoUnidad = 'unidades', tamano = 20): Promise<Pagina<Unidad>> =>
  getPagina<Unidad>(`${BASE}/${recurso}/`, { activo: true, ...filtros }, pagina, tamano);

export const crearUnidad = async (d: UnidadInput, recurso: RecursoUnidad = 'unidades'): Promise<Unidad> => (await apiPrivada.post<Unidad>(`${BASE}/${recurso}/`, d)).data;
export const actualizarUnidad = async (id: number, d: Partial<UnidadInput>, recurso: RecursoUnidad = 'unidades'): Promise<Unidad> =>
  (await apiPrivada.patch<Unidad>(`${BASE}/${recurso}/${id}/`, d)).data;
export const eliminarUnidad = async (id: number, recurso: RecursoUnidad = 'unidades'): Promise<void> => { await apiPrivada.delete(`${BASE}/${recurso}/${id}/`); };

export const subirFotoUnidad = (id: number, archivo: File, recurso: RecursoUnidad = 'propiedades'): Promise<UnidadFoto> => {
  const fd = new FormData();
  fd.append('imagen', archivo);
  return enviarMultipart<UnidadFoto>('POST', `${BASE}/${recurso}/${id}/fotos/`, fd);
};
export const marcarPortada = async (unidadId: number, fotoId: number, recurso: RecursoUnidad = 'propiedades'): Promise<void> => { await apiPrivada.post(`${BASE}/${recurso}/${unidadId}/fotos/${fotoId}/`); };
export const eliminarFoto = async (unidadId: number, fotoId: number, recurso: RecursoUnidad = 'propiedades'): Promise<void> => { await apiPrivada.delete(`${BASE}/${recurso}/${unidadId}/fotos/${fotoId}/`); };

export const importarUnidades = (archivo: File, edificioId?: number): Promise<ResumenImportacion> => {
  const fd = new FormData();
  fd.append('archivo', archivo);
  if (edificioId) fd.append('edificio', String(edificioId));
  return enviarMultipart<ResumenImportacion>('POST', `${BASE}/unidades/importar/`, fd);
};

export async function descargarPlantillaUnidades(): Promise<void> {
  const r = await apiPrivada.get(`${BASE}/unidades/plantilla-csv/`, { responseType: 'blob' });
  const url = URL.createObjectURL(r.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_unidades.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const getEstadoCuenta = async (unidadId: number): Promise<EstadoCuenta> => (await apiPrivada.get<EstadoCuenta>(`${BASE}/unidades/${unidadId}/estado-cuenta/`)).data;
export const pdfEstadoCuenta = (unidadId: number) => abrirPdf(`/unidades/${unidadId}/estado-cuenta-pdf/`);
export const pdfSolvencia = (unidadId: number) => abrirPdf(`/unidades/${unidadId}/solvencia-pdf/`);

// ---------------------------------------------------------------------------
// Medios de cobro
// ---------------------------------------------------------------------------

export const getMediosPago = async (): Promise<MedioPago[]> => (await apiPrivada.get<MedioPago[]>(`${BASE}/medios-pago/`)).data;
export const crearMedioPago = async (d: Partial<MedioPago>): Promise<MedioPago> => (await apiPrivada.post<MedioPago>(`${BASE}/medios-pago/`, d)).data;
export const actualizarMedioPago = async (id: number, d: Partial<MedioPago>): Promise<MedioPago> => (await apiPrivada.patch<MedioPago>(`${BASE}/medios-pago/${id}/`, d)).data;
export const eliminarMedioPago = async (id: number): Promise<void> => { await apiPrivada.delete(`${BASE}/medios-pago/${id}/`); };

// ---------------------------------------------------------------------------
// Condominios: gastos y períodos
// ---------------------------------------------------------------------------

export const getGastosComunes = async (filtros: Filtros): Promise<GastoComun[]> => (await apiPrivada.get<GastoComun[]>(`${BASE}/gastos-comunes/`, { params: limpiar(filtros) })).data;

export type GastoComunInput = { edificio: number; periodo: string; categoria: CategoriaGasto; descripcion: string; monto_usd: string; fecha: string; proveedor?: number | null; comprobante?: File | null };

/** Con comprobante adjunto viaja como formulario (archivo); sin él, como JSON. */
function cuerpoGasto(d: Partial<GastoComunInput>): { json?: Partial<GastoComunInput>; form?: FormData } {
  const { comprobante, ...resto } = d;
  if (!comprobante) return { json: resto };
  const fd = new FormData();
  Object.entries(resto).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') fd.append(k, String(v)); });
  fd.append('comprobante', comprobante);
  return { form: fd };
}

export const crearGastoComun = async (d: GastoComunInput): Promise<GastoComun> => {
  const { json, form } = cuerpoGasto(d);
  return form ? enviarMultipart<GastoComun>('POST', `${BASE}/gastos-comunes/`, form) : (await apiPrivada.post<GastoComun>(`${BASE}/gastos-comunes/`, json)).data;
};
export const actualizarGastoComun = async (id: number, d: Partial<GastoComunInput>): Promise<GastoComun> => {
  const { json, form } = cuerpoGasto(d);
  return form ? enviarMultipart<GastoComun>('PATCH', `${BASE}/gastos-comunes/${id}/`, form) : (await apiPrivada.patch<GastoComun>(`${BASE}/gastos-comunes/${id}/`, json)).data;
};
export const eliminarGastoComun = async (id: number): Promise<void> => { await apiPrivada.delete(`${BASE}/gastos-comunes/${id}/`); };

export const getPeriodos = async (filtros: Filtros = {}): Promise<PeriodoCondominio[]> => (await apiPrivada.get<PeriodoCondominio[]>(`${BASE}/periodos-condominio/`, { params: limpiar(filtros) })).data;
export const previsualizarPeriodo = async (edificio: number, periodo: string): Promise<VistaPreviaPeriodo> =>
  (await apiPrivada.get<VistaPreviaPeriodo>(`${BASE}/periodos-condominio/previsualizar/`, { params: { edificio, periodo } })).data;
export const emitirPeriodo = async (d: { edificio: number; periodo: string; fecha_vencimiento?: string; forzar_alicuotas?: boolean }): Promise<PeriodoCondominio> =>
  (await apiPrivada.post<PeriodoCondominio>(`${BASE}/periodos-condominio/emitir/`, d)).data;
export const anularPeriodo = async (id: number): Promise<PeriodoCondominio> => (await apiPrivada.post<PeriodoCondominio>(`${BASE}/periodos-condominio/${id}/anular/`)).data;

// ---------------------------------------------------------------------------
// Cobranza
// ---------------------------------------------------------------------------

export const getPaginaCargos = (filtros: Filtros, pagina: number): Promise<Pagina<Cargo>> => getPagina<Cargo>(`${BASE}/cargos/`, filtros, pagina);
export const getCargos = async (filtros: Filtros): Promise<Cargo[]> => (await apiPrivada.get<Cargo[]>(`${BASE}/cargos/`, { params: limpiar(filtros) })).data;
export const crearCargo = async (d: { unidad: number; tipo: 'extraordinaria' | 'multa' | 'otro'; concepto: string; periodo: string; monto_usd: string; fecha_vencimiento: string }): Promise<Cargo> =>
  (await apiPrivada.post<Cargo>(`${BASE}/cargos/`, d)).data;
export const anularCargo = async (id: number): Promise<Cargo> => (await apiPrivada.post<Cargo>(`${BASE}/cargos/${id}/anular/`)).data;
export const pdfReciboCondominio = (cargoId: number) => abrirPdf(`/cargos/${cargoId}/recibo-condominio-pdf/`);

export const getPaginaRecibos = (filtros: Filtros, pagina: number): Promise<Pagina<Recibo>> => getPagina<Recibo>(`${BASE}/recibos/`, filtros, pagina);
export const registrarRecibo = async (d: RegistrarReciboInput): Promise<Recibo> => {
  const { comprobante, ...resto } = d;
  if (!comprobante) return (await apiPrivada.post<Recibo>(`${BASE}/recibos/`, resto)).data;
  const fd = new FormData();
  Object.entries(resto).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) v.forEach((x) => fd.append(k, String(x)));
    else fd.append(k, String(v));
  });
  fd.append('comprobante', comprobante);
  return enviarMultipart<Recibo>('POST', `${BASE}/recibos/`, fd);
};
export const anularRecibo = async (id: number, motivo: string): Promise<Recibo> => (await apiPrivada.post<Recibo>(`${BASE}/recibos/${id}/anular/`, { motivo })).data;
export const pdfRecibo = (id: number, numero?: string) => abrirPdf(`/recibos/${id}/pdf/`, numero);

export const getPagosReportados = async (filtros: Filtros): Promise<PagoReportado[]> => (await apiPrivada.get<PagoReportado[]>(`${BASE}/pagos-reportados/`, { params: limpiar(filtros) })).data;
export const aprobarPagoReportado = async (id: number, d: { tasa?: string | null; monto_pago?: string | null; observaciones?: string }): Promise<PagoReportado> =>
  (await apiPrivada.post<PagoReportado>(`${BASE}/pagos-reportados/${id}/aprobar/`, d)).data;
export const rechazarPagoReportado = async (id: number, motivo: string): Promise<PagoReportado> => (await apiPrivada.post<PagoReportado>(`${BASE}/pagos-reportados/${id}/rechazar/`, { motivo })).data;

export const getAccesoPortal = async (cliente: number): Promise<{ token: string; nombre: string; telefono: string | null }> =>
  (await apiPrivada.get(`${BASE}/portal-accesos/`, { params: { cliente } })).data;
export const regenerarAccesoPortal = async (cliente: number): Promise<{ token: string; nombre: string; telefono: string | null }> =>
  (await apiPrivada.post(`${BASE}/portal-accesos/`, { cliente, regenerar: true })).data;
export const revocarAccesoPortal = async (cliente: number): Promise<void> => { await apiPrivada.delete(`${BASE}/portal-accesos/`, { data: { cliente } }); };

// ---------------------------------------------------------------------------
// Inmobiliaria
// ---------------------------------------------------------------------------

export const getContratos = async (filtros: Filtros = {}): Promise<Contrato[]> => (await apiPrivada.get<Contrato[]>(`${BASE}/contratos/`, { params: limpiar(filtros) })).data;
export const getPaginaContratos = (filtros: Filtros, pagina: number): Promise<Pagina<Contrato>> => getPagina<Contrato>(`${BASE}/contratos/`, filtros, pagina);
export const crearContrato = async (d: ContratoInput): Promise<Contrato> => (await apiPrivada.post<Contrato>(`${BASE}/contratos/`, d)).data;
export const actualizarContrato = async (id: number, d: Partial<ContratoInput>): Promise<Contrato> => (await apiPrivada.patch<Contrato>(`${BASE}/contratos/${id}/`, d)).data;
export const eliminarContrato = async (id: number): Promise<void> => { await apiPrivada.delete(`${BASE}/contratos/${id}/`); };
export const activarContrato = async (id: number, cobrarDeposito = true): Promise<Contrato> => (await apiPrivada.post<Contrato>(`${BASE}/contratos/${id}/activar/`, { cobrar_deposito: cobrarDeposito })).data;
export const rescindirContrato = async (id: number, d: { fecha?: string; motivo?: string }): Promise<Contrato> => (await apiPrivada.post<Contrato>(`${BASE}/contratos/${id}/rescindir/`, d)).data;
export const renovarContrato = async (id: number, d: { nueva_fecha_fin: string; nuevo_canon?: string | null }): Promise<Contrato> => (await apiPrivada.post<Contrato>(`${BASE}/contratos/${id}/renovar/`, d)).data;

export const getGastosPropiedad = async (filtros: Filtros = {}): Promise<GastoPropiedad[]> => (await apiPrivada.get<GastoPropiedad[]>(`${BASE}/gastos-propiedad/`, { params: limpiar(filtros) })).data;
export const crearGastoPropiedad = async (d: { unidad: number; fecha: string; descripcion: string; monto_usd: string }): Promise<GastoPropiedad> => (await apiPrivada.post<GastoPropiedad>(`${BASE}/gastos-propiedad/`, d)).data;
export const eliminarGastoPropiedad = async (id: number): Promise<void> => { await apiPrivada.delete(`${BASE}/gastos-propiedad/${id}/`); };

export const getLiquidaciones = async (filtros: Filtros = {}): Promise<Liquidacion[]> => (await apiPrivada.get<Liquidacion[]>(`${BASE}/liquidaciones/`, { params: limpiar(filtros) })).data;
export const previsualizarLiquidacion = async (propietario: number): Promise<VistaPreviaLiquidacion> =>
  (await apiPrivada.get<VistaPreviaLiquidacion>(`${BASE}/liquidaciones/previsualizar/`, { params: { propietario } })).data;
export const generarLiquidacion = async (d: { propietario: number; observaciones?: string }): Promise<Liquidacion> => (await apiPrivada.post<Liquidacion>(`${BASE}/liquidaciones/generar/`, d)).data;
export const pagarLiquidacion = async (id: number, d: { fecha?: string; referencia?: string }): Promise<Liquidacion> => (await apiPrivada.post<Liquidacion>(`${BASE}/liquidaciones/${id}/pagar/`, d)).data;
export const anularLiquidacion = async (id: number): Promise<Liquidacion> => (await apiPrivada.post<Liquidacion>(`${BASE}/liquidaciones/${id}/anular/`)).data;
export const pdfLiquidacion = (id: number) => abrirPdf(`/liquidaciones/${id}/pdf/`);

export const getConsultas = async (filtros: Filtros = {}): Promise<ConsultaPropiedad[]> => (await apiPrivada.get<ConsultaPropiedad[]>(`${BASE}/consultas/`, { params: limpiar(filtros) })).data;
export const actualizarConsulta = async (id: number, d: { estado?: ConsultaPropiedad['estado']; notas?: string }): Promise<ConsultaPropiedad> =>
  (await apiPrivada.patch<ConsultaPropiedad>(`${BASE}/consultas/${id}/`, d)).data;

// ---------------------------------------------------------------------------
// Reportes
// ---------------------------------------------------------------------------

export const getReporteMorosidad = async (filtros: Filtros = {}): Promise<ReporteMorosidad> => (await apiPrivada.get<ReporteMorosidad>(`${BASE}/reportes/morosidad/`, { params: limpiar(filtros) })).data;
export const getRecordatorios = async (filtros: Filtros = {}): Promise<Recordatorio[]> => (await apiPrivada.get<Recordatorio[]>(`${BASE}/reportes/recordatorios/`, { params: limpiar(filtros) })).data;
export const getTableroInmuebles = async (): Promise<TableroInmuebles> => (await apiPrivada.get<TableroInmuebles>(`${BASE}/reportes/tablero/`)).data;
