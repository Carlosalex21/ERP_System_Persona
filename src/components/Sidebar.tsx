"use client";

import { useCallback, useMemo, memo } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useUsuarioActual } from "@/hooks/useUsuarioActual";
import { usePedidosPendientes } from "@/hooks/usePedidosPendientes";
import { getPaisInfo } from "@/utils/paises";
import { tenantUrl } from "@/utils/tenantUrl";
import {
  LayoutDashboard,
  Package,
  Tags,
  Users,
  ShoppingCart,
  ShoppingBag,
  Loader2,
  LogOut,
  X,
  Warehouse,
  ReceiptText,
  UploadCloud,
  UserPlus,
  Coins,
  Repeat,
  FileText,
  Landmark,
  Globe2,
  Wallet,
  ExternalLink,
  Truck,
  Smartphone,
  Building2,
  ArrowLeftRight,
  Sparkles,
  Hash,
  ShieldCheck,
  SlidersHorizontal,
  Utensils,
  FlaskConical,
  Wrench,
  Calculator,
  BookOpen,
  Scale,
  FileBarChart,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TipoNegocio } from "@/utils/modulosPanel";

/** Mismos tipos que habilitan el módulo 'pos' en `utils/modulosPanel.ts` -- un negocio de mostrador (farmacia, taller) o de barra rápida (restaurante) también cobra por el POS clásico, no solo retail. */
const POS_TIPOS_NEGOCIO: TipoNegocio[] = ['retail', 'farmacia', 'servicios', 'restaurante'];

/** Todo lo que NO es un contador -- ver `TIPOS_CON_INVENTARIO` en `utils/modulosPanel.ts` (misma lista). */
const TIPOS_CON_INVENTARIO: TipoNegocio[] = ['retail', 'b2b', 'restaurante', 'farmacia', 'servicios'];

interface SidebarProps {
  menuMovilAbierto: boolean;
  setMenuMovilAbierto: (abierto: boolean) => void;
  ejecutarLogout: () => void;
}

interface SidebarLinkProps {
  href: string;
  children: React.ReactNode;
  /** Ancla para el tour guiado (`GuidedTour` busca `[data-tour="..."]`). */
  dataTour?: string;
}

/**
 * Enlace de navegación memoizado para evitar re-renderizados innecesarios
 * cuando cambia un estado ajeno (p. ej. el menú móvil).
 */
const SidebarLink = memo(function SidebarLink({ href, children, dataTour }: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive =
    (href === "/admin" && pathname === href) ||
    (href !== "/admin" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      data-tour={dataTour}
      className={`relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
        isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
      }`}
    >
      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary-400" />}
      {children}
    </Link>
  );
});

function SidebarGroupLabel({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 mb-1.5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">{children}</div>;
}

export default function Sidebar({
  menuMovilAbierto,
  setMenuMovilAbierto,
  ejecutarLogout,
}: SidebarProps) {
  const { tenant, isLoading } = useTenant();
  const usuario = useUsuarioActual();
  const pais = getPaisInfo(tenant?.pais_codigo);
  // Un contador no tiene catálogo/tienda pública que mostrar (no vende
  // productos) -- el link solo aplica a los tipos de negocio con inventario.
  const tiendaPublicaUrl = tenant?.schema_name && tenant.tipo_negocio !== 'contador' ? tenantUrl(tenant.schema_name) : undefined;
  const pedidosPendientes = usePedidosPendientes();

  // Códigos de `utils/modulosPanel.ts` que el rol de este usuario no debe
  // ver (ver "Permisos por Rol", `/admin/configuracion/permisos`) -- un
  // `Set` vacío si todavía no cargó o el usuario no tiene rol asignado, así
  // que por defecto se ve TODO (fail-open: esto es solo el menú, el
  // backend sigue exigiendo el permiso real en cada endpoint).
  const modulosOcultos = useMemo(() => new Set(usuario?.modulos_ocultos ?? []), [usuario]);
  const oculto = useCallback((codigo: string) => modulosOcultos.has(codigo), [modulosOcultos]);
  const esAdmin = usuario?.rol_codigo === 'admin';

  const cerrarMenu = useCallback(() => {
    setMenuMovilAbierto(false);
  }, [setMenuMovilAbierto]);

  const navContent = useMemo(
    () => (
      <nav className="flex-grow space-y-1">
        {!oculto('dashboard') && (
          <SidebarLink href="/admin" dataTour="dashboard">
            <LayoutDashboard size={18} /> Dashboard
          </SidebarLink>
        )}

        <SidebarGroupLabel>Gestión</SidebarGroupLabel>
        {tenant?.tipo_negocio && TIPOS_CON_INVENTARIO.includes(tenant.tipo_negocio) && !oculto('inventario') && (
          <SidebarLink href="/admin/inventario" dataTour="inventario">
            <Package size={18} /> Inventario
          </SidebarLink>
        )}
        {tenant?.tipo_negocio && TIPOS_CON_INVENTARIO.includes(tenant.tipo_negocio) && !oculto('categorias') && (
          <SidebarLink href="/admin/inventario/categorias">
            <Tags size={18} /> Categorías
          </SidebarLink>
        )}
        {tenant?.tipo_negocio && TIPOS_CON_INVENTARIO.includes(tenant.tipo_negocio) && !oculto('ajustes_inventario') && (
          <SidebarLink href="/admin/inventario/ajustes" dataTour="ajustes-inventario">
            <ArrowLeftRight size={18} /> Ajustes de Inventario
          </SidebarLink>
        )}
        {tenant?.tipo_negocio && TIPOS_CON_INVENTARIO.includes(tenant.tipo_negocio) && !oculto('proveedores') && (
          <SidebarLink href="/admin/proveedores">
            <Truck size={18} /> Proveedores
          </SidebarLink>
        )}
        {tenant?.tipo_negocio && TIPOS_CON_INVENTARIO.includes(tenant.tipo_negocio) && !oculto('pedidos') && (
          <SidebarLink href="/admin/pedidos">
            <ShoppingBag size={18} /> Pedidos
            {pedidosPendientes > 0 && (
              <span className="ml-auto bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {pedidosPendientes}
              </span>
            )}
          </SidebarLink>
        )}

        {tenant?.tipo_negocio && POS_TIPOS_NEGOCIO.includes(tenant.tipo_negocio) && !oculto('pos') && (
          <SidebarLink href="/admin/pos">
            <ShoppingCart size={18} /> Punto de Venta (POS)
          </SidebarLink>
        )}
        {tenant?.tipo_negocio === "restaurante" && !oculto('mesas') && (
          <SidebarLink href="/admin/restaurante/mesas">
            <Utensils size={18} /> Mesas y Pedidos
          </SidebarLink>
        )}
        {tenant?.tipo_negocio === "farmacia" && !oculto('lotes_vencimientos') && (
          <SidebarLink href="/admin/farmacia/lotes">
            <FlaskConical size={18} /> Lotes y Vencimientos
          </SidebarLink>
        )}
        {tenant?.tipo_negocio === "servicios" && !oculto('ordenes_servicio') && (
          <SidebarLink href="/admin/servicios/ordenes">
            <Wrench size={18} /> Órdenes de Servicio
          </SidebarLink>
        )}
        {tenant?.tipo_negocio === "contador" && !oculto('empresas_contables') && (
          <SidebarLink href="/admin/contabilidad/empresas" dataTour="empresas-contables">
            <Building2 size={18} /> Empresas (Clientes)
          </SidebarLink>
        )}
        {tenant?.tipo_negocio === "contador" && !oculto('servicios_facturables') && (
          <SidebarLink href="/admin/contabilidad/servicios">
            <Wrench size={18} /> Servicios y Honorarios
          </SidebarLink>
        )}
        {tenant?.tipo_negocio === "contador" && !oculto('asientos_contables') && (
          <SidebarLink href="/admin/contabilidad/asientos">
            <BookOpen size={18} /> Asientos Contables
          </SidebarLink>
        )}
        {tenant?.tipo_negocio === "contador" && !oculto('plan_cuentas') && (
          <SidebarLink href="/admin/contabilidad/cuentas">
            <Calculator size={18} /> Plan de Cuentas
          </SidebarLink>
        )}
        {tenant?.tipo_negocio === "contador" && !oculto('libro_mayor') && (
          <SidebarLink href="/admin/contabilidad/libro-mayor">
            <FileBarChart size={18} /> Libro Mayor
          </SidebarLink>
        )}
        {tenant?.tipo_negocio === "contador" && !oculto('balance_comprobacion') && (
          <SidebarLink href="/admin/contabilidad/balance">
            <Scale size={18} /> Balance de Comprobación
          </SidebarLink>
        )}
        {tenant?.tipo_negocio === "contador" && !oculto('estados_financieros') && (
          <SidebarLink href="/admin/contabilidad/estados">
            <FileBarChart size={18} /> Estados Financieros
          </SidebarLink>
        )}
        {tenant?.tipo_negocio === "contador" && !oculto('conciliacion_bancaria') && (
          <SidebarLink href="/admin/contabilidad/conciliacion">
            <Landmark size={18} /> Conciliación Bancaria
          </SidebarLink>
        )}
        {!oculto('cobros') && (
          <SidebarLink href="/admin/facturacion/cobros">
            <Landmark size={18} /> Cobros
          </SidebarLink>
        )}

        {tenant?.tipo_negocio === "b2b" && !oculto('clientes_b2b') && (
          <SidebarLink href="/admin/clientes/b2b">
            <Users size={18} /> Red de Clientes
          </SidebarLink>
        )}
        {!oculto('empleados') && (
          <SidebarLink href="/admin/rrhh">
            <Users size={18} /> Empleados
          </SidebarLink>
        )}

        <SidebarGroupLabel>Fiscal</SidebarGroupLabel>
        {!oculto('notas_credito') && (
          <SidebarLink href="/admin/facturacion/notas-credito">
            <FileText size={18} /> Notas de Crédito
          </SidebarLink>
        )}
        {!oculto('notas_debito') && (
          <SidebarLink href="/admin/facturacion/notas-debito">
            <FileText size={18} /> Notas de Débito
          </SidebarLink>
        )}
        {!oculto('libros_fiscales') && (
          <SidebarLink href="/admin/facturacion/libros">
            <Landmark size={18} /> Libros Fiscales
          </SidebarLink>
        )}
        {!oculto('retenciones') && (
          <SidebarLink href="/admin/facturacion/retenciones">
            <ReceiptText size={18} /> Retenciones
          </SidebarLink>
        )}
        {!oculto('auditoria') && (
          <SidebarLink href="/admin/auditoria">
            <ShieldCheck size={18} /> Auditoría
          </SidebarLink>
        )}

        <SidebarGroupLabel>Cargas Masivas</SidebarGroupLabel>
        {tenant?.tipo_negocio && TIPOS_CON_INVENTARIO.includes(tenant.tipo_negocio) && !oculto('importar_productos') && (
          <SidebarLink href="/admin/inventario/importar">
            <UploadCloud size={18} /> Importar Productos
          </SidebarLink>
        )}
        {tenant?.tipo_negocio !== "b2b" && !oculto('importar_clientes') && (
          <SidebarLink href="/admin/clientes/importar">
            <UserPlus size={18} /> Importar Clientes
          </SidebarLink>
        )}
        {tenant?.tipo_negocio === "b2b" && !oculto('importar_clientes_b2b') && (
          <SidebarLink href="/admin/clientes/b2b/importar">
            <UserPlus size={18} /> Importar Clientes
          </SidebarLink>
        )}

        <SidebarGroupLabel>Configuración</SidebarGroupLabel>
        {!oculto('suscripcion') && (
          <SidebarLink href="/admin/suscripcion">
            <Sparkles size={18} /> Mi Suscripción
          </SidebarLink>
        )}
        {!oculto('datos_empresa') && (
          <SidebarLink href="/admin/configuracion/empresa" dataTour="datos-empresa">
            <Building2 size={18} /> Datos de la Empresa
          </SidebarLink>
        )}
        {tenant?.tipo_negocio && TIPOS_CON_INVENTARIO.includes(tenant.tipo_negocio) && !oculto('almacenes') && (
          <SidebarLink href="/admin/inventario/almacenes">
            <Warehouse size={18} /> Almacenes
          </SidebarLink>
        )}
        {!oculto('impuestos') && (
          <SidebarLink href="/admin/configuracion/iva">
            <ReceiptText size={18} /> Impuestos
          </SidebarLink>
        )}
        {!oculto('monedas') && (
          <SidebarLink href="/admin/configuracion/monedas">
            <Coins size={18} /> Monedas
          </SidebarLink>
        )}
        {!oculto('tasas_cambio') && (
          <SidebarLink href="/admin/configuracion/tasas-cambio">
            <Repeat size={18} /> Tasas de Cambio
          </SidebarLink>
        )}
        {!oculto('metodos_pago') && (
          <SidebarLink href="/admin/configuracion/metodos-pago">
            <Wallet size={18} /> Métodos de Pago
          </SidebarLink>
        )}
        {!oculto('bancos') && (
          <SidebarLink href="/admin/configuracion/bancos">
            <Landmark size={18} /> Bancos
          </SidebarLink>
        )}
        {tenant?.tipo_negocio && TIPOS_CON_INVENTARIO.includes(tenant.tipo_negocio) && !oculto('pagos_online') && (
          <SidebarLink href="/admin/configuracion/pagos-online">
            <Smartphone size={18} /> Pagos en Línea
          </SidebarLink>
        )}
        {!oculto('fiscal') && (
          <SidebarLink href="/admin/configuracion/fiscal">
            <Globe2 size={18} /> País y Fiscalidad
          </SidebarLink>
        )}
        {!oculto('correlativo') && (
          <SidebarLink href="/admin/configuracion/correlativo">
            <Hash size={18} /> Numeración de Facturas
          </SidebarLink>
        )}
        {esAdmin && (
          <SidebarLink href="/admin/configuracion/permisos">
            <SlidersHorizontal size={18} /> Permisos por Rol
          </SidebarLink>
        )}
      </nav>
    ),
    [tenant?.tipo_negocio, pedidosPendientes, modulosOcultos, oculto, esAdmin],
  );

  return (
    <>
      {menuMovilAbierto && (
        <div onClick={cerrarMenu} className="fixed inset-0 bg-black/60 z-40 md:hidden" />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-ink-950 border-r border-white/5 p-4 flex flex-col z-50 transform transition-transform md:relative md:translate-x-0 ${
          menuMovilAbierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center mb-2 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-black text-sm shrink-0">
              {(tenant?.nombre_empresa || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-white truncate">
                {isLoading ? <Loader2 className="animate-spin" size={16} /> : tenant?.nombre_empresa}
              </p>
              {!isLoading && tenant && (
                <p className="text-[10px] text-slate-500 font-mono">{pais.nombre} · {pais.moneda}</p>
              )}
            </div>
          </div>
          <button onClick={cerrarMenu} className="md:hidden text-slate-400 shrink-0">
            <X size={20} />
          </button>
        </div>

        {tiendaPublicaUrl && (
          <a
            href={tiendaPublicaUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-tour="tienda-publica"
            className="mt-3 mb-2 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-200 hover:bg-white/10 transition-colors"
          >
            <span className="flex items-center gap-2 truncate">
              <Globe2 size={14} className="text-primary-400 shrink-0" /> Ver tienda pública
            </span>
            <ExternalLink size={12} className="text-slate-500 shrink-0" />
          </a>
        )}

        <div className="mt-2 border-t border-white/5 pt-2 flex-grow overflow-y-auto min-h-0 scrollbar-thin-dark">
          {isLoading ? (
            <div className="flex-grow flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-slate-500" />
            </div>
          ) : (
            navContent
          )}
        </div>

        <div className="mt-auto pt-2 border-t border-white/5">
          <button
            onClick={ejecutarLogout}
            className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 font-bold py-2.5 rounded-xl transition-colors"
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
