/**
 * Este archivo centraliza todas las definiciones de tipos (interfaces)
 * que se corresponden con los esquemas de la API del backend.
 * Proporciona una única fuente de verdad para las estructuras de datos.
 */
import type { TipoNegocio } from '@/utils/modulosPanel';

// --- Tipos de Autenticación y Usuarios ---

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  rol?: string | null;
  sucursal?: string | null;
}

// --- Carga masiva (productos, clientes) ---

/** Una fila del archivo que no se pudo procesar, con el motivo. */
export interface BulkUploadErrorRow {
  fila: number;
  codigo_barras?: string | null;
  error: string;
}

export interface ProductoBulkUploadResult {
  total_filas: number;
  productos_creados: number;
  productos_actualizados: number;
  errores: BulkUploadErrorRow[];
  message: string;
}

export interface ClienteBulkUploadResult {
  total_filas: number;
  clientes_creados: number;
  clientes_actualizados: number;
  errores: BulkUploadErrorRow[];
  message: string;
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
  /** Venezuela: cliente calificado por el SENIAT como agente de retención de IVA. */
  contribuyente_especial?: boolean;
  /** A cuántos días le das crédito a este cliente -- vacío = sin crédito definido. */
  dias_credito?: number | null;
}

export type ClienteRequest = Omit<Cliente, 'id' | 'fecha_registro'>;

export interface TipoDocumentoOpcion {
  value: string;
  label: string;
}

// --- Tipos B2B (mayoristas/distribuidores) ---
// Ver `apps/clientes/models.py` en el backend: `ClienteB2B` es un modelo
// aparte de `Cliente` (retail), con su propio nivel de precio y línea de
// crédito -- antes se reutilizaba (mal) el tipo `Cliente` aquí.

export interface NivelPrecio {
  id: number;
  nombre: string;
  porcentaje_descuento: string;
  monto_minimo_periodo: string;
  activo: boolean;
}

export type NivelPrecioRequest = Omit<NivelPrecio, 'id'>;
export type PatchedNivelPrecioRequest = Partial<NivelPrecioRequest>;

export interface ClienteB2B {
  id: number;
  razon_social: string;
  rif: string;
  email_contacto: string;
  telefono_contacto: string;
  direccion_fiscal: string;
  nivel_precio: number | null;
  nivel_precio_nombre: string | null;
  nivel_precio_actualizado_en: string | null;
  total_comprado_periodo: string;
  limite_credito: string;
  credito_usado: string;
  estado: 'pendiente' | 'activo' | 'inactivo' | 'bloqueado';
  fecha_creacion: string;
}

export type ClienteB2BRequest = Partial<
  Pick<ClienteB2B, 'razon_social' | 'rif' | 'telefono_contacto' | 'direccion_fiscal' | 'nivel_precio' | 'limite_credito' | 'estado'>
>;

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

export interface Proveedor {
  id: number;
  identificador_fiscal: string;
  nombre: string;
  direccion: string;
  telefono?: string | null;
  email: string;
  plazo_pago?: number | null;
  es_contribuyente_especial: boolean;
  activo: boolean;
}

export type ProveedorRequest = Omit<Proveedor, 'id'>;

// --- Órdenes de Compra ---

export type EstadoOrdenCompra = 'borrador' | 'enviada' | 'recibida_parcial' | 'recibida' | 'cancelada';

export interface OrdenCompraDetalle {
  id: number;
  producto: number;
  producto_nombre: string;
  cantidad_pedida: number;
  cantidad_recibida: number;
  cantidad_pendiente: number;
  costo_unitario_esperado: string | null;
}

export interface OrdenCompra {
  id: number;
  numero: string;
  proveedor: number;
  proveedor_nombre: string;
  almacen: number | null;
  almacen_nombre: string | null;
  estado: EstadoOrdenCompra;
  observaciones: string;
  usuario: number | null;
  usuario_nombre: string | null;
  fecha_creacion: string;
  fecha_envio: string | null;
  fecha_recepcion_completa: string | null;
  detalles: OrdenCompraDetalle[];
}

export interface OrdenCompraDetalleRequest {
  producto_id: number;
  cantidad: number;
  costo_unitario_esperado?: string | null;
}

export interface CrearOrdenCompraRequest {
  proveedor_id: number;
  almacen_id?: number | null;
  observaciones?: string;
  detalles: OrdenCompraDetalleRequest[];
}

// --- Facturas de Compra ---

export type TipoDocumentoCompra = 'factura' | 'nota_entrega';

export interface FacturaCompraDetalle {
  id: number;
  producto: number;
  producto_nombre: string;
  variante: number | null;
  variante_nombre: string | null;
  orden_detalle: number | null;
  cantidad: number;
  costo_unitario: string;
  subtotal: string;
}

export interface FacturaCompra {
  id: number;
  proveedor: number;
  proveedor_nombre: string;
  proveedor_rif: string;
  tipo_documento: TipoDocumentoCompra;
  tipo_documento_display: string;
  numero_factura: string;
  numero_control: string;
  fecha_emision: string;
  orden_compra: number | null;
  orden_compra_numero: string | null;
  almacen: number | null;
  almacen_nombre: string | null;
  monto_exento: string;
  base_imponible: string;
  porcentaje_iva: string;
  iva: string;
  total: string;
  retencion_iva: string;
  retencion_islr: string;
  neto_a_pagar: string;
  saldo_pendiente: string;
  estado: 'registrada' | 'anulada';
  observaciones: string;
  usuario_nombre: string | null;
  fecha_creacion: string;
  fecha_anulacion: string | null;
  detalles: FacturaCompraDetalle[];
}

export interface FacturaCompraLineaRequest {
  producto_id: number;
  variante_id?: number | null;
  orden_detalle_id?: number | null;
  cantidad: number;
  costo_unitario: string;
}

export interface CrearFacturaCompraRequest {
  proveedor_id: number;
  tipo_documento: TipoDocumentoCompra;
  numero_factura: string;
  numero_control?: string;
  fecha_emision: string;
  almacen_id?: number | null;
  orden_compra_id?: number | null;
  monto_exento?: string;
  base_imponible?: string;
  porcentaje_iva?: string;
  porcentaje_retencion_iva?: string;
  observaciones?: string;
  detalles: FacturaCompraLineaRequest[];
}

// --- Cuentas por Pagar (AP) ---

export interface PagoProveedor {
  id: number;
  cuenta_por_pagar: number;
  monto: string;
  metodo_pago: number | null;
  metodo_pago_nombre: string | null;
  referencia: string;
  usuario_nombre: string | null;
  fecha: string;
}

export type EstadoCuentaPorPagar = 'pendiente' | 'pagada' | 'anulada';

export interface CuentaPorPagar {
  id: number;
  proveedor: number;
  proveedor_nombre: string;
  numero_documento: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  monto: string;
  monto_pagado: string;
  saldo_pendiente: string;
  estado: EstadoCuentaPorPagar;
  ajuste_origen: number | null;
  /** Factura de compra que originó la deuda (null en cuentas históricas creadas desde Ajustes). */
  factura_compra: number | null;
  factura_compra_total: string | null;
  /** Lo retenido (IVA/ISLR) sobre esa factura -- se le paga al fisco, por eso `monto` ya viene rebajado. */
  factura_compra_retenido: string | null;
  observaciones: string;
  fecha_creacion: string;
  pagos: PagoProveedor[];
}

export interface RegistrarPagoProveedorRequest {
  monto: number;
  metodo_pago_id?: number | null;
  referencia?: string;
}

export interface FilaAgingCuenta {
  id: number;
  numero_documento: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  monto: string;
  saldo_pendiente: string;
  dias: number;
}

export interface FilaReporteCuentasPorPagar {
  proveedor_id: number;
  proveedor_nombre: string;
  total: string;
  '0_30': string;
  '31_60': string;
  '61_90': string;
  mas_90: string;
  cuentas: FilaAgingCuenta[];
}

// --- Cuentas por Cobrar (AR) ---

export interface FilaFacturaAging {
  id: number;
  correlativo: string | null;
  fecha_operacion: string;
  total_base: string;
  saldo_pendiente_base: string;
  dias: number;
  /** Moneda propia de la factura (no la base) -- la que espera `registrarPago` al cobrar. */
  moneda_id: number | null;
  moneda_codigo: string | null;
  moneda_simbolo: string | null;
  saldo_pendiente: string;
}

export interface FilaReporteCuentasPorCobrar {
  cliente_id: number;
  cliente_nombre: string;
  cliente_telefono: string | null;
  total: string;
  '0_30': string;
  '31_60': string;
  '61_90': string;
  mas_90: string;
  facturas: FilaFacturaAging[];
}

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
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  /** Códigos de módulo del panel ocultos para este rol -- ver `utils/modulosPanel.ts`. */
  modulos_ocultos: string[];
}

export interface Sucursal {
  id: number;
  nombre: string;
  direccion?: string | null;
}

export type SucursalRequest = Omit<Sucursal, 'id'>;
export type PatchedSucursalRequest = Partial<SucursalRequest>;

export interface Departamento {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export type DepartamentoRequest = Omit<Departamento, 'id' | 'activo'>;
export type PatchedDepartamentoRequest = Partial<DepartamentoRequest>;

export interface UserManaged {
  id: number;
  /** Pk del `User` de Django -- distinto de `id` (pk de `UserMetadata`). Úsalo para nómina/vacaciones/liquidación. */
  usuario_id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  rol: number | null;
  sucursal: number | null;
  /** Almacén/sucursal operativo asignado -- usado para atribuir ventas a una sucursal en el dashboard (ver `Factura.almacen`). */
  almacen_asignado: number | null;
  departamento: number | null;
  sueldo_base: string | null;
  fecha_contratacion: string | null;
}

export interface UserManagedRequest {
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  rol: number | null;
  sucursal: number | null;
  almacen_asignado?: number | null;
  departamento?: number | null;
  fecha_contratacion?: string | null;
  sueldo_base?: string | number | null;
  password?: string;
}

export type PatchedUserManagedRequest = Partial<UserManagedRequest>;

// --- Nómina ---

export type TipoConceptoNomina = 'bono' | 'deduccion';
export type ModoConceptoNomina = 'porcentaje' | 'fijo';

/**
 * Bono/deducción configurable por el propio tenant (ej. "Bono de
 * Alimentación", "Seguro Social") -- el sistema NO asume tasas legales
 * fijas (varían por país y cambian con el tiempo); el usuario/su contador
 * las define una vez y, si `recurrente`, se aplican solas en cada nómina
 * nueva (ver `apps.rrhh.services._aplicar_conceptos_recurrentes`).
 */
export interface ConceptoNomina {
  id: number;
  nombre: string;
  tipo: TipoConceptoNomina;
  modo: ModoConceptoNomina;
  /** Porcentaje del sueldo base (ej. "4.00" = 4%) o monto fijo, según `modo`. */
  valor: string;
  recurrente: boolean;
  activo: boolean;
  fecha_creacion: string;
}

export interface ConceptoNominaRequest {
  nombre: string;
  tipo: TipoConceptoNomina;
  modo: ModoConceptoNomina;
  valor: string;
  recurrente?: boolean;
  activo?: boolean;
}

/** Snapshot de un `ConceptoNomina` ya aplicado a una línea de nómina de un período específico. */
export interface NominaEmpleadoConcepto {
  id: number;
  /** `null` = concepto puntual agregado a mano a esta línea (ej. una comisión) -- no viene de un `ConceptoNomina` recurrente. */
  concepto: number | null;
  nombre: string;
  tipo: TipoConceptoNomina;
  monto: string;
}

export interface AgregarConceptoManualRequest {
  nombre: string;
  tipo: TipoConceptoNomina;
  monto: number;
}

export interface NominaEmpleado {
  id: number;
  usuario: number;
  usuario_nombre: string;
  numero_empleado: string | null;
  sueldo_base: string;
  dias_ausencia: number;
  deduccion_ausencias: string;
  /** Horas por encima del `Horario` oficial, calculadas solas desde los marcajes reales de `Asistencia`. */
  horas_extra: string;
  pago_horas_extra: string;
  /** Suma de los `ConceptoNomina` tipo 'bono' aplicados -- ver `conceptos`. */
  bonificaciones: string;
  /** Suma de los `ConceptoNomina` tipo 'deduccion' aplicados -- ver `conceptos`. */
  otras_deducciones: string;
  total_pagar: string;
  conceptos: NominaEmpleadoConcepto[];
}

export type EstadoPeriodoNomina = 'borrador' | 'pagada';

export interface PeriodoNomina {
  id: number;
  fecha_desde: string;
  fecha_hasta: string;
  estado: EstadoPeriodoNomina;
  fecha_pago: string | null;
  usuario: number | null;
  usuario_nombre: string | null;
  fecha_creacion: string;
  empleados: NominaEmpleado[];
  total_nomina: string;
}

export interface GenerarPeriodoNominaRequest {
  fecha_desde: string;
  fecha_hasta: string;
}

export interface ConfiguracionRRHH {
  id: number;
  dias_vacaciones_por_anio: number;
  dias_prestaciones_por_anio: number;
  dias_periodo_sueldo_base: number;
}

export type ConfiguracionRRHHRequest = Omit<ConfiguracionRRHH, 'id'>;

export interface VacacionTomada {
  id: number;
  usuario: number;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  observaciones: string;
  registrado_por_username: string | null;
  fecha_registro: string;
}

export interface RegistrarVacacionRequest {
  fecha_inicio: string;
  fecha_fin: string;
  observaciones?: string;
}

export interface VacacionesResumen {
  antiguedad_anios: string;
  dias_acumulados: number;
  dias_tomados: number;
  dias_disponibles: number;
  tomadas: VacacionTomada[];
}

export interface Liquidacion {
  antiguedad_anios: string;
  sueldo_diario: string;
  dias_vacaciones_pendientes: number;
  monto_vacaciones_pendientes: string;
  dias_prestaciones_acumulados: number;
  monto_prestaciones: string;
  total_liquidacion: string;
}

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

export interface PresentacionProducto {
  id: number;
  producto: number;
  nombre: string;
  factor_conversion: number;
  precio?: string | null;
  es_default: boolean;
  activo: boolean;
}

export interface PresentacionProductoRequest {
  producto: number;
  nombre: string;
  factor_conversion: number;
  precio?: string | null;
  es_default?: boolean;
}

export interface Producto {
  id: number;
  variantes: Variacionproducto[];
  presentaciones: PresentacionProducto[];
  nombre: string;
  descripcion?: string | null;
  precio?: string | null;
  cantidad?: number | null;
  /** Costo promedio ponderado por unidad -- para valorizar el inventario (a costo, no a precio de venta). Solo se actualiza al registrar una entrada con costo (ver Ajustes de Inventario). */
  costo_promedio?: string | null;
  /** Umbral de "bajo stock" propio de este producto. Vacío = usa el umbral general. */
  stock_minimo?: number | null;
  /** Meses de garantía al venderse -- vacío = sin garantía rastreada (ver `apps.postventa`). */
  meses_garantia?: number | null;
  codigo_barras?: string | null;
  disponible_online?: boolean | null;
  /** Insumo/materia prima interna (ej. papas en un restaurante) -- se excluye de los selectores de venta (POS, Mesas). */
  es_insumo?: boolean;
  descuento?: string | null;
  slug?: string | null;
  sku?: string | null;
  peso?: string | null;
  dimensiones?: string | null;
  imagen?: string | null; // URL de la imagen
  tipo: 'simple' | 'variable' | 'servicio';
  activo: boolean;
  almacen?: number | null;
  configuracion_iva?: number | null;
  categoria?: number | null;
  /** Moneda en la que está expresado `precio`. Si se omite, se asume la moneda base del tenant. */
  moneda?: number | null;
  moneda_codigo?: string | null;
  moneda_simbolo?: string | null;
  /** Qué departamento prepara/despacha este producto (ej. Cocina, Almacén) -- ver `apps.rrhh.models.Departamento`. */
  departamento?: number | null;
  departamento_nombre?: string | null;
}

/**
 * Para la creación y actualización de productos.
 * Omitimos campos de solo lectura y manejamos la imagen como un archivo.
 */
export type ProductoRequest = Omit<Producto, 'id' | 'variantes' | 'presentaciones' | 'slug' | 'imagen' | 'moneda_codigo' | 'moneda_simbolo' | 'departamento_nombre'> & {
  imagen?: File | null;
};

// ---------------------------------------------------------------------------
// Ajustes de inventario (entrada/salida manual de stock: notas de entrega
// sin factura, correcciones de conteo físico, mermas, devoluciones a
// proveedor). Un ajuste, igual que una factura confirmada, no se edita.
// ---------------------------------------------------------------------------

export type TipoAjusteInventario = 'entrada' | 'salida';

export type MotivoAjusteInventario =
  | 'compra_con_factura'
  | 'compra_sin_factura'
  | 'conteo_fisico'
  | 'inventario_inicial'
  | 'merma'
  | 'consumo_interno'
  | 'devolucion_proveedor'
  | 'otro';

export interface AjusteInventarioDetalle {
  id: number;
  nombre: string | null;
  producto: number | null;
  variante: number | null;
  cantidad: number;
  costo_unitario?: string | null;
  stock_resultante: number | null;
}

export interface AjusteInventarioDetalleRequest {
  producto: number;
  variante?: number | null;
  cantidad: number;
  costo_unitario?: string | null;
}

export interface AjusteInventario {
  id: number;
  tipo: TipoAjusteInventario;
  tipo_display: string;
  motivo: MotivoAjusteInventario;
  motivo_display: string;
  almacen: number | null;
  proveedor: number | null;
  numero_documento: string;
  numero_control: string;
  observaciones: string;
  usuario: number | null;
  usuario_nombre: string | null;
  fecha_creacion: string;
  /** Fecha del documento del proveedor (nota/factura) -- vacía = se usa `fecha_creacion`. Editable después de creado. */
  fecha_documento: string | null;
  activo: boolean;
  detalles: AjusteInventarioDetalle[];
}

/** Campos editables de un ajuste ya aplicado -- NO incluye tipo/almacén/líneas (ver `AjusteInventarioEditSerializer` en el backend). */
export interface AjusteInventarioEditRequest {
  motivo?: MotivoAjusteInventario;
  proveedor?: number | null;
  numero_documento?: string;
  numero_control?: string;
  fecha_documento?: string | null;
  observaciones?: string;
}

export interface AjusteInventarioRequest {
  tipo: TipoAjusteInventario;
  motivo: MotivoAjusteInventario;
  almacen?: number | null;
  proveedor?: number | null;
  numero_documento?: string;
  numero_control?: string;
  observaciones?: string;
  detalles_para_crear: AjusteInventarioDetalleRequest[];
}

export interface Inventario {
  id: number;
  producto: number;
  producto_nombre: string | null;
  almacen: number;
  almacen_nombre: string | null;
  cantidad: number;
  activo: boolean;
}

export interface TrasladoInventarioDetalle {
  id: number;
  producto: number;
  producto_nombre: string | null;
  cantidad: number;
  stock_resultante_origen: number | null;
  stock_resultante_destino: number | null;
}

export interface TrasladoInventarioDetalleRequest {
  producto: number;
  cantidad: number;
}

export interface TrasladoInventario {
  id: number;
  almacen_origen: number;
  almacen_origen_nombre: string | null;
  almacen_destino: number;
  almacen_destino_nombre: string | null;
  observaciones: string;
  usuario: number | null;
  usuario_nombre: string | null;
  fecha_creacion: string;
  detalles: TrasladoInventarioDetalle[];
}

export interface TrasladoInventarioRequest {
  almacen_origen: number;
  almacen_destino: number;
  observaciones?: string;
  detalles_para_crear: TrasladoInventarioDetalleRequest[];
}

export interface Variacionproducto {
  id: number;
  base_imponible: string;
  nombre: string;
  sku?: string | null;
  precio?: string | null;
  cantidad?: number | null;
  costo_promedio?: string | null;
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
  presentacion?: number | null;
}

export interface DetallefacturaRequest {
  producto: number;
  variante?: number | null;
  presentacion?: number | null;
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
  vendedor?: number | null;
  vendedor_nombre?: string | null;
  condicion_pago?: 'contado' | 'credito';
  cliente?: number | null;
  orden?: number | null;
  almacen?: number | null;
  metodo_pago?: number | null;
  /** true si ya se descontó el stock de esta factura/nota de entrega. */
  inventario_afectado?: boolean;
  /** Seguimiento de preparación/despacho (ej. "el almacenista ya lo armó") -- separado del ciclo fiscal/de cobro. */
  estado_preparacion?: 'pendiente' | 'listo';
  departamento_preparacion?: number | null;
  departamento_preparacion_nombre?: string | null;
  preparado_por?: number | null;
  preparado_por_nombre?: string | null;
  fecha_preparado?: string | null;
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
  vendedor?: number | null;
  condicion_pago?: 'contado' | 'credito';
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
  /** Banco fijo al que entra el dinero de este método (vacío para efectivo). */
  banco: number | null;
  banco_nombre?: string | null;
  activo: boolean;
}

export type MetodoPagoRequest = Omit<MetodoPago, 'id' | 'banco_nombre'>;

export interface Banco {
  id: number;
  nombre: string;
  activo: boolean;
}
export type BancoRequest = Omit<Banco, 'id'>;

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
  /** Moneda en la que están expresados base_imponible/iva_total/retencion_total/total (la de la factura asociada). */
  factura_moneda_codigo?: string | null;
  numero_nota: string;
  numero_control?: string | null;
  fecha_emision: string;
  motivo: string;
  base_imponible: string;
  iva_total: string;
  retencion_total: string;
  total: string;
  /** Consolidación en la moneda base del tenant (mismo patrón que Factura.total_base). */
  base_imponible_base: string;
  iva_base: string;
  retencion_base: string;
  total_base: string;
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
  /** Moneda en la que están expresados base_imponible/iva_total/total (la de la factura asociada). */
  factura_moneda_codigo?: string | null;
  numero_nota: string;
  numero_control?: string | null;
  fecha_emision: string;
  motivo: string;
  base_imponible: string;
  iva_total: string;
  total: string;
  base_imponible_base: string;
  iva_base: string;
  total_base: string;
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
  /** Factura de VENTA: retención que un cliente le hizo al negocio (número cargado a mano). */
  factura: number | null;
  factura_correlativo?: string | null;
  /** Moneda en la que están expresados base/monto (la de la factura asociada, si hay una). */
  factura_moneda_codigo?: string | null;
  /** Factura de COMPRA: retención que el negocio le hace a un proveedor (número generado por el sistema). */
  factura_compra: number | null;
  factura_compra_numero?: string | null;
  proveedor: number | null;
  proveedor_nombre?: string | null;
  proveedor_rif?: string | null;
  tipo_retencion: 'islr' | 'iva' | 'otros';
  numero_comprobante?: string | null;
  porcentaje: string;
  base: string;
  monto: string;
  /** Periodo fiscal que declara el proveedor (ej: "2026", "01/2026"). Texto libre. */
  periodo_imposicion?: string | null;
  fecha_emision: string;
  activo: boolean;
}

export interface RetencionRequest {
  factura?: number | null;
  factura_compra?: number | null;
  numero_comprobante?: string | null;
  proveedor?: number | null;
  tipo_retencion: 'islr' | 'iva' | 'otros';
  porcentaje: string;
  base: string;
  periodo_imposicion?: string | null;
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

// ---------------------------------------------------------------------------
// Pagos en línea (Pago Móvil / Zelle) -- checkout manual del catálogo público
// ---------------------------------------------------------------------------

export interface PagoMovilConfig {
  id: number;
  metodo_pago: number;
  banco: string;
  cedula: string;
  telefono: string;
}

export type PagoMovilConfigRequest = Omit<PagoMovilConfig, 'id'>;

export interface ZelleConfig {
  id: number;
  metodo_pago: number;
  email_zelle: string;
  nombre_beneficiario: string;
}

export type ZelleConfigRequest = Omit<ZelleConfig, 'id'>;

export interface StripeConfig {
  id: number;
  metodo_pago: number;
  publishable_key: string;
  moneda: string;
  tiene_secret_key: boolean;
  modo_test: boolean;
}

export interface StripeConfigRequest {
  metodo_pago: number;
  publishable_key: string;
  secret_key: string;
  webhook_secret?: string;
  moneda: string;
}

export interface MetodoPagoConfig {
  id: number;
  nombre: string;
  activo: boolean;
  es_manual: boolean;
  instrucciones?: string | null;
  pago_movil_config: PagoMovilConfig | null;
  zelle_config: ZelleConfig | null;
  stripe_config: StripeConfig | null;
}

export type MetodoPagoConfigRequest = Pick<MetodoPagoConfig, 'nombre' | 'activo' | 'es_manual' | 'instrucciones'>;

export interface ConfiguracionEmpresa {
  nombre_comercial: string;
  razon_social?: string | null;
  rif?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  logo?: string | null;
  /** true si eliminar un renglón (POS, mesas, etc.) exige el PIN de autorización. */
  requiere_pin_eliminar?: boolean;
  /** Plantilla del mensaje de WhatsApp al cerrar una venta -- variables: {cliente} {factura} {total} {moneda}. El link al PDF se agrega siempre aparte. */
  mensaje_whatsapp_venta?: string;
}

export type ConfiguracionEmpresaRequest = Omit<ConfiguracionEmpresa, 'logo'> & {
  logo?: File | null;
  /** Solo escritura -- fija/cambia el PIN (4-6 dígitos). Vacío/omitido = no lo toca. */
  pin?: string;
};

/** Numeración de facturas (correlativo SENIAT-style: prefijo + número). */
export interface ConfiguracionCorrelativo {
  prefijo: string;
  /** Último número de factura utilizado (la próxima factura usará este + 1). */
  current_number: number;
  /** Cantidad de dígitos del correlativo (ej. 3 para "001"). */
  number_length: number;
}

export interface ConfiguracionCorrelativoRequest {
  prefijo?: string;
  current_number?: number;
  number_length?: number;
  /** Contraseña del usuario logueado, requerida para confirmar el cambio. */
  password: string;
}

export interface TransaccionPasarela {
  id: number;
  factura: number;
  metodo_pago: number;
  metodo_pago_nombre: string;
  monto: string;
  referencia_externa?: string | null;
  estado: string;
  fecha_creacion: string;
}

/** Registro de pago desde el POS (efectivo, Pago Móvil, transferencia, Zelle, tarjeta). */
export interface Transaccionpago {
  id: number;
  factura?: number | null;
  metodo_pago?: number | null;
  metodo_pago_nombre?: string | null;
  monto: string;
  /** Lo que el cliente entregó de verdad (para efectivo, puede ser mayor a `monto`; ver `vuelto`). */
  monto_recibido?: string | null;
  /** Cambio devuelto (solo aplica a efectivo). */
  vuelto?: string;
  /** Turno de caja del cajero que cobró (null si no pasó por el POS). */
  caja_sesion?: number | null;
  estado: string;
  codigo_transaccion?: string | null;
  /** N° de Pago Móvil/transferencia/Zelle que el cajero anotó a mano, si aplica. */
  referencia?: string | null;
  fecha?: string | null;
  activo: boolean;
}

/** Una línea de pago a enviar al confirmar una venta (soporta pago dividido entre varios métodos). */
export interface PagoRequestLinea {
  metodo_pago_id: number;
  monto: string;
  monto_recibido?: string;
  referencia?: string;
}

// ---------------------------------------------------------------------------
// Cobro de suscripciones SaaS (el dueño del tenant le paga A LA PLATAFORMA).
// No confundir con MetodoPagoConfig/StripeConfig/TransaccionPasarela de
// arriba: esos son para que CADA TENANT le cobre a SUS PROPIOS clientes en
// su catálogo público. Aquí el dinero fluye en la dirección opuesta.
// ---------------------------------------------------------------------------

export interface Plan {
  id: number;
  nombre: string;
  slug: string | null;
  precio: string;
  limite_usuarios: number;
  limite_sucursales: number;
  limite_productos: number | null;
  descripcion: string;
  activo: boolean;
  /** Tipos de negocio a los que aplica (ver TipoNegocio en utils/modulosPanel). Vacío = aplica a todos. */
  tipos_negocio: string[];
  /** Módulos que incluye (códigos de `utils/modulosPanel`). Vacío = todos. */
  modulos: string[];
}

/** Versión resumida de `Plan` embebida en la suscripción del cliente (sin `descripcion`/`activo`). */
export interface PlanResumen {
  id: number;
  nombre: string;
  slug: string | null;
  precio: string;
  limite_usuarios: number;
  limite_sucursales: number;
  limite_productos: number | null;
}

export interface MiSubscripcion {
  plan: PlanResumen;
  estado: string;
  fecha_fin: string | null;
  is_active: boolean;
  es_prueba: boolean;
}

export type PeriodoSuscripcion = 'mensual' | 'trimestral' | 'anual';

export interface PeriodoSuscripcionInfo {
  codigo: PeriodoSuscripcion;
  nombre: string;
  meses: number;
  dias: number;
  descuento_pct: number;
}

export interface CotizarSuscripcionResponse {
  monto: string;
  credito: string;
  monto_lista: string;
  es_upgrade_con_credito: boolean;
}

export interface MiCliente {
  id: number;
  nombre_empresa: string;
  schema_name: string;
  pais_codigo: 'VE' | 'CO' | 'PE';
  /** Módulo con el que se registró el negocio -- solo se le ofrecen planes de ese tipo. */
  tipo_negocio: TipoNegocio;
  subscription: MiSubscripcion | null;
}

export interface PlatformPaymentInfo {
  pago_movil_banco: string;
  pago_movil_cedula: string;
  pago_movil_telefono: string;
  zelle_email: string;
  zelle_titular: string;
  stripe_publishable_key: string;
}

export interface PlatformPaymentConfig extends PlatformPaymentInfo {
  stripe_secret_key?: string;
  stripe_webhook_secret?: string;
  tiene_stripe_secret_key: boolean;
}

export type PlatformPaymentConfigRequest = Partial<Omit<PlatformPaymentConfig, 'tiene_stripe_secret_key'>>;

export type MetodoPagoSuscripcion = 'pago_movil' | 'zelle' | 'stripe';

export interface CrearPagoSuscripcionRequest {
  client_id: number;
  plan_id: number;
  metodo: MetodoPagoSuscripcion;
  periodo?: PeriodoSuscripcion;
  referencia?: string;
}

export interface CrearPagoSuscripcionResponse {
  pago_id: number;
  estado: string;
  metodo: MetodoPagoSuscripcion;
  periodo: PeriodoSuscripcion;
  monto: string;
  checkout_url: string | null;
}

export interface PlatformSettings {
  limite_registros_gratis: number | null;
  dias_gracia_tras_vencimiento: number;
}

export type PlatformSettingsRequest = Partial<PlatformSettings>;

export interface SubscriptionPayment {
  id: number;
  client: { id: number; nombre_empresa: string; schema_name: string; pais_codigo: string };
  plan: PlanResumen;
  periodo: PeriodoSuscripcion;
  monto: string;
  metodo: MetodoPagoSuscripcion;
  referencia: string;
  estado: 'pendiente' | 'confirmado' | 'rechazado';
  fecha_creacion: string;
  fecha_confirmacion: string | null;
  confirmado_por_username: string | null;
  notas: string;
}

/** Un cambio individual dentro de un registro de auditoría: {"antes": x, "despues": y}. */
export interface CambioAuditoria {
  antes: unknown;
  despues: unknown;
}

/** Entrada del registro de auditoría -- quién hizo qué, cuándo, y con qué valores antes/después. */
export interface RegistroAuditoria {
  id: number;
  fecha: string;
  usuario: number | null;
  usuario_nombre: string;
  accion: 'crear' | 'actualizar' | 'eliminar' | 'reactivar';
  modelo: string;
  objeto_id: string;
  objeto_repr: string;
  cambios: Record<string, CambioAuditoria> | null;
  ip_address: string | null;
}

// ---------------------------------------------------------------------------
// Postventa: garantías (generadas solas al pagarse una venta de un producto
// con `meses_garantia`) y reclamos/tickets de soporte -- ver `apps.postventa`.
// ---------------------------------------------------------------------------

export interface Garantia {
  id: number;
  detalle_factura: number;
  factura: number;
  factura_correlativo: string | null;
  producto: number | null;
  producto_nombre: string | null;
  cliente: number | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  fecha_inicio: string;
  fecha_vencimiento: string;
  meses_garantia: number;
  esta_vigente: boolean;
  tiene_reclamo_abierto: boolean;
  fecha_creacion: string;
}

export type EstadoReclamoPostventa = 'abierto' | 'en_proceso' | 'resuelto' | 'rechazado';
export type PrioridadReclamoPostventa = 'baja' | 'media' | 'alta';

export interface ReclamoPostventa {
  id: number;
  garantia: number | null;
  garantia_vigente: boolean | null;
  factura: number | null;
  factura_correlativo: string | null;
  producto: number | null;
  producto_nombre: string | null;
  cliente: number | null;
  nombre_contacto_libre: string;
  telefono_contacto: string;
  nombre_contacto: string;
  titulo: string;
  descripcion: string;
  estado: EstadoReclamoPostventa;
  prioridad: PrioridadReclamoPostventa;
  usuario_asignado: number | null;
  usuario_asignado_nombre: string | null;
  resolucion: string;
  fecha_apertura: string;
  fecha_actualizacion: string;
  fecha_cierre: string | null;
}

export interface CrearReclamoRequest {
  titulo: string;
  descripcion?: string;
  cliente?: number | null;
  nombre_contacto_libre?: string;
  telefono_contacto?: string;
  factura?: number | null;
  producto?: number | null;
  garantia?: number | null;
  prioridad?: PrioridadReclamoPostventa;
}

// ---------------------------------------------------------------------------
// Programa de Referidos -- ver `apps.tenants.models.Referido` y
// `ReferidoProgramaView`. El código de invitación de cada tenant ES su
// propio `schema_name`, no un campo aparte.
// ---------------------------------------------------------------------------

export type EstadoReferido = 'pendiente' | 'recompensado';

export interface ReferidoItem {
  nombre_empresa: string;
  fecha_registro: string;
  estado: EstadoReferido;
}

export interface ReferidoPrograma {
  codigo_referido: string;
  link_invitacion: string;
  total_referidos: number;
  referidos_pendientes: number;
  referidos_recompensados: number;
  meses_ganados: number;
  referidos: ReferidoItem[];
}
