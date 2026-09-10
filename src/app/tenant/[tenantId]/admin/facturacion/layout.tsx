import type { ReactNode } from 'react';

/**
 * Layout para el módulo de Facturación.
 * Hereda el estilo y la navegación del layout de administración.
 */
export default function FacturacionLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
