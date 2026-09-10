import type { ReactNode } from 'react';

/**
 * Layout para el módulo de Configuración.
 * Hereda el estilo y la navegación del layout de administración.
 */
export default function ConfiguracionLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
