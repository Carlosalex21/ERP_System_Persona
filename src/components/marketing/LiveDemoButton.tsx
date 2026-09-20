"use client";

import { useState, type ReactElement, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { construirUrlDemoEnVivo } from '@/services/demoService';

/**
 * Entra al panel REAL del sistema (tenant demo, con datos de ejemplo) sin
 * pedir usuario/contraseña -- a diferencia de `ProductDemo`/`DemoWindow`
 * (mockups animados que solo simulan la interfaz), este botón lleva al
 * visitante al panel administrativo de verdad, logueado, para que pueda
 * clickear todo tal cual lo haría un cliente real.
 */
export default function LiveDemoButton({ className, children }: { className: string; children: ReactNode }): ReactElement {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);

  const entrar = async () => {
    setError(false);
    setCargando(true);
    try {
      const url = await construirUrlDemoEnVivo();
      window.location.href = url;
    } catch {
      setError(true);
      setCargando(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={entrar} disabled={cargando} className={className}>
        {cargando ? <Loader2 className="animate-spin" size={18} /> : children}
      </button>
      {error && <p className="text-xs font-bold text-red-400">No se pudo abrir la demo. Intenta de nuevo.</p>}
    </div>
  );
}
