"use client";

import { useEffect, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';

const STORAGE_KEY = 'cookie_consent_aceptado';

/** Aviso de cookies simple: solo usamos cookies esenciales (sesión), pero igual se informa y se pide aceptación. */
export default function CookieConsent(): ReactElement | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // localStorage no disponible (navegación privada, etc.): no bloquea el uso del sitio.
    }
  }, []);

  const aceptar = (): void => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // sin persistencia, el banner solo reaparecerá en la próxima carga.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[200] p-4 sm:p-6">
      <div className="max-w-3xl mx-auto bg-ink-950 text-slate-200 rounded-2xl shadow-2xl border border-white/10 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Cookie className="text-accent-500 shrink-0" size={24} />
        <p className="text-xs leading-relaxed flex-1">
          Usamos cookies esenciales para mantener tu sesión iniciada. No usamos cookies de publicidad ni de rastreo.{' '}
          <Link href="/legal/cookies" className="underline text-accent-400 hover:text-accent-300">Más información</Link>.
        </p>
        <button
          onClick={aceptar}
          className="shrink-0 bg-accent-500 text-slate-950 text-xs font-black px-5 py-2.5 rounded-xl hover:bg-accent-400 transition-colors"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
