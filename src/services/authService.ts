/**
 * @file Servicio para acciones de autenticación públicas y específicas del tenant.
 */
import axios from 'axios';
import { apiPublica } from './api';

interface ActivationResponse {
  message: string;
}

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