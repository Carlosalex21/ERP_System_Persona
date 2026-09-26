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

import {
  ArrowLeftRight, BarChart3, BookOpen, Building2, Calculator, ChefHat, ClipboardList, Coins, FileBarChart, FileText,
  FlaskConical, Gift, Globe2, HandCoins, Hash, Landmark, LayoutDashboard, LifeBuoy, Package, ReceiptText, Repeat, Scale,
  Settings, ShieldCheck, ShoppingBag, ShoppingCart, Shuffle, SlidersHorizontal, Smartphone, Sparkles, Tags, Target,
  TriangleAlert, Truck, UploadCloud, UserPlus, UserRound, Users, Utensils, Wallet, Warehouse, Wrench,
  type LucideIcon,
} from 'lucide-react';

/** Debe calzar con `Client.TIPO_NEGOCIO_CHOICES` del backend (`apps.tenants.models`). */
export type TipoNegocio = 'retail' | 'b2b' | 'restaurante' | 'farmacia' | 'servicios' | 'contador';

/** Todo lo que NO es un contador -- para módulos de "bienes físicos" que a un contador no le aplican. */
export const TIPOS_CON_INVENTARIO: TipoNegocio[] = ['retail', 'b2b', 'restaurante', 'farmacia', 'servicios'];

export interface ModuloPanel {
  codigo: string;
  etiqueta: string;
  path: string;
  icono: LucideIcon;
  /** Si se define, el módulo solo aplica a tenants de alguno de estos tipos de negocio. */
  tiposNegocio?: TipoNegocio[];
  /** Solo visible para el rol administrador (independiente de `modulos_ocultos`). */
  soloAdmin?: boolean;
  /**
   * Incluido en TODOS los planes (sin él el sistema no se puede operar). El
   * resto se vende por plan: `Plan.modulos` en el backend, que debe listar
   * los mismos códigos (ver `apps/tenants/modulos.py`).
   */
  basico?: boolean;
}

export interface GrupoModulosPanel {
  /** Identificador estable (clave de estado abierto/cerrado del menú). */
  id: string;
  etiqueta: string;
  icono: LucideIcon;
  modulos: ModuloPanel[];
  /** Grupos fijos (siempre expandidos, sin cabecera colapsable) -- el "inicio" del panel. */
  fijo?: boolean;
}

/**
 * Menú organizado por MÓDULO DE NEGOCIO (Ventas, Inventario, Compras,
 * Finanzas...). Antes "Gestión" era una sola lista plana de ~30 enlaces
 * que mezclaba inventario, contabilidad, cobros y RRHH -- el usuario no
 * encontraba nada. Cada grupo se colapsa; los grupos sin ningún módulo
 * visible para el tenant/rol simplemente no se muestran.
 */
export const GRUPOS_MODULOS_PANEL: GrupoModulosPanel[] = [
  {
    id: 'inicio',
    etiqueta: 'Inicio',
    icono: LayoutDashboard,
    fijo: true,
    modulos: [
      { codigo: 'dashboard', etiqueta: 'Dashboard', path: '/admin', icono: LayoutDashboard, basico: true },
      { codigo: 'alertas', etiqueta: 'Centro de Alertas', path: '/admin/alertas', icono: TriangleAlert, basico: true },
      { codigo: 'reportes', etiqueta: 'Reportes y Analítica', path: '/admin/reportes', icono: BarChart3 },
    ],
  },
  {
    id: 'ventas',
    etiqueta: 'Ventas',
    icono: ShoppingCart,
    modulos: [
      { codigo: 'pos', etiqueta: 'Punto de Venta (POS)', path: '/admin/pos', icono: ShoppingCart, tiposNegocio: ['retail', 'farmacia', 'servicios', 'restaurante'] },
      { codigo: 'mesas', etiqueta: 'Mesas y Pedidos', path: '/admin/restaurante/mesas', icono: Utensils, tiposNegocio: ['restaurante'] },
      { codigo: 'cocina', etiqueta: 'Cocina', path: '/admin/restaurante/cocina', icono: ChefHat, tiposNegocio: ['restaurante'] },
      { codigo: 'ordenes_servicio', etiqueta: 'Órdenes de Servicio', path: '/admin/servicios/ordenes', icono: Wrench, tiposNegocio: ['servicios'] },
      { codigo: 'pedidos', etiqueta: 'Pedidos', path: '/admin/pedidos', icono: ShoppingBag, tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'clientes', etiqueta: 'Clientes', path: '/admin/clientes', icono: UserRound },
      { codigo: 'clientes_b2b', etiqueta: 'Red de Clientes B2B', path: '/admin/clientes/b2b', icono: Users, tiposNegocio: ['b2b'] },
      { codigo: 'notas_entrega', etiqueta: 'Notas de Entrega', path: '/admin/facturacion/notas-entrega', icono: ReceiptText, tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'cotizaciones', etiqueta: 'Cotizaciones', path: '/admin/crm/cotizaciones', icono: FileText },
      { codigo: 'oportunidades', etiqueta: 'Oportunidades (CRM)', path: '/admin/crm/oportunidades', icono: Target },
    ],
  },
  {
    id: 'inventario',
    etiqueta: 'Inventario',
    icono: Package,
    modulos: [
      { codigo: 'inventario', etiqueta: 'Productos', path: '/admin/inventario', icono: Package, tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'categorias', etiqueta: 'Categorías', path: '/admin/inventario/categorias', icono: Tags, tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'ajustes_inventario', etiqueta: 'Entradas y Salidas', path: '/admin/inventario/ajustes', icono: ArrowLeftRight, tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'traslados_inventario', etiqueta: 'Traslados entre Almacenes', path: '/admin/inventario/traslados', icono: Shuffle, tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'almacenes', etiqueta: 'Almacenes', path: '/admin/inventario/almacenes', icono: Warehouse, tiposNegocio: TIPOS_CON_INVENTARIO },
      // Sin restringir a 'farmacia' -- LoteProducto siempre fue opcional
      // por producto (cualquier negocio con mercancía perecedera/con fecha
      // de caducidad lo puede usar), y el backend nunca lo restringió.
      { codigo: 'lotes_vencimientos', etiqueta: 'Lotes y Vencimientos', path: '/admin/farmacia/lotes', icono: FlaskConical, tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'importar_productos', etiqueta: 'Importar Productos', path: '/admin/inventario/importar', icono: UploadCloud, tiposNegocio: TIPOS_CON_INVENTARIO },
    ],
  },
  {
    id: 'compras',
    etiqueta: 'Compras',
    icono: Truck,
    modulos: [
      { codigo: 'proveedores', etiqueta: 'Proveedores', path: '/admin/proveedores', icono: Truck, tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'ordenes_compra', etiqueta: 'Órdenes de Compra', path: '/admin/proveedores/ordenes-compra', icono: ClipboardList, tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'cuentas_por_pagar', etiqueta: 'Cuentas por Pagar', path: '/admin/proveedores/cuentas-por-pagar', icono: HandCoins, tiposNegocio: TIPOS_CON_INVENTARIO },
    ],
  },
  {
    id: 'finanzas',
    etiqueta: 'Finanzas',
    icono: Wallet,
    modulos: [
      { codigo: 'cobros', etiqueta: 'Cobros', path: '/admin/facturacion/cobros', icono: Landmark },
      { codigo: 'cuentas_por_cobrar', etiqueta: 'Cuentas por Cobrar', path: '/admin/facturacion/cuentas-por-cobrar', icono: HandCoins },
      { codigo: 'caja_bancos', etiqueta: 'Caja y Bancos', path: '/admin/facturacion/caja-bancos', icono: Wallet },
    ],
  },
  {
    id: 'contabilidad',
    etiqueta: 'Contabilidad',
    icono: BookOpen,
    modulos: [
      { codigo: 'empresas_contables', etiqueta: 'Empresas (Clientes)', path: '/admin/contabilidad/empresas', icono: Building2, tiposNegocio: ['contador'] },
      { codigo: 'servicios_facturables', etiqueta: 'Servicios y Honorarios', path: '/admin/contabilidad/servicios', icono: Wrench, tiposNegocio: ['contador'] },
      // Sin `tiposNegocio`: cualquier negocio lleva su propia contabilidad
      // (ver `EmpresaSelector` y los asientos automáticos del backend).
      { codigo: 'asientos_contables', etiqueta: 'Asientos Contables', path: '/admin/contabilidad/asientos', icono: BookOpen },
      { codigo: 'plan_cuentas', etiqueta: 'Plan de Cuentas', path: '/admin/contabilidad/cuentas', icono: Calculator },
      { codigo: 'libro_mayor', etiqueta: 'Libro Mayor', path: '/admin/contabilidad/libro-mayor', icono: FileBarChart },
      { codigo: 'balance_comprobacion', etiqueta: 'Balance de Comprobación', path: '/admin/contabilidad/balance', icono: Scale },
      { codigo: 'estados_financieros', etiqueta: 'Estados Financieros', path: '/admin/contabilidad/estados', icono: FileBarChart },
      { codigo: 'conciliacion_bancaria', etiqueta: 'Conciliación Bancaria', path: '/admin/contabilidad/conciliacion', icono: Landmark, tiposNegocio: ['contador'] },
    ],
  },
  {
    id: 'fiscal',
    etiqueta: 'Fiscal',
    icono: ReceiptText,
    modulos: [
      { codigo: 'libros_fiscales', etiqueta: 'Libros Fiscales', path: '/admin/facturacion/libros', icono: Landmark },
      { codigo: 'notas_credito', etiqueta: 'Notas de Crédito', path: '/admin/facturacion/notas-credito', icono: FileText },
      { codigo: 'notas_debito', etiqueta: 'Notas de Débito', path: '/admin/facturacion/notas-debito', icono: FileText },
      { codigo: 'retenciones', etiqueta: 'Retenciones', path: '/admin/facturacion/retenciones', icono: ReceiptText },
    ],
  },
  {
    id: 'rrhh',
    etiqueta: 'Recursos Humanos',
    icono: Users,
    modulos: [
      { codigo: 'empleados', etiqueta: 'Empleados', path: '/admin/rrhh', icono: Users },
      { codigo: 'departamentos', etiqueta: 'Departamentos', path: '/admin/rrhh/departamentos', icono: Building2 },
      { codigo: 'nomina', etiqueta: 'Nómina', path: '/admin/rrhh/nomina', icono: Wallet },
    ],
  },
  {
    id: 'postventa',
    etiqueta: 'Postventa',
    icono: LifeBuoy,
    modulos: [
      { codigo: 'garantias', etiqueta: 'Garantías', path: '/admin/postventa/garantias', icono: ShieldCheck, tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'reclamos_postventa', etiqueta: 'Reclamos', path: '/admin/postventa/reclamos', icono: LifeBuoy },
    ],
  },
  {
    id: 'configuracion',
    etiqueta: 'Configuración',
    icono: Settings,
    modulos: [
      { codigo: 'datos_empresa', etiqueta: 'Datos de la Empresa', path: '/admin/configuracion/empresa', icono: Building2, basico: true },
      { codigo: 'suscripcion', etiqueta: 'Mi Suscripción', path: '/admin/suscripcion', icono: Sparkles, basico: true },
      { codigo: 'monedas', etiqueta: 'Monedas', path: '/admin/configuracion/monedas', icono: Coins, basico: true },
      { codigo: 'tasas_cambio', etiqueta: 'Tasas de Cambio', path: '/admin/configuracion/tasas-cambio', icono: Repeat, basico: true },
      { codigo: 'impuestos', etiqueta: 'Impuestos', path: '/admin/configuracion/iva', icono: ReceiptText, basico: true },
      { codigo: 'metodos_pago', etiqueta: 'Métodos de Pago', path: '/admin/configuracion/metodos-pago', icono: Wallet, basico: true },
      { codigo: 'bancos', etiqueta: 'Bancos', path: '/admin/configuracion/bancos', icono: Landmark, basico: true },
      { codigo: 'pagos_online', etiqueta: 'Pagos en Línea', path: '/admin/configuracion/pagos-online', icono: Smartphone, tiposNegocio: TIPOS_CON_INVENTARIO },
      { codigo: 'fiscal', etiqueta: 'País y Fiscalidad', path: '/admin/configuracion/fiscal', icono: Globe2, basico: true },
      { codigo: 'correlativo', etiqueta: 'Numeración de Facturas', path: '/admin/configuracion/correlativo', icono: Hash, basico: true },
      { codigo: 'importar_clientes', etiqueta: 'Importar Clientes', path: '/admin/clientes/importar', icono: UserPlus, tiposNegocio: ['retail', 'restaurante', 'farmacia', 'servicios', 'contador'] },
      { codigo: 'importar_clientes_b2b', etiqueta: 'Importar Clientes', path: '/admin/clientes/b2b/importar', icono: UserPlus, tiposNegocio: ['b2b'] },
      { codigo: 'auditoria', etiqueta: 'Auditoría', path: '/admin/auditoria', icono: ShieldCheck },
      { codigo: 'referidos', etiqueta: 'Programa de Referidos', path: '/admin/referidos', icono: Gift, basico: true },
      { codigo: 'permisos_rol', etiqueta: 'Permisos por Rol', path: '/admin/configuracion/permisos', icono: SlidersHorizontal, soloAdmin: true, basico: true },
    ],
  },
];

/**
 * Orden de los grupos según el tipo de negocio: lo que ese negocio usa a
 * diario va arriba (un contador vive en Contabilidad; un restaurante en
 * Ventas). Los grupos no listados conservan su orden relativo al final.
 */
const ORDEN_GRUPOS_POR_TIPO: Partial<Record<TipoNegocio, string[]>> = {
  contador: ['inicio', 'contabilidad', 'finanzas', 'fiscal', 'ventas'],
  b2b: ['inicio', 'ventas', 'inventario', 'compras', 'finanzas'],
  servicios: ['inicio', 'ventas', 'finanzas', 'inventario'],
};

function aplicaAlTipo(modulo: ModuloPanel, tipoNegocio?: TipoNegocio): boolean {
  return !modulo.tiposNegocio || (!!tipoNegocio && modulo.tiposNegocio.includes(tipoNegocio));
}

/** `modulosPlan` = módulos que incluye el plan contratado; `null`/`undefined` = todos. */
export function incluidoEnPlan(modulo: ModuloPanel, modulosPlan: readonly string[] | null | undefined): boolean {
  return Boolean(modulo.basico) || !modulosPlan || modulosPlan.includes(modulo.codigo);
}

/** Grupos con solo los módulos que se venden por plan (para el editor de planes del superadmin). */
export const GRUPOS_MODULOS_VENDIBLES: GrupoModulosPanel[] = GRUPOS_MODULOS_PANEL
  .map((g) => ({ ...g, modulos: g.modulos.filter((m) => !m.basico) }))
  .filter((g) => g.modulos.length > 0);

/** Módulos aplicables a este tipo de negocio que su plan NO incluye (para invitar a mejorar el plan). */
export function modulosFueraDelPlan(tipoNegocio: TipoNegocio | undefined, modulosPlan: readonly string[] | null | undefined): ModuloPanel[] {
  if (!modulosPlan) return [];
  return MODULOS_PANEL.filter((m) => aplicaAlTipo(m, tipoNegocio) && !m.soloAdmin && !incluidoEnPlan(m, modulosPlan));
}

/**
 * Grupos (ordenados) con solo los módulos que este tenant y este rol deben
 * ver -- la única función que decide qué aparece en el menú lateral.
 */
export function gruposVisibles(
  tipoNegocio: TipoNegocio | undefined,
  modulosOcultos: ReadonlySet<string>,
  esAdmin: boolean,
  modulosPlan?: readonly string[] | null,
): GrupoModulosPanel[] {
  const orden = (tipoNegocio && ORDEN_GRUPOS_POR_TIPO[tipoNegocio]) || [];
  const posicion = (id: string): number => {
    const i = orden.indexOf(id);
    return i === -1 ? orden.length + GRUPOS_MODULOS_PANEL.findIndex((g) => g.id === id) : i;
  };
  return GRUPOS_MODULOS_PANEL
    .map((grupo) => ({
      ...grupo,
      modulos: grupo.modulos.filter(
        (m) => aplicaAlTipo(m, tipoNegocio) && incluidoEnPlan(m, modulosPlan) && !modulosOcultos.has(m.codigo) && (!m.soloAdmin || esAdmin),
      ),
    }))
    .filter((grupo) => grupo.modulos.length > 0)
    .sort((a, b) => posicion(a.id) - posicion(b.id));
}

/** Grupo al que pertenece un módulo (para abrirlo desde el tour o el buscador). */
export function grupoDeModulo(codigo: string): GrupoModulosPanel | null {
  return GRUPOS_MODULOS_PANEL.find((g) => g.modulos.some((m) => m.codigo === codigo)) ?? null;
}

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
export function primerModuloVisible(modulosOcultos: string[], tipoNegocio?: TipoNegocio, modulosPlan?: readonly string[] | null): ModuloPanel | null {
  const ocultos = new Set(modulosOcultos);
  for (const modulo of MODULOS_PANEL) {
    if (ocultos.has(modulo.codigo) || !incluidoEnPlan(modulo, modulosPlan)) continue;
    if (modulo.soloAdmin || !aplicaAlTipo(modulo, tipoNegocio)) continue;
    return modulo;
  }
  return null;
}
