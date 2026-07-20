"use client";

import { useState, useEffect, use, type ReactElement } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import { Menu, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar'; // Se actualiza la ruta para usar el componente global
import { SessionProvider } from '@/context/SessionContext';

/**
 * @typedef {Object} AdminLayoutProps
 * @property {Promise<{ tenantId: string }>} params - Parámetros de la ruta, incluyendo el ID del tenant.
 * @property {React.ReactNode} children - Contenido de la página actual.
 */
interface AdminLayoutProps {
  params: Promise<{ tenantId: string }>;
  children: React.ReactNode;
}

/**
 * Layout principal para el panel de administración de un tenant.
 * Incluye la barra lateral de navegación y maneja la autenticación básica.
 * @param {AdminLayoutProps} props - Las propiedades del layout.
 * @returns {ReactElement} El layout del panel de administración.
 */
export default function AdminLayout({ params, children }: AdminLayoutProps): ReactElement {
  const { tenantId } = use(params);
  const router = useRouter();
  const pathname = usePathname();

  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [cargandoGlobal, setCargandoGlobal] = useState(false);

  /**
   * Función para cerrar la sesión del usuario.
   * Elimina los tokens y redirige a la página de login del tenant.
   */
  const ejecutarLogout = (): void => {
    Cookies.remove('access_token', { domain: '.localhost' });
    Cookies.remove('refresh_token', { domain: '.localhost' });
    router.push('/login');
  };

  return (
    <SessionProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900">
        <Sidebar
          menuMovilAbierto={menuMovilAbierto}
          setMenuMovilAbierto={setMenuMovilAbierto}
          ejecutarLogout={ejecutarLogout}
        />

        {/* CONTENEDOR PRINCIPAL */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between md:hidden sticky top-0 z-40">
            <span className="font-extrabold text-slate-800 tracking-tight capitalize">{tenantId}</span>
            <button onClick={() => setMenuMovilAbierto(true)} className="p-2 text-slate-600"><Menu size={24} /></button>
          </header>

          <main className="p-4 sm:p-8 flex-grow overflow-y-auto relative">
            {cargandoGlobal && ( // Usar cargandoGlobal para estados de carga generales
              <div className="absolute top-4 right-8 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow border border-slate-200 text-xs font-bold text-primary-600 animate-pulse">
                <Loader2 size={14} className="animate-spin" /> Cargando...
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}