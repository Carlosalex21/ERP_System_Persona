import Link from 'next/link';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900">
      {/* Barra de Navegación (Navbar) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <span className="text-2xl font-extrabold text-primary-900 tracking-tight">
                ERP<span className="text-accent-500">System</span>
              </span>
            </Link>

            {/* Enlaces al centro (Ocultos en móvil) */}
            <nav className="hidden md:flex space-x-8">
              <Link href="#caracteristicas" className="text-slate-600 hover:text-primary-600 font-medium transition">Características</Link>
              <Link href="/planes" className="text-slate-600 hover:text-primary-600 font-medium transition">Planes</Link>
              <Link href="#faq" className="text-slate-600 hover:text-primary-600 font-medium transition">Preguntas Frecuentes</Link>
            </nav>

            {/* Botones de Acción */}
            <div className="flex items-center space-x-4">
              <Link href="/login" className="hidden sm:block text-primary-700 font-semibold hover:text-primary-800 transition">
                Iniciar Sesión
              </Link>
              <Link href="/planes" className="bg-accent-500 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-accent-600 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                Comenzar
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Aquí se renderizará el contenido de cada página (Landing, Precios, Login) */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Pie de Página (Footer) */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <span className="text-2xl font-extrabold text-white tracking-tight mb-4 block">
              ERP<span className="text-accent-500">System</span>
            </span>
            <p className="text-sm">
              La plataforma todo-en-uno para gestionar tu inventario y vender por WhatsApp con tu propio subdominio.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Enlaces Rápidos</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/planes" className="hover:text-accent-500 transition">Precios y Planes</Link></li>
              <li><Link href="/login" className="hover:text-accent-500 transition">Portal de Clientes</Link></li>
              <li><Link href="#" className="hover:text-accent-500 transition">Términos de Servicio</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Contacto</h4>
            <p className="text-sm">soporte@erpsystem.com</p>
            <p className="text-sm mt-2">Atención 24/7 para nuestros clientes suscritos.</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-slate-800 text-center text-sm">
          © {new Date().getFullYear()} ERP System. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}