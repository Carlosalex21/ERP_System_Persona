"use client"; // Este archivo ya tenía "use client"

import { useState, type ReactElement } from 'react';
import { Check, HelpCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function PlanesPage(): ReactElement {
  const [esAnual, setEsAnual] = useState(false);

  // Definición de precios dinámicos
  const precioMensualEmprendedor = 15;
  const precioAnualEmprendedor = 12; // $144 al año

  const precioMensualPro = 29;
  const precioAnualPro = 24; // $288 al año

  return (
    <div className="bg-slate-50 min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Encabezado */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Planes simples y transparentes
          </h1>
          <p className="mt-4 text-xl text-slate-600">
            Elige el plan que mejor se adapte al tamaño de tu negocio. Todos los planes incluyen subdominio dedicado.
          </p>
        </div>

        {/* Selector Mensual / Anual */}
        <div className="flex justify-center items-center gap-4 mb-16">
          <span className={`font-semibold ${!esAnual ? 'text-primary-700' : 'text-slate-500'}`}>
            Facturación Mensual
          </span>
          <button 
            onClick={() => setEsAnual(!esAnual)}
            className="w-14 h-8 bg-primary-200 rounded-full p-1 transition-colors duration-300 relative focus:outline-none"
            aria-label="Cambiar tipo de facturación"
          >
            <div className={`w-6 h-6 bg-primary-700 rounded-full shadow-md transform transition-transform duration-300 ${esAnual ? 'translate-x-6 bg-accent-500' : 'translate-x-0'}`} />
          </button>
          <span className={`font-semibold flex items-center gap-2 ${esAnual ? 'text-accent-600' : 'text-slate-500'}`}>
            Facturación Anual 
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
              Ahorra 20%
            </span>
          </span>
        </div>

        {/* Tarjetas de Precios */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-24">
          
          {/* Plan Emprendedor */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Plan Emprendedor</h3>
              <p className="text-slate-500 text-sm mb-6">Ideal para tiendas independientes y profesionales independientes.</p>
              
              <div className="mb-6 flex items-baseline">
                <span className="text-5xl font-extrabold text-slate-900">
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
              className="w-full bg-primary-600 text-white text-center py-3.5 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-sm"
            >
              Seleccionar Plan Emprendedor
            </Link>
          </div>

          {/* Plan ERP Pro */}
          <div className="bg-primary-900 text-white p-8 rounded-3xl shadow-xl border-2 border-primary-700 flex flex-col justify-between relative overflow-hidden transition-all transform hover:scale-[1.02]">
            <div className="absolute top-0 right-0 bg-accent-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl tracking-wide flex items-center gap-1">
              <Sparkles size={12} /> RECOMENDADO
            </div>
            
            <div>
              <h3 className="text-2xl font-bold mb-2 text-white">Plan ERP Pro</h3>
              <p className="text-primary-200 text-sm mb-6">Para comercios en crecimiento que requieren control total y reportes avanzados.</p>
              
              <div className="mb-6 flex items-baseline">
                <span className="text-5xl font-extrabold text-white">
                  ${esAnual ? precioAnualPro : precioMensualPro}
                </span>
                <span className="text-primary-200 ml-2">/ mes</span>
              </div>
              
              {esAnual && (
                <p className="text-accent-500 text-xs font-semibold mb-6">
                  Se facturan ${precioAnualPro * 12} al año
                </p>
              )}

              <div className="border-t border-primary-800 my-6"></div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3 text-primary-100">
                  <Check className="text-accent-500 shrink-0 mt-0.5" size={18} />
                  <span>Todo lo incluido en el Plan Emprendedor</span>
                </li>
                <li className="flex items-start gap-3 text-primary-100">
                  <Check className="text-accent-500 shrink-0 mt-0.5" size={18} />
                  <span className="font-semibold text-white">Productos y categorías ilimitadas</span>
                </li>
                <li className="flex items-start gap-3 text-primary-100">
                  <Check className="text-accent-500 shrink-0 mt-0.5" size={18} />
                  <span>Módulo multialmacén y control de stocks críticos</span>
                </li>
                <li className="flex items-start gap-3 text-primary-100">
                  <Check className="text-accent-500 shrink-0 mt-0.5" size={18} />
                  <span>Panel de analíticas avanzadas y reportes de ventas</span>
                </li>
                <li className="flex items-start gap-3 text-primary-100">
                  <Check className="text-accent-500 shrink-0 mt-0.5" size={18} />
                  <span>Soporte prioritario por WhatsApp y Correo</span>
                </li>
              </ul>
            </div>

            {/* ENLACE DINÁMICO AL LOGIN */}
            <Link 
              href={`/login?plan=pro&facturacion=${esAnual ? 'anual' : 'mensual'}`} 
              className="w-full bg-accent-500 text-white text-center py-3.5 rounded-xl font-bold hover:bg-accent-600 transition-colors shadow-md"
            >
              Seleccionar Plan ERP Pro
            </Link>
          </div>

        </div>

        {/* Sección de Comparación Detallada */}
        <div className="max-w-4xl mx-auto mb-24 hidden sm:block">
          <h3 className="text-2xl font-bold text-slate-800 text-center mb-8">Comparación de características</h3>
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

        {/* Sección de Preguntas Frecuentes Corta */}
        <div id="faq" className="max-w-3xl mx-auto border-t border-slate-200 pt-16">
          <h3 className="text-3xl font-bold text-slate-900 text-center mb-10">Preguntas frecuentes sobre la suscripción</h3>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                <HelpCircle className="text-primary-600 shrink-0" size={18} />
                ¿Puedo cancelar mi suscripción en cualquier momento?
              </h4>
              <p className="text-slate-600 text-sm pl-7">
                Sí, totalmente. No tenemos cláusulas de permanencia forzosa. Si decides cancelar, mantendrás acceso al sistema hasta que finalice el periodo que ya pagaste.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                <HelpCircle className="text-primary-600 shrink-0" size={18} />
                ¿El subdominio tiene algún costo extra?
              </h4>
              <p className="text-slate-600 text-sm pl-7">
                No, el subdominio `tunombre.erpsystem.com` está 100% incluido de forma gratuita en cualquiera de nuestros planes operativos.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                <HelpCircle className="text-primary-600 shrink-0" size={18} />
                ¿Cómo se reciben los PDFs de las órdenes?
              </h4>
              <p className="text-slate-600 text-sm pl-7">
                Cuando tus compradores finales cierran el pedido desde tu catálogo, el sistema genera automáticamente un formato limpio del pedido y abre el WhatsApp del cliente con el texto y link listo para que te lo envíe con un solo toque.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}