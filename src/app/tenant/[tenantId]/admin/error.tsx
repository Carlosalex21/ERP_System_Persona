"use client";

import type { ReactElement } from 'react';

import ErrorBoundaryPagina from '@/components/ErrorBoundaryPagina';

/**
 * Fallo inesperado dentro del panel: el menú lateral y la sesión siguen
 * funcionando (esto solo reemplaza el contenido de la pantalla que falló),
 * así el cliente puede navegar a otra sección sin recargar todo.
 */
export default function ErrorPanel({ error, retry, reset }: { error: Error & { digest?: string }; retry?: () => void; reset: () => void }): ReactElement {
  return <ErrorBoundaryPagina error={error} retry={retry} reset={reset} compacta />;
}
