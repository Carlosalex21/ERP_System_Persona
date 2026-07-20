import { ArrowRight, Store, Smartphone, BarChart3, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div>
      {/* 1. HERO SECTION (Sección Principal) */}
      <section className="relative bg-gradient-to-b from-primary-50 to-white pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
            Lleva tu negocio al <span className="text-primary-600">siguiente nivel</span>
          </h1>
          <p className="mt-4 text-xl text-slate-600 max-w-3xl mx-auto mb-10">
            Obtén tu propio enlace personalizado, sube tu catálogo, gestiona tu inventario 
            y recibe los pedidos de tus clientes directamente en tu WhatsApp. Todo en un solo lugar.
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

      {/* 2. SECCIÓN DE CARACTERÍSTICAS */}
      <section id="caracteristicas" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-primary-900">Todo lo que necesitas para vender más</h2>
            <p className="mt-4 text-lg text-slate-500">Diseñado para ser fácil de usar, tanto para ti como para tus clientes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Tarjeta 1 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center mb-6">
                <Store size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Subdominio Propio</h3>
              <p className="text-slate-600">Tu tienda vivirá en <span className="font-semibold text-primary-600">tumarca.erpsystem.com</span>, dándote presencia profesional al instante.</p>
            </div>

            {/* Tarjeta 2 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6">
                <Smartphone size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Pedidos por WhatsApp</h3>
              <p className="text-slate-600">Tus clientes arman su carrito y te envían la orden lista y formateada directo a tu WhatsApp.</p>
            </div>

            {/* Tarjeta 3 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-accent-100 text-accent-600 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Control de Inventario</h3>
              <p className="text-slate-600">Panel administrativo privado para gestionar tu stock, crear facturas proforma y ver tus ventas.</p>
            </div>

            {/* Tarjeta 4 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">100% Seguro</h3>
              <p className="text-slate-600">Tus datos están aislados y seguros. Nadie más tiene acceso a tu inventario ni a tu lista de clientes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECCIÓN CALL TO ACTION (Llamado a la acción final) */}
      <section className="bg-primary-900 py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-primary-800 blur-3xl opacity-50"></div>
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