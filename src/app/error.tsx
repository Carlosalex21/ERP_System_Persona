"use client";

import type { ReactElement } from 'react';

import ErrorBoundaryPagina from '@/components/ErrorBoundaryPagina';

/** Fallo inesperado de renderizado en cualquier pantalla pública (marketing, login, catálogo...). */
export default function Error({ error, retry, reset }: { error: Error & { digest?: string }; retry?: () => void; reset: () => void }): ReactElement {
  return <ErrorBoundaryPagina error={error} retry={retry} reset={reset} />;
}
