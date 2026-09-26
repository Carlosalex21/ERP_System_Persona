/**
 * @file Lista canónica de "módulos" del panel administrativo -- la misma
 * fuente de verdad que arma el menú lateral (`components/Sidebar.tsx`), la
 * pantalla de "Permisos por Rol" (elegir qué ocultarle a cada rol) y el
 * guard de rutas del layout (`admin/layout.tsx`, evita que alguien entre a
 * un módulo oculto tecleando la URL a mano).
 *
 * `path` es el prefijo de ruta real de cada módulo -- se usa para resolver
 * "¿a qué módulo pertenece esta URL?" con el mismo criterio de
 * coincidencia que ya usa `SidebarLink` (`/admin` exacto, el resto por
 * prefijo).
 */

/** Debe calzar con `Client.TIPO_NEGOCIO_CHOICES` del backend (`apps.tenants.models`). */
export type TipoNegocio = 'retail' | 'b2b' | 'restaurante' | 'farmacia' | 'servicios' | 'contador';

/** Todo lo que NO es un contador -- para módulos de "bienes físicos" que a un contador no le aplican. */
export const TIPOS_CON_INVENTARIO: TipoNegocio[] = ['retail', 'b2b', 'restaurante', 'farmacia', 'servicios'];

export interface ModuloPanel {
  codigo: string;
  etiqueta: string;
  path: string;
  /** Si se define, el módulo solo aplica a tenants de alguno de estos tipos de negocio. */
  tiposNegocio?: TipoNegocio[];
}

export interface GrupoModulosPanel {
  etiqueta: string;
  modulos: ModuloPanel[];
}

export const GRUPOS_MODULOS_PANEL: GrupoModulosPanel[] = [
  {
    etiqueta: 'General',
    modulos: [
      { codigo: 'dashboard', etiqueta: 'Dashboard', path: '/admin' },
      { codigo: 'alertas', etiqueta: 'Centro de Alertas', path: '/admin/alertas' },
    ],
  },
  {
    etiqueta: 'Gestión',
    modulos: [
      { codigo: 'clientes', etiqueta: 'Clientes', path: '/admin/clientes' },
      { codigo: 'inventario', etiqueta: 'Inventario', path: '/admin/inventario', tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'categorias', etiqueta: 'Categorías', path: '/admin/inventario/categorias', tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'ajustes_inventario', etiqueta: 'Ajustes de Inventario', path: '/admin/inventario/ajustes', tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'traslados_inventario', etiqueta: 'Traslados entre Almacenes', path: '/admin/inventario/traslados', tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'proveedores', etiqueta: 'Proveedores', path: '/admin/proveedores', tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'ordenes_compra', etiqueta: 'Órdenes de Compra', path: '/admin/proveedores/ordenes-compra', tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'cuentas_por_pagar', etiqueta: 'Cuentas por Pagar', path: '/admin/proveedores/cuentas-por-pagar', tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'pedidos', etiqueta: 'Pedidos', path: '/admin/pedidos', tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'notas_entrega', etiqueta: 'Notas de Entrega', path: '/admin/facturacion/notas-entrega', tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'pos', etiqueta: 'Punto de Venta (POS)', path: '/admin/pos', tiposNegocio: ['retail', 'farmacia', 'servicios', 'restaurante'] },
      { codigo: 'mesas', etiqueta: 'Mesas y Pedidos', path: '/admin/restaurante/mesas', tiposNegocio: ['restaurante'] },
      { codigo: 'cocina', etiqueta: 'Cocina', path: '/admin/restaurante/cocina', tiposNegocio: ['restaurante'] },
      // Sin restringir a 'farmacia' -- LoteProducto siempre fue opcional
      // por producto (cualquier negocio con mercancía perecedera/con fecha
      // de caducidad lo puede usar), y el backend nunca lo restringió.
      { codigo: 'lotes_vencimientos', etiqueta: 'Lotes y Vencimientos', path: '/admin/farmacia/lotes', tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'ordenes_servicio', etiqueta: 'Órdenes de Servicio', path: '/admin/servicios/ordenes', tiposNegocio: ['servicios'] },
      { codigo: 'empresas_contables', etiqueta: 'Empresas (Clientes)', path: '/admin/contabilidad/empresas', tiposNegocio: ['contador'] },
      { codigo: 'servicios_facturables', etiqueta: 'Servicios y Honorarios', path: '/admin/contabilidad/servicios', tiposNegocio: ['contador'] },
      // Sin `tiposNegocio` (antes restringido a 'contador'): cualquier
      // negocio lleva su propia contabilidad ahora -- ver
      // `EmpresaSelector`, que le resuelve/auto-crea su única empresa
      // contable propia, y `apps.contabilidad.services.generar_asiento_automatico_venta`
      // / `generar_asiento_automatico_ajuste_inventario`, que la alimentan solos.
      { codigo: 'asientos_contables', etiqueta: 'Asientos Contables', path: '/admin/contabilidad/asientos' },
      { codigo: 'plan_cuentas', etiqueta: 'Plan de Cuentas', path: '/admin/contabilidad/cuentas' },
      { codigo: 'libro_mayor', etiqueta: 'Libro Mayor', path: '/admin/contabilidad/libro-mayor' },
      { codigo: 'balance_comprobacion', etiqueta: 'Balance de Comprobación', path: '/admin/contabilidad/balance' },
      { codigo: 'estados_financieros', etiqueta: 'Estados Financieros', path: '/admin/contabilidad/estados' },
      { codigo: 'conciliacion_bancaria', etiqueta: 'Conciliación Bancaria', path: '/admin/contabilidad/conciliacion', tiposNegocio: ['contador'] },
      { codigo: 'cobros', etiqueta: 'Cobros', path: '/admin/facturacion/cobros' },
      { codigo: 'cuentas_por_cobrar', etiqueta: 'Cuentas por Cobrar', path: '/admin/facturacion/cuentas-por-cobrar' },
      { codigo: 'caja_bancos', etiqueta: 'Caja y Bancos', path: '/admin/facturacion/caja-bancos' },
      { codigo: 'clientes_b2b', etiqueta: 'Red de Clientes', path: '/admin/clientes/b2b', tiposNegocio: ['b2b'] },
      { codigo: 'empleados', etiqueta: 'Empleados', path: '/admin/rrhh' },
      { codigo: 'departamentos', etiqueta: 'Departamentos', path: '/admin/rrhh/departamentos' },
      { codigo: 'nomina', etiqueta: 'Nómina', path: '/admin/rrhh/nomina' },
    ],
  },
  {
    etiqueta: 'CRM',
    modulos: [
      { codigo: 'oportunidades', etiqueta: 'Oportunidades', path: '/admin/crm/oportunidades' },
      { codigo: 'cotizaciones', etiqueta: 'Cotizaciones', path: '/admin/crm/cotizaciones' },
    ],
  },
  {
    etiqueta: 'Postventa',
    modulos: [
      { codigo: 'garantias', etiqueta: 'Garantías', path: '/admin/postventa/garantias', tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'reclamos_postventa', etiqueta: 'Reclamos Postventa', path: '/admin/postventa/reclamos' },
    ],
  },
  {
    etiqueta: 'Fiscal',
    modulos: [
      { codigo: 'notas_credito', etiqueta: 'Notas de Crédito', path: '/admin/facturacion/notas-credito' },
      { codigo: 'notas_debito', etiqueta: 'Notas de Débito', path: '/admin/facturacion/notas-debito' },
      { codigo: 'libros_fiscales', etiqueta: 'Libros Fiscales', path: '/admin/facturacion/libros' },
      { codigo: 'retenciones', etiqueta: 'Retenciones', path: '/admin/facturacion/retenciones' },
      { codigo: 'auditoria', etiqueta: 'Auditoría', path: '/admin/auditoria' },
    ],
  },
  {
    etiqueta: 'Cargas Masivas',
    modulos: [
      { codigo: 'importar_productos', etiqueta: 'Importar Productos', path: '/admin/inventario/importar', tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'importar_clientes', etiqueta: 'Importar Clientes', path: '/admin/clientes/importar', tiposNegocio: ['retail', 'restaurante', 'farmacia', 'servicios', 'contador'] },
      { codigo: 'importar_clientes_b2b', etiqueta: 'Importar Clientes', path: '/admin/clientes/b2b/importar', tiposNegocio: ['b2b'] },
    ],
  },
  {
    etiqueta: 'Configuración',
    modulos: [
      { codigo: 'suscripcion', etiqueta: 'Mi Suscripción', path: '/admin/suscripcion' },
      { codigo: 'referidos', etiqueta: 'Programa de Referidos', path: '/admin/referidos' },
      { codigo: 'datos_empresa', etiqueta: 'Datos de la Empresa', path: '/admin/configuracion/empresa' },
      { codigo: 'almacenes', etiqueta: 'Almacenes', path: '/admin/inventario/almacenes', tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'impuestos', etiqueta: 'Impuestos', path: '/admin/configuracion/iva' },
      { codigo: 'monedas', etiqueta: 'Monedas', path: '/admin/configuracion/monedas' },
      { codigo: 'tasas_cambio', etiqueta: 'Tasas de Cambio', path: '/admin/configuracion/tasas-cambio' },
      { codigo: 'metodos_pago', etiqueta: 'Métodos de Pago', path: '/admin/configuracion/metodos-pago' },
      { codigo: 'bancos', etiqueta: 'Bancos', path: '/admin/configuracion/bancos' },
      { codigo: 'pagos_online', etiqueta: 'Pagos en Línea', path: '/admin/configuracion/pagos-online', tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'fiscal', etiqueta: 'País y Fiscalidad', path: '/admin/configuracion/fiscal' },
      { codigo: 'correlativo', etiqueta: 'Numeración de Facturas', path: '/admin/configuracion/correlativo' },
      { codigo: 'permisos_rol', etiqueta: 'Permisos por Rol', path: '/admin/configuracion/permisos' },
    ],
  },
];

/** Todos los módulos en un solo array plano (para búsquedas). */
export const MODULOS_PANEL: ModuloPanel[] = GRUPOS_MODULOS_PANEL.flatMap((g) => g.modulos);

/**
 * Resuelve a qué módulo pertenece una ruta (mismo criterio que
 * `SidebarLink.isActive`: `/admin` exige coincidencia exacta, el resto es
 * por prefijo). Entre varios prefijos que calcen, gana el más largo/específico
 * (ej. `/admin/inventario/categorias` debe resolver a `categorias`, no a
 * `inventario`).
 */
export function moduloDeRuta(pathname: string): ModuloPanel | null {
  let mejor: ModuloPanel | null = null;
  for (const modulo of MODULOS_PANEL) {
    const coincide = modulo.path === '/admin' ? pathname === '/admin' : pathname.startsWith(modulo.path);
    if (coincide && (!mejor || modulo.path.length > mejor.path.length)) {
      mejor = modulo;
    }
  }
  return mejor;
}

/** Primer módulo no oculto para el rol actual -- a dónde mandar a alguien cuyo módulo actual (o el dashboard) está oculto. */
export function primerModuloVisible(modulosOcultos: string[], tipoNegocio?: TipoNegocio): ModuloPanel | null {
  const ocultos = new Set(modulosOcultos);
  for (const modulo of MODULOS_PANEL) {
    if (ocultos.has(modulo.codigo)) continue;
    if (modulo.tiposNegocio && (!tipoNegocio || !modulo.tiposNegocio.includes(tipoNegocio))) continue;
    return modulo;
  }
  return null;
}
