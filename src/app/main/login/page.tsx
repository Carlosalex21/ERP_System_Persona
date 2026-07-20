"use client";

import { useState, Suspense, useEffect } from 'react';
import { Mail, Lock, User, Building, Eye, EyeOff, ArrowRight, CheckCircle2, Loader2, UserPlus, Check, X, ShieldAlert, Globe, Store, ExternalLink, ArrowLeft } from 'lucide-react';
import Cookies from 'js-cookie';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiPublica } from '@/services/api';

type View = 'login' | 'select_type' | 'register';
type BusinessType = 'retail' | 'b2b';

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const planElegido = searchParams.get('plan');

  // Estados de Interfaz
  const [view, setView] = useState<View>(planElegido ? 'register' : 'login');
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState('');

  // Control del Asistente de Registro Animado
  const [faseRegistro, setFaseRegistro] = useState<'formulario' | 'creando' | 'exito'>('formulario');
  const [pasoCreacion, setPasoCreacion] = useState(0);
  const mensajesCreacion = [
    "Aislando tu base de datos en PostgreSQL...",
    "Configurando tu esquema único de inquilino (Tenant Schema)...",
    "Sincronizando módulos de inventario, sucursales e IVA...",
    "Generando tus accesos seguros de administración..."
  ];

  // Estados de Formulario
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [password, setPassword] = useState('');
  const [usuarioLogin, setUsuarioLogin] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [usernameRegistro, setUsernameRegistro] = useState('');
  const [email, setEmail] = useState('');
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [subdominio, setSubdominio] = useState('');

  // Estados de Validación de Subdominio
  const [validandoSubdominio, setValidandoSubdominio] = useState(false);
  const [subdominioDisponible, setSubdominioDisponible] = useState<boolean | null>(null);
  const [mensajeSubdominio, setMensajeSubdominio] = useState('');

  // Efecto para animar los textos de creación de base de datos
  useEffect(() => {
    if (faseRegistro !== 'creando') return;
    const interval = setInterval(() => {
      setPasoCreacion((prev) => (prev < mensajesCreacion.length - 1 ? prev + 1 : prev));
    }, 2000);
    return () => clearInterval(interval);
  }, [faseRegistro]);

  const manejarCambioSubdominio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorLimpio = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); 
    setSubdominio(valorLimpio);
    if (valorLimpio === '' || view !== 'register') {
      setSubdominioDisponible(null);
      setMensajeSubdominio('');
    }
  };

  // Validación Debounce del subdominio en el Backend
  useEffect(() => {
    if (!subdominio || view !== 'register') { setSubdominioDisponible(null); return; }
    setValidandoSubdominio(true);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await apiPublica.get(`/api/v1/tenants/check-subdomain/?subdomain=${subdominio}`);
        setSubdominioDisponible(res.data.available);
        setMensajeSubdominio(res.data.available ? '' : (res.data.message || ''));
      } catch (error) {
        setSubdominioDisponible(false);
        setMensajeSubdominio('Error al verificar disponibilidad.');
      } finally {
        setValidandoSubdominio(false);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [subdominio, view]);

  // LÓGICA DE INICIO DE SESIÓN (EXCLUSIVO SUPERADMIN)
  const procesarLoginSuperAdmin = async () => {
    const res = await apiPublica.post('/api/v1/auth/token/', { username: usuarioLogin, password });
    Cookies.set('access_token', res.data.access, { expires: 1 });
    Cookies.set('refresh_token', res.data.refresh, { expires: 7 });
    router.push('/superadmin');
  };

  // LÓGICA DE REGISTRO CON ANIMACIÓN DE ENTORNO
  const procesarRegistro = async () => {
    if (subdominioDisponible === false) {
      setErrorGlobal('Elige un subdominio válido y disponible.');
      return;
    }

    setFaseRegistro('creando'); 

    const payload = {
      first_name: firstName, last_name: lastName, username: usernameRegistro,
      email, password, nombre_empresa: nombreEmpresa, subdomain: subdominio, plan_id: 1, tipo_negocio: businessType
    };

    await apiPublica.post('/api/v1/tenants/register/', payload);

    setFaseRegistro('exito');
  };

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGlobal('');
    setCargando(true);

    try {
      if (view === 'login') {
        await procesarLoginSuperAdmin();
      } else if (view === 'register') {
        await procesarRegistro();
      }
    } catch (error: any) {
      setFaseRegistro('formulario'); 
      if (view === 'login' && error.response?.status === 401) {
        setErrorGlobal('Credenciales incorrectas. Solo personal autorizado.');
      } else if (view === 'register' && error.response?.data) {
        const dataError = error.response.data;
        const msg = typeof dataError === 'string' ? dataError : Object.values(dataError)[0];
        setErrorGlobal(String(Array.isArray(msg) ? msg[0] : msg));
      } else {
        setErrorGlobal('Ocurrió un error al conectar con el servidor.');
      }
    } finally {
      setCargando(false);
    }
  };
  
  /**
   * Maneja la selección del tipo de negocio y avanza a la vista de registro.
   * @param {BusinessType} type - El tipo de negocio seleccionado ('retail' o 'b2b').
   */
  const handleSelectType = (type: BusinessType): void => {
    setBusinessType(type);
    setView('register');
  };

  // ==========================================================
  // RENDER: PANTALLA 2 - ANIMACIÓN DE CREACIÓN (PAGOS / INSTANCIA)
  // ==========================================================
  if (faseRegistro === 'creando') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white w-full max-w-lg p-10 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center text-center space-y-6">
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border-4 border-primary-100 border-t-primary-600 animate-spin"></div>
            <Building className="absolute text-primary-600 animate-pulse" size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900">Desplegando tu ecosistema</h3>
            <p className="text-sm text-slate-400 font-mono max-w-sm h-12 flex items-center justify-center animate-pulse">
              {mensajesCreacion[pasoCreacion]}
            </p>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary-600 h-full transition-all duration-1000 ease-out" style={{ width: `${((pasoCreacion + 1) / mensajesCreacion.length) * 100}%` }}></div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // RENDER: PANTALLA 3 - EXCELENTE REQUISITO DE ÉXITO (LINKS DISPONIBLES)
  // ==========================================================
  if (faseRegistro === 'exito') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white w-full max-w-xl p-10 rounded-3xl shadow-2xl border border-slate-100 space-y-8 animate-scale-in">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center border border-green-200">
              <Check size={36} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">¡Plataforma Levantada con Éxito!</h2>
            <p className="text-slate-500 text-sm max-w-md">Hemos completado la migración de tu esquema y aislamiento de datos. Guarda tus enlaces de acceso corporativos:</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tarjeta 1: Tienda Pública */}
            <div className="border border-slate-200 p-6 rounded-2xl bg-slate-50 flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 border border-blue-100"><Globe size={20} /></div>
                <h4 className="font-bold text-slate-900 text-sm">Catálogo Público Online</h4>
                <p className="text-xs text-slate-400 mt-1 mb-4">La dirección web donde tus clientes comprarán tus productos.</p>
              </div>
              <a href={`http://${subdominio}.localhost:3000`} target="_blank" rel="noopener noreferrer" className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm hover:bg-slate-50 transition-colors">
                Ver Catálogo <ExternalLink size={14} />
              </a>
            </div>

            {/* Tarjeta 2: Panel Administrativo */}
            <div className="border border-primary-200 p-6 rounded-2xl bg-primary-50/50 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-primary-600 text-white font-bold text-[9px] uppercase px-3 py-1 rounded-bl-xl tracking-wider">Tus Controles</div>
              <div>
                <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-xl flex items-center justify-center mb-4 border border-primary-200"><Store size={20} /></div>
                <h4 className="font-bold text-slate-900 text-sm">Panel Administrativo</h4>
                <p className="text-xs text-slate-400 mt-1 mb-4">Administra tu inventario, configura almacenes, sucursales e IVA.</p>
              </div>
              <a href={`http://${subdominio}.localhost:3000/login`} className="w-full py-2.5 bg-primary-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-primary-700 transition-transform active:scale-95">
                Ingresar al Admin <ArrowRight size={14} />
              </a>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center text-xs text-slate-500 font-medium">
             Utiliza el usuario <strong className="text-slate-700 font-mono">@{usernameRegistro}</strong> y la clave que configuraste para iniciar sesión en tu panel.
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // RENDER: PANTALLA 1 - FORMULARIO DE ACCESO / REGISTRO
  // ==========================================================
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-white">
      
      {/* SECCIÓN IZQUIERDA */}
      <div className="hidden md:flex md:w-1/2 bg-primary-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-primary-800 blur-3xl opacity-40"></div>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-accent-500 blur-3xl opacity-20"></div>

        <div className="relative z-10">
          <span className="text-accent-500 font-bold text-sm tracking-widest uppercase block mb-3">Plataforma SaaS</span>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight max-w-md">
            Digitaliza tu inventario y comienza a vender hoy.
          </h2>
        </div>

        <div className="space-y-6 my-auto relative z-10 max-w-md">
          <div className="flex gap-4 items-start">
            <CheckCircle2 className="text-accent-500 shrink-0 mt-1" size={22} />
            <div>
              <h4 className="font-bold text-lg text-white">Tu propio subdominio</h4>
              <p className="text-primary-200 text-sm mt-0.5">tuempresa.erpsystem.com listo en segundos.</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN DERECHA */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-slate-50">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          
          <div className="flex border-b border-slate-200 mb-8">
            <button type="button" onClick={() => { setView('login'); setErrorGlobal(''); }} className={`w-1/2 pb-4 text-center font-bold text-sm relative ${view === 'login' ? 'text-primary-700 border-b-2 border-primary-700' : 'text-slate-400'}`}>
              Acceso Master
            </button>
            <button type="button" onClick={() => { setView('select_type'); setErrorGlobal(''); }} className={`w-1/2 pb-4 text-center font-bold text-sm relative ${view !== 'login' ? 'text-primary-700 border-b-2 border-primary-700' : 'text-slate-400'}`}>
              Nueva Tienda
            </button>
          </div>

          {view === 'login' && (
            <form className="space-y-4" onSubmit={manejarSubmit}>
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3 text-red-800 mb-4">
                  <ShieldAlert className="shrink-0" size={18} />
                  <p className="text-[11px] font-bold">Acceso restringido a administradores de la plataforma. Si eres un comercio cliente, usa tu enlace web personalizado (ej. tu-tienda.erpsystem.com/login).</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Usuario Global</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" value={usuarioLogin} onChange={e => setUsuarioLogin(e.target.value)} placeholder="ej. saas_master" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" required />
                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Contraseña</label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type={verPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-lg text-sm focus:outline-none" required />
                  <button type="button" onClick={() => setVerPassword(!verPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {verPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {errorGlobal && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-lg text-center">{errorGlobal}</div>}
              <button type="submit" disabled={cargando} className="w-full mt-4 bg-primary-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 text-sm disabled:opacity-70 shadow-md hover:shadow-lg transition-all">
                {cargando ? <Loader2 className="animate-spin" size={16} /> : 'Acceso Seguro'} 
              </button>
            </form>
          )}

          {view === 'select_type' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-slate-800 mb-2">Elige tu Modelo de Negocio</h2>
              <p className="text-slate-500 mb-6 text-sm">Selecciona cómo operarás para configurar tu sistema.</p>
              <div className="space-y-4">
                <div onClick={() => handleSelectType('retail')} className="p-5 border-2 border-slate-200 rounded-xl text-left hover:border-primary-500 hover:bg-primary-50 cursor-pointer transition-all flex items-center gap-4">
                  <Store size={32} className="mx-auto text-primary-600 shrink-0" />
                  <div>
                    <h3 className="font-bold text-slate-800">Tienda al Detal (Retail)</h3>
                    <p className="text-xs text-slate-500 mt-1">Vende directamente al consumidor final. Ideal para POS, tiendas físicas y e-commerce tradicional.</p>
                  </div>
                </div>
                <div onClick={() => handleSelectType('b2b')} className="p-5 border-2 border-slate-200 rounded-xl text-left hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer transition-all flex items-center gap-4">
                  <Building size={32} className="mx-auto text-indigo-600 shrink-0" />
                  <div>
                    <h3 className="font-bold text-slate-800">Fabricante / Mayorista (B2B)</h3>
                    <p className="text-xs text-slate-500 mt-1">Gestiona tu red de clientes mayoristas, con precios y condiciones especiales.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'register' && (
              <form className="space-y-4 animate-fade-in" onSubmit={manejarSubmit}>
                <button onClick={() => setView('select_type')} type="button" className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 mb-2">
                  <ArrowLeft size={16} /> Volver a seleccionar
                </button>
                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre</label>
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Juan" className="w-full px-4 py-2.5 bg-slate-50 border rounded-lg text-sm focus:outline-none" required />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Apellido</label>
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Pérez" className="w-full px-4 py-2.5 bg-slate-50 border rounded-lg text-sm focus:outline-none" required />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Usuario</label>
                    <div className="relative">
                      <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input type="text" value={usernameRegistro} onChange={e => setUsernameRegistro(e.target.value.toLowerCase().replace(/\s/g, ''))} placeholder="juanperez" className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-lg text-sm focus:outline-none" required />
                    </div>
                  </div>
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Correo</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-lg text-sm focus:outline-none" required />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Negocio</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" value={nombreEmpresa} onChange={e => setNombreEmpresa(e.target.value)} placeholder="Ej. Inversiones Power" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-lg text-sm focus:outline-none" required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tu Enlace Web (Subdominio)</label>
                  <div className="flex rounded-lg shadow-sm relative">
                    <input 
                      type="text" 
                      value={subdominio} 
                      onChange={manejarCambioSubdominio} 
                      placeholder="mi-tienda" 
                      className={`w-1/2 min-w-[120px] pl-10 pr-4 py-2.5 bg-slate-50 border rounded-l-lg text-sm font-semibold focus:outline-none text-right ${
                        subdominioDisponible === true ? 'border-green-400 bg-green-50/50 text-green-700' :
                        subdominioDisponible === false ? 'border-red-400 bg-red-50/50 text-red-700' : 'border-slate-200 text-primary-700'
                      }`} 
                      required 
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                      {validandoSubdominio && <Loader2 size={16} className="animate-spin text-slate-400" />}
                      {!validandoSubdominio && subdominioDisponible === true && <Check size={16} className="text-green-600" />}
                      {!validandoSubdominio && subdominioDisponible === false && <X size={16} className="text-red-500" />}
                    </div>
                    <span className="w-1/2 inline-flex items-center px-3 rounded-r-lg border border-l-0 border-slate-200 bg-slate-100 text-slate-500 text-xs font-medium truncate">
                      .erpsystem.com
                    </span>
                  </div>
                  {subdominio && !validandoSubdominio && (
                    <p className={`mt-1.5 text-xs font-bold ${subdominioDisponible ? 'text-green-600' : 'text-red-500'}`}>
                      {subdominioDisponible ? `✓ ¡Genial! Disponible.` : `❌ ${mensajeSubdominio || 'Ocupado.'}`}
                    </p>
                  )}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Contraseña</label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type={verPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-lg text-sm focus:outline-none" required />
                    <button type="button" onClick={() => setVerPassword(!verPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {verPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {errorGlobal && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-lg text-center">{errorGlobal}</div>}

                <button type="submit" disabled={cargando || subdominioDisponible === false} className="w-full mt-4 bg-primary-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 text-sm disabled:opacity-70 shadow-md hover:shadow-lg transition-all">
                  {cargando ? <Loader2 className="animate-spin" size={16} /> : 'Comenzar Registro'} 
                </button>
              </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary-600" size={40} /></div>}>
      <AuthContent />
    </Suspense>
  );
}