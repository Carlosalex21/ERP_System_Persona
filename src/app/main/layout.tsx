import Link from 'next/link';
import CookieConsent from '@/components/CookieConsent';
import MarketingNav from '@/components/marketing/MarketingNav';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900">
      <MarketingNav />

      {/* Aquí se renderizará el contenido de cada página (Landing, Precios, Login) */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Pie de Página (Footer) */}
      <footer className="bg-ink-950 text-slate-400 pt-16 pb-10 border-t border-white/5 relative overflow-hidden">
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] bg-primary-700 rounded-full blur-[140px] opacity-20 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-12">
            <div>
              <span className="font-display text-3xl font-extrabold text-white tracking-tight mb-4 block uppercase">
                ERP<span className="text-accent-400">System</span>
              </span>
              <p className="text-sm max-w-xs">
                La plataforma todo-en-uno para gestionar tu inventario y vender por WhatsApp con tu propio subdominio.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Enlaces Rápidos</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/planes" className="hover:text-accent-400 transition">Precios y Planes</Link></li>
                <li><Link href="/login" className="hover:text-accent-400 transition">Portal de Clientes</Link></li>
                <li><Link href="/legal/terminos" className="hover:text-accent-400 transition">Términos y Condiciones</Link></li>
                <li><Link href="/legal/privacidad" className="hover:text-accent-400 transition">Política de Privacidad</Link></li>
                <li><Link href="/legal/cookies" className="hover:text-accent-400 transition">Política de Cookies</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Contacto</h4>
              <p className="text-sm">soporte@erpsystem.com</p>
              <p className="text-sm mt-2">Atención 24/7 para nuestros clientes suscritos.</p>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 text-center text-sm">
            © {new Date().getFullYear()} ERP System. Todos los derechos reservados.
          </div>
        </div>
      </footer>
      <CookieConsent />
    </div>
  );
}
