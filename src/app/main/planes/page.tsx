"use client"; // Este archivo ya tenía "use client"

import { useState, useEffect, type ReactElement } from 'react';
import { Check, HelpCircle, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getPlanesPublicos } from '@/services/platformBillingService';
import { Plan } from '@/types/api';
import Reveal from '@/components/marketing/Reveal';

/** Descuento anual mostrado en la UI (no hay un precio anual real en el backend todavía). */
const DESCUENTO_ANUAL = 0.2;

export default function PlanesPage(): ReactElement {
  const [esAnual, setEsAnual] = useState(false);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    getPlanesPublicos()
      .then(setPlanes)
      .catch(() => setPlanes([]))
      .finally(() => setCargando(false));
  }, []);

  const planEmprendedor = planes.find((p) => p.slug === 'emprendedor');
  const planPro = planes.find((p) => p.slug === 'pro');

  const precioMensualEmprendedor = planEmprendedor ? parseFloat(planEmprendedor.precio) : 15;
  const precioAnualEmprendedor = Math.round(precioMensualEmprendedor * (1 - DESCUENTO_ANUAL));

  const precioMensualPro = planPro ? parseFloat(planPro.precio) : 29;
  const precioAnualPro = Math.round(precioMensualPro * (1 - DESCUENTO_ANUAL));

  if (cargando) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

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
              Elige el plan que mejor se adapte al tamaño de tu negocio. Todos los planes incluyen subdominio dedicado.
            </p>
          </Reveal>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
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

        {/* Tarjetas de Precios */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-24">

          {/* Plan Emprendedor */}
          <Reveal from="left">
            <div className="h-full bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
              <div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Plan Emprendedor</h3>
                <p className="text-slate-500 text-sm mb-6">Ideal para tiendas independientes y profesionales independientes.</p>

                <div className="mb-6 flex items-baseline">
                  <span className="font-display text-6xl font-black text-slate-900">
                    ${esAnual ? precioAnualEmprendedor : precioMensualEmprendedor}
                  </span>
                  <span className="text-slate-500 ml-2">/ mes</span>
                </div>

                {esAnual && (
                  <p className="text-green-600 text-xs font-semibold mb-6">
                    Se facturan ${precioAnualEmprendedor * 12} al año
                  </p>
                )}

                <div className="border-t border-slate-100 my-6"></div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3 text-slate-600">
                    <Check className="text-primary-600 shrink-0 mt-0.5" size={18} />
                    <span>Subdominio personalizado (ej: tuempresa.erpsystem.com)</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-600">
                    <Check className="text-primary-600 shrink-0 mt-0.5" size={18} />
                    <span>Catálogo web público optimizado para móviles</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-600">
                    <Check className="text-primary-600 shrink-0 mt-0.5" size={18} />
                    <span>Pedidos ilimitados enviados directamente a tu WhatsApp</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-600">
                    <Check className="text-primary-600 shrink-0 mt-0.5" size={18} />
                    <span>Módulo de Inventario Básico (Hasta 100 productos)</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-600">
                    <Check className="text-primary-600 shrink-0 mt-0.5" size={18} />
                    <span>Facturación no fiscal / Control de Órdenes internas</span>
                  </li>
                </ul>
              </div>

              {/* ENLACE DINÁMICO AL LOGIN */}
              <Link
                href={`/login?plan=emprendedor&facturacion=${esAnual ? 'anual' : 'mensual'}`}
                className="group w-full bg-slate-900 text-white text-center py-3.5 rounded-full font-bold hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                Seleccionar plan <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>

          {/* Plan ERP Pro */}
          <Reveal from="right" delay={0.1}>
            <div className="h-full bg-ink-950 text-white p-8 rounded-3xl shadow-2xl shadow-ink-950/20 border-2 border-primary-700 flex flex-col justify-between relative overflow-hidden transition-all hover:-translate-y-1">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary-600 rounded-full blur-[80px] opacity-40" />
              <div className="absolute top-0 right-0 bg-accent-400 text-ink-950 text-xs font-bold px-4 py-1.5 rounded-bl-2xl tracking-wide flex items-center gap-1 z-10">
                <Sparkles size={12} /> RECOMENDADO
              </div>

              <div className="relative z-10">
                <h3 className="text-2xl font-black mb-2 text-white">Plan ERP Pro</h3>
                <p className="text-slate-400 text-sm mb-6">Para comercios en crecimiento que requieren control total y reportes avanzados.</p>

                <div className="mb-6 flex items-baseline">
                  <span className="font-display text-6xl font-black text-white">
                    ${esAnual ? precioAnualPro : precioMensualPro}
                  </span>
                  <span className="text-slate-400 ml-2">/ mes</span>
                </div>

                {esAnual && (
                  <p className="text-accent-400 text-xs font-semibold mb-6">
                    Se facturan ${precioAnualPro * 12} al año
                  </p>
                )}

                <div className="border-t border-white/10 my-6"></div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3 text-slate-300">
                    <Check className="text-accent-400 shrink-0 mt-0.5" size={18} />
                    <span>Todo lo incluido en el Plan Emprendedor</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-300">
                    <Check className="text-accent-400 shrink-0 mt-0.5" size={18} />
                    <span className="font-semibold text-white">Productos y categorías ilimitadas</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-300">
                    <Check className="text-accent-400 shrink-0 mt-0.5" size={18} />
                    <span>Módulo multialmacén y control de stocks críticos</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-300">
                    <Check className="text-accent-400 shrink-0 mt-0.5" size={18} />
                    <span>Panel de analíticas avanzadas y reportes de ventas</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-300">
                    <Check className="text-accent-400 shrink-0 mt-0.5" size={18} />
                    <span>Soporte prioritario por WhatsApp y Correo</span>
                  </li>
                </ul>
              </div>

              {/* ENLACE DINÁMICO AL LOGIN */}
              <Link
                href={`/login?plan=pro&facturacion=${esAnual ? 'anual' : 'mensual'}`}
                className="group w-full bg-accent-400 text-ink-950 text-center py-3.5 rounded-full font-bold hover:bg-accent-300 transition-colors shadow-md relative z-10 flex items-center justify-center gap-2"
              >
                Seleccionar plan <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>

        </div>

        {/* Sección de Comparación Detallada */}
        <Reveal>
          <div className="max-w-4xl mx-auto mb-24 hidden sm:block">
            <h3 className="font-display font-extrabold text-3xl text-slate-900 text-center mb-10 uppercase">Cara a cara</h3>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                    <th className="p-4 pl-6">Módulos Básicos</th>
                    <th className="p-4 text-center">Emprendedor</th>
                    <th className="p-4 text-center">ERP Pro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="p-4 pl-6 font-medium text-slate-800">Catálogo Web Autogestionable</td>
                    <td className="p-4 text-center text-primary-600">✓</td>
                    <td className="p-4 text-center text-primary-600">✓</td>
                  </tr>
                  <tr>
                    <td className="p-4 pl-6 font-medium text-slate-800">Pedidos directo a WhatsApp</td>
                    <td className="p-4 text-center text-primary-600">✓</td>
                    <td className="p-4 text-center text-primary-600">✓</td>
                  </tr>
                  <tr>
                    <td className="p-4 pl-6 font-medium text-slate-800">Límite de Productos en Stock</td>
                    <td className="p-4 text-center">Hasta 100</td>
                    <td className="p-4 text-center font-semibold text-primary-700">Ilimitados</td>
                  </tr>
                  <tr>
                    <td className="p-4 pl-6 font-medium text-slate-800">Facturación No Fiscal (Órdenes de Compra)</td>
                    <td className="p-4 text-center text-primary-600">✓</td>
                    <td className="p-4 text-center text-primary-600">✓</td>
                  </tr>
                  <tr>
                    <td className="p-4 pl-6 font-medium text-slate-800">Gestión de Múltiples Almacenes</td>
                    <td className="p-4 text-center text-slate-300">✕</td>
                    <td className="p-4 text-center text-primary-600">✓</td>
                  </tr>
                  <tr>
                    <td className="p-4 pl-6 font-medium text-slate-800">Reportes de Ventas y Finanzas</td>
                    <td className="p-4 text-center text-slate-300">Básico</td>
                    <td className="p-4 text-center font-semibold text-primary-700">Avanzado</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

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
                q: '¿Cómo se reciben los PDFs de las órdenes?',
                a: 'Cuando tus compradores finales cierran el pedido desde tu catálogo, el sistema genera automáticamente un formato limpio del pedido y abre el WhatsApp del cliente con el texto y link listo para que te lo envíe con un solo toque.',
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
