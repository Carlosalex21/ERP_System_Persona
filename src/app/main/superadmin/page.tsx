"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import {
  ShieldAlert, CreditCard, Users, Database, LogOut, Activity, Plus, Edit2, Trash2, Search, Loader2, Server, X, Check,
  Wallet, Smartphone, CheckCircle2, XCircle, Clock, Lock, User as UserIcon, Sliders, Eye, EyeOff,
} from 'lucide-react';
import { apiPrivada, apiPublica } from '@/services/api';
import { getSharedCookieDomain } from '@/utils/cookieDomain';
import {
  getSubscriptionPayments, confirmarPagoSuscripcion, rechazarPagoSuscripcion,
  getPlatformPaymentConfig, updatePlatformPaymentConfig,
  getPlatformSettings, updatePlatformSettings,
} from '@/services/platformBillingService';
import { SubscriptionPayment, PlatformPaymentConfig, PlatformSettings } from '@/types/api';

/**
 * Este panel NUNCA se enlaza desde el sitio público (ver `main/login`, que
 * ahora es solo para dueños de tenants) -- es la única puerta de entrada
 * del superadmin de la plataforma. Además de no estar enlazado, verifica
 * contra el backend (`/auth/me/`, que exige `IsAdminUser`) que la cuenta
 * realmente sea staff antes de mostrar cualquier dato: antes, CUALQUIER
 * usuario autenticado (incluido un dueño de tenant normal) que llegara
 * aquí con un token válido veía el shell del panel completo.
 */
type EstadoAuth = 'verificando' | 'no_autenticado' | 'autorizado';

export default function SuperAdminPanel() {
  const router = useRouter();
  const [estadoAuth, setEstadoAuth] = useState<EstadoAuth>('verificando');
  const autorizado = estadoAuth === 'autorizado';
  const [usuarioLogin, setUsuarioLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [erroLogin, setErrorLogin] = useState('');
  const [verificandoLogin, setVerificandoLogin] = useState(false);
  const [vistaActiva, setVistaActiva] = useState('dashboard');
  const [cargando, setCargando] = useState(false);

  // Estados de Datos
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);
  const [pagosSuscripcion, setPagosSuscripcion] = useState<SubscriptionPayment[]>([]);
  const [filtroPagos, setFiltroPagos] = useState<'pendiente' | 'todos'>('pendiente');
  const [pagoConfig, setPagoConfig] = useState<PlatformPaymentConfig | null>(null);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [guardandoSettings, setGuardandoSettings] = useState(false);

  // Estados del Modal de Planes
  const [modalPlanAbierto, setModalPlanAbierto] = useState(false);
  const [editandoPlanId, setEditandoPlanId] = useState<number | null>(null);
  const [formPlan, setFormPlan] = useState<{
    nombre: string; slug: string; descripcion: string; precio: string;
    limite_usuarios: number; limite_sucursales: number; limite_productos: number | null; activo: boolean;
  }>({
    nombre: '',
    slug: '',
    descripcion: '',
    precio: '',
    limite_usuarios: 100,
    limite_sucursales: 10,
    limite_productos: null,
    activo: true
  });

  useEffect(() => {
    const token = Cookies.get('access_token');
    if (!token) {
      setEstadoAuth('no_autenticado');
      return;
    }
    apiPrivada.get('/auth/me/')
      .then(() => setEstadoAuth('autorizado'))
      .catch(() => {
        const domain = getSharedCookieDomain();
        Cookies.remove('access_token', { domain });
        Cookies.remove('refresh_token', { domain });
        setEstadoAuth('no_autenticado');
      });
  }, []);

  const manejarLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErrorLogin('');
    setVerificandoLogin(true);
    try {
      const res = await apiPublica.post('/auth/token/', { username: usuarioLogin, password: passwordLogin });
      const domain = getSharedCookieDomain();
      Cookies.set('access_token', res.data.access, { expires: 1, domain });
      Cookies.set('refresh_token', res.data.refresh, { expires: 7, domain });
      // Verificación real contra el backend: `/auth/me/` exige IsAdminUser,
      // así que si esta llamada falla, la cuenta existe pero NO es staff.
      await apiPrivada.get('/auth/me/');
      setEstadoAuth('autorizado');
    } catch (error: any) {
      const domain = getSharedCookieDomain();
      Cookies.remove('access_token', { domain });
      Cookies.remove('refresh_token', { domain });
      if (error?.response?.status === 401) {
        setErrorLogin('Usuario o contraseña incorrectos.');
      } else if (error?.response?.status === 403) {
        setErrorLogin('Esta cuenta no tiene permisos de administrador de la plataforma.');
      } else {
        setErrorLogin('No se pudo conectar con el servidor.');
      }
    } finally {
      setVerificandoLogin(false);
    }
  };

  // Función para obtener datos de la API
  const obtenerDatos = async () => {
    if (!autorizado) return;
    setCargando(true);
    try {
      if (vistaActiva === 'dashboard') {
        const res = await apiPrivada.get('/tenants/dashboard/');
        setDashboardData(res.data);
      } 
      else if (vistaActiva === 'suscripciones') {
        const res = await apiPrivada.get('/tenants/clients/');
        setClientes(res.data);
      } 
      else if (vistaActiva === 'planes') {
        const res = await apiPrivada.get('/tenants/plans/');
        setPlanes(res.data);
      }
      else if (vistaActiva === 'pagos_suscripcion') {
        const pagos = await getSubscriptionPayments(filtroPagos === 'pendiente' ? 'pendiente' : undefined);
        setPagosSuscripcion(pagos);
      }
      else if (vistaActiva === 'config_cobro') {
        const config = await getPlatformPaymentConfig();
        setPagoConfig(config);
      }
      else if (vistaActiva === 'config_plataforma') {
        const settings = await getPlatformSettings();
        setPlatformSettings(settings);
      }
    } catch (error) { console.error(error); }
    finally { setCargando(false); }
  };

  useEffect(() => { obtenerDatos(); }, [vistaActiva, autorizado, filtroPagos]);

  const confirmarPago = async (id: number) => {
    try {
      await confirmarPagoSuscripcion(id);
      toast.success('Pago confirmado. La suscripción fue activada.');
      obtenerDatos();
    } catch {
      toast.error('No se pudo confirmar el pago.');
    }
  };

  const rechazarPago = async (id: number) => {
    if (!confirm('¿Rechazar este pago? El cliente deberá reportarlo de nuevo.')) return;
    try {
      await rechazarPagoSuscripcion(id);
      toast.success('Pago rechazado.');
      obtenerDatos();
    } catch {
      toast.error('No se pudo rechazar el pago.');
    }
  };

  const guardarConfigCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pagoConfig) return;
    setGuardandoConfig(true);
    try {
      const actualizado = await updatePlatformPaymentConfig(pagoConfig);
      setPagoConfig(actualizado);
      toast.success('Configuración de cobro actualizada.');
    } catch {
      toast.error('No se pudo guardar la configuración.');
    } finally {
      setGuardandoConfig(false);
    }
  };

  const guardarPlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformSettings) return;
    setGuardandoSettings(true);
    try {
      const actualizado = await updatePlatformSettings(platformSettings);
      setPlatformSettings(actualizado);
      toast.success('Configuración de plataforma actualizada.');
    } catch {
      toast.error('No se pudo guardar la configuración.');
    } finally {
      setGuardandoSettings(false);
    }
  };

  // Lógica para Guardar Plan (POST o PATCH)
  const guardarPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
      if (editandoPlanId) {
        // PATCH api/v1/tenants/plans/{id}/
        await apiPrivada.patch(`/tenants/plans/${editandoPlanId}/`, formPlan);
      } else {
        // POST api/v1/tenants/plans/
        await apiPrivada.post('/tenants/plans/', formPlan);
      }
      setModalPlanAbierto(false);
      obtenerDatos(); // Recargar lista
    } catch (error) {
      alert("Error al guardar el plan. Revisa los datos.");
    } finally { setCargando(false); }
  };

  // Abrir modal para editar
  const prepararEdicion = (plan: any) => {
    setEditandoPlanId(plan.id);
    setFormPlan({
      nombre: plan.nombre,
      slug: plan.slug || '',
      descripcion: plan.descripcion,
      precio: plan.precio,
      limite_usuarios: plan.limite_usuarios,
      limite_sucursales: plan.limite_sucursales,
      limite_productos: plan.limite_productos ?? null,
      activo: plan.activo
    });
    setModalPlanAbierto(true);
  };

  // Eliminar Plan
  const eliminarPlan = async (id: number) => {
    if(!confirm("¿Estás seguro de eliminar este plan?")) return;
    try {
      await apiPrivada.delete(`/tenants/plans/${id}/`);
      obtenerDatos();
    } catch (error) { alert("No se pudo eliminar el plan."); }
  };

  const cerrarSesion = () => {
    const domain = getSharedCookieDomain();
    Cookies.remove('access_token', { domain });
    Cookies.remove('refresh_token', { domain });
    setEstadoAuth('no_autenticado');
  };

  if (estadoAuth === 'verificando') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-accent-500" size={32} />
      </div>
    );
  }

  if (estadoAuth === 'no_autenticado') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary-700/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto bg-accent-500/10 text-accent-500 rounded-2xl flex items-center justify-center border border-accent-500/20 mb-4">
              <ShieldAlert size={26} />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">Consola de Plataforma</h1>
            <p className="text-slate-500 text-xs mt-1">Acceso exclusivo para administradores del sistema.</p>
          </div>
          <form onSubmit={manejarLogin} className="bg-slate-900/70 border border-white/5 rounded-2xl p-6 space-y-4 shadow-2xl backdrop-blur">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Usuario</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text" value={usuarioLogin} onChange={e => setUsuarioLogin(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-accent-500/50"
                  placeholder="administrador" autoFocus required
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type={verPassword ? 'text' : 'password'} value={passwordLogin} onChange={e => setPasswordLogin(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-950 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-accent-500/50"
                  placeholder="••••••••" required
                />
                <button type="button" onClick={() => setVerPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {erroLogin && (
              <div className="text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{erroLogin}</div>
            )}
            <button
              type="submit" disabled={verificandoLogin}
              className="w-full bg-accent-500 text-slate-950 py-2.5 rounded-lg font-black text-sm hover:bg-accent-400 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {verificandoLogin ? <Loader2 size={16} className="animate-spin" /> : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-900 overflow-hidden">
      
      {/* BARRA LATERAL */}
      <aside className="w-full md:w-64 bg-slate-950 text-slate-300 flex flex-col justify-between shadow-2xl relative z-20">
        <div>
          <div className="p-6 border-b border-slate-800/50 flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-500/20 text-accent-500 rounded-lg flex items-center justify-center border border-accent-500/30">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-wider uppercase">SaaS Master</h2>
              <span className="text-[10px] text-slate-500 font-mono">Control de Instancia</span>
            </div>
          </div>

          <nav className="p-4 space-y-1.5 mt-2">
            <button onClick={() => setVistaActiva('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${vistaActiva === 'dashboard' ? 'bg-accent-500 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
              <Activity size={18} /> Métrica Global
            </button>
            <button onClick={() => setVistaActiva('suscripciones')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${vistaActiva === 'suscripciones' ? 'bg-accent-500 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
              <Users size={18} /> Inquilinos (Tenants)
            </button>
            <button onClick={() => setVistaActiva('planes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${vistaActiva === 'planes' ? 'bg-accent-500 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
              <CreditCard size={18} /> Planes de Cobro
            </button>
            <button onClick={() => setVistaActiva('pagos_suscripcion')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${vistaActiva === 'pagos_suscripcion' ? 'bg-accent-500 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
              <Wallet size={18} /> Pagos de Suscripción
            </button>
            <button onClick={() => setVistaActiva('config_cobro')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${vistaActiva === 'config_cobro' ? 'bg-accent-500 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
              <Smartphone size={18} /> Config. de Cobro
            </button>
            <button onClick={() => setVistaActiva('config_plataforma')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${vistaActiva === 'config_plataforma' ? 'bg-accent-500 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
              <Sliders size={18} /> Config. de Plataforma
            </button>
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800/50">
          <button onClick={cerrarSesion} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-400 rounded-xl font-bold text-sm hover:bg-red-500/20">
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        
        {/* VISTA 1: DASHBOARD */}
        {vistaActiva === 'dashboard' && dashboardData && (
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Centro de Operaciones</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard title="MRR Mensual" value={`$${dashboardData.business_metrics.monthly_recurring_revenue}`} />
              <MetricCard title="Inquilinos Activos" value={dashboardData.business_metrics.active_tenants} color="text-primary-600" />
              <MetricCard title="Suscripciones" value={dashboardData.business_metrics.active_subscriptions} color="text-green-600" />
              <MetricCard title="Nuevos (30d)" value={dashboardData.business_metrics.new_clients_last_30_days} color="text-accent-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800">
                <h3 className="font-bold flex items-center gap-2 mb-6"><Server className="text-accent-500" /> Salud del VPS</h3>
                <ProgressBar label="Uso de CPU" value={dashboardData.system_health.cpu_usage_percent} />
                <ProgressBar label="Uso de RAM" value={dashboardData.system_health.memory_usage_percent} className="mt-4" />
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><Database className="text-primary-600" /> Base de Datos</h3>
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <div>
                     <span className="block text-xs font-bold text-slate-400">Conexiones</span>
                     <span className="text-2xl font-black">{dashboardData.db_health.active_connections} / {dashboardData.db_health.max_connections}</span>
                   </div>
                   <div className="text-2xl font-black text-primary-600">{dashboardData.db_health.usage_percent}%</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VISTA 2: INQUILINOS */}
        {vistaActiva === 'suscripciones' && (
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestión de Inquilinos</h1>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                    <th className="p-4 pl-6">Empresa / Esquema</th>
                    <th className="p-4">Dominio</th>
                    <th className="p-4">Dueño</th>
                    <th className="p-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientes.map(cliente => (
                    <tr key={cliente.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6 font-bold">{cliente.nombre_empresa} <span className="block font-mono text-[9px] text-slate-400 lowercase">{cliente.schema_name}</span></td>
                      <td className="p-4 font-semibold text-primary-600">{cliente.domains?.[0]?.domain}</td>
                      <td className="p-4 text-xs text-slate-500">{cliente.owner.email}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${cliente.esta_activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {cliente.esta_activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VISTA 3: PLANES */}
        {vistaActiva === 'planes' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Planes de Suscripción</h1>
              <button 
                onClick={() => { setEditandoPlanId(null); setFormPlan({ nombre: '', slug: '', descripcion: '', precio: '', limite_usuarios: 100, limite_sucursales: 10, limite_productos: null, activo: true }); setModalPlanAbierto(true); }}
                className="bg-accent-500 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-accent-600 flex items-center gap-2 shadow-lg"
              >
                <Plus size={18} /> Nuevo Plan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {planes.map(plan => (
                <div key={plan.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group overflow-hidden">
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => prepararEdicion(plan)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-primary-600 hover:text-white transition-colors"><Edit2 size={14}/></button>
                    <button onClick={() => eliminarPlan(plan.id)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors"><Trash2 size={14}/></button>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">{plan.nombre}</h3>
                  <p className="text-3xl font-black text-accent-600 my-4">${parseFloat(plan.precio).toFixed(2)}</p>
                  <p className="text-sm text-slate-500 mb-6 flex-grow">{plan.descripcion}</p>
                  <div className="pt-4 border-t border-slate-100 text-[11px] font-bold text-slate-400 space-y-1">
                    <p>Usuarios: {plan.limite_usuarios > 1000 ? 'Ilimitados' : plan.limite_usuarios}</p>
                    <p>Sucursales: {plan.limite_sucursales > 1000 ? 'Ilimitadas' : plan.limite_sucursales}</p>
                    <p>Productos: {plan.limite_productos ? plan.limite_productos : 'Ilimitados'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VISTA 4: PAGOS DE SUSCRIPCIÓN (confirmación manual de Pago Móvil/Zelle) */}
        {vistaActiva === 'pagos_suscripcion' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pagos de Suscripción</h1>
              <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200">
                <button onClick={() => setFiltroPagos('pendiente')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${filtroPagos === 'pendiente' ? 'bg-accent-500 text-white' : 'text-slate-500'}`}>Pendientes</button>
                <button onClick={() => setFiltroPagos('todos')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${filtroPagos === 'todos' ? 'bg-accent-500 text-white' : 'text-slate-500'}`}>Todos</button>
              </div>
            </div>

            {cargando ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
            ) : pagosSuscripcion.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-sm font-semibold">
                No hay pagos {filtroPagos === 'pendiente' ? 'pendientes' : 'registrados'}.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                      <th className="p-4 pl-6">Empresa</th>
                      <th className="p-4">Plan</th>
                      <th className="p-4">Método</th>
                      <th className="p-4">Referencia</th>
                      <th className="p-4">Monto</th>
                      <th className="p-4 text-center">Estado</th>
                      <th className="p-4 text-right pr-6">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagosSuscripcion.map(pago => (
                      <tr key={pago.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6 font-bold">{pago.client.nombre_empresa} <span className="block font-mono text-[9px] text-slate-400 lowercase">{pago.client.schema_name}</span></td>
                        <td className="p-4 text-xs text-slate-600">{pago.plan.nombre}</td>
                        <td className="p-4 text-xs text-slate-600 capitalize">{pago.metodo.replace('_', ' ')}</td>
                        <td className="p-4 text-xs font-mono text-slate-500">{pago.referencia || '—'}</td>
                        <td className="p-4 text-xs font-bold text-slate-700">${pago.monto}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                            pago.estado === 'confirmado' ? 'bg-green-100 text-green-700' :
                            pago.estado === 'rechazado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {pago.estado === 'confirmado' && <CheckCircle2 size={10} />}
                            {pago.estado === 'rechazado' && <XCircle size={10} />}
                            {pago.estado === 'pendiente' && <Clock size={10} />}
                            {pago.estado}
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6">
                          {pago.estado === 'pendiente' && (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => confirmarPago(pago.id)} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-colors" title="Confirmar"><Check size={14} /></button>
                              <button onClick={() => rechazarPago(pago.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors" title="Rechazar"><X size={14} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VISTA 5: CONFIGURACIÓN DE COBRO DE LA PLATAFORMA */}
        {vistaActiva === 'config_cobro' && pagoConfig && (
          <div className="space-y-6 animate-fade-in max-w-2xl">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuración de Cobro</h1>
            <p className="text-sm text-slate-500 -mt-4">
              Estos son TUS datos (el dueño de la plataforma) para que los tenants te paguen su suscripción.
              No confundir con los métodos de pago que cada tenant configura para cobrarle a sus propios clientes.
            </p>

            <form onSubmit={guardarConfigCobro} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Smartphone size={16} className="text-primary-600" /> Pago Móvil (Venezuela)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <input placeholder="Banco" value={pagoConfig.pago_movil_banco} onChange={e => setPagoConfig({ ...pagoConfig, pago_movil_banco: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                  <input placeholder="Cédula / RIF" value={pagoConfig.pago_movil_cedula} onChange={e => setPagoConfig({ ...pagoConfig, pago_movil_cedula: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                  <input placeholder="Teléfono" value={pagoConfig.pago_movil_telefono} onChange={e => setPagoConfig({ ...pagoConfig, pago_movil_telefono: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Wallet size={16} className="text-primary-600" /> Zelle (Venezuela)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input placeholder="Email de Zelle" value={pagoConfig.zelle_email} onChange={e => setPagoConfig({ ...pagoConfig, zelle_email: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                  <input placeholder="Nombre del titular" value={pagoConfig.zelle_titular} onChange={e => setPagoConfig({ ...pagoConfig, zelle_titular: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><CreditCard size={16} className="text-primary-600" /> Stripe (resto de países)</h3>
                <div className="grid grid-cols-1 gap-4">
                  <input placeholder="Publishable Key (pk_...)" value={pagoConfig.stripe_publishable_key} onChange={e => setPagoConfig({ ...pagoConfig, stripe_publishable_key: e.target.value })} className="px-3 py-2 border rounded-lg text-sm font-mono" />
                  <input
                    placeholder={pagoConfig.tiene_stripe_secret_key ? 'Secret Key ya configurada (dejar vacío para no cambiar)' : 'Secret Key (sk_...)'}
                    value={pagoConfig.stripe_secret_key || ''}
                    onChange={e => setPagoConfig({ ...pagoConfig, stripe_secret_key: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm font-mono"
                    type="password"
                  />
                  <input
                    placeholder="Webhook Signing Secret (whsec_...)"
                    value={pagoConfig.stripe_webhook_secret || ''}
                    onChange={e => setPagoConfig({ ...pagoConfig, stripe_webhook_secret: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm font-mono"
                    type="password"
                  />
                  <p className="text-[11px] text-slate-400">
                    URL del webhook a registrar en Stripe: <code className="bg-slate-100 px-1.5 py-0.5 rounded">{`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/tenants/pagos-suscripcion/stripe/webhook/`}</code>
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" disabled={guardandoConfig} className="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2 shadow-md disabled:opacity-70">
                  {guardandoConfig ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Guardar Configuración
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VISTA 6: CONFIGURACIÓN GLOBAL DE LA PLATAFORMA (cupo gratis, días de gracia) */}
        {vistaActiva === 'config_plataforma' && platformSettings && (
          <div className="space-y-6 animate-fade-in max-w-2xl">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuración de Plataforma</h1>
            <p className="text-sm text-slate-500 -mt-4">
              Controla cuántos negocios pueden registrarse gratis como promoción y qué tan estricto es el corte
              cuando una suscripción vence.
            </p>

            <form onSubmit={guardarPlatformSettings} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cupo de registros gratuitos</label>
                <input
                  type="number" min="0"
                  placeholder="Sin límite"
                  value={platformSettings.limite_registros_gratis ?? ''}
                  onChange={e => setPlatformSettings({
                    ...platformSettings,
                    limite_registros_gratis: e.target.value === '' ? null : parseInt(e.target.value, 10),
                  })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Cuántos negocios pueden registrarse en total (todos arrancan con el plan de prueba gratis). Deja vacío para no limitar.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Días de gracia tras vencer la suscripción</label>
                <input
                  type="number" min="0"
                  value={platformSettings.dias_gracia_tras_vencimiento}
                  onChange={e => setPlatformSettings({ ...platformSettings, dias_gracia_tras_vencimiento: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Días que un tenant sigue teniendo acceso a su panel después de que su suscripción venció, antes de bloquearlo.
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={guardandoSettings} className="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2 shadow-md disabled:opacity-70">
                  {guardandoSettings ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Guardar Configuración
                </button>
              </div>
            </form>
          </div>
        )}

      </main>

      {/* ================= MODAL DE PLANES (CREAR / EDITAR) ================= */}
      {modalPlanAbierto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">{editandoPlanId ? 'Editar Plan Existente' : 'Configurar Nuevo Plan'}</h3>
              <button onClick={() => setModalPlanAbierto(false)} className="p-2 hover:bg-slate-800 rounded-full"><X size={20}/></button>
            </div>
            
            <form onSubmit={guardarPlan} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Plan</label>
                  <input type="text" value={formPlan.nombre} onChange={e => setFormPlan({...formPlan, nombre: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-600" required />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción Corta</label>
                  <textarea value={formPlan.descripcion} onChange={e => setFormPlan({...formPlan, descripcion: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl h-20 focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Precio Mensual ($)</label>
                  <input type="number" value={formPlan.precio} onChange={e => setFormPlan({...formPlan, precio: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Slug (usado por el frontend)</label>
                  <input type="text" value={formPlan.slug} onChange={e => setFormPlan({...formPlan, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} placeholder="ej: emprendedor" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Límite de Usuarios</label>
                  <input type="number" value={formPlan.limite_usuarios} onChange={e => setFormPlan({...formPlan, limite_usuarios: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Límite Sucursales</label>
                  <input type="number" value={formPlan.limite_sucursales} onChange={e => setFormPlan({...formPlan, limite_sucursales: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none" required />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Límite de Productos</label>
                  <input
                    type="number"
                    value={formPlan.limite_productos ?? ''}
                    placeholder="Sin límite"
                    onChange={e => setFormPlan({...formPlan, limite_productos: e.target.value === '' ? null : parseInt(e.target.value)})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Deja vacío para no limitar la cantidad de productos.</p>
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setModalPlanAbierto(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors shadow-lg flex items-center justify-center gap-2">
                  {cargando ? <Loader2 className="animate-spin" size={18}/> : <Check size={18}/>}
                  {editandoPlanId ? 'Actualizar Plan' : 'Crear Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponentes para un código más limpio
function MetricCard({ title, value, color = "text-slate-900" }: { title: string, value: any, color?: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</span>
      <h3 className={`text-3xl font-black mt-2 ${color}`}>{value}</h3>
    </div>
  );
}

function ProgressBar({ label, value, className = "" }: { label: string, value: number, className?: string }) {
  return (
    <div className={className}>
      <div className="flex justify-between text-[10px] font-bold mb-1 uppercase text-slate-400">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div className="bg-accent-500 h-full rounded-full transition-all duration-500" style={{ width: `${value}%` }}></div>
      </div>
    </div>
  );
}