/**
 * @file API pública de inmuebles (sin sesión): catálogo de propiedades de una
 * inmobiliaria, consultas de interesados y portal del condómino/inquilino.
 *
 * El catálogo se pide también desde el servidor (SSR, para SEO), por eso usa
 * `axios` directo con la base y el `Host` del tenant; el portal solo corre en
 * el navegador y usa `apiPublica`.
 */
import axios from 'axios';

import { apiPublica } from '@/services/api';
import { baseUrl, tenantHeaders } from '@/services/publicCatalogService';
import type { TipoMedioPago } from '@/services/inmueblesService';

interface Envelope<T> {
  data: T;
  meta?: { pagination?: { count?: number; page?: number; total_pages?: number } };
}

// ---------------------------------------------------------------------------
// Catálogo de propiedades
// ---------------------------------------------------------------------------

export interface PropiedadPublica {
  id: number;
  titulo_visible: string;
  tipo: string;
  tipo_display: string;
  operacion: 'alquiler' | 'venta' | 'alquiler_venta' | 'ninguna';
  descripcion: string;
  zona: string;
  ciudad: string;
  edificio_nombre: string | null;
  precio_venta_usd: string | null;
  canon_usd: string | null;
  habitaciones: number | null;
  banos: number | null;
  estacionamientos: number | null;
  area_m2: string | null;
  area_construida_m2: string | null;
  amenidades: string[];
  portada_url: string | null;
  fotos: { id: number; url: string; orden: number; es_portada: boolean }[];
}

export interface FiltrosCatalogo {
  operacion?: 'alquiler' | 'venta';
  tipo?: string;
  zona?: string;
  ciudad?: string;
  habitaciones?: string;
  banos?: string;
  precio_min?: string;
  precio_max?: string;
  q?: string;
  orden?: 'precio_asc' | 'precio_desc' | '';
}

export interface PaginaPropiedades {
  items: PropiedadPublica[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export interface OpcionesFiltros {
  zonas: string[];
  ciudades: string[];
  tipos: { valor: string; etiqueta: string }[];
  hay_alquiler: boolean;
  hay_venta: boolean;
  canon: { min: string | null; max: string | null };
  precio_venta: { min: string | null; max: string | null };
}

export const getPropiedadesPublicas = async (subdominio: string, filtros: FiltrosCatalogo = {}, pagina = 1): Promise<PaginaPropiedades> => {
  const params: Record<string, string | number> = { page: pagina };
  for (const [k, v] of Object.entries(filtros)) if (v) params[k] = v;
  const r = await axios.get<Envelope<PropiedadPublica[]>>(`${baseUrl(subdominio)}/inmuebles/publico/propiedades/`, { params, headers: tenantHeaders(subdominio) });
  const p = r.data.meta?.pagination ?? {};
  return { items: r.data.data, total: p.count ?? r.data.data.length, pagina: p.page ?? pagina, totalPaginas: p.total_pages ?? 1 };
};

export const getFiltrosPublicos = async (subdominio: string): Promise<OpcionesFiltros> =>
  (await axios.get<Envelope<OpcionesFiltros>>(`${baseUrl(subdominio)}/inmuebles/publico/propiedades/filtros/`, { headers: tenantHeaders(subdominio) })).data.data;

export const getPropiedadPublica = async (subdominio: string, id: number | string): Promise<PropiedadPublica> =>
  (await axios.get<Envelope<PropiedadPublica>>(`${baseUrl(subdominio)}/inmuebles/publico/propiedades/${id}/`, { headers: tenantHeaders(subdominio) })).data.data;

export const enviarConsultaPublica = async (subdominio: string, d: { unidad?: number | null; nombre: string; telefono: string; email?: string; mensaje?: string; sitio_web?: string }): Promise<void> => {
  await axios.post(`${baseUrl(subdominio)}/inmuebles/publico/consultas/`, d, { headers: tenantHeaders(subdominio) });
};

// ---------------------------------------------------------------------------
// Portal del condómino / inquilino / propietario
// ---------------------------------------------------------------------------

export interface PortalCargo { id: number; concepto: string; periodo: string; tipo: string; monto_usd: string; saldo_usd: string; vencimiento: string; vencido: boolean }
export interface PortalMedioPago { id: number; tipo: TipoMedioPago; tipo_display: string; titular: string; documento_titular: string; banco: string; numero_cuenta: string; moneda: string; instrucciones: string }
export interface PortalUnidad {
  id: number;
  codigo: string;
  edificio: string;
  rol: 'propietario' | 'inquilino';
  saldo_usd: string;
  vencido_usd: string;
  saldo_a_favor_usd: string;
  cargos: PortalCargo[];
  recibos: { id: number; numero: string; fecha: string; monto_usd: string; metodo: string }[];
  medios_pago: PortalMedioPago[];
  pagos_reportados: { id: number; fecha_pago: string; monto_pago: string; moneda_pago: string; estado: 'pendiente' | 'aprobado' | 'rechazado'; estado_display: string; motivo_rechazo: string; referencia: string }[];
  morosidad_edificio: { unidades_morosas: number; total_unidades: number; porcentaje_morosidad: string; unidades: { codigo: string; meses_vencidos: number }[] } | null;
}
export interface DatosPortal {
  persona: { nombre: string; documento: string | null };
  empresa: { nombre: string; telefono: string | null };
  tasa: { moneda: string; valor: string } | null;
  saldo_total_usd: string;
  vencido_total_usd: string;
  unidades: PortalUnidad[];
}

export const getPortal = async (token: string): Promise<DatosPortal> => (await apiPublica.get<DatosPortal>(`/inmuebles/portal/${token}/`)).data;

export interface ReportePagoPortal {
  unidad: number;
  fecha_pago: string;
  monto_pago: string;
  moneda_pago: string;
  metodo: TipoMedioPago;
  referencia: string;
  banco: string;
  medio_pago?: number | null;
  cargos: number[];
  nota: string;
  comprobante?: File | null;
}

export const reportarPagoPortal = async (token: string, d: ReportePagoPortal): Promise<{ mensaje: string }> => {
  const fd = new FormData();
  const { cargos, comprobante, ...resto } = d;
  Object.entries(resto).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') fd.append(k, String(v)); });
  cargos.forEach((c) => fd.append('cargos', String(c)));
  if (comprobante) fd.append('comprobante', comprobante);
  return (await apiPublica.post<{ mensaje: string }>(`/inmuebles/portal/${token}/reportar-pago/`, fd)).data;
};

/** Abre un PDF del portal (recibo, cuota o estado de cuenta) en otra pestaña. */
export async function abrirPdfPortal(token: string, ruta: string): Promise<void> {
  const r = await apiPublica.get(`/inmuebles/portal/${token}/${ruta}`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
