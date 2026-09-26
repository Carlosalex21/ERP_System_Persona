"use client";

import { useState, useRef, useEffect, use, type ReactElement } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { Menu, Bell, BellRing, Globe2, Sparkles, AlertTriangle, ShoppingBag, ArrowRight, Lock, TriangleAlert, PackageX, Landmark, Truck, FlaskConical, PhoneCall, LifeBuoy, Search, ShieldCheck } from 'lucide-react';
import { pushDisponible, tieneNotificacionesActivas, activarNotificacionesPush } from '@/utils/pushNotifications';
import InstallPwaButton from '@/components/pwa/InstallPwaButton';
import Sidebar from '@/components/Sidebar';
import { SessionProvider, useSession } from '@/context/SessionContext';
import { usePedidosPendientesDetalle } from '@/hooks/usePedidosPendientes';
import { useAlertas } from '@/hooks/useAlertas';
import type { AlertaItem, TipoAlerta } from '@/services/reportesService';
import { getPaisInfo } from '@/utils/paises';
import OnboardingTour from '@/components/tour/OnboardingTour';
import CommandPalette from '@/components/CommandPalette';
import toast from 'react-hot-toast';
import { getSharedCookieDomain } from '@/utils/cookieDomain';
import { limpiarCacheReferencia } from '@/utils/offlineDb';
import { moduloDeRuta, primerModuloVisible } from '@/utils/modulosPanel';

interface AdminLayoutProps {
  params: Promise<{ tenantId: string }>;
  children: React.ReactNode;
}

/**
 * Antes no había NINGÚN indicador de que el tenant está en un plan de
 * prueba o pago, ni cuándo vence -- el dueño no se enteraba de que debía
 * pagar hasta que (ahora sí) el `SubscriptionGateMiddleware` le bloquea el
 * panel. Este badge avisa con antelación y linkea directo a pagar.
 */
function PlanBadge({ tenant }: { tenant: ReturnType<typeof useSession>['tenant'] }): ReactElement | null {
  const sub = tenant?.subscription_status;
  if (!sub) return null;

  const urgente = sub.dias_restantes !== null && sub.dias_restantes <= 3;
  // Ruta DENTRO del propio panel (no cruza al dominio raíz): iniciar sesión
  // ahí es una identidad totalmente distinta (el dueño en el esquema
  // público) que además nunca comparte cookie con `*.localhost` en
  // desarrollo -- ver `/admin/suscripcion`.
  const href = '/admin/suscripcion';

  if (!sub.is_active) {
    return (
      <Link href={href} className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors">
        <AlertTriangle size={13} /> Suscripción vencida -- Renovar
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`hidden sm:inline-flex items-center gap-1.5 border text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
        urgente ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-accent-50 text-accent-700 border-accent-100 hover:bg-accent-100'
      }`}
    >
      <Sparkles size={13} />
      {sub.es_prueba
        ? `Prueba gratis${sub.dias_restantes !== null ? `: ${sub.dias_restantes}d` : ''}`
        : sub.plan_nombre || 'Plan activo'}
    </Link>
  );
}

/**
 * Antes la campana era solo un ícono estático con un badge -- hacer clic no
 * mostraba nada, solo navegaba a /admin/pedidos. Ahora despliega los
 * últimos pedidos pendientes directamente.
 */
function NotificacionesBell(): ReactElement {
  const { count, pedidos, cargando } = usePedidosPendientesDetalle(5);
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cerrarSiAfuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrarSiAfuera);
    return () => document.removeEventListener('mousedown', cerrarSiAfuera);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto(v => !v)}
        className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
        aria-label="Pedidos pendientes"
        title={count > 0 ? `${count} pedido(s) pendiente(s)` : 'Sin pedidos pendientes'}
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-40 overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-800">Pedidos Pendientes</h4>
            {count > 0 && <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{count}</span>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {cargando ? (
              <p className="text-center text-xs text-slate-400 py-6">Cargando...</p>
            ) : pedidos.length === 0 ? (
              <div className="text-center py-8 px-4">
                <ShoppingBag size={28} className="mx-auto text-slate-200 mb-2" />
                <p className="text-xs text-slate-400">No hay pedidos pendientes.</p>
              </div>
            ) : (
              pedidos.map(pedido => (
                <Link
                  key={pedido.id}
                  href="/admin/pedidos"
                  onClick={() => setAbierto(false)}
                  className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{pedido.nombre_cliente_pendiente || 'Cliente'}</p>
                    <p className="text-[11px] text-slate-400">{pedido.correlativo || `#${pedido.id}`}</p>
                  </div>
                  <span className="text-xs font-black text-primary-700 shrink-0">${parseFloat(pedido.total).toFixed(2)}</span>
                </Link>
              ))
            )}
          </div>
          <Link
            href="/admin/pedidos"
            onClick={() => setAbierto(false)}
            className="flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-bold text-primary-600 hover:bg-primary-50 transition-colors"
          >
            Ver todos los pedidos <ArrowRight size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}

const ICONO_ALERTA: Record<TipoAlerta, ReactElement> = {
  cxc: <Landmark size={15} />,
  cxp: <Truck size={15} />,
  stock: <PackageX size={15} />,
  lote: <FlaskConical size={15} />,
  seguimiento: <PhoneCall size={15} />,
  reclamo: <LifeBuoy size={15} />,
  garantia: <ShieldCheck size={15} />,
};

/**
 * Campana separada de "Pedidos Pendientes" a propósito -- esa es sobre
 * pedidos nuevos del catálogo público esperando confirmación; esta es sobre
 * cosas que ya venían andando y necesitan seguimiento (cobros/pagos
 * vencidos, stock por agotarse). Mezclarlas en una sola campana habría
 * escondido las urgentes de contabilidad detrás del ruido de pedidos.
 */
function AlertasBell(): ReactElement {
  const { alertas, total, urgentes, cargando } = useAlertas();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cerrarSiAfuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrarSiAfuera);
    return () => document.removeEventListener('mousedown', cerrarSiAfuera);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto(v => !v)}
        className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
        aria-label="Centro de Alertas"
        title={total > 0 ? `${total} alerta(s)` : 'Sin alertas'}
      >
        <TriangleAlert size={18} />
        {total > 0 && (
          <span className={`absolute top-0.5 right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-black text-white ${urgentes > 0 ? 'bg-red-500' : 'bg-amber-500'}`}>
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-40 overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-800">Centro de Alertas</h4>
            {total > 0 && <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{total}</span>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {cargando ? (
              <p className="text-center text-xs text-slate-400 py-6">Cargando...</p>
            ) : alertas.length === 0 ? (
              <div className="text-center py-8 px-4">
                <TriangleAlert size={28} className="mx-auto text-slate-200 mb-2" />
                <p className="text-xs text-slate-400">Todo al día -- sin alertas pendientes.</p>
              </div>
            ) : (
              alertas.slice(0, 6).map((a: AlertaItem, i: number) => (
                <Link
                  key={`${a.tipo}-${i}`}
                  href={a.link}
                  onClick={() => setAbierto(false)}
                  className="flex items-start gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <span className={`mt-0.5 shrink-0 ${a.nivel === 'urgente' ? 'text-red-500' : 'text-amber-500'}`}>
                    {ICONO_ALERTA[a.tipo]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{a.titulo}</p>
                    <p className="text-[11px] text-slate-400 truncate">{a.descripcion}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
          <Link
            href="/admin/alertas"
            onClick={() => setAbierto(false)}
            className="flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-bold text-primary-600 hover:bg-primary-50 transition-colors"
          >
            Ver todas las alertas <ArrowRight size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * Botón para activar notificaciones push del navegador (Web Push) -- antes
 * solo existía en la pantalla de Mesas de restaurante ("llaman al mesero").
 * Generalizado aquí porque el mismo mecanismo ya sirve para cualquier
 * aviso urgente del sistema (ver `apps.postventa.services.crear_reclamo`,
 * que dispara uno cuando entra un reclamo de prioridad alta). Se oculta
 * solo una vez activo -- no hace falta una UI para desactivar desde acá,
 * el navegador ya lo permite desde su propio panel de permisos del sitio.
 */
function PushToggleButton(): ReactElement | null {
  const [disponible, setDisponible] = useState(false);
  const [activo, setActivo] = useState(false);
  const [activando, setActivando] = useState(false);

  useEffect(() => {
    if (!pushDisponible()) return;
    setDisponible(true);
    tieneNotificacionesActivas().then(setActivo);
  }, []);

  if (!disponible || activo) return null;

  const activar = async (): Promise<void> => {
    setActivando(true);
    const ok = await activarNotificacionesPush();
    setActivando(false);
    if (ok) {
      setActivo(true);
      toast.success('Notificaciones activadas -- avisamos aunque tengas el panel cerrado.');
    } else {
      toast.error('No se pudo activar. Revisa los permisos de notificaciones del navegador.');
    }
  };

  return (
    <button
      onClick={activar}
      disabled={activando}
      className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-40"
      aria-label="Activar notificaciones"
      title="Activar notificaciones del navegador"
    >
      <BellRing size={18} />
    </button>
  );
}

function AdminTopbar({ onOpenMenu }: { onOpenMenu: () => void }): ReactElement {
  const { tenant } = useSession();
  const pais = getPaisInfo(tenant?.pais_codigo);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-8 h-16">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button onClick={onOpenMenu} className="md:hidden p-2 -ml-2 text-slate-600 shrink-0">
            <Menu size={22} />
          </button>
          <span className="font-black text-slate-900 tracking-tight capitalize truncate md:hidden">
            {tenant?.nombre_empresa}
          </span>
          <button
            onClick={() => window.dispatchEvent(new Event('erp:abrir-buscador'))}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors text-xs max-w-xs w-full"
          >
            <Search size={14} />
            <span className="flex-1 text-left">Buscar en el panel...</span>
            <kbd className="text-[10px] font-mono bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">Ctrl K</kbd>
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <PlanBadge tenant={tenant} />
          {tenant && (
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 border border-primary-100 text-xs font-bold px-3 py-1.5 rounded-full">
              <Globe2 size={13} /> {pais.nombre} · {pais.moneda}
            </span>
          )}
          <InstallPwaButton />
          <AlertasBell />
          <NotificacionesBell />
          <PushToggleButton />
        </div>
      </div>
    </header>
  );
}

/**
 * Pantalla de respaldo cuando `SessionProvider` no pudo confirmar la sesión
 * (token vencido sin refresh válido, o el backend no respondió tras el
 * reintento). Antes no existía nada así: el layout renderizaba el panel
 * igual con `tenant=null`, y cada página hija fallaba sus propias
 * peticiones en silencio -- el usuario quedaba atascado viendo errores,
 * sin ningún redirect automático al login, hasta que cerraba sesión a mano.
 */
function SesionNoDisponible(): ReactElement {
  const router = useRouter();

  useEffect(() => {
    const domain = getSharedCookieDomain();
    Cookies.remove('access_token', { domain });
    Cookies.remove('refresh_token', { domain });
    limpiarCacheReferencia();
    const timeout = setTimeout(() => router.push('/login'), 2500);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-sm">
        <AlertTriangle className="mx-auto text-amber-500 mb-3" size={36} />
        <h2 className="font-bold text-slate-800 text-lg">No se pudo verificar tu sesión</h2>
        <p className="text-sm text-slate-500 mt-1">
          Puede que haya expirado o que el servidor no esté disponible en este momento. Te llevaremos al inicio de sesión...
        </p>
        <button
          onClick={() => router.push('/login')}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors"
        >
          Ir a iniciar sesión ahora
        </button>
      </div>
    </div>
  );
}

/**
 * Se muestra en vez de la página cuando el rol del usuario tiene este
 * módulo oculto (ver "Permisos por Rol") -- solo esconde el CONTENIDO, no
 * el layout entero: el usuario sigue viendo el sidebar (ya filtrado, sin
 * este ítem) para poder irse a cualquier módulo que sí le corresponda.
 * Esto es una conveniencia de UI, no el límite de seguridad real -- ese lo
 * sigue poniendo el backend (`apps.core.permissions`) en cada endpoint,
 * así que entrar aquí a mano (tecleando la URL) nunca deja hacer nada que
 * el backend no permitiría de todas formas.
 */
function AccesoRestringido({ destino }: { destino: string | null }): ReactElement {
  return (
    <div className="h-full flex items-center justify-center py-16">
      <div className="text-center max-w-sm">
        <Lock className="mx-auto text-slate-300 mb-3" size={36} />
        <h2 className="font-bold text-slate-800 text-lg">Acceso restringido</h2>
        <p className="text-sm text-slate-500 mt-1">
          Tu rol no tiene acceso a esta sección. Si crees que es un error, pídele a tu administrador que lo habilite en Permisos por Rol.
        </p>
        {destino && (
          <Link
            href={destino}
            className="inline-block mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors"
          >
            Ir a mi panel
          </Link>
        )}
      </div>
    </div>
  );
}

function AdminShell({
  menuMovilAbierto, setMenuMovilAbierto, ejecutarLogout, children,
}: {
  menuMovilAbierto: boolean;
  setMenuMovilAbierto: (abierto: boolean) => void;
  ejecutarLogout: () => void;
  children: React.ReactNode;
}): ReactElement {
  const { isLoading, authError, usuario, tenant } = useSession();
  const pathname = usePathname();

  if (!isLoading && authError) {
    return <SesionNoDisponible />;
  }

  // "Permisos por Rol" es admin-only aparte de cualquier configuración de
  // `modulos_ocultos` -- no tendría sentido que un rol pudiera ocultarse
  // (o dejar de ocultarse) esa misma pantalla a sí mismo.
  const esPantallaPermisos = pathname?.startsWith('/admin/configuracion/permisos');
  const moduloActual = usuario ? moduloDeRuta(pathname ?? '') : null;
  const bloqueadoPorRol = Boolean(moduloActual && usuario!.modulos_ocultos.includes(moduloActual.codigo));
  const bloqueadoPorAdmin = Boolean(esPantallaPermisos && usuario && usuario.rol_codigo !== 'admin');
  const restringido = bloqueadoPorRol || bloqueadoPorAdmin;
  const destinoAlternativo = usuario
    ? primerModuloVisible(usuario.modulos_ocultos, tenant?.tipo_negocio)?.path ?? null
    : null;

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900">
      <Sidebar
        menuMovilAbierto={menuMovilAbierto}
        setMenuMovilAbierto={setMenuMovilAbierto}
        ejecutarLogout={ejecutarLogout}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <AdminTopbar onOpenMenu={() => setMenuMovilAbierto(true)} />
        <main className="p-4 sm:p-8 flex-grow overflow-y-auto relative min-h-0">
          {restringido ? <AccesoRestringido destino={destinoAlternativo} /> : children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ params, children }: AdminLayoutProps): ReactElement {
  const { tenantId } = use(params);
  void tenantId;
  const router = useRouter();

  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  const ejecutarLogout = (): void => {
    const domain = getSharedCookieDomain();
    Cookies.remove('access_token', { domain });
    Cookies.remove('refresh_token', { domain });
    // El POS es un terminal normalmente COMPARTIDO entre cajeros por turno
    // -- sin esto, el nombre/precio/dirección de cada cliente quedaba en
    // IndexedDB sin límite de tiempo, legible por el siguiente que use el
    // mismo navegador (ver el comentario largo en `limpiarCacheReferencia`).
    limpiarCacheReferencia();
    router.push('/login');
  };

  return (
    <SessionProvider>
      <AdminShell menuMovilAbierto={menuMovilAbierto} setMenuMovilAbierto={setMenuMovilAbierto} ejecutarLogout={ejecutarLogout}>
        {children}
      </AdminShell>
      <OnboardingTour />
      <CommandPalette />
    </SessionProvider>
  );
}
