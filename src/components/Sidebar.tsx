"use client";

import { useCallback, useMemo, memo } from "react";
import { useTenant } from "@/hooks/useTenant"; // Ahora usa el hook actualizado
import {
  LayoutDashboard,
  Package,
  Tags,
  Users,
  ShoppingCart,
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
  Scale,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  menuMovilAbierto: boolean;
  setMenuMovilAbierto: (abierto: boolean) => void;
  ejecutarLogout: () => void;
}

interface SidebarLinkProps {
  href: string;
  children: React.ReactNode;
}

/**
 * Enlace de navegación memoizado para evitar re-renderizados innecesarios
 * cuando cambia un estado ajeno (p. ej. el menú móvil).
 */
const SidebarLink = memo(function SidebarLink({ href, children }: SidebarLinkProps) {
  const pathname = usePathname();
  // Lógica mejorada para el enlace activo: exacto para el dashboard, prefijo para los demás.
  const isActive =
    (href === "/admin" && pathname === href) ||
    (href !== "/admin" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
        isActive ? "bg-primary-100 text-primary-700" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </Link>
  );
});

export default function Sidebar({
  menuMovilAbierto,
  setMenuMovilAbierto,
  ejecutarLogout,
}: SidebarProps) {
  const { tenant, isLoading } = useTenant();

  // useCallback: estabiliza la referencia del manejador del overlay para el menú móvil.
  const cerrarMenu = useCallback(() => {
    setMenuMovilAbierto(false);
  }, [setMenuMovilAbierto]);

  // useMemo: el menú de navegación solo se recalcula cuando cambia el tipo de negocio.
  const navContent = useMemo(
    () => (
      <nav className="flex-grow space-y-1">
        <SidebarLink href="/admin">
          <LayoutDashboard size={18} /> Dashboard
        </SidebarLink>

        {/* --- GESTIÓN --- */}
        <div className="mt-4 mb-2 px-4 text-xs font-bold uppercase text-slate-400">Gestión</div>
        <SidebarLink href="/admin/inventario">
          <Package size={18} /> Inventario
        </SidebarLink>
        <SidebarLink href="/admin/inventario/categorias">
          <Tags size={18} /> Categorías
        </SidebarLink>

        {/* --- SECCIÓN DINÁMICA POR TIPO DE NEGOCIO --- */}
        {tenant?.tipo_negocio === "retail" && (
          <SidebarLink href="/admin/pos">
            <ShoppingCart size={18} /> Punto de Venta (POS)
          </SidebarLink>
        )}

        {tenant?.tipo_negocio === "b2b" && (
          <SidebarLink href="/admin/clientes/b2b">
            <Users size={18} /> Red de Clientes
          </SidebarLink>
        )}

        {/* --- FISCAL (SENIAT) --- */}
        <div className="mt-4 mb-2 px-4 text-xs font-bold uppercase text-slate-400">
          Fiscal (SENIAT)
        </div>
        <SidebarLink href="/admin/facturacion/notas-credito">
          <FileText size={18} /> Notas de Crédito
        </SidebarLink>
        <SidebarLink href="/admin/facturacion/notas-debito">
          <FileText size={18} /> Notas de Débito
        </SidebarLink>
        <SidebarLink href="/admin/facturacion/libros">
          <Landmark size={18} /> Libros Fiscales
        </SidebarLink>
        <SidebarLink href="/admin/facturacion/retenciones">
          <ReceiptText size={18} /> Retenciones
        </SidebarLink>

        {/* --- IMPORTACIONES --- */}
        <div className="mt-4 mb-2 px-4 text-xs font-bold uppercase text-slate-400">
          Cargas Masivas
        </div>
        <SidebarLink href="/admin/inventario/importar">
          <UploadCloud size={18} /> Importar Productos
        </SidebarLink>
        {tenant?.tipo_negocio === "b2b" && (
          <SidebarLink href="/admin/clientes/b2b/importar">
            <UserPlus size={18} /> Importar Clientes
          </SidebarLink>
        )}

        {/* --- CONFIGURACIÓN --- */}
        <div className="mt-4 mb-2 px-4 text-xs font-bold uppercase text-slate-400">
          Configuración
        </div>
        <SidebarLink href="/admin/inventario/almacenes">
          <Warehouse size={18} /> Almacenes
        </SidebarLink>
        <SidebarLink href="/admin/configuracion/iva">
          <ReceiptText size={18} /> Impuestos (IVA)
        </SidebarLink>
        <SidebarLink href="/admin/configuracion/monedas">
          <Coins size={18} /> Monedas
        </SidebarLink>
        <SidebarLink href="/admin/configuracion/tasas-cambio">
          <Repeat size={18} /> Tasas de Cambio
        </SidebarLink>
        <SidebarLink href="/admin/configuracion/metodos-pago">
          <Wallet size={18} /> Métodos de Pago
        </SidebarLink>
        <SidebarLink href="/admin/configuracion/fiscal">
          <Scale size={18} /> Estrategia Fiscal
        </SidebarLink>
      </nav>
    ),
    [tenant?.tipo_negocio],
  );

  return (
    <>
      {/* Overlay para móvil */}
      {menuMovilAbierto && (
        <div onClick={cerrarMenu} className="fixed inset-0 bg-black/60 z-40 md:hidden" />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 p-4 flex flex-col z-50 transform transition-transform md:relative md:translate-x-0 ${
          menuMovilAbierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center mb-8">
          <div className="font-bold text-lg truncate">
            {isLoading ? <Loader2 className="animate-spin" /> : tenant?.nombre_empresa}
          </div>
          <button onClick={cerrarMenu} className="md:hidden text-slate-500">
            <X size={20} />
          </button>
        </div>
        {isLoading ? (
          <div className="flex-grow flex items-center justify-center">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          navContent
        )}
        <div className="mt-auto">
          <button
            onClick={ejecutarLogout}
            className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 font-bold py-3 rounded-lg"
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
