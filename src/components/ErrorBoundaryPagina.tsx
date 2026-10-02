"use client";

import { useEffect, type ReactElement } from 'react';
import { RefreshCw, TriangleAlert, WifiOff } from 'lucide-react';

import PantallaError, { claseBotonPrincipal, claseBotonSecundario } from '@/components/PantallaError';

interface Props {
  error: Error & { digest?: string };
  /** Next 16: vuelve a pedir y renderizar el segmento que falló. */
  retry?: () => void;
  /** Respaldo: solo limpia el estado de error sin volver a pedir datos. */
  reset: () => void;
  compacta?: boolean;
}

/**
 * Tras publicar una versión nueva, una pestaña que seguía abierta intenta
 * cargar archivos (chunks) que ya no existen y falla. No es un bug del
 * cliente: basta recargar para traer la versión nueva.
 */
const esVersionVieja = (error: Error): boolean =>
  /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
    `${error.name} ${error.message}`,
  );

/** Contenido compartido por `error.tsx` (raíz y panel): pantalla amable + reintento. */
export default function ErrorBoundaryPagina({ error, retry, reset, compacta = false }: Props): ReactElement {
  useEffect(() => {
    // Queda en la consola del navegador para soporte (y para el monitoreo de errores cuando se conecte).
    console.error('[ErrorBoundary]', error);
  }, [error]);

  const versionVieja = esVersionVieja(error);

  return (
    <PantallaError
      compacta={compacta}
      icono={versionVieja ? <WifiOff size={30} /> : <TriangleAlert size={30} />}
      etiqueta={versionVieja ? 'Actualización disponible' : 'Algo salió mal'}
      titulo={versionVieja ? 'Hay una versión nueva del sistema' : 'No pudimos mostrar esta pantalla'}
      mensaje={
        versionVieja
          ? 'Actualizamos el sistema mientras lo tenías abierto. Recarga la página para continuar; no perderás tus datos guardados.'
          : 'Ocurrió un problema inesperado. Tus datos guardados están seguros. Inténtalo de nuevo y, si se repite, avísanos con el código de abajo.'
      }
      pie={error.digest ? `Código de referencia: ${error.digest}` : undefined}
    >
      {!versionVieja && (
        <button type="button" onClick={() => (retry ?? reset)()} className={claseBotonSecundario}>
          <RefreshCw size={16} /> Reintentar
        </button>
      )}
      <button type="button" onClick={() => window.location.reload()} className={claseBotonPrincipal}>
        <RefreshCw size={16} /> Recargar la página
      </button>
    </PantallaError>
  );
}
