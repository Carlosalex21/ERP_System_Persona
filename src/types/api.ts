/**
 * Este archivo centraliza todas las definiciones de tipos (interfaces)
 * que se corresponden con los esquemas de la API del backend.
 * Proporciona una única fuente de verdad para las estructuras de datos.
 */

// --- Tipos de Autenticación y Usuarios ---

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  rol?: string | null;
  sucursal?: string | null;
}

// --- Tipos de Clientes ---

export interface Cliente {
  id: number;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  tipo_documento?: string | null;
  documento?: string | null;
  fecha_registro: string;
  activo: boolean;
}

export type ClienteRequest = Omit<Cliente, 'id' | 'fecha_registro'>;

/**
 * Tipo de conveniencia para la red de clientes B2B (mayoristas/distribuidores).
 * El backend expone los clientes bajo `/clientes/`, por lo que se reutiliza
 * la estructura base de `Cliente`.
 */
export type ClienteB2B = Cliente;

// --- Tipos de Inventario ---

export interface Almacen {
  id: number;
  nombre: string;
  direccion: string;
  telefono?: string | null;
  activo: boolean;
  estado?: string | null;
}

export type AlmacenRequest = Omit<Almacen, 'id'>;

export interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  activo: boolean;
  padre?: number | null;
  padre_nombre: string;
}

export type CategoriaRequest = Omit<Categoria, 'id' | 'slug' | 'padre_nombre'>;

// --- Tipos de RRHH ---

export interface Rol {
  id: number;
  nombre: string;
  // NOTA: El esquema de Rol no está en el YAML, se asume esta estructura.
}

export interface Sucursal {
  id: number;
  nombre: string;
  direccion?: string | null;
}

export type SucursalRequest = Omit<Sucursal, 'id'>;
export type PatchedSucursalRequest = Partial<SucursalRequest>;


export interface UserManaged {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  rol: number | null;
  sucursal: number | null;
}

export interface UserManagedRequest {
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  rol: number | null;
  sucursal: number | null;
  password?: string;
}

export type PatchedUserManagedRequest = Partial<UserManagedRequest>;

export interface Iva {
  id: number;
  nombre?: string | null;
  porcentaje_iva: string;
  activo: boolean;
  fecha_creacion: string;
}

/**
 * Para la creación y actualización de configuraciones de IVA.
 * Omitimos campos de solo lectura.
 */
export type IvaRequest = Omit<Iva, 'id' | 'fecha_creacion'>;

export interface Producto {
  id: number;
  variantes: Variacionproducto[];
  nombre: string;
  descripcion?: string | null;
  precio?: string | null;
  cantidad?: number | null;
  codigo_barras?: string | null;
  disponible_online?: boolean | null;
  descuento?: string | null;
  slug?: string | null;
  sku?: string | null;
  peso?: string | null;
  dimensiones?: string | null;
  imagen?: string | null; // URL de la imagen
  tipo: 'simple' | 'variable';
  activo: boolean;
  almacen?: number | null;
  configuracion_iva?: number | null;
  categoria?: number | null;
}

/**
 * Para la creación y actualización de productos.
 * Omitimos campos de solo lectura y manejamos la imagen como un archivo.
 */
export type ProductoRequest = Omit<Producto, 'id' | 'variantes' | 'slug' | 'imagen'> & {
  imagen?: File | null;
};

export interface Variacionproducto {
  id: number;
  base_imponible: string;
  nombre: string;
  sku?: string | null;
  precio?: string | null;
  cantidad?: number | null;
  codigo_barras?: string | null;
  imagen?: string | null; // URL de la imagen
  producto?: number | null; // ID Padre
  atributos: number[]; // IDs de atributos
}

/**
 * Para la creación y actualización de variantes de producto.
 * Omitimos campos de solo lectura y manejamos la imagen como un archivo.
 */
export type VariacionproductoRequest = Omit<Variacionproducto, 'id' | 'base_imponible' | 'imagen'> & {
  imagen?: File | null;
};

// --- Tipos de Atributos (para variantes) ---
export interface Atributo {
  id: number;
  nombre: string;
  valores: ValorAtributo[];
}

export type AtributoRequest = Omit<Atributo, 'id' | 'valores'>;

export interface ValorAtributo {
  id: number;
  valor: string;
}

export type ValorAtributoRequest = Omit<ValorAtributo, 'id'>;



// --- Tipos de Facturación ---

export interface Detallefactura {
  id: number;
  nombre: string;
  cantidad: number;
  precio_unitario: string;
  descuento?: string | null;
  subtotal_linea: string;
  iva_linea: string;
  total_linea: string;
  producto?: number | null;
  variante?: number | null;
}

export interface DetallefacturaRequest {
  producto: number;
  variante?: number | null;
  cantidad: number;
  precio_unitario: string;
  descuento?: string | null;
}

export interface Factura {
  id: number;
  detalles: Detallefactura[];
  fecha_operacion: string;
  correlativo?: string | null;
  numero_control?: string | null;
  base_imponible: string;
  retencion_total: string;
  moneda?: number | null;
  moneda_codigo?: string | null;
  moneda_nombre?: string | null;
  tasa_cambio?: string | null;
  subtotal: string;
  descuento_global?: string | null;
  iva_total: string;
  total: string;
  // Consolidación en moneda base (el backend ya los calcula y devuelve):
  subtotal_base: string;
  base_imponible_base: string;
  iva_base: string;
  retencion_base: string;
  total_base: string;
  estado?: string | null;
  nif_factura?: string | null;
  activo: boolean;
  nombre_cliente_pendiente?: string | null;
  comentario_pendiente?: string | null;
  usuario?: number | null;
  cliente?: number | null;
  orden?: number | null;
  almacen?: number | null;
  metodo_pago?: number | null;
}

export interface FacturaRequest {
  detalles_para_crear: DetallefacturaRequest[];
  fecha_operacion: string;
  correlativo?: string | null;
  numero_control?: string | null;
  moneda?: number | null;
  tasa_cambio?: string | null;
  descuento_global?: string | null;
  estado?: string | null;
  nif_factura?: string | null;
  activo?: boolean;
  nombre_cliente_pendiente?: string | null;
  comentario_pendiente?: string | null;
  usuario?: number | null;
  cliente?: number | null;
  orden?: number | null;
  almacen?: number | null;
  metodo_pago?: number | null;
}

export interface MetodoPago {
  id: number;
  nombre: string;
  nro_cuenta: string | null;
  telefono: string | null;
  tipo_metodo: string | null;
  activo: boolean;
}

export type MetodoPagoRequest = Omit<MetodoPago, 'id'>;

// --- Tipos de Multi-Moneda (Configuración) ---

export interface Moneda {
  id: number;
  /** Código ISO 4217 (ej: VES, USD, EUR). */
  codigo: string;
  nombre: string;
  simbolo?: string | null;
  /** Indica si es la moneda base (funcional) del tenant. */
  es_predeterminada: boolean;
  activa: boolean;
  fecha_creacion: string;
}

export type MonedaRequest = Omit<Moneda, 'id' | 'fecha_creacion'>;
export type PatchedMonedaRequest = Partial<MonedaRequest>;

export interface TasaCambio {
  id: number;
  /** ID de la moneda asociada. */
  moneda: number;
  codigo_moneda: string;
  nombre_moneda: string;
  fecha: string;
  /** Tasa: 1 unidad de la moneda = tasa unidades de la moneda base. */
  tasa: string;
  fuente?: string | null;
  activa: boolean;
}

export interface TasaCambioRequest {
  moneda: number;
  tasa: string;
  fuente?: string | null;
  activa?: boolean;
}

export type PatchedTasaCambioRequest = Partial<TasaCambioRequest>;

// --- Tipos de Estrategia Fiscal (SENIAT / DIAN / SUNAT) ---

export interface TaxStrategyInfo {
  country_code: string;
  country_name: string;
  tax_rates: { code: string; name: string; rate: string }[];
  available_countries: { code: string; country: string }[];
}

// --- Tipos de Documentos Fiscales SENIAT ---

export interface NotaCredito {
  id: number;
  factura: number | null;
  numero_nota: string;
  numero_control?: string | null;
  fecha_emision: string;
  motivo: string;
  base_imponible: string;
  iva_total: string;
  retencion_total: string;
  total: string;
  activo: boolean;
}

export interface NotaCreditoRequest {
  factura: number;
  monto: string;
  motivo: string;
}
export type PatchedNotaCreditoRequest = Partial<NotaCreditoRequest>;

export interface NotaDebito {
  id: number;
  factura: number | null;
  numero_nota: string;
  numero_control?: string | null;
  fecha_emision: string;
  motivo: string;
  base_imponible: string;
  iva_total: string;
  total: string;
  activo: boolean;
}

export interface NotaDebitoRequest {
  factura: number;
  monto: string;
  motivo: string;
}
export type PatchedNotaDebitoRequest = Partial<NotaDebitoRequest>;

export interface LibroCompraVenta {
  id: number;
  tipo_libro: 'compra' | 'venta';
  fecha_operacion: string;
  tipo_documento: string;
  numero_documento: string;
  numero_control?: string | null;
  rif?: string | null;
  razon_social: string;
  base_imponible: string;
  iva: string;
  retencion: string;
  total: string;
  activo: boolean;
}

export type LibroCompraVentaRequest = Omit<LibroCompraVenta, 'id'>;
export type PatchedLibroCompraVentaRequest = Partial<LibroCompraVentaRequest>;

export interface Retencion {
  id: number;
  factura: number | null;
  proveedor: number | null;
  tipo_retencion: 'islr' | 'iva' | 'otros';
  numero_comprobante?: string | null;
  porcentaje: string;
  base: string;
  monto: string;
  fecha_emision: string;
  activo: boolean;
}

export interface RetencionRequest {
  factura?: number | null;
  proveedor?: number | null;
  tipo_retencion: 'islr' | 'iva' | 'otros';
  porcentaje: string;
  base: string;
}
export type PatchedRetencionRequest = Partial<RetencionRequest>;

// ===========================================================================
// Envoltura estándar de la API: {data, meta, errors}
// ===========================================================================

export interface ApiError {
  /** Código corto y estable del error (ej: 'validation_error'). */
  code: string;
  /** Mensaje legible del error. */
  detail: string;
  /** Campo al que pertenece el error (o null si es global). */
  field: string | null;
}

export interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiMeta {
  pagination?: PaginationMeta | null;
  /** Nombre del esquema/tenant actual. */
  tenant?: string | null;
  [key: string]: unknown;
}

/**
 * Envoltura estándar que el backend devuelve en todas las respuestas JSON.
 * Los interceptores de Axios desenvuelven `data` automáticamente, dejando
 * `meta` y `errors` accesibles en la respuesta normalizada.
 */
export interface ApiEnvelope<T = unknown> {
  data: T | null;
  meta: ApiMeta | null;
  errors: ApiError[] | null;
}
