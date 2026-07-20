"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { 
  ShieldAlert, CreditCard, Users, Database, LogOut, Activity, Plus, Edit2, Trash2, Search, Loader2, Server, X, Check
} from 'lucide-react';
import { apiPrivada } from '@/services/api';

export default function SuperAdminPanel() {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState(false);
  const [vistaActiva, setVistaActiva] = useState('dashboard');
  const [cargando, setCargando] = useState(false);

  // Estados de Datos
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);

  // Estados del Modal de Planes
  const [modalPlanAbierto, setModalPlanAbierto] = useState(false);
  const [editandoPlanId, setEditandoPlanId] = useState<number | null>(null);
  const [formPlan, setFormPlan] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stripe_price_id: '',
    limite_usuarios: 100,
    limite_sucursales: 10,
    activo: true
  });

  useEffect(() => {
    const token = Cookies.get('access_token');
    if (!token) router.replace('/login');
    else setAutorizado(true);
  }, [router]);

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
    } catch (error) { console.error(error); }
    finally { setCargando(false); }
  };

  useEffect(() => { obtenerDatos(); }, [vistaActiva, autorizado]);

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
      descripcion: plan.descripcion,
      precio: plan.precio,
      stripe_price_id: plan.stripe_price_id || '',
      limite_usuarios: plan.limite_usuarios,
      limite_sucursales: plan.limite_sucursales,
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
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    router.replace('/login');
  };

  if (!autorizado) return null;

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
                onClick={() => { setEditandoPlanId(null); setFormPlan({ nombre: '', descripcion: '', precio: '', stripe_price_id: '', limite_usuarios: 100, limite_sucursales: 10, activo: true }); setModalPlanAbierto(true); }}
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
                  </div>
                </div>
              ))}
            </div>
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
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID de Stripe (Opcional)</label>
                  <input type="text" value={formPlan.stripe_price_id} onChange={e => setFormPlan({...formPlan, stripe_price_id: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Límite de Usuarios</label>
                  <input type="number" value={formPlan.limite_usuarios} onChange={e => setFormPlan({...formPlan, limite_usuarios: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Límite Sucursales</label>
                  <input type="number" value={formPlan.limite_sucursales} onChange={e => setFormPlan({...formPlan, limite_sucursales: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none" required />
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