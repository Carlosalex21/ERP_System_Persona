/**
 * @file Servicio para encapsular la lógica de API para el módulo de RRHH.
 */
import { apiPrivada } from '@/services/api';
import {
  UserManaged, UserManagedRequest, Rol, Sucursal, SucursalRequest, Departamento, DepartamentoRequest,
  PeriodoNomina, GenerarPeriodoNominaRequest, ConceptoNomina, ConceptoNominaRequest,
  NominaEmpleado, AgregarConceptoManualRequest,
  ConfiguracionRRHH, ConfiguracionRRHHRequest, VacacionesResumen, RegistrarVacacionRequest, Liquidacion,
} from '@/types/api';

/**
 * Obtiene la lista de usuarios gestionados (empleados) del tenant.
 * @returns {Promise<UserManaged[]>}
 */
export const getManagedUsers = async (): Promise<UserManaged[]> => {
  const response = await apiPrivada.get<UserManaged[]>('/auth/management/');
  return response.data;
};

/**
 * Crea un nuevo usuario gestionado (empleado).
 * @param {UserManagedRequest} data - Los datos del nuevo empleado.
 * @returns {Promise<UserManaged>}
 */
export const createManagedUser = async (data: UserManagedRequest): Promise<UserManaged> => {
  const response = await apiPrivada.post<UserManaged>('/auth/management/', data);
  return response.data;
};

/**
 * Actualiza un usuario gestionado (empleado) existente. La contraseña es
 * opcional: si se omite, no se toca la existente.
 * @param {number} id - El ID del `UserMetadata` a actualizar.
 * @param {Partial<UserManagedRequest>} data - Campos a actualizar.
 * @returns {Promise<UserManaged>}
 */
export const updateManagedUser = async (id: number, data: Partial<UserManagedRequest>): Promise<UserManaged> => {
  const response = await apiPrivada.patch<UserManaged>(`/auth/management/${id}/`, data);
  return response.data;
};

/**
 * Obtiene los roles reales del tenant (antes el frontend hardcodeaba 3
 * roles con IDs fijos, sin garantía de que coincidieran con los del backend).
 * @returns {Promise<Rol[]>}
 */
export const getRoles = async (): Promise<Rol[]> => {
  const response = await apiPrivada.get<Rol[]>('/auth/roles/');
  return response.data;
};

/**
 * Actualiza los módulos del panel ocultos para un rol (pantalla "Permisos
 * por Rol"). Es el único campo editable de un rol -- el resto
 * (código/nombre) lo siembra el sistema al crear el tenant.
 */
export const updateModulosOcultosRol = async (rolId: number, modulosOcultos: string[]): Promise<Rol> => {
  const response = await apiPrivada.patch<Rol>(`/auth/roles/${rolId}/`, { modulos_ocultos: modulosOcultos });
  return response.data;
};

/**
 * Obtiene la lista de sucursales del tenant.
 * @returns {Promise<Sucursal[]>}
 */
export const getSucursales = async (): Promise<Sucursal[]> => {
  const response = await apiPrivada.get<Sucursal[]>('/rrhh/sucursales/');
  return response.data;
};

/**
 * Crea una nueva sucursal.
 * @param {SucursalRequest} data - Los datos de la sucursal a crear.
 * @returns {Promise<Sucursal>} Una promesa que se resuelve con la sucursal recién creada.
 */
export const createSucursal = async (data: SucursalRequest): Promise<Sucursal> => {
  const response = await apiPrivada.post<Sucursal>('/rrhh/sucursales/', data);
  return response.data;
};

/**
 * Elimina una sucursal por su ID.
 * @param {number} id - El ID de la sucursal a eliminar.
 * @returns {Promise<void>}
 */
export const deleteSucursal = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/rrhh/sucursales/${id}/`);
};

/**
 * Obtiene la lista de departamentos (equipos de trabajo: Cocina, Almacén,
 * Taller...) del tenant -- ver `apps.rrhh.models.Departamento`.
 * @returns {Promise<Departamento[]>}
 */
export const getDepartamentos = async (): Promise<Departamento[]> => {
  const response = await apiPrivada.get<Departamento[]>('/rrhh/departamentos/');
  return response.data;
};

export const createDepartamento = async (data: DepartamentoRequest): Promise<Departamento> => {
  const response = await apiPrivada.post<Departamento>('/rrhh/departamentos/', data);
  return response.data;
};

export const updateDepartamento = async (id: number, data: Partial<DepartamentoRequest>): Promise<Departamento> => {
  const response = await apiPrivada.patch<Departamento>(`/rrhh/departamentos/${id}/`, data);
  return response.data;
};

export const deleteDepartamento = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/rrhh/departamentos/${id}/`);
};

// --- Nómina ---

export const getPeriodosNomina = async (): Promise<PeriodoNomina[]> => {
  const response = await apiPrivada.get<PeriodoNomina[]>('/rrhh/nomina/');
  return response.data;
};

/** Genera un nuevo período de nómina (una línea por empleado con sueldo asignado, descontando ausencias reales). */
export const generarPeriodoNomina = async (data: GenerarPeriodoNominaRequest): Promise<PeriodoNomina> => {
  const response = await apiPrivada.post<PeriodoNomina>('/rrhh/nomina/', data);
  return response.data;
};

/** Marca el período como pagado y genera su asiento contable automático (Gasto de Sueldos / Caja). */
export const pagarPeriodoNomina = async (periodoId: number): Promise<PeriodoNomina> => {
  const response = await apiPrivada.post<PeriodoNomina>(`/rrhh/nomina/${periodoId}/pagar/`);
  return response.data;
};

/**
 * Agrega un concepto puntual (ej. una comisión de ventas del mes, que varía
 * por empleado) a una línea de nómina ya generada -- solo mientras el
 * período siga en borrador. Devuelve la línea recalculada.
 */
export const agregarConceptoNominaEmpleado = async (
  nominaEmpleadoId: number, data: AgregarConceptoManualRequest,
): Promise<NominaEmpleado> => {
  const response = await apiPrivada.post<NominaEmpleado>(`/rrhh/nomina-empleados/${nominaEmpleadoId}/conceptos/`, data);
  return response.data;
};

/** Quita un concepto puntual agregado a mano (no uno recurrente -- ese se desactiva desde Bonos y Deducciones). */
export const quitarConceptoNominaEmpleado = async (
  nominaEmpleadoId: number, conceptoAplicadoId: number,
): Promise<NominaEmpleado> => {
  const response = await apiPrivada.delete<NominaEmpleado>(`/rrhh/nomina-empleados/${nominaEmpleadoId}/conceptos/${conceptoAplicadoId}/`);
  return response.data;
};

// --- Vacaciones y liquidación ---

export const getConfiguracionRRHH = async (): Promise<ConfiguracionRRHH> => {
  const response = await apiPrivada.get<ConfiguracionRRHH>('/rrhh/configuracion-rrhh/');
  return response.data;
};

export const updateConfiguracionRRHH = async (data: ConfiguracionRRHHRequest): Promise<ConfiguracionRRHH> => {
  const response = await apiPrivada.put<ConfiguracionRRHH>('/rrhh/configuracion-rrhh/', data);
  return response.data;
};

/** Días de vacaciones acumulados/tomados/disponibles de un empleado (por `usuario_id`, ver `UserManaged.usuario_id`) y su historial. */
export const getVacacionesEmpleado = async (usuarioId: number): Promise<VacacionesResumen> => {
  const response = await apiPrivada.get<VacacionesResumen>(`/rrhh/vacaciones/${usuarioId}/`);
  return response.data;
};

export const registrarVacacionTomada = async (
  usuarioId: number, data: RegistrarVacacionRequest,
): Promise<VacacionesResumen> => {
  const response = await apiPrivada.post<VacacionesResumen>(`/rrhh/vacaciones/${usuarioId}/`, data);
  return response.data;
};

export const eliminarVacacionTomada = async (vacacionId: number): Promise<void> => {
  await apiPrivada.delete(`/rrhh/vacaciones-tomadas/${vacacionId}/`);
};

/** Calculadora de referencia de liquidación (vacaciones pendientes + prestaciones acumuladas) -- no paga ni registra nada. */
export const calcularLiquidacion = async (usuarioId: number, fechaEgreso: string): Promise<Liquidacion> => {
  const response = await apiPrivada.get<Liquidacion>(`/rrhh/liquidacion/${usuarioId}/`, { params: { fecha_egreso: fechaEgreso } });
  return response.data;
};

/**
 * Descarga el recibo de pago (PDF) de una línea de nómina y lo abre en una
 * pestaña nueva -- mismo patrón que `verFacturaPdf`: el endpoint exige
 * autenticación, así que se pide como blob con el token ya inyectado por
 * `apiPrivada` en vez de enlazar directo con un `<a href>`.
 */
export const verReciboNominaPdf = async (nominaEmpleadoId: number): Promise<void> => {
  const response = await apiPrivada.get(`/rrhh/recibo-nomina/${nominaEmpleadoId}/`, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(response.data as Blob);
  window.open(blobUrl, '_blank');
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30_000);
};

// --- Conceptos de Nómina (bonos/deducciones configurables) ---

export const getConceptosNomina = async (): Promise<ConceptoNomina[]> => {
  const response = await apiPrivada.get<ConceptoNomina[]>('/rrhh/conceptos-nomina/');
  return response.data;
};

export const crearConceptoNomina = async (data: ConceptoNominaRequest): Promise<ConceptoNomina> => {
  const response = await apiPrivada.post<ConceptoNomina>('/rrhh/conceptos-nomina/', data);
  return response.data;
};

export const actualizarConceptoNomina = async (id: number, data: Partial<ConceptoNominaRequest>): Promise<ConceptoNomina> => {
  const response = await apiPrivada.patch<ConceptoNomina>(`/rrhh/conceptos-nomina/${id}/`, data);
  return response.data;
};

/** Desactiva el concepto (no lo borra físicamente -- puede estar snapshoteado en nóminas pasadas). */
export const eliminarConceptoNomina = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/rrhh/conceptos-nomina/${id}/`);
};