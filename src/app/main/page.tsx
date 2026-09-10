import { ArrowRight, Store, Smartphone, BarChart3, ShieldCheck, Zap, Package, MessageCircle, Globe } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-slate-50 text-slate-900">
      {/* 1. HERO */}
      <section className="relative bg-gradient-to-b from-primary-50 to-white pt-20 pb-28 overflow-hidden">
        <div className="absolute top-10 -left-24 w-72 h-72 bg-primary-100 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-0 -right-24 w-72 h-72 bg-accent-100 rounded-full blur-3xl opacity-30" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="inline-flex items-center gap-2 bg-white border border-primary-100 text-primary-700 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm mb-6">
            <Zap size={14} /> Tu tienda online lista en minutos
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Lleva tu negocio al <span className="text-primary-600">siguiente nivel</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto mb-10">
            Obtén tu propio enlace personalizado, sube tu catálogo, gestiona tu inventario
            y recibe los pedidos de tus clientes. Todo en un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/planes" className="bg-primary-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary-700 shadow-lg shadow-primary-500/30 transition-all flex items-center justify-center gap-2">
              Ver Planes y Precios <ArrowRight size={20} />
            </Link>
            <Link href="#caracteristicas" className="bg-white text-primary-700 border-2 border-primary-100 px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary-50 transition-all flex items-center justify-center">
              ¿Cómo funciona?
            </Link>
          </div>
        </div>
      </section>

      {/* 2. CARACTERÍSTICAS */}
      <section id="caracteristicas" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-primary-900">Todo lo que necesitas para vender más</h2>
            <p className="mt-4 text-lg text-slate-500">Diseñado para ser fácil de usar, tanto para ti como para tus clientes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard icon={<Store size={32} />} color="bg-primary-100 text-primary-600" title="Subdominio Propio" desc="Tu tienda vivirá en tumarca.erpsystem.com, dándote presencia profesional al instante." />
            <FeatureCard icon={<Smartphone size={32} />} color="bg-green-100 text-green-600" title="Pedidos por WhatsApp" desc="Tus clientes arman su carrito y te envían la orden formateada directo a tu WhatsApp." />
            <FeatureCard icon={<BarChart3 size={32} />} color="bg-accent-100 text-accent-600" title="Control de Inventario" desc="Panel privado para gestionar stock, facturas y ver tus ventas en tiempo real." />
            <FeatureCard icon={<Package size={32} />} color="bg-sky-100 text-sky-600" title="Catálogo autogestionable" desc="Carga productos, variantes y categorías sin límites y publica al instante." />
            <FeatureCard icon={<MessageCircle size={32} />} color="bg-emerald-100 text-emerald-600" title="Notificaciones de pedidos" desc="Recibe avisos cada vez que un cliente finaliza una compra en tu tienda." />
            <FeatureCard icon={<ShieldCheck size={32} />} color="bg-slate-100 text-slate-600" title="100% Seguro" desc="Tus datos están aislados y seguros. Nadie más tiene acceso a tu información." />
          </div>
        </div>
      </section>

      {/* 3. CÓMO FUNCIONA */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Comienza en 3 simples pasos</h2>
            <p className="mt-4 text-lg text-slate-500">Sin conocimientos técnicos.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard numero="1" icon={<Globe size={24} />} titulo="Elige tu plan" desc="Selecciona el plan que mejor se adapte a tu negocio." />
            <StepCard numero="2" icon={<Store size={24} />} titulo="Elige tu modelo" desc="Detallista (retail) o mayorista/fabricante (B2B)." />
            <StepCard numero="3" icon={<Package size={24} />} titulo="Sube tu catálogo" desc="Carga productos y publica tu tienda con tu subdominio." />
          </div>
        </div>
      </section>

      {/* 4. CTA FINAL */}
      <section className="bg-primary-900 py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-primary-800 blur-3xl opacity-50" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">¿Listo para digitalizar tus ventas?</h2>
          <p className="text-xl text-primary-200 mb-10">
            Únete a otros comercios que ya están ahorrando tiempo y aumentando sus ventas.
          </p>
          <Link href="/planes" className="inline-block bg-accent-500 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-accent-600 shadow-xl shadow-accent-500/20 transition-transform transform hover:scale-105">
            Crear mi tienda ahora
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, color, title, desc }: { icon: React.ReactNode; color: string; title: string; desc: string }) {
  return (
    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-xl transition-all hover:-translate-y-1">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${color}`}>{icon}</div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600">{desc}</p>
    </div>
  );
}

function StepCard({ numero, icon, titulo, desc }: { numero: string; icon: React.ReactNode; titulo: string; desc: string }) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center relative">
      <span className="absolute top-4 right-4 text-4xl font-black text-slate-100">{numero}</span>
      <div className="w-14 h-14 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center mx-auto mb-6">{icon}</div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{titulo}</h3>
      <p className="text-sm text-slate-500">{desc}</p>
    </div>
  );
}
