"use client";

import { useSession } from '@/context/SessionContext';

/** Perfil del empleado logueado (rol, módulos ocultos) -- ver `SessionContext`. */
export function useUsuarioActual() {
  const { usuario } = useSession();
  return usuario;
}
