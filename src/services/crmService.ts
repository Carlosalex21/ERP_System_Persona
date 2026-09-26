/** @file Servicio del CRM ligero: oportunidades (pipeline comercial) y cotizaciones formales. */
import { apiPrivada } from './api';

export type EtapaOportunidad = 'nuevo' | 'contactado' | 'cotizado' | 'negociacion' | 'ganado' | 'perdido';

export interface Oportunidad {
  id: number;
  titulo: string;
  cliente: number | null;
  cliente_nombre: string | null;
  nombre_prospecto: string;
  telefono_prospecto: string;
  nombre_contacto: string;
  etapa: EtapaOportunidad;
  valor_estimado: string | null;
  fecha_cierre_estimada: string | null;
  proximo_seguimiento: string | null;
  usuario_asignado: number | null;
  usuario_asignado_nombre: string | null;
  departamento: number | null;
  departamento_nombre: string | null;
  observaciones: string;
  motivo_perdida: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface OportunidadRequest {
  titulo: string;
  cliente?: number | null;
  nombre_prospecto?: string;
  telefono_prospecto?: string;
  valor_estimado?: string | null;
  fecha_cierre_estimada?: string | null;
  proximo_seguimiento?: string | null;
  usuario_asignado?: number | null;
  departamento?: number | null;
  observaciones?: string;
}

export const ETAPAS_OPORTUNIDAD: { value: EtapaOportunidad; label: string }[] = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'contactado', label: 'Contactado' },
  { value: 'cotizado', label: 'Cotizado' },
  { value: 'negociacion', label: 'En negociación' },
  { value: 'ganado', label: 'Ganado' },
  { value: 'perdido', label: 'Perdido' },
];

export const getOportunidades = async (etapa?: string): Promise<Oportunidad[]> => {
  const response = await apiPrivada.get<Oportunidad[]>('/crm/oportunidades/', { params: etapa ? { etapa } : undefined });
  return response.data;
};

export const crearOportunidad = async (data: OportunidadRequest): Promise<Oportunidad> => {
  const response = await apiPrivada.post<Oportunidad>('/crm/oportunidades/', data);
  return response.data;
};

export const cambiarEtapaOportunidad = async (id: number, etapa: EtapaOportunidad, motivoPerdida?: string): Promise<Oportunidad> => {
  const response = await apiPrivada.post<Oportunidad>(`/crm/oportunidades/${id}/cambiar-etapa/`, { etapa, motivo_perdida: motivoPerdida });
  return response.data;
};

// --- Cotizaciones ---

export type EstadoCotizacion = 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'vencida' | 'convertida';

export interface CotizacionDetalle {
  id: number;
  producto: number;
  producto_nombre: string;
  variante: number | null;
  variante_nombre: string | null;
  cantidad: number;
  precio_unitario: string;
  subtotal_linea: string;
}

export interface Cotizacion {
  id: number;
  numero: string;
  oportunidad: number | null;
  cliente: number | null;
  cliente_nombre: string | null;
  nombre_prospecto: string;
  telefono_prospecto: string;
  nombre_contacto: string;
  estado: EstadoCotizacion;
  moneda: number | null;
  moneda_codigo: string | null;
  subtotal: string;
  iva_total: string;
  total: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  observaciones: string;
  usuario: number | null;
  usuario_nombre: string | null;
  factura_generada: number | null;
  token_publico: string;
  fecha_creacion: string;
  detalles: CotizacionDetalle[];
}

export interface CotizacionDetalleRequest {
  producto_id: number;
  variante_id?: number | null;
  cantidad: number;
  precio_unitario: string;
}

export interface CrearCotizacionRequest {
  cliente_id?: number | null;
  nombre_prospecto?: string;
  telefono_prospecto?: string;
  oportunidad_id?: number | null;
  moneda_id?: number | null;
  fecha_vencimiento?: string | null;
  observaciones?: string;
  detalles: CotizacionDetalleRequest[];
}

export const getCotizaciones = async (estado?: string): Promise<Cotizacion[]> => {
  const response = await apiPrivada.get<Cotizacion[]>('/crm/cotizaciones/', { params: estado ? { estado } : undefined });
  return response.data;
};

export const crearCotizacion = async (data: CrearCotizacionRequest): Promise<Cotizacion> => {
  const response = await apiPrivada.post<Cotizacion>('/crm/cotizaciones/', data);
  return response.data;
};

export const cambiarEstadoCotizacion = async (id: number, estado: EstadoCotizacion): Promise<Cotizacion> => {
  const response = await apiPrivada.post<Cotizacion>(`/crm/cotizaciones/${id}/cambiar-estado/`, { estado });
  return response.data;
};

export const convertirCotizacion = async (id: number, condicionPago: 'contado' | 'credito' = 'contado'): Promise<{ cotizacion: Cotizacion; factura_id: number }> => {
  const response = await apiPrivada.post<{ cotizacion: Cotizacion; factura_id: number }>(`/crm/cotizaciones/${id}/convertir/`, { condicion_pago: condicionPago });
  return response.data;
};
