"use client";

import { useState, useEffect, useMemo, Suspense, type ReactElement } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import {
  Loader2, CreditCard, Smartphone, Copy, Check, ArrowRight, ExternalLink, Store, ShieldCheck, Clock, XCircle,
  Sparkles, TrendingUp, TrendingDown, CalendarCheck2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getMiCliente, getPlanesPublicos, getPlatformPaymentInfo, getPeriodosSuscripcion, crearPagoSuscripcion,
} from '@/services/platformBillingService';
import { MiCliente, MiSubscripcion, Plan, PlatformPaymentInfo, MetodoPagoSuscripcion, PeriodoSuscripcion, PeriodoSuscripcionInfo } from '@/types/api';
import { tenantUrl } from '@/utils/tenantUrl';

/** Beneficios adicionales (marketing) por plan, más allá de los límites numéricos que ya vienen del backend. */
const BENEFICIOS_EXTRA: Record<string, string[]> = {
  emprendedor: [
    'Subdominio personalizado',
    'Catálogo web público optimizado para móviles',
    'Pedidos ilimitados enviados por WhatsApp',
    'Facturación no fiscal / control de órdenes',
  ],
  pro: [
    'Todo lo incluido en el Plan Emprendedor',
    'Productos y categorías ilimitadas',
    'Módulo multialmacén y control de stocks críticos',
    'Reportes y analíticas avanzadas',
    'Soporte prioritario por WhatsApp y correo',
  ],
};

function beneficiosDePlan(plan: Plan): string[] {
  const base: string[] = [];
  base.push(plan.limite_productos ? `Hasta ${plan.limite_productos} productos` : 'Productos ilimitados');
  base.push(`Hasta ${plan.limite_usuarios} usuario${plan.limite_usuarios === 1 ? '' : 's'}`);
  base.push(`Hasta ${plan.limite_sucursales} sucursal${plan.limite_sucursales === 1 ? '' : 'es'}`);
  const extra = plan.slug ? BENEFICIOS_EXTRA[plan.slug] : undefined;
  return extra ? [...extra, ...base] : base;
}

/** Parsea una fecha "YYYY-MM-DD" a medianoche LOCAL (evita el corrimiento de
 * un día que da `new Date("YYYY-MM-DD")`, que la interpreta como UTC). */
function parseFechaISO(fechaStr: string): Date {
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Fecha en que quedaría la suscripción tras pagar este período. Replica la
 * regla real del backend (`SubscriptionService.create_subscription`): si ya
 * hay una suscripción vigente (activa, con `fecha_fin` en el futuro), el
 * pago EXTIENDE esa fecha en vez de reiniciar desde hoy -- así el cliente no
 * pierde los días que ya pagó y no usó, sea o no el mismo plan.
 */
function calcularFechaVencimiento(subscription: MiSubscripcion | null | undefined, dias: number): Date {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  let base = hoy;
  if (subscription?.estado === 'activa' && subscription.fecha_fin) {
    const fin = parseFechaISO(subscription.fecha_fin);
    if (fin >= hoy) base = fin;
  }
  const resultado = new Date(base);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

function calcularMontoPeriodo(precioMensual: number, periodoInfo: PeriodoSuscripcionInfo | undefined): number {
  if (!periodoInfo) return precioMensual;
  const bruto = precioMensual * periodoInfo.meses;
  const descuento = bruto * (periodoInfo.descuento_pct / 100);
  return Math.round((bruto - descuento) * 100) / 100;
}

function copiar(valor: string): void {
  navigator.clipboard.writeText(valor).catch(() => undefined);
  toast.success('Copiado al portapapeles.');
}

function CampoCopiable({ etiqueta, valor }: { etiqueta: string; valor: string }): ReactElement {
  return (
    <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase">{etiqueta}</p>
        <p className="text-sm font-semibold text-slate-800 truncate">{valor || '—'}</p>
      </div>
      <button
        type="button"
        onClick={() => copiar(valor)}
        className="shrink-0 p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
        title="Copiar"
      >
        <Copy size={14} />
      </button>
    </div>
  );
}

function PagoContent(): ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planSlug = searchParams.get('plan') || '';
  const subdominio = searchParams.get('subdominio') || '';
  const stripeResultado = searchParams.get('stripe');

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [cliente, setCliente] = useState<MiCliente | null>(null);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoSuscripcionInfo[]>([]);
  const [pagoInfo, setPagoInfo] = useState<PlatformPaymentInfo | null>(null);
  const [planSeleccionadoId, setPlanSeleccionadoId] = useState<number | null>(null);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<PeriodoSuscripcion>('mensual');
  const [metodoManual, setMetodoManual] = useState<'pago_movil' | 'zelle'>('pago_movil');
  const [referencia, setReferencia] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pagoEnviado, setPagoEnviado] = useState(false);

  useEffect(() => {
    const token = Cookies.get('access_token');
    if (!token) {
      router.replace(`/login?plan=${planSlug}`);
      return;
    }

    (async () => {
      try {
        const [miCliente, planesData, periodosData, info] = await Promise.all([
          getMiCliente(),
          getPlanesPublicos(),
          getPeriodosSuscripcion(),
          getPlatformPaymentInfo(),
        ]);
        setCliente(miCliente);
        setPagoInfo(info);
        setPeriodos(periodosData);

        // Solo se pueden comprar planes pagos activos -- el Plan de Prueba no es una opción de compra.
        const planesComprables = planesData.filter((p) => p.activo && p.nombre !== 'Plan de Prueba');
        setPlanes(planesComprables);

        const planDesdeQuery = planesComprables.find((p) => p.slug === planSlug);
        const planActual = miCliente.subscription?.plan;
        const planActualComprable = planActual ? planesComprables.find((p) => p.id === planActual.id) : undefined;
        const preseleccion = planDesdeQuery || planActualComprable || planesComprables[0] || null;
        setPlanSeleccionadoId(preseleccion?.id ?? null);
        if (!preseleccion) {
          setError('No hay planes disponibles para contratar en este momento.');
        }
      } catch {
        setError('No se pudieron cargar los datos de tu cuenta. Intenta iniciar sesión de nuevo.');
      } finally {
        setCargando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planSlug]);

  const esVenezuela = cliente?.pais_codigo === 'VE';
  // Un plan de prueba también queda `is_active=True` -- si solo mirásemos
  // eso, cualquiera que se acabara de registrar (con su prueba gratis
  // recién arrancada) veía "¡ya estás suscrito!" y nunca llegaba a ver las
  // opciones de pago. Solo se considera "ya pagó" si tiene un plan activo
  // que NO sea el de prueba.
  const esPrueba = cliente?.subscription?.es_prueba ?? true;
  const tienePlanPago = (cliente?.subscription?.is_active ?? false) && !esPrueba;
  const planActual = cliente?.subscription?.plan ?? null;
  const diasRestantes = (() => {
    if (!cliente?.subscription?.fecha_fin) return null;
    const dias = Math.ceil((new Date(cliente.subscription.fecha_fin).getTime() - Date.now()) / 86400000);
    return dias >= 0 ? dias : 0;
  })();

  const periodoInfo = periodos.find((p) => p.codigo === periodoSeleccionado);
  const plan = planes.find((p) => p.id === planSeleccionadoId) || null;
  const esRenovacion = !!planActual && !!plan && planActual.id === plan.id;
  const montoSeleccionado = plan ? calcularMontoPeriodo(parseFloat(plan.precio), periodoInfo) : 0;
  const diferenciaVsPlanActual = useMemo(() => {
    if (!plan || !planActual || esPrueba) return null;
    const diff = parseFloat(plan.precio) - parseFloat(planActual.precio);
    return Math.round(diff * 100) / 100;
  }, [plan, planActual, esPrueba]);

  const fechaVencimientoEstimada = useMemo(() => {
    if (!periodoInfo) return null;
    return calcularFechaVencimiento(cliente?.subscription, periodoInfo.dias);
  }, [cliente, periodoInfo]);
  const fechaVencimientoTexto = fechaVencimientoEstimada?.toLocaleDateString('es-VE', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const pagarManual = async (): Promise<void> => {
    if (!cliente || !plan) return;
    if (!referencia.trim()) {
      toast.error('Ingresa el número de referencia del pago.');
      return;
    }
    setEnviando(true);
    try {
      await crearPagoSuscripcion({
        client_id: cliente.id,
        plan_id: plan.id,
        metodo: metodoManual as MetodoPagoSuscripcion,
        periodo: periodoSeleccionado,
        referencia: referencia.trim(),
      });
      setPagoEnviado(true);
    } catch {
      toast.error('No se pudo registrar tu pago. Verifica los datos e intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const pagarConStripe = async (): Promise<void> => {
    if (!cliente || !plan) return;
    setEnviando(true);
    try {
      const res = await crearPagoSuscripcion({
        client_id: cliente.id,
        plan_id: plan.id,
        metodo: 'stripe',
        periodo: periodoSeleccionado,
      });
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        toast.error('No se pudo iniciar el pago con Stripe.');
        setEnviando(false);
      }
    } catch {
      toast.error('No se pudo iniciar el pago con Stripe. Contacta al soporte.');
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary-600" size={36} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-sm border border-slate-200 text-center space-y-4">
          <XCircle className="mx-auto text-red-500" size={40} />
          <p className="text-slate-700 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (pagoEnviado) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white w-full max-w-xl p-10 rounded-3xl shadow-2xl border border-slate-100 space-y-8 animate-scale-in text-center">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center border bg-amber-50 text-amber-600 border-amber-200">
            <Clock size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pago en revisión</h2>
            <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
              Recibimos tu reporte de pago. Lo confirmaremos manualmente y tu suscripción se activará en breve.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a href={tenantUrl(subdominio || cliente?.schema_name || '')} target="_blank" rel="noopener noreferrer" className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm hover:bg-slate-50 transition-colors">
              Ver Catálogo <ExternalLink size={14} />
            </a>
            <a href={tenantUrl(subdominio || cliente?.schema_name || '', '/login')} className="w-full py-2.5 bg-primary-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-primary-700 transition-colors">
              Ingresar al Admin <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-900">Tu suscripción</h1>
          {stripeResultado === 'cancel' && (
            <p className="text-amber-600 text-xs font-bold mt-2">Cancelaste el pago con tarjeta. Puedes intentarlo de nuevo cuando quieras.</p>
          )}
        </div>

        {/* --- Estado actual --- */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Tu plan actual</p>
            <p className="text-lg font-black text-slate-900">
              {planActual?.nombre || 'Sin plan'}
              {tienePlanPago && <span className="ml-2 text-xs font-bold text-green-600 align-middle">● Activo</span>}
            </p>
            {esPrueba && (
              <p className="text-primary-600 text-xs font-bold mt-1">
                Período de prueba gratuita{diasRestantes !== null ? ` — ${diasRestantes} día${diasRestantes === 1 ? '' : 's'} restantes` : ''}.
              </p>
            )}
            {tienePlanPago && diasRestantes !== null && (
              <p className="text-slate-500 text-xs mt-1">Vence en {diasRestantes} día{diasRestantes === 1 ? '' : 's'}.</p>
            )}
          </div>
          {tienePlanPago && (
            <div className="grid grid-cols-2 gap-3">
              <a href={tenantUrl(subdominio || cliente?.schema_name || '')} target="_blank" rel="noopener noreferrer" className="py-2 px-4 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm hover:bg-slate-50 transition-colors">
                Ver Catálogo <ExternalLink size={14} />
              </a>
              <a href={tenantUrl(subdominio || cliente?.schema_name || '', '/login')} className="py-2 px-4 bg-primary-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-primary-700 transition-colors">
                Ir al Admin <ArrowRight size={14} />
              </a>
            </div>
          )}
        </div>

        {/* --- Selector de período --- */}
        <div className="flex justify-center gap-2">
          {periodos.map((p) => (
            <button
              key={p.codigo}
              type="button"
              onClick={() => setPeriodoSeleccionado(p.codigo)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-colors flex items-center gap-1.5 ${
                periodoSeleccionado === p.codigo ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500 bg-white'
              }`}
            >
              {p.nombre}
              {p.descuento_pct > 0 && (
                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  -{p.descuento_pct}%
                </span>
              )}
            </button>
          ))}
        </div>

        {/* --- Tarjetas de planes --- */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {planes.map((p) => {
            const esActual = planActual?.id === p.id;
            const monto = calcularMontoPeriodo(parseFloat(p.precio), periodoInfo);
            const diff = planActual && !esPrueba ? Math.round((parseFloat(p.precio) - parseFloat(planActual.precio)) * 100) / 100 : null;
            const seleccionado = planSeleccionadoId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlanSeleccionadoId(p.id)}
                className={`text-left p-5 rounded-2xl border-2 transition-all relative ${
                  seleccionado ? 'border-primary-500 bg-primary-50/40 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {p.slug === 'pro' && (
                  <div className="absolute top-0 right-0 bg-accent-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                    <Sparkles size={10} /> RECOMENDADO
                  </div>
                )}
                <p className="font-black text-slate-900 text-lg">{p.nombre}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-extrabold text-slate-900">${monto}</span>
                  <span className="text-slate-500 text-xs">/ {periodoInfo?.nombre.toLowerCase() || 'mes'}</span>
                </div>
                {esActual && (
                  <span className="inline-block mt-2 text-[10px] font-bold text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full">
                    Tu plan actual
                  </span>
                )}
                {!esActual && diff !== null && diff !== 0 && (
                  <span className={`inline-flex items-center gap-1 mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${diff > 0 ? 'text-amber-700 bg-amber-100' : 'text-slate-600 bg-slate-100'}`}>
                    {diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {diff > 0 ? `+$${diff.toFixed(2)}` : `-$${Math.abs(diff).toFixed(2)}`}/mes vs. tu plan actual
                  </span>
                )}
                <ul className="mt-4 space-y-2">
                  {beneficiosDePlan(p).map((b) => (
                    <li key={b} className="flex items-start gap-2 text-xs text-slate-600">
                      <Check className="text-primary-600 shrink-0 mt-0.5" size={13} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {/* --- Panel de pago --- */}
        <div className="max-w-2xl mx-auto w-full space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700">
                {esRenovacion ? 'Renovar' : 'Contratar'} {plan?.nombre}
              </p>
              <p className="text-lg font-black text-slate-900">${montoSeleccionado} <span className="text-xs font-medium text-slate-400">/ {periodoInfo?.nombre.toLowerCase()}</span></p>
            </div>
            {!esRenovacion && diferenciaVsPlanActual !== null && diferenciaVsPlanActual !== 0 && (
              <p className="text-xs text-slate-500">
                {diferenciaVsPlanActual > 0
                  ? `Este plan cuesta $${diferenciaVsPlanActual.toFixed(2)} más al mes que tu plan actual (${planActual?.nombre}).`
                  : `Este plan cuesta $${Math.abs(diferenciaVsPlanActual).toFixed(2)} menos al mes que tu plan actual (${planActual?.nombre}).`}
              </p>
            )}
            {fechaVencimientoTexto && (
              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 flex items-center gap-1.5">
                <CalendarCheck2 size={14} className="text-primary-600 shrink-0" />
                Tu suscripción quedará activa hasta el <strong>{fechaVencimientoTexto}</strong>
                {esVenezuela && ' (una vez confirmemos tu pago)'}
              </p>
            )}

            {esVenezuela ? (
              <>
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                  <Smartphone size={18} className="text-primary-600" /> Pago móvil o Zelle a la plataforma
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setMetodoManual('pago_movil')} className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-colors ${metodoManual === 'pago_movil' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500'}`}>
                    Pago Móvil
                  </button>
                  <button type="button" onClick={() => setMetodoManual('zelle')} className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-colors ${metodoManual === 'zelle' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500'}`}>
                    Zelle
                  </button>
                </div>

                {metodoManual === 'pago_movil' ? (
                  <div className="space-y-2">
                    <CampoCopiable etiqueta="Banco" valor={pagoInfo?.pago_movil_banco || ''} />
                    <CampoCopiable etiqueta="Cédula / RIF" valor={pagoInfo?.pago_movil_cedula || ''} />
                    <CampoCopiable etiqueta="Teléfono" valor={pagoInfo?.pago_movil_telefono || ''} />
                    <CampoCopiable etiqueta="Monto (equivalente en Bs. a la tasa del día)" valor={`$${montoSeleccionado} USD`} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <CampoCopiable etiqueta="Email Zelle" valor={pagoInfo?.zelle_email || ''} />
                    <CampoCopiable etiqueta="Titular" valor={pagoInfo?.zelle_titular || ''} />
                    <CampoCopiable etiqueta="Monto" valor={`$${montoSeleccionado} USD`} />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número de referencia del pago</label>
                  <input
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Ej: 000123456789"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Confirmaremos tu pago manualmente en un plazo corto.</p>
                </div>

                <button
                  type="button"
                  onClick={pagarManual}
                  disabled={enviando || !plan}
                  className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {enviando ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  Reportar Pago
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                  <CreditCard size={18} className="text-primary-600" /> Pago con tarjeta (Stripe)
                </div>
                <p className="text-slate-500 text-sm">
                  Serás redirigido a un checkout seguro de Stripe para pagar ${montoSeleccionado} USD ({periodoInfo?.nombre.toLowerCase()}).
                </p>
                <button
                  type="button"
                  onClick={pagarConStripe}
                  disabled={enviando || !plan}
                  className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {enviando ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                  Pagar con Tarjeta
                </button>
              </>
            )}
          </div>

          {esPrueba && (
            <div className="text-center">
              <a href={tenantUrl(subdominio || cliente?.schema_name || '', '/login')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-primary-600">
                <Store size={14} /> Prefiero seguir con el plan de prueba por ahora
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PagoPage(): ReactElement {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary-600" size={40} /></div>}>
      <PagoContent />
    </Suspense>
  );
}
