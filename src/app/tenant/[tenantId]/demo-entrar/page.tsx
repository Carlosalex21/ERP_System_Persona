"use client";

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { Loader2 } from 'lucide-react';
import { getSharedCookieDomain, cookieSecureFlag } from '@/utils/cookieDomain';

/**
 * Punto de entrada del botón "Probar demo en vivo" de la landing.
 *
 * La landing vive en el dominio raíz y no puede simplemente dejar una
 * cookie ahí para que la vea este subdominio: en desarrollo las cookies
 * `.localhost` no se comparten entre subdominios (Chrome las descarta
 * enteras, ver `getSharedCookieDomain`), así que los tokens viajan en el
 * fragmento de la URL (`#access=...`) -- nunca llegan al servidor ni a los
 * logs -- y esta página los toma y los guarda como cookie de ESTE origen,
 * exactamente como hace un login normal con contraseña.
 */
export default function DemoEntrar() {
  const [error, setError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const access = params.get('access');
    const refresh = params.get('refresh');

    if (!access || !refresh) {
      setError(true);
      return;
    }

    const domain = getSharedCookieDomain();
    Cookies.set('access_token', access, { expires: 1, domain, secure: cookieSecureFlag(), sameSite: 'Lax' });
    Cookies.set('refresh_token', refresh, { expires: 7, domain, secure: cookieSecureFlag(), sameSite: 'Lax' });

    // Limpia el fragmento antes de navegar para que no quede en el historial.
    window.location.replace('/admin');
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="text-center">
        {error ? (
          <p className="text-sm font-bold text-red-600">
            El enlace de la demo no es válido. Volvé a intentarlo desde la página principal.
          </p>
        ) : (
          <>
            <Loader2 className="animate-spin mx-auto mb-3 text-primary-600" size={28} />
            <p className="text-sm font-bold text-slate-500">Entrando a la demo...</p>
          </>
        )}
      </div>
    </div>
  );
}
