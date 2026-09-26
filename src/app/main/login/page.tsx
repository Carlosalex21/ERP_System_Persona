"use client";

import { useState, Suspense, useEffect } from 'react';
import { Mail, Lock, User, Building, Eye, EyeOff, ArrowRight, CheckCircle2, Loader2, UserPlus, Check, X, Globe, Store, ExternalLink, ArrowLeft, Sparkles, UtensilsCrossed, FlaskConical, Wrench, Calculator } from 'lucide-react';
import Cookies from 'js-cookie';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiPublica } from '@/services/api';
import { getPlanesPublicos, getMiCliente } from '@/services/platformBillingService';
import { getSharedCookieDomain, cookieSecureFlag } from '@/utils/cookieDomain';
import { tenantUrl } from '@/utils/tenantUrl';
import Reveal from '@/components/marketing/Reveal';
import FloatingChip from '@/components/marketing/FloatingChip';

type View = 'select_type' | 'register' | 'owner_login';
type BusinessType = 'retail' | 'b2b' | 'restaurante' | 'farmacia' | 'servicios' | 'contador';

const TIPOS_NEGOCIO: {
  tipo: BusinessType;
  icon: typeof Store;
  color: string;
  titulo: string;
  descripcion: string;
}[] = [
  { tipo: 'retail', icon: Store, color: 'primary', titulo: 'Tienda al Detal', descripcion: 'POS, tiendas físicas y e-commerce tradicional.' },
  { tipo: 'restaurante', icon: UtensilsCrossed, color: 'accent', titulo: 'Restaurante / Bar', descripcion: 'Mesas, pedidos y cuenta dividida por QR.' },
  { tipo: 'farmacia', icon: FlaskConical, color: 'emerald', titulo: 'Farmacia', descripcion: 'Control de lotes y alertas de vencimiento.' },
  { tipo: 'servicios', icon: Wrench, color: 'amber', titulo: 'Taller / Servicios', descripcion: 'Órdenes de servicio, técnicos y entregas.' },
  { tipo: 'contador', icon: Calculator, color: 'violet', titulo: 'Contador / Firma Contable', descripcion: 'Plan de cuentas, asientos, libros y estados financieros por cliente.' },
  { tipo: 'b2b', icon: Building, color: 'indigo', titulo: 'Fabricante / Mayorista', descripcion: 'Red de clientes mayoristas con precios especiales.' },
];

const COLOR_CLASSES: Record<string, { activo: string; icono: string }> = {
  primary: { activo: 'border-primary-500 bg-primary-50', icono: 'text-primary-600' },
  accent: { activo: 'border-accent-500 bg-accent-50', icono: 'text-accent-600' },
  emerald: { activo: 'border-emerald-500 bg-emerald-50', icono: 'text-emerald-600' },
  amber: { activo: 'border-amber-500 bg-amber-50', icono: 'text-amber-600' },
  indigo: { activo: 'border-indigo-500 bg-indigo-50', icono: 'text-indigo-600' },
  violet: { activo: 'border-violet-500 bg-violet-50', icono: 'text-violet-600' },
};
type PaisCodigo = 'VE' | 'CO' | 'PE';

/**
 * Extrae un mensaje de error legible sin importar la forma exacta en que
 * llegó envuelto. El backend a veces devuelve `serializer.errors` crudo
 * (ej: `TenantRegistrationView`), que el renderer estándar termina
 * envolviendo como `{data: {username: [msg]}, errors: null, meta: {}}` en
 * vez de poblar `errors` -- por eso hay que mirar ambos lugares.
 */
function extraerMensajeError(error: any): string {
  const body = error?.response?.data;
  if (!body) return 'Ocurrió un error al conectar con el servidor.';

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    const primero = body.errors[0];
    if (typeof primero === 'string') return primero;
    return primero?.detail || primero?.message || 'Ocurrió un error al procesar la solicitud.';
  }

  const camposError = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : body;
  if (camposError && typeof camposError === 'object') {
    const primeraClave = Object.keys(camposError)[0];
    if (primeraClave) {
      const valor = camposError[primeraClave];
      const msg = Array.isArray(valor) ? valor[0] : valor;
      if (typeof msg === 'string') return msg;
    }
  }

  if (typeof body === 'string') return body;
  return 'Ocurrió un error al procesar la solicitud.';
}

const PAISES: { codigo: PaisCodigo; nombre: string; moneda: string }[] = [
  { codigo: 'VE', nombre: 'Venezuela', moneda: 'Bs. / IVA' },
  { codigo: 'CO', nombre: 'Colombia', moneda: 'COP / IVA' },
  { codigo: 'PE', nombre: 'Perú', moneda: 'S/ / IGV' },
];

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const planElegido = searchParams.get('plan');
  // Programa de referidos: `?ref=<schema_name del tenant que invitó>` (ver
  // `apps.tenants.api.views_subscription.ReferidoProgramaView`, que arma
  // este mismo link). Se manda tal cual al registrar -- el backend valida
  // que exista y no sea el propio subdominio, así que un valor inválido
  // simplemente no genera ningún `Referido`.
  const codigoReferido = searchParams.get('ref');

  // Estados de Interfaz
  // Si el usuario vino de un plan, primero elegimos el tipo de negocio (retail/b2b).
  const [view, setView] = useState<View>(planElegido ? 'select_type' : 'select_type');
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
  // País de operación: primer dato del registro. Condiciona moneda base e
  // IVA/IGV sembrados para el tenant (ver TenantService.create_tenant).
  const [paisCodigo, setPaisCodigo] = useState<PaisCodigo>('VE');
  const [password, setPassword] = useState('');
  const [usuarioLogin, setUsuarioLogin] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [usernameRegistro, setUsernameRegistro] = useState('');
  const [email, setEmail] = useState('');
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [subdominio, setSubdominio] = useState('');
  // Solo se usa/envía si businessType === 'restaurante' -- cada local tiene
  // un número de mesas distinto, así que lo indica el propio dueño en vez
  // de sembrar una cantidad fija (ver TenantService.create_tenant).
  const [cantidadMesas, setCantidadMesas] = useState(6);

  // Estados de Validación de Subdominio
  const [validandoSubdominio, setValidandoSubdominio] = useState(false);
  const [subdominioDisponible, setSubdominioDisponible] = useState<boolean | null>(null);
  const [mensajeSubdominio, setMensajeSubdominio] = useState('');

  // Estados de Validación de Usuario (el username es único a nivel de
  // plataforma -- ver `UsernameAvailabilityView` -- así que se puede
  // avisar ANTES del submit, igual que con el subdominio).
  const [validandoUsuario, setValidandoUsuario] = useState(false);
  const [usuarioDisponible, setUsuarioDisponible] = useState<boolean | null>(null);
  const [mensajeUsuario, setMensajeUsuario] = useState('');

  // Cupo de registros gratuitos restantes (promoción configurable por el superadmin).
  const [cupoRestante, setCupoRestante] = useState<{ restantes: number | null; total: number | null } | null>(null);

  useEffect(() => {
    apiPublica.get('/tenants/registration-quota/')
      .then((res) => setCupoRestante({ restantes: res.data.cupos_restantes, total: res.data.cupo_total }))
      .catch(() => setCupoRestante(null));
  }, []);

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
        const res = await apiPublica.get(`/tenants/check-subdomain/?subdomain=${subdominio}`);
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

  // Validación Debounce del nombre de usuario en el Backend
  useEffect(() => {
    if (!usernameRegistro || view !== 'register') { setUsuarioDisponible(null); return; }
    setValidandoUsuario(true);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await apiPublica.get(`/tenants/check-username/?username=${encodeURIComponent(usernameRegistro)}`);
        setUsuarioDisponible(res.data.available);
        setMensajeUsuario(res.data.available ? '' : (res.data.message || ''));
      } catch (error) {
        setUsuarioDisponible(null);
        setMensajeUsuario('');
      } finally {
        setValidandoUsuario(false);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [usernameRegistro, view]);

  // LÓGICA DE INICIO DE SESIÓN DEL DUEÑO DE UN TENANT (no de plataforma).
  // Tras validar credenciales, lo mandamos a donde corresponda según el
  // estado real de su suscripción -- antes esto no existía y cualquier
  // dueño que volviera a "iniciar sesión" terminaba en /superadmin (¡el
  // panel de la plataforma, no el suyo!).
  const procesarLoginDueno = async () => {
    const res = await apiPublica.post('/auth/token/', { username: usuarioLogin, password });
    const domain = getSharedCookieDomain();
    Cookies.set('access_token', res.data.access, { expires: 1, domain, secure: cookieSecureFlag(), sameSite: 'Lax' });
    Cookies.set('refresh_token', res.data.refresh, { expires: 7, domain, secure: cookieSecureFlag(), sameSite: 'Lax' });

    try {
      const cliente = await getMiCliente();
      if (cliente.subscription?.is_active) {
        window.location.href = tenantUrl(cliente.schema_name, '/admin');
      } else {
        const planSlug = planElegido || 'emprendedor';
        router.push(`/pago?plan=${planSlug}&subdominio=${cliente.schema_name}`);
      }
    } catch {
      // No pudimos resolver el tenant asociado: lo dejamos en esta misma
      // pantalla con la sesión iniciada en vez de mandarlo a un panel ajeno.
      setErrorGlobal('Sesión iniciada, pero no pudimos encontrar tu negocio asociado. Contáctanos si esto persiste.');
    }
  };

  // LÓGICA DE REGISTRO CON ANIMACIÓN DE ENTORNO
  const procesarRegistro = async () => {
    if (subdominioDisponible === false) {
      setErrorGlobal('Elige un subdominio válido y disponible.');
      return;
    }
    if (usuarioDisponible === false) {
      setErrorGlobal(mensajeUsuario || 'Este nombre de usuario ya está en uso.');
      return;
    }

    setFaseRegistro('creando');

    // El `plan_id` aquí solo sirve para validar que el plan elegido existe;
    // la activación real ocurre después de un pago confirmado en /pago (ver
    // `TenantService.create_tenant`, que siempre arranca con el plan de
    // prueba sin importar este valor).
    let planId: number | undefined;
    try {
      const planes = await getPlanesPublicos();
      planId = planes.find((p) => p.slug === planElegido)?.id;
    } catch {
      planId = undefined;
    }

    const payload = {
      first_name: firstName,
      last_name: lastName,
      username: usernameRegistro,
      email,
      password,
      nombre_empresa: nombreEmpresa,
      subdomain: subdominio,
      ...(planId ? { plan_id: planId } : {}),
      tipo_negocio: businessType,
      pais_codigo: paisCodigo,
      ...(businessType === 'restaurante' ? { cantidad_mesas: cantidadMesas } : {}),
      ...(codigoReferido ? { codigo_referido: codigoReferido } : {}),
    };

    try {
      // Timeout más largo que el default (20s) SOLO para este request:
      // crear un tenant corre TODAS las migraciones en un esquema Postgres
      // nuevo (no es un POST normal) -- cuantos más módulos tiene el
      // sistema, más tarda. Con el timeout default, un registro real podía
      // completarse en el servidor (el tenant SÍ quedaba creado) pero el
      // navegador ya había cortado la conexión, dejando al usuario viendo
      // la animación de "Desplegando tu ecosistema" para siempre.
      await apiPublica.post('/tenants/register/', payload, { timeout: 60000 });
      // Auto-login: el flujo de pago de suscripción (/pago) necesita una
      // sesión autenticada del dueño del tenant para saber a quién cobrarle.
      try {
        const tokenRes = await apiPublica.post('/auth/token/', { username: usernameRegistro, password });
        const domain = getSharedCookieDomain();
        Cookies.set('access_token', tokenRes.data.access, { expires: 1, domain, secure: cookieSecureFlag(), sameSite: 'Lax' });
        Cookies.set('refresh_token', tokenRes.data.refresh, { expires: 7, domain, secure: cookieSecureFlag(), sameSite: 'Lax' });
      } catch (loginError) {
        console.error('No se pudo iniciar sesión automáticamente tras el registro:', loginError);
      }
      setFaseRegistro('exito');
    } catch (error: any) {
      console.error("Errores de validación del backend:", error.response?.data);
      setErrorGlobal(extraerMensajeError(error));
      setFaseRegistro('formulario');
    }
  };

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGlobal('');
    setCargando(true);

    try {
      if (view === 'owner_login') {
        await procesarLoginDueno();
      } else if (view === 'register') {
        // `procesarRegistro` ya maneja y muestra sus propios errores
        // (necesita volver a 'formulario' incluso si el registro en sí
        // tuvo éxito pero el auto-login falló), así que no relanza.
        await procesarRegistro();
      }
    } catch (error: any) {
      setFaseRegistro('formulario');
      if (view === 'owner_login' && error.response?.status === 401) {
        setErrorGlobal('Usuario o contraseña incorrectos.');
      } else {
        setErrorGlobal(extraerMensajeError(error));
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
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-ink-950 p-6 relative overflow-hidden bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:44px_44px]">
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary-600 rounded-full blur-[110px] opacity-30" />
        <div className="absolute -top-32 -right-16 w-96 h-96 bg-accent-500 rounded-full blur-[120px] opacity-20" />
        <div className="bg-white w-full max-w-lg p-10 rounded-3xl shadow-2xl flex flex-col items-center text-center space-y-6 relative z-10 animate-scale-in">
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border-4 border-primary-100 border-t-primary-600 animate-spin"></div>
            <Building className="absolute text-primary-600 animate-pulse" size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="font-display font-extrabold text-2xl text-slate-900 uppercase">Desplegando tu ecosistema</h3>
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
            <h2 className="font-display font-extrabold text-3xl text-slate-900 uppercase">¡Cuenta Creada!</h2>
            <p className="text-slate-500 text-sm max-w-md">
              Tu entorno multi-tenant fue aislado correctamente. Ahora activa tu suscripción para publicar tu catálogo.
            </p>
          </div>

          <button
            onClick={() => router.push(`/pago?plan=${planElegido || 'emprendedor'}&subdominio=${subdominio}`)}
            className="w-full bg-accent-400 text-ink-950 py-4 rounded-full font-black text-base shadow-lg hover:bg-accent-300 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            Continuar al Pago <ArrowRight size={18} />
          </button>

          <div className={`grid grid-cols-1 gap-4 ${businessType !== 'contador' ? 'sm:grid-cols-2' : ''}`}>
            {/* Tarjeta 1: Tienda Pública -- un contador no vende nada, no tiene catálogo público que mostrar. */}
            {businessType !== 'contador' && (
              <div className="border border-slate-200 p-6 rounded-2xl bg-slate-50 flex flex-col justify-between group">
                <div>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 border border-blue-100"><Globe size={20} /></div>
                  <h4 className="font-bold text-slate-900 text-sm">Catálogo Público Online</h4>
                  <p className="text-xs text-slate-400 mt-1 mb-4">La dirección web donde tus clientes comprarán tus productos.</p>
                </div>
                <a href={tenantUrl(subdominio)} target="_blank" rel="noopener noreferrer" className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm hover:bg-slate-50 transition-colors">
                  Ver Catálogo <ExternalLink size={14} />
                </a>
              </div>
            )}

            {/* Tarjeta 2: Panel Administrativo */}
            <div className="border border-primary-200 p-6 rounded-2xl bg-primary-50/50 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-primary-600 text-white font-bold text-[9px] uppercase px-3 py-1 rounded-bl-xl tracking-wider">Tus Controles</div>
              <div>
                <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-xl flex items-center justify-center mb-4 border border-primary-200"><Store size={20} /></div>
                <h4 className="font-bold text-slate-900 text-sm">Panel Administrativo</h4>
                <p className="text-xs text-slate-400 mt-1 mb-4">Administra tu inventario, configura almacenes, sucursales e IVA.</p>
              </div>
              <a href={tenantUrl(subdominio, '/login')} className="w-full py-2.5 bg-primary-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-primary-700 transition-transform active:scale-95">
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
      <div className="hidden md:flex md:w-1/2 bg-ink-950 text-white p-12 flex-col justify-between relative overflow-hidden bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:44px_44px]">
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-primary-700 blur-[100px] opacity-40"></div>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-accent-500 blur-[100px] opacity-20"></div>

        <Reveal from="down">
          <div className="relative z-10">
            <span className="text-accent-400 font-bold text-sm tracking-widest uppercase block mb-3">Plataforma SaaS</span>
            <h2 className="font-display font-extrabold text-4xl lg:text-5xl leading-[0.95] max-w-md uppercase">
              Digitaliza y vende <span className="text-accent-400">hoy</span>
            </h2>
          </div>
        </Reveal>

        <div className="relative flex-1 flex items-center justify-center">
          <FloatingChip icon={<Sparkles size={13} />} label="Listo en minutos" color="accent" className="left-[8%] top-[20%]" rotate={-8} />
          <FloatingChip icon={<CheckCircle2 size={13} />} label="Sin tarjeta" color="emerald" className="right-[4%] top-[50%]" rotate={6} delayed />
        </div>

        <Reveal delay={0.15}>
          <div className="space-y-6 relative z-10 max-w-md">
            <div className="flex gap-4 items-start">
              <CheckCircle2 className="text-accent-400 shrink-0 mt-1" size={22} />
              <div>
                <h4 className="font-bold text-lg text-white">Tu propio subdominio</h4>
                <p className="text-slate-400 text-sm mt-0.5">tuempresa.erpsystem.com listo en segundos.</p>
              </div>
            </div>
            {cupoRestante && cupoRestante.restantes !== null && (
              <div className="flex gap-4 items-start">
                <CheckCircle2 className="text-accent-400 shrink-0 mt-1" size={22} />
                <div>
                  <h4 className="font-bold text-lg text-white">Promoción de lanzamiento</h4>
                  <p className="text-slate-400 text-sm mt-0.5">
                    Quedan <strong className="text-accent-400">{cupoRestante.restantes}</strong> cupos gratis de {cupoRestante.total}.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </div>

      {/* SECCIÓN DERECHA */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-slate-50">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100 animate-scale-in">

          <div className="flex bg-slate-100 rounded-full p-1 mb-8">
            <button type="button" onClick={() => { setView('select_type'); setErrorGlobal(''); }} className={`w-1/2 py-2.5 text-center font-bold text-sm rounded-full transition-all ${view !== 'owner_login' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500'}`}>
              Nueva Tienda
            </button>
            <button type="button" onClick={() => { setView('owner_login'); setErrorGlobal(''); }} className={`w-1/2 py-2.5 text-center font-bold text-sm rounded-full transition-all ${view === 'owner_login' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500'}`}>
              Ya Tengo Cuenta
            </button>
          </div>

          {view === 'owner_login' && (
            <form className="space-y-4" onSubmit={manejarSubmit}>
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">Bienvenido de vuelta</h2>
                <p className="text-slate-500 text-xs mb-4">Ingresa con el usuario de tu negocio para gestionar tu suscripción.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Usuario</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" value={usuarioLogin} onChange={e => setUsuarioLogin(e.target.value)} placeholder="tu usuario" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type={verPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-lg text-sm focus:outline-none" required />
                  <button type="button" onClick={() => setVerPassword(!verPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {verPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {errorGlobal && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-lg text-center">{errorGlobal}</div>}
              <button type="submit" disabled={cargando} className="w-full mt-4 bg-primary-600 text-white py-3 rounded-full font-bold flex items-center justify-center gap-2 text-sm disabled:opacity-70 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
                {cargando ? <Loader2 className="animate-spin" size={16} /> : 'Ingresar'}
              </button>
              <p className="text-center text-[11px] text-slate-400">
                ¿Olvidaste tu contraseña? Recupérala desde el panel de tu negocio: <span className="font-mono">tu-tienda.erpsystem.com/login</span>
              </p>
            </form>
          )}

          {view === 'select_type' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-slate-800 mb-2">¿Dónde opera tu negocio?</h2>
              <p className="text-slate-500 mb-4 text-sm">Configura tu moneda base y tus impuestos (IVA/IGV) automáticamente.</p>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {PAISES.map((pais) => (
                  <button
                    key={pais.codigo}
                    type="button"
                    onClick={() => setPaisCodigo(pais.codigo)}
                    className={`px-2 py-3 rounded-xl border-2 text-center transition-all ${
                      paisCodigo === pais.codigo
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-sm font-bold">{pais.nombre}</span>
                    <span className="block text-[10px] mt-0.5 opacity-70">{pais.moneda}</span>
                  </button>
                ))}
              </div>

              <h2 className="text-xl font-bold text-slate-800 mb-2">Elige tu Modelo de Negocio</h2>
              <p className="text-slate-500 mb-6 text-sm">El sistema habilita los módulos que necesitas según lo que elijas -- lo puedes ajustar después.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TIPOS_NEGOCIO.map(({ tipo, icon: Icon, color, titulo, descripcion }) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => handleSelectType(tipo)}
                    className={`p-4 border-2 rounded-xl text-left cursor-pointer transition-all flex items-start gap-3 ${
                      businessType === tipo ? COLOR_CLASSES[color].activo : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={26} className={`shrink-0 ${COLOR_CLASSES[color].icono}`} />
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{titulo}</h3>
                      <p className="text-xs text-slate-500 mt-1">{descripcion}</p>
                    </div>
                  </button>
                ))}
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
                      <input
                        type="text"
                        value={usernameRegistro}
                        onChange={e => setUsernameRegistro(e.target.value.toLowerCase().replace(/\s/g, ''))}
                        placeholder="juanperez"
                        className={`w-full pl-9 pr-8 py-2.5 bg-slate-50 border rounded-lg text-sm focus:outline-none ${
                          usuarioDisponible === true ? 'border-green-400' : usuarioDisponible === false ? 'border-red-400' : ''
                        }`}
                        required
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                        {validandoUsuario && <Loader2 size={14} className="animate-spin text-slate-400" />}
                        {!validandoUsuario && usuarioDisponible === true && <Check size={14} className="text-green-600" />}
                        {!validandoUsuario && usuarioDisponible === false && <X size={14} className="text-red-500" />}
                      </div>
                    </div>
                    {usernameRegistro && !validandoUsuario && usuarioDisponible === false && (
                      <p className="mt-1 text-[11px] font-bold text-red-500">{mensajeUsuario || 'Ocupado.'}</p>
                    )}
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

                {businessType === 'restaurante' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">¿Cuántas mesas tiene tu local?</label>
                    <div className="relative">
                      <UtensilsCrossed className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={cantidadMesas}
                        onChange={e => setCantidadMesas(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-lg text-sm focus:outline-none"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">Las creamos numeradas (Mesa 1, Mesa 2...) -- puedes renombrarlas o agregar/quitar después desde el panel.</p>
                  </div>
                )}

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

                {cupoRestante && cupoRestante.restantes !== null && cupoRestante.restantes <= 10 && (
                  <p className="text-[11px] font-bold text-accent-600 bg-accent-50 border border-accent-100 rounded-lg px-3 py-2">
                    {cupoRestante.restantes > 0
                      ? `Quedan solo ${cupoRestante.restantes} cupos de la promoción de lanzamiento.`
                      : 'La promoción de lanzamiento ya se agotó, pero puedes registrarte con un plan pago.'}
                  </p>
                )}

                {errorGlobal && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-lg text-center">{errorGlobal}</div>}

                <button type="submit" disabled={cargando || subdominioDisponible === false || usuarioDisponible === false} className="w-full mt-4 bg-primary-600 text-white py-3 rounded-full font-bold flex items-center justify-center gap-2 text-sm disabled:opacity-70 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
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
