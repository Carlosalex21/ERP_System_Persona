/**
 * Este archivo centraliza todas las definiciones de tipos (interfaces)
 * que se corresponden con los esquemas de la API del backend.
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
  total_linea: string;
}

export interface DetallefacturaRequest {
  producto: number;
  variante?: number | null;
  cantidad: number;
  precio_unitario: string;
}

export interface Factura {
  id: number;
  detalles: Detallefactura[];
  fecha_operacion: string;
  correlativo?: string | null;
  subtotal: string;
  descuento_global?: string | null;
  iva_total: string;
  total: string;
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