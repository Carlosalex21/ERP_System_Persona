/**
 * @file Hook personalizado para mostrar notificaciones (toasts) en la aplicación.
 */
import { toast } from 'react-hot-toast';

/**
 * Proporciona funciones para mostrar notificaciones de éxito, error, carga y personalizadas.
 */
export const useNotify = () => {
  return {
    /** Muestra una notificación de éxito. */
    success: (message: string) => toast.success(message),
    /** Muestra una notificación de error. */
    error: (message: string) => toast.error(message),
    /** Muestra una notificación de carga. */
    loading: (message: string) => toast.loading(message),
    /** Descarta una notificación por su ID. */
    dismiss: (toastId: string) => toast.dismiss(toastId),
    /** Muestra una notificación personalizada. */
    custom: (message: string) => toast(message),
  };
};