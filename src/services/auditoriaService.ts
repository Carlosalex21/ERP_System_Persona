/**
 * @file Servicio para el registro de auditoría del tenant -- quién hizo qué
 * cambio, cuándo, y con qué valores antes/después. Solo lectura: el backend
 * no expone crear/editar/borrar un registro de auditoría (ver
 * `RegistroAuditoriaViewSet`, `ReadOnlyModelViewSet`).
 */
import { apiPrivada } from './api';
import { RegistroAuditoria } from '@/types/api';
import { getPagina, type Pagina } from './paginacion';

export interface FiltrosAuditoria {
  modelo?: string;
  accion?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  q?: string;
}

/**
 * Lista el registro de auditoría del tenant, opcionalmente filtrado.
 * @param {FiltrosAuditoria} filtros - Filtros opcionales (modelo, acción, rango de fechas, búsqueda libre).
 * @returns {Promise<RegistroAuditoria[]>}
 */
export const getRegistrosAuditoria = async (filtros: FiltrosAuditoria = {}): Promise<RegistroAuditoria[]> => {
  const response = await apiPrivada.get<RegistroAuditoria[]>('/auditoria/registros/', { params: filtros });
  return response.data;
};

/** Una página del registro de auditoría (la tabla crece con cada cambio del sistema: se pagina en el servidor). */
export const getPaginaAuditoria = async (filtros: FiltrosAuditoria, pagina: number): Promise<Pagina<RegistroAuditoria>> =>
  getPagina<RegistroAuditoria>('/auditoria/registros/', { ...filtros }, pagina);
