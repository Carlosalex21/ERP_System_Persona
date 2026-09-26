"use client";

import { memo, useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ExternalLink, Globe2, Loader2, LogOut, Sparkles, X } from "lucide-react";

import CambiarPasswordModal from "@/components/CambiarPasswordModal";
import { useTenant } from "@/hooks/useTenant";
import { useUsuarioActual } from "@/hooks/useUsuarioActual";
import { usePedidosPendientes } from "@/hooks/usePedidosPendientes";
import { getPaisInfo } from "@/utils/paises";
import { tenantUrl } from "@/utils/tenantUrl";
import { gruposVisibles, moduloDeRuta, modulosFueraDelPlan, type GrupoModulosPanel, type ModuloPanel } from "@/utils/modulosPanel";

/** Evento global para abrir un grupo del menú desde fuera (tour guiado, buscador). */
export const EVENTO_ABRIR_GRUPO_SIDEBAR = "erp:sidebar-abrir-grupo";

const STORAGE_GRUPO_ABIERTO = "sidebar:grupo-abierto";

interface SidebarProps {
  menuMovilAbierto: boolean;
  setMenuMovilAbierto: (abierto: boolean) => void;
  ejecutarLogout: () => void;
}

interface SidebarLinkProps {
  modulo: ModuloPanel;
  activo: boolean;
  badge?: number;
  onNavigate: () => void;
}

const SidebarLink = memo(function SidebarLink({ modulo, activo, badge, onNavigate }: SidebarLinkProps) {
  const Icono = modulo.icono;
  return (
    <Link
      href={modulo.path}
      data-tour={modulo.codigo}
      onClick={onNavigate}
      aria-current={activo ? "page" : undefined}
      className={`relative flex items-center gap-3 pl-4 pr-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
        activo ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
      }`}
    >
      {activo && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary-400" />}
      <Icono size={17} className="shrink-0" />
      <span className="truncate">{modulo.etiqueta}</span>
      {!!badge && badge > 0 && (
        <span className="ml-auto bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
});

interface SidebarGroupProps {
  grupo: GrupoModulosPanel;
  abierto: boolean;
  onToggle: (id: string) => void;
  codigoActivo: string | null;
  badges: Record<string, number>;
  onNavigate: () => void;
}

/**
 * Sección colapsable por módulo de negocio. La animación usa
 * `grid-template-rows` (0fr -> 1fr) para abrir/cerrar a la altura real del
 * contenido sin medirla con JS.
 */
function SidebarGroup({ grupo, abierto, onToggle, codigoActivo, badges, onNavigate }: SidebarGroupProps): ReactElement {
  const Icono = grupo.icono;
  const contieneActivo = grupo.modulos.some((m) => m.codigo === codigoActivo);
  const totalBadges = grupo.modulos.reduce((acc, m) => acc + (badges[m.codigo] ?? 0), 0);

  return (
    <div data-tour={`grupo-${grupo.id}`}>
      <button
        type="button"
        onClick={() => onToggle(grupo.id)}
        aria-expanded={abierto}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
          contieneActivo ? "text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
        }`}
      >
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${contieneActivo ? "bg-primary-600 text-white" : "bg-white/5 text-slate-400"}`}>
          <Icono size={15} />
        </span>
        <span className="flex-1 text-left truncate">{grupo.etiqueta}</span>
        {!abierto && totalBadges > 0 && (
          <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">{totalBadges}</span>
        )}
        <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${abierto ? "" : "-rotate-90"}`} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${abierto ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="ml-5 mt-0.5 mb-1 space-y-0.5 border-l border-white/5 pl-2">
            {grupo.modulos.map((m) => (
              <SidebarLink
                key={m.codigo}
                modulo={m}
                activo={m.codigo === codigoActivo}
                badge={badges[m.codigo]}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function leerGrupoGuardado(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_GRUPO_ABIERTO);
  } catch {
    return null;
  }
}

function guardarGrupo(id: string | null): void {
  try {
    if (id) window.localStorage.setItem(STORAGE_GRUPO_ABIERTO, id);
    else window.localStorage.removeItem(STORAGE_GRUPO_ABIERTO);
  } catch {
    // Almacenamiento no disponible (modo privado): solo se pierde la preferencia.
  }
}

export default function Sidebar({ menuMovilAbierto, setMenuMovilAbierto, ejecutarLogout }: SidebarProps) {
  const { tenant, isLoading } = useTenant();
  const usuario = useUsuarioActual();
  const pathname = usePathname() ?? "";
  const pedidosPendientes = usePedidosPendientes();
  const modulosPlan = tenant?.subscription_status?.modulos_plan;
  const pais = getPaisInfo(tenant?.pais_codigo);
  // Un contador no tiene catálogo/tienda pública que mostrar.
  const tiendaPublicaUrl = tenant?.schema_name && tenant.tipo_negocio !== "contador" ? tenantUrl(tenant.schema_name) : undefined;

  // Fail-open a propósito: esto es solo el menú, el backend sigue exigiendo
  // el permiso real en cada endpoint.
  const grupos = useMemo(
    () => gruposVisibles(tenant?.tipo_negocio, new Set(usuario?.modulos_ocultos ?? []), usuario?.rol_codigo === "admin", modulosPlan),
    [tenant?.tipo_negocio, usuario, modulosPlan],
  );
  // Lo que el negocio podría usar pero su plan no incluye: se invita al
  // admin a mejorar el plan en vez de esconderlo sin explicación.
  const fueraDelPlan = useMemo(() => modulosFueraDelPlan(tenant?.tipo_negocio, modulosPlan), [tenant?.tipo_negocio, modulosPlan]);
  const codigoActivo = moduloDeRuta(pathname)?.codigo ?? null;
  const grupoActivo = grupos.find((g) => g.modulos.some((m) => m.codigo === codigoActivo))?.id ?? null;

  // Acordeón: un solo grupo abierto a la vez (el de la página activa por
  // defecto) -- con todos abiertos el menú volvía a ser una lista eterna.
  // (El menú no se renderiza hasta que carga la sesión, así que leer
  // localStorage en el inicializador no provoca diferencias de hidratación.)
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(() => grupoActivo ?? leerGrupoGuardado());
  // Al navegar a otro módulo se abre su sección (ajuste durante el render,
  // no en un efecto, para no pintar primero el estado viejo).
  const [grupoActivoPrevio, setGrupoActivoPrevio] = useState(grupoActivo);
  if (grupoActivo !== grupoActivoPrevio) {
    setGrupoActivoPrevio(grupoActivo);
    if (grupoActivo) setGrupoAbierto(grupoActivo);
  }

  useEffect(() => {
    const abrir = (e: Event): void => {
      const id = (e as CustomEvent<string>).detail;
      if (id) setGrupoAbierto(id);
    };
    window.addEventListener(EVENTO_ABRIR_GRUPO_SIDEBAR, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_GRUPO_SIDEBAR, abrir);
  }, []);

  const alternarGrupo = useCallback((id: string) => {
    setGrupoAbierto((actual) => {
      const siguiente = actual === id ? null : id;
      guardarGrupo(siguiente);
      return siguiente;
    });
  }, []);

  const cerrarMenu = useCallback(() => setMenuMovilAbierto(false), [setMenuMovilAbierto]);
  const badges = useMemo<Record<string, number>>(() => ({ pedidos: pedidosPendientes }), [pedidosPendientes]);

  return (
    <>
      {menuMovilAbierto && <div onClick={cerrarMenu} className="fixed inset-0 bg-black/60 z-40 md:hidden" />}

      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-ink-950 border-r border-white/5 p-4 flex flex-col z-50 transform transition-transform md:relative md:translate-x-0 ${
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
          <button onClick={cerrarMenu} className="md:hidden text-slate-400 shrink-0" aria-label="Cerrar menú">
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
              <Globe2 size={14} className="text-primary-400 shrink-0" />
              {tenant?.tipo_negocio === "restaurante" ? "Ver menú público" : "Ver tienda pública"}
            </span>
            <ExternalLink size={12} className="text-slate-500 shrink-0" />
          </a>
        )}

        <div className="mt-2 border-t border-white/5 pt-2 flex-grow overflow-y-auto min-h-0 scrollbar-thin-dark">
          {isLoading ? (
            <div className="space-y-2 py-2" aria-hidden>
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-9 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <nav className="space-y-1" aria-label="Menú principal">
              {grupos.map((grupo) =>
                grupo.fijo ? (
                  <div key={grupo.id} className="space-y-0.5 pb-2 mb-1 border-b border-white/5">
                    {grupo.modulos.map((m) => (
                      <SidebarLink
                        key={m.codigo}
                        modulo={m}
                        activo={m.codigo === codigoActivo}
                        badge={badges[m.codigo]}
                        onNavigate={cerrarMenu}
                      />
                    ))}
                  </div>
                ) : (
                  <SidebarGroup
                    key={grupo.id}
                    grupo={grupo}
                    abierto={grupoAbierto === grupo.id}
                    onToggle={alternarGrupo}
                    codigoActivo={codigoActivo}
                    badges={badges}
                    onNavigate={cerrarMenu}
                  />
                ),
              )}
              {usuario?.rol_codigo === "admin" && fueraDelPlan.length > 0 && (
                <Link
                  href="/admin/suscripcion"
                  onClick={cerrarMenu}
                  className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:border-primary-400 transition-colors"
                >
                  <Sparkles size={14} className="text-accent-400 shrink-0" />
                  {fueraDelPlan.length} módulo{fueraDelPlan.length === 1 ? "" : "s"} más en planes superiores
                </Link>
              )}
            </nav>
          )}
        </div>

        <div className="mt-auto pt-2 border-t border-white/5">
          <CambiarPasswordModal />
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
