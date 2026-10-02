"use client";

import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, Compass, Home } from 'lucide-react';
import type { ReactElement } from 'react';

import PantallaError, { claseBotonPrincipal, claseBotonSecundario } from '@/components/PantallaError';

/**
 * 404 de toda la aplicación (el middleware reescribe cada URL a /main o
 * /tenant/<x>, así que cualquier ruta inexistente termina aquí). El botón
 * principal lleva al panel si el cliente estaba dentro de él, o al inicio.
 */
export default function NotFound(): ReactElement {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const dentroDelPanel = pathname.startsWith('/admin');

  return (
    <PantallaError
      icono={<Compass size={30} />}
      etiqueta="Error 404"
      titulo="Esta página no existe"
      mensaje="Puede que el enlace esté mal escrito o que la página ya no esté disponible. Verifica la dirección o vuelve al inicio."
    >
      <button type="button" onClick={() => router.back()} className={claseBotonSecundario}>
        <ArrowLeft size={16} /> Volver atrás
      </button>
      <a href={dentroDelPanel ? '/admin' : '/'} className={claseBotonPrincipal}>
        <Home size={16} /> {dentroDelPanel ? 'Ir al panel' : 'Ir al inicio'}
      </a>
    </PantallaError>
  );
}
