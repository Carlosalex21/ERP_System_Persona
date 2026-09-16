/**
 * @file Servicio para datos de usuarios/empleados del tenant.
 */
import { apiPrivada } from './api';
import { cachedGet } from '@/utils/cache';

/** Empleado que puede figurar como vendedor de una venta (admin o vendedor). */
export interface Vendedor {
  id: number;
  nombre: string;
  rol: string;
}

/**
 * Lista los empleados que pueden atribuirse una venta (admins y vendedores)
 * -- usada por el selector "Vendedor" del POS, para cuando quien registra la
 * venta en el sistema no es quien la cerró (ej. un vendedor en la calle).
 * @returns {Promise<Vendedor[]>}
 */
export const getVendedores = async (): Promise<Vendedor[]> => {
  return cachedGet('usuarios:vendedores', async () => {
    const response = await apiPrivada.get<Vendedor[]>('/auth/vendedores/');
    return response.data;
  });
};
