"use client";

/**
 * @file Gestión del plan/suscripción DESDE el propio panel del tenant.
 *
 * Antes, el único lugar para ver el plan actual, días restantes y pagar era
 * `/pago` en el dominio raíz -- lo que obligaba a iniciar sesión otra vez
 * como "el dueño" (una identidad separada del login del panel, en un
 * esquema de base de datos distinto). Esa segunda sesión nunca viajaba sola
 * entre `prueba2.localhost` y `localhost` (los navegadores modernos no
 * dejan compartir cookies entre subdominios de `.localhost`), así que el
 * botón terminaba en la pantalla de login sin explicación.
 *
 * Esta página resuelve lo mismo sin cruzar de dominio: usa la sesión que ya
 * existe en el panel (`useSession`) y pega contra los endpoints
 * `/tenants/...` expuestos también en el urlconf del tenant (ver
 * `backend/urls_tenants.py` y `CrearPagoSuscripcionDesdeAdminView`).
 */
import { useState, useEffect, useMemo, Suspense, type ReactElement } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Loader2, CreditCard, Smartphone, Copy, Check, ShieldCheck, Clock,
  Sparkles, TrendingUp, TrendingDown, CalendarCheck2, CreditCard as CardIcon, ClipboardCopy, Receipt,
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useSession } from '@/context/SessionContext';
import {
  getPlanesPublicos, getPlatformPaymentInfo, getPeriodosSuscripcion, crearPagoSuscripcionDesdeAdmin,
  getTasaBcvPlataforma,
} from '@/services/platformBillingService';
import { Plan, PlatformPaymentInfo, MetodoPagoSuscripcion, PeriodoSuscripcion, PeriodoSuscripcionInfo } from '@/types/api';
import { PageHeader, Card, Stagger, StaggerItem } from '@/components/ui';
import { beneficiosDePlan } from '@/utils/planes';

function parseFechaISO(fechaStr: string): Date {
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function calcularFechaVencimiento(fechaFinActual: string | null | undefined, estadoActual: string | null | undefined, dias: number): Date {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  let base = hoy;
  if (estadoActual === 'activa' && fechaFinActual) {
    const fin = parseFechaISO(fechaFinActual);
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

function SuscripcionAdminContent(): ReactElement {
  const { tenant, isLoading: cargandoSesion, refetchTenant } = useSession();
  const searchParams = useSearchParams();
  const stripeResultado = searchParams.get('stripe');

  const [cargando, setCargando] = useState(true);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoSuscripcionInfo[]>([]);
  const [pagoInfo, setPagoInfo] = useState<PlatformPaymentInfo | null>(null);
  const [tasaBcv, setTasaBcv] = useState<number | null>(null);
  const [planSeleccionadoId, setPlanSeleccionadoId] = useState<number | null>(null);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<PeriodoSuscripcion>('mensual');
  const [metodoManual, setMetodoManual] = useState<'pago_movil' | 'zelle'>('pago_movil');
  const [referencia, setReferencia] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pagoEnviado, setPagoEnviado] = useState(false);

  const sub = tenant?.subscription_status;

  useEffect(() => {
    if (cargandoSesion) return;
    (async () => {
      try {
        const [planesData, periodosData, info] = await Promise.all([
          // Solo los planes del módulo con el que se registró el negocio.
          getPlanesPublicos(tenant?.tipo_negocio),
          getPeriodosSuscripcion(),
          getPlatformPaymentInfo(),
        ]);
        setPagoInfo(info);
        setPeriodos(periodosData);

        const planesComprables = planesData.filter((p) => p.activo && p.nombre !== 'Plan de Prueba');
        setPlanes(planesComprables);

        const planActualComprable = sub?.plan_id ? planesComprables.find((p) => p.id === sub.plan_id) : undefined;
        const preseleccion = planActualComprable || planesComprables[0] || null;
        setPlanSeleccionadoId(preseleccion?.id ?? null);
      } catch {
        toast.error('No se pudieron cargar los planes disponibles.');
      } finally {
        setCargando(false);
      }

      // Tasa BCV para el equivalente en Bs -- solo aplica a Pago Móvil
      // (Venezuela); si la fuente externa falla, simplemente no se muestra
      // el equivalente (el monto en USD sigue siendo válido y copiable).
      if (tenant?.pais_codigo === 'VE') {
        getTasaBcvPlataforma()
          .then((r) => setTasaBcv(r.tasa ? parseFloat(r.tasa) : null))
          .catch(() => setTasaBcv(null));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargandoSesion]);

  const esVenezuela = tenant?.pais_codigo === 'VE';
  const esPrueba = sub?.es_prueba ?? true;
  const tienePlanPago = (sub?.is_active ?? false) && !esPrueba;
  const diasRestantes = sub?.dias_restantes ?? null;

  const periodoInfo = periodos.find((p) => p.codigo === periodoSeleccionado);
  const plan = planes.find((p) => p.id === planSeleccionadoId) || null;
  const esRenovacion = !!sub?.plan_id && !!plan && sub.plan_id === plan.id;
  const montoSeleccionado = plan ? calcularMontoPeriodo(parseFloat(plan.precio), periodoInfo) : 0;
  // Equivalente en Bs. a la tasa BCV del día -- Pago Móvil solo admite
  // bolívares y antes el tenant tenía que calcularlo por su cuenta.
  const montoBs = tasaBcv ? Math.round(montoSeleccionado * tasaBcv * 100) / 100 : null;

  const diferenciaVsPlanActual = useMemo(() => {
    if (!plan || !sub?.plan_precio || esPrueba) return null;
    const diff = parseFloat(plan.precio) - parseFloat(sub.plan_precio);
    return Math.round(diff * 100) / 100;
  }, [plan, sub, esPrueba]);

  const fechaVencimientoEstimada = useMemo(() => {
    if (!periodoInfo) return null;
    return calcularFechaVencimiento(sub?.fecha_fin, sub?.estado, periodoInfo.dias);
  }, [sub, periodoInfo]);
  const fechaVencimientoTexto = fechaVencimientoEstimada?.toLocaleDateString('es-VE', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const pagarManual = async (): Promise<void> => {
    if (!plan) return;
    if (!referencia.trim()) {
      toast.error('Ingresa el número de referencia del pago.');
      return;
    }
    setEnviando(true);
    try {
      await crearPagoSuscripcionDesdeAdmin({
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
    if (!plan) return;
    setEnviando(true);
    try {
      const res = await crearPagoSuscripcionDesdeAdmin({
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

  if (cargandoSesion || cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  if (pagoEnviado) {
    return (
      <div className="max-w-xl mx-auto bg-white p-10 rounded-3xl shadow-sm border border-slate-200 space-y-6 text-center animate-scale-in">
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center border bg-amber-50 text-amber-600 border-amber-200">
          <Clock size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pago en revisión</h2>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
            Recibimos tu reporte de pago. Lo confirmaremos manualmente y tu suscripción se activará en breve.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setPagoEnviado(false); refetchTenant(); }}
          className="inline-flex items-center gap-2 bg-primary-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-primary-700 transition-colors"
        >
          Volver a mi plan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        icon={<Receipt size={20} />}
        title="Tu suscripción"
        description="Gestiona tu plan, renueva o cambia de período de facturación."
      />
      {stripeResultado === 'cancel' && (
        <p className="text-amber-600 text-xs font-bold -mt-4">Cancelaste el pago con tarjeta. Puedes intentarlo de nuevo cuando quieras.</p>
      )}

      {/* --- Estado actual --- */}
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Tu plan actual</p>
          <p className="text-lg font-black text-slate-900">
            {sub?.plan_nombre || 'Sin plan'}
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
      </Card>

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
      <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {planes.map((p) => {
          const esActual = sub?.plan_id === p.id;
          const monto = calcularMontoPeriodo(parseFloat(p.precio), periodoInfo);
          const diff = sub?.plan_precio && !esPrueba ? Math.round((parseFloat(p.precio) - parseFloat(sub.plan_precio)) * 100) / 100 : null;
          const seleccionado = planSeleccionadoId === p.id;
          return (
            <StaggerItem key={p.id} className="h-full">
            <button
              type="button"
              onClick={() => setPlanSeleccionadoId(p.id)}
              className={`w-full h-full text-left p-5 rounded-2xl border-2 transition-all relative bg-white ${
                seleccionado ? 'border-primary-500 bg-primary-50/40 shadow-md' : 'border-slate-200 hover:border-slate-300'
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
                {beneficiosDePlan(p, tenant?.tipo_negocio).map((b) => (
                  <li key={b} className="flex items-start gap-2 text-xs text-slate-600">
                    <Check className="text-primary-600 shrink-0 mt-0.5" size={13} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </button>
            </StaggerItem>
          );
        })}
      </Stagger>

      {/* --- Panel de pago --- */}
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <Card className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700">
              {esRenovacion ? 'Renovar' : 'Contratar'} {plan?.nombre}
            </p>
            <p className="text-lg font-black text-slate-900">${montoSeleccionado} <span className="text-xs font-medium text-slate-400">/ {periodoInfo?.nombre.toLowerCase()}</span></p>
          </div>
          {!esRenovacion && diferenciaVsPlanActual !== null && diferenciaVsPlanActual !== 0 && (
            <p className="text-xs text-slate-500">
              {diferenciaVsPlanActual > 0
                ? `Este plan cuesta $${diferenciaVsPlanActual.toFixed(2)} más al mes que tu plan actual (${sub?.plan_nombre}).`
                : `Este plan cuesta $${Math.abs(diferenciaVsPlanActual).toFixed(2)} menos al mes que tu plan actual (${sub?.plan_nombre}).`}
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
                  <CampoCopiable etiqueta="Monto (USD, referencia)" valor={`$${montoSeleccionado}`} />
                  <CampoCopiable
                    etiqueta="Monto a pagar en Bs. (tasa BCV del día)"
                    valor={montoBs !== null ? `Bs. ${montoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : 'Tasa no disponible'}
                  />
                  {tasaBcv && (
                    <p className="text-[11px] text-slate-400 text-right">Tasa BCV: 1 USD = {tasaBcv.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.</p>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      copiar(
                        `Banco: ${pagoInfo?.pago_movil_banco || ''}\n` +
                        `Cédula/RIF: ${pagoInfo?.pago_movil_cedula || ''}\n` +
                        `Teléfono: ${pagoInfo?.pago_movil_telefono || ''}\n` +
                        `Monto: Bs. ${montoBs !== null ? montoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }) : `(equivalente a $${montoSeleccionado}, tasa no disponible)`}`,
                      )
                    }
                    className="w-full flex items-center justify-center gap-2 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg py-2 transition-colors"
                  >
                    <ClipboardCopy size={14} /> Copiar todos los datos para pegar en el banco
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <CampoCopiable etiqueta="Email Zelle" valor={pagoInfo?.zelle_email || ''} />
                  <CampoCopiable etiqueta="Titular" valor={pagoInfo?.zelle_titular || ''} />
                  <CampoCopiable etiqueta="Monto" valor={`$${montoSeleccionado} USD`} />
                  <button
                    type="button"
                    onClick={() =>
                      copiar(
                        `Email Zelle: ${pagoInfo?.zelle_email || ''}\n` +
                        `Titular: ${pagoInfo?.zelle_titular || ''}\n` +
                        `Monto: $${montoSeleccionado} USD`,
                      )
                    }
                    className="w-full flex items-center justify-center gap-2 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg py-2 transition-colors"
                  >
                    <ClipboardCopy size={14} /> Copiar todos los datos
                  </button>
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

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={pagarManual}
                disabled={enviando || !plan}
                className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {enviando ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                Reportar Pago
              </motion.button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                <CardIcon size={18} className="text-primary-600" /> Pago con tarjeta (Stripe)
              </div>
              <p className="text-slate-500 text-sm">
                Serás redirigido a un checkout seguro de Stripe para pagar ${montoSeleccionado} USD ({periodoInfo?.nombre.toLowerCase()}).
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={pagarConStripe}
                disabled={enviando || !plan}
                className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {enviando ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                Pagar con Tarjeta
              </motion.button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function SuscripcionAdminPage(): ReactElement {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary-600" size={32} /></div>}>
      <SuscripcionAdminContent />
    </Suspense>
  );
}
