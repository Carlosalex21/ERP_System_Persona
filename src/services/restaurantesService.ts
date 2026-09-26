/**
 * @file Servicio del módulo de Restaurante: mesas y pedidos (panel, requiere sesión).
 * El acceso público de "dividir cuenta" por QR vive aparte, en `publicMesaService.ts`
 * (sin token de sesión -- se autentica solo con el token opaco de la URL).
 */
import { apiPrivada } from './api';

export interface Mesa {
  id: number;
  numero: string;
  capacidad: number | null;
  activo: boolean;
  estado: 'libre' | 'ocupada';
  pedido_abierto_id: number | null;
  mesero_solicitado: boolean;
  cuenta_solicitada: boolean;
}

export interface PedidoMesaItem {
  id: number;
  producto: number;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: string;
  notas: string | null;
  subtotal: string;
  persona_asignada: number | null;
  preparado: boolean;
  departamento: number | null;
  departamento_nombre: string | null;
  preparado_por_nombre: string | null;
  fecha_preparado: string | null;
}

export interface PedidoMesa {
  id: number;
  mesa: number;
  mesa_numero: string;
  mesero: number | null;
  mesero_nombre: string | null;
  cliente: number | null;
  cliente_nombre: string | null;
  estado: 'abierto' | 'cerrado';
  factura: number | null;
  token_publico: string;
  division_personas: number;
  propina_pct: string;
  mesero_solicitado: boolean;
  cuenta_solicitada: boolean;
  fecha_apertura: string;
  fecha_cierre: string | null;
  items: PedidoMesaItem[];
  total: string;
  comprobante_pago: string | null;
}

export const getMesas = async (): Promise<Mesa[]> => {
  const response = await apiPrivada.get<Mesa[]>('/restaurantes/mesas/');
  return response.data;
};

export const createMesa = async (data: { numero: string; capacidad?: number | null }): Promise<Mesa> => {
  const response = await apiPrivada.post<Mesa>('/restaurantes/mesas/', data);
  return response.data;
};

export const updateMesa = async (id: number, data: { numero?: string; capacidad?: number | null }): Promise<Mesa> => {
  const response = await apiPrivada.patch<Mesa>(`/restaurantes/mesas/${id}/`, data);
  return response.data;
};

export const deleteMesa = async (id: number): Promise<void> => {
  await apiPrivada.delete(`/restaurantes/mesas/${id}/`);
};

export const getPedidoMesa = async (id: number): Promise<PedidoMesa> => {
  const response = await apiPrivada.get<PedidoMesa>(`/restaurantes/pedidos/${id}/`);
  return response.data;
};

/** Todos los pedidos abiertos con sus ítems -- para la vista de cocina. */
export const getPedidosAbiertos = async (): Promise<PedidoMesa[]> => {
  const response = await apiPrivada.get<PedidoMesa[]>('/restaurantes/pedidos/', { params: { estado: 'abierto' } });
  return response.data;
};

/** Abre un pedido nuevo para una mesa (la mesa debe estar libre). */
export const abrirPedidoMesa = async (mesaId: number, clienteId?: number | null): Promise<PedidoMesa> => {
  const response = await apiPrivada.post<PedidoMesa>('/restaurantes/pedidos/', { mesa: mesaId, cliente: clienteId ?? null });
  return response.data;
};

export const agregarItemPedido = async (
  pedidoId: number,
  data: { producto_id: number; cantidad: number; notas?: string },
): Promise<PedidoMesa> => {
  const response = await apiPrivada.post<PedidoMesa>(`/restaurantes/pedidos/${pedidoId}/agregar_item/`, data);
  return response.data;
};

export const quitarItemPedido = async (pedidoId: number, itemId: number, eliminarTodo = false): Promise<PedidoMesa> => {
  const response = await apiPrivada.post<PedidoMesa>(`/restaurantes/pedidos/${pedidoId}/quitar-item/`, {
    item_id: itemId,
    ...(eliminarTodo ? { eliminar_todo: true } : {}),
  });
  return response.data;
};

export const marcarPedidoAtendido = async (pedidoId: number): Promise<PedidoMesa> => {
  const response = await apiPrivada.post<PedidoMesa>(`/restaurantes/pedidos/${pedidoId}/marcar-atendido/`);
  return response.data;
};

/** Libera una mesa abierta por error, antes de que tenga algún ítem. */
export const cancelarPedidoMesa = async (pedidoId: number): Promise<void> => {
  await apiPrivada.post(`/restaurantes/pedidos/${pedidoId}/cancelar/`);
};

export const cerrarPedidoMesa = async (
  pedidoId: number,
  data: { metodo_pago_id: number; condicion_pago?: 'contado' | 'credito'; moneda_id?: number; cliente_id?: number | null },
): Promise<{ mensaje: string; factura_id: number; correlativo: string | null }> => {
  const response = await apiPrivada.post(`/restaurantes/pedidos/${pedidoId}/cerrar/`, data);
  return response.data;
};

/** Vista de cocina: alterna si un ítem ya se preparó. */
export const marcarItemPreparado = async (pedidoId: number, itemId: number): Promise<PedidoMesa> => {
  const response = await apiPrivada.post<PedidoMesa>(`/restaurantes/pedidos/${pedidoId}/marcar-item-preparado/`, { item_id: itemId });
  return response.data;
};

export const asignarPersonaItem = async (pedidoId: number, itemId: number, personaAsignada: number | null): Promise<PedidoMesa> => {
  const response = await apiPrivada.post<PedidoMesa>(`/restaurantes/pedidos/${pedidoId}/asignar-persona-item/`, {
    item_id: itemId, persona_asignada: personaAsignada,
  });
  return response.data;
};

export const subirComprobantePagoPrivado = async (pedidoId: number, archivo: File): Promise<PedidoMesa> => {
  const formData = new FormData();
  formData.append('comprobante_pago', archivo);
  const response = await apiPrivada.post<PedidoMesa>(`/restaurantes/pedidos/${pedidoId}/comprobante-pago/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const registrarPushSubscription = async (data: { endpoint: string; p256dh: string; auth: string }): Promise<void> => {
  await apiPrivada.post('/restaurantes/push-subscriptions/', data);
};
