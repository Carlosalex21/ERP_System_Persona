/**
 * @file Servicio para acciones de autenticación públicas y específicas del tenant.
 */
import axios from 'axios';
import { apiPublica, apiPrivada } from './api';
import { guardarSesion } from '@/utils/authSession';

interface ActivationResponse {
  message: string;
}

/** Perfil del empleado/usuario del tenant actualmente autenticado (`/auth/me/`). */
export interface UsuarioActual {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  rol: string | null;
  /** Código estable del rol (ver `apps.core.permissions.codigo_rol`), no el nombre editable. */
  rol_codigo: string | null;
  sucursal: string | null;
  /** Almacén operativo del empleado (ver `UserMetadata.almacen_asignado`) -- null si no tiene uno. */
  almacen_asignado_id: number | null;
  almacen_asignado: string | null;
  /** Códigos de módulo del panel que el rol de este usuario NO debe ver (ver `utils/modulosPanel.ts`). */
  modulos_ocultos: string[];
}

/** Perfil del usuario autenticado -- usado para armar el menú según su rol (ver `SessionContext`). */
export const getUsuarioActual = async (): Promise<UsuarioActual> => {
  const response = await apiPrivada.get<UsuarioActual>('/auth/me/');
  return response.data;
};

/**
 * Activa la cuenta de un cliente B2B estableciendo su contraseña.
 * Esta función crea una instancia de Axios sobre la marcha para apuntar al subdominio correcto.
 * @param {string} tenantId - El subdominio del tenant.
 * @param {string} token - El token de activación de la URL.
 * @param {string} password - La nueva contraseña.
 * @param {string} password_confirm - La confirmación de la contraseña.
 * @returns {Promise<ActivationResponse>}
 */
export const activateB2bAccount = async (tenantId: string, token: string, password: string, password_confirm: string): Promise<ActivationResponse> => {
  // Producción: mismo origen (esta página ya vive bajo el subdominio del
  // tenant -- ver `NEXT_PUBLIC_API_SAME_ORIGIN` en `services/api.ts`).
  if (process.env.NEXT_PUBLIC_API_SAME_ORIGIN === 'true') {
    const response = await axios.post<ActivationResponse>(
      '/api/v1/clientes/b2b/activate-account/',
      { token, password, password_confirm },
    );
    return response.data;
  }

  // La URL base del backend, ajústala según tu entorno (producción/desarrollo)
  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const tenantApiUrl = `${baseURL.replace('://', `://${tenantId}.`)}`;

  const response = await axios.post<ActivationResponse>(
    `${tenantApiUrl}/api/v1/clientes/b2b/activate-account/`,
    { token, password, password_confirm }
  );
  return response.data;
};

/**
 * Pide el correo de recuperación de contraseña para un usuario del tenant
 * actual (empleado o admin). `apiPublica` ya resuelve el subdominio correcto
 * a partir de `window.location.hostname`, así que solo funciona llamada
 * desde el propio subdominio del tenant.
 */
export const solicitarResetPassword = async (email: string): Promise<{ message: string }> => {
  const response = await apiPublica.post<{ message: string }>('/auth/password-reset/', { email });
  return response.data;
};

/** Confirma el reset con el uid/token del enlace del correo y establece la nueva contraseña. */
export const confirmarResetPassword = async (uid: string, token: string, newPassword: string): Promise<{ message: string }> => {
  const response = await apiPublica.post<{ message: string }>('/auth/password-reset/confirm/', {
    uid, token, new_password: newPassword,
  });
  return response.data;
};

/**
 * Autoservicio: el usuario ya autenticado cambia su propia contraseña
 * (distinto de `confirmarResetPassword`, que no requiere sesión y se usa
 * cuando el usuario la olvidó). Exige la contraseña actual.
 */
export const cambiarMiPassword = async (passwordActual: string, passwordNueva: string): Promise<{ message: string }> => {
  const response = await apiPrivada.post<{ message: string; access?: string; refresh?: string }>('/auth/me/cambiar-password/', {
    password_actual: passwordActual,
    password_nueva: passwordNueva,
  });
  // El backend cierra TODAS las sesiones del usuario (incluida esta) y
  // devuelve un par nuevo para seguir trabajando sin volver a iniciar sesión.
  if (response.data.access) {
    guardarSesion(response.data.access, response.data.refresh);
  }
  return { message: response.data.message };
};

/** Historial de inicios de sesión del tenant (solo admin) -- últimos 200 intentos, éxito y fallo. */
export interface IntentoLogin {
  id: number;
  usuario_nombre: string;
  ip: string | null;
  success: boolean;
  timestamp: string;
}

export const getHistorialAccesos = async (): Promise<IntentoLogin[]> => {
  const response = await apiPrivada.get<IntentoLogin[]>('/auth/login-attempts/');
  return response.data;
};