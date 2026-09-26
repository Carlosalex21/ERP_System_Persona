"use client";

import { useState, useEffect, useCallback, Suspense, type ReactElement } from 'react';
import { Check, HelpCircle, Loader2, Sparkles, ArrowRight, Store, Building, UtensilsCrossed, FlaskConical, Wrench, Calculator } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getPlanesPublicos } from '@/services/platformBillingService';
import { Plan } from '@/types/api';
import Reveal from '@/components/marketing/Reveal';
import { resumenModulosPlan } from '@/utils/planes';

/** Descuento anual mostrado en la UI (no hay un precio anual real en el backend todavía). */
const DESCUENTO_ANUAL = 0.2;

type TipoNegocio = 'retail' | 'b2b' | 'restaurante' | 'farmacia' | 'servicios' | 'contador';

const TIPOS_NEGOCIO: { valor: TipoNegocio; etiqueta: string; icon: typeof Store }[] = [
  { valor: 'retail', etiqueta: 'Tienda al Detal', icon: Store },
  { valor: 'restaurante', etiqueta: 'Restaurante', icon: UtensilsCrossed },
  { valor: 'farmacia', etiqueta: 'Farmacia', icon: FlaskConical },
  { valor: 'servicios', etiqueta: 'Taller/Servicios', icon: Wrench },
  { valor: 'contador', etiqueta: 'Contador', icon: Calculator },
  { valor: 'b2b', etiqueta: 'Mayorista', icon: Building },
];

function PlanesContent(): ReactElement {
  const searchParams = useSearchParams();
  const tipoInicial = searchParams.get('negocio') as TipoNegocio | null;

  const [esAnual, setEsAnual] = useState(false);
  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio | null>(tipoInicial);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarPlanes = useCallback(async (tipo: TipoNegocio | null) => {
    setCargando(true);
    try {
      setPlanes(await getPlanesPublicos(tipo || undefined));
    } catch {
      setPlanes([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarPlanes(tipoNegocio); }, [tipoNegocio, cargarPlanes]);

  const planesOrdenados = [...planes].sort((a, b) => parseFloat(a.precio) - parseFloat(b.precio));
  // El plan más caro se destaca visualmente -- si solo hay uno, no se destaca nada.
  const idPlanDestacado = planesOrdenados.length > 1 ? planesOrdenados[planesOrdenados.length - 1].id : null;

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Encabezado -- banda oscura a juego con el home, para que el sitio
          se sienta como un solo lenguaje visual, no páginas sueltas. */}
      <div className="relative bg-ink-950 pt-20 pb-28 overflow-hidden bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:44px_44px]">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-primary-600 rounded-full blur-[130px] opacity-25" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <Reveal from="down">
            <span className="inline-block bg-white/5 border border-white/10 text-slate-300 text-[11px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
              Precios simples
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="font-display font-black text-6xl sm:text-7xl leading-[0.88] text-white uppercase">
              Un plan <span className="text-accent-400">justo</span>
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 text-lg text-slate-400">
              Elige el plan que mejor se adapte al tipo y tamaño de tu negocio. Todos los planes incluyen subdominio dedicado.
            </p>
          </Reveal>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        {/* Selector de tipo de negocio -- cada vertical tiene su propia oferta y precio. */}
        <Reveal delay={0.15}>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {TIPOS_NEGOCIO.map(({ valor, etiqueta, icon: Icon }) => (
              <button
                key={valor}
                onClick={() => setTipoNegocio(valor === tipoNegocio ? null : valor)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors ${
                  tipoNegocio === valor
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                <Icon size={15} /> {etiqueta}
              </button>
            ))}
          </div>
        </Reveal>

        {/* Selector Mensual / Anual */}
        <Reveal delay={0.2}>
          <div className="flex justify-center items-center gap-4 mb-12 bg-white rounded-full border border-slate-200 shadow-lg shadow-slate-900/5 p-2 w-fit mx-auto">
            <button
              onClick={() => setEsAnual(false)}
              className={`px-5 py-2.5 rounded-full font-bold text-sm transition-colors ${!esAnual ? 'bg-primary-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Mensual
            </button>
            <button
              onClick={() => setEsAnual(true)}
              className={`px-5 py-2.5 rounded-full font-bold text-sm transition-colors flex items-center gap-2 ${esAnual ? 'bg-primary-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Anual
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${esAnual ? 'bg-accent-400 text-ink-950' : 'bg-green-100 text-green-700'}`}>
                -20%
              </span>
            </button>
          </div>
        </Reveal>

        {/* Tarjetas de Precios -- dinámicas: tantas como planes activos apliquen al tipo de negocio elegido. */}
        {cargando ? (
          <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary-600" size={32} /></div>
        ) : planesOrdenados.length === 0 ? (
          <div className="text-center py-24 text-slate-400">Todavía no hay planes configurados para este tipo de negocio.</div>
        ) : (
          <div className={`grid gap-8 mx-auto mb-24 ${planesOrdenados.length === 1 ? 'max-w-md' : planesOrdenados.length === 2 ? 'md:grid-cols-2 max-w-4xl' : 'md:grid-cols-3 max-w-6xl'}`}>
            {planesOrdenados.map((plan, i) => {
              const destacado = plan.id === idPlanDestacado;
              const precioMensual = parseFloat(plan.precio);
              const precioAnual = Math.round(precioMensual * (1 - DESCUENTO_ANUAL));
              const caracteristicas = [
                ...plan.descripcion.split('\n').map((l) => l.trim()).filter(Boolean),
                ...resumenModulosPlan(plan, tipoNegocio),
              ];

              return (
                <Reveal key={plan.id} from={i % 2 === 0 ? 'left' : 'right'} delay={i * 0.1}>
                  <div className={`h-full p-8 rounded-3xl flex flex-col justify-between relative overflow-hidden transition-all hover:-translate-y-1 ${
                    destacado
                      ? 'bg-ink-950 text-white shadow-2xl shadow-ink-950/20 border-2 border-primary-700'
                      : 'bg-white shadow-sm border border-slate-200 hover:shadow-xl'
                  }`}>
                    {destacado && (
                      <>
                        <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary-600 rounded-full blur-[80px] opacity-40" />
                        <div className="absolute top-0 right-0 bg-accent-400 text-ink-950 text-xs font-bold px-4 py-1.5 rounded-bl-2xl tracking-wide flex items-center gap-1 z-10">
                          <Sparkles size={12} /> RECOMENDADO
                        </div>
                      </>
                    )}

                    <div className="relative z-10">
                      <h3 className={`text-2xl font-black mb-2 ${destacado ? 'text-white' : 'text-slate-900'}`}>{plan.nombre}</h3>

                      <div className="mb-6 flex items-baseline">
                        <span className={`font-display text-6xl font-black ${destacado ? 'text-white' : 'text-slate-900'}`}>
                          ${esAnual ? precioAnual : precioMensual}
                        </span>
                        <span className={`ml-2 ${destacado ? 'text-slate-400' : 'text-slate-500'}`}>/ mes</span>
                      </div>

                      {esAnual && (
                        <p className={`text-xs font-semibold mb-6 ${destacado ? 'text-accent-400' : 'text-green-600'}`}>
                          Se facturan ${precioAnual * 12} al año
                        </p>
                      )}

                      <div className={`border-t my-6 ${destacado ? 'border-white/10' : 'border-slate-100'}`}></div>

                      <ul className="space-y-4 mb-8">
                        {caracteristicas.length > 0 ? caracteristicas.map((c) => (
                          <li key={c} className={`flex items-start gap-3 ${destacado ? 'text-slate-300' : 'text-slate-600'}`}>
                            <Check className={destacado ? 'text-accent-400 shrink-0 mt-0.5' : 'text-primary-600 shrink-0 mt-0.5'} size={18} />
                            <span>{c}</span>
                          </li>
                        )) : (
                          <li className={destacado ? 'text-slate-400 text-sm' : 'text-slate-400 text-sm'}>
                            Hasta {plan.limite_usuarios} usuarios · {plan.limite_sucursales} sucursal(es)
                            {plan.limite_productos ? ` · ${plan.limite_productos} productos` : ' · productos ilimitados'}
                          </li>
                        )}
                      </ul>
                    </div>

                    <Link
                      href={`/login?plan=${plan.slug || plan.id}&facturacion=${esAnual ? 'anual' : 'mensual'}${tipoNegocio ? `&negocio=${tipoNegocio}` : ''}`}
                      className={`group w-full text-center py-3.5 rounded-full font-bold transition-colors shadow-sm flex items-center justify-center gap-2 relative z-10 ${
                        destacado ? 'bg-accent-400 text-ink-950 hover:bg-accent-300 shadow-md' : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      Seleccionar plan <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}

        {/* Sección de Preguntas Frecuentes Corta */}
        <div id="faq" className="max-w-3xl mx-auto border-t border-slate-200 pt-16 pb-24">
          <Reveal>
            <h3 className="font-display font-extrabold text-3xl text-slate-900 text-center mb-10 uppercase">Preguntas frecuentes</h3>
          </Reveal>
          <div className="space-y-6">
            {[
              {
                q: '¿Puedo cancelar mi suscripción en cualquier momento?',
                a: 'Sí, totalmente. No tenemos cláusulas de permanencia forzosa. Si decides cancelar, mantendrás acceso al sistema hasta que finalice el periodo que ya pagaste.',
              },
              {
                q: '¿El subdominio tiene algún costo extra?',
                a: 'No, el subdominio `tunombre.erpsystem.com` está 100% incluido de forma gratuita en cualquiera de nuestros planes operativos.',
              },
              {
                q: '¿Los planes son distintos según mi tipo de negocio?',
                a: 'Sí -- un restaurante, una farmacia, un taller de servicios o un contador tienen necesidades y módulos distintos, así que cada uno tiene su propia oferta de planes y precios. Elige tu tipo de negocio arriba para ver los que te corresponden.',
              },
            ].map((item, i) => (
              <Reveal key={item.q} delay={i * 0.06}>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <HelpCircle className="text-primary-600 shrink-0" size={18} />
                    {item.q}
                  </h4>
                  <p className="text-slate-600 text-sm pl-7">{item.a}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function PlanesPage(): ReactElement {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary-600" size={32} /></div>}>
      <PlanesContent />
    </Suspense>
  );
}
