"use client";

import { useState, useEffect, useCallback, useRef, type ReactElement } from 'react';
import { UtensilsCrossed, Plus, Minus, Trash2, QrCode as QrCodeIcon, Bell, Receipt, Search, CreditCard, FileCheck2 } from 'lucide-react';
import { AppModal, ActionButton } from '@/components/ui';
import QrCode from '@/components/QrCode';
import { useNotify } from '@/hooks/useNotify';
import { getTenantSubdomain, tenantUrl } from '@/utils/tenantUrl';
import { referenciaEnMonedaBase, convertirAMoneda } from '@/utils/currencyReference';
import {
  getPedidoMesa,
  agregarItemPedido,
  quitarItemPedido,
  marcarPedidoAtendido,
  cerrarPedidoMesa,
  cancelarPedidoMesa,
  type PedidoMesa,
} from '@/services/restaurantesService';
import { getProductos } from '@/services/inventoryService';
import { getMetodosDePago } from '@/services/facturacionService';
import { getClientes } from '@/services/clientesService';
import { getTasasCambioActual, getMonedas, type TasaCambioActual } from '@/services/configuracionService';
import { useLiveSocket } from '@/hooks/useLiveSocket';
import { usePinAutorizacion } from '@/hooks/usePinAutorizacion';
import PinAutorizacionModal from '@/components/PinAutorizacionModal';
import type { Producto, MetodoPago, Moneda, Cliente } from '@/types/api';
import ClientModal from '../../../pos/components/ClientModal';
import { useMonedaVista } from '@/context/MonedaVistaContext';

interface PedidoMesaModalProps {
  pedidoId: number;
  onClose: () => void;
  /** Se dispara al cerrar/cobrar el pedido -- el padre debe refrescar la grilla de mesas. */
  onPedidoCerrado: () => void;
}

export default function PedidoMesaModal({ pedidoId, onClose, onPedidoCerrado }: PedidoMesaModalProps): ReactElement {
  const notify = useNotify();
  // Si el admin activó "Exigir PIN para eliminar renglones", quitar un
  // ítem completo de la mesa pide antes el PIN de un encargado.
  const pinAuth = usePinAutorizacion();
  const [pedido, setPedido] = useState<PedidoMesa | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState<'items' | 'cobrar' | 'qr'>('items');
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [metodoPagoId, setMetodoPagoId] = useState<number | null>(null);
  const [cobrando, setCobrando] = useState(false);
  const [tasas, setTasas] = useState<Record<string, TasaCambioActual>>({});
  const [cerrando, setCerrando] = useState(false);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [monedaId, setMonedaId] = useState<number | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false);
  // Cuenta cuántas mutaciones (agregar/quitar item) están en vuelo -- el
  // refresco periódico de abajo se salta mientras hay alguna, porque si
  // llegaba justo entre el cambio optimista y la respuesta real, pisaba el
  // estado optimista con la foto vieja del servidor (el ítem "parpadeaba":
  // aparecía, desaparecía, y volvía a aparecer cuando por fin llegaba la
  // respuesta real).
  const mutacionesEnVuelo = useRef(0);

  const cargarPedido = useCallback(async () => {
    try {
      setPedido(await getPedidoMesa(pedidoId));
    } catch {
      notify.error('No se pudo cargar el pedido.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId]);

  // Push en vivo de ESTE pedido (ver `apps.restaurantes.consumers.
  // PedidoMesaPrivadoConsumer`) -- igual que el polling de abajo, se salta
  // mientras hay una mutación local en vuelo, por la misma razón.
  useLiveSocket<PedidoMesa>({
    path: `/ws/restaurantes/pedidos/${pedidoId}/`,
    onMessage: (datos) => { if (mutacionesEnVuelo.current === 0) setPedido(datos); },
  });

  useEffect(() => {
    cargarPedido();
    getProductos().then(setProductos).catch(() => setProductos([]));
    getTasasCambioActual().then(setTasas).catch(() => setTasas({}));
    // Refresco periódico -- para que el mesero vea si alguien tocó "Llamar
    // al mesero"/"Pedir la cuenta" desde el QR mientras tiene este modal
    // abierto. Se salta mientras hay una mutación local en vuelo (ver arriba).
    const intervalo = window.setInterval(() => {
      if (mutacionesEnVuelo.current === 0) cargarPedido();
    }, 3000);
    return () => window.clearInterval(intervalo);
  }, [cargarPedido]);

  // Optimista: el ítem aparece/desaparece al instante en vez de esperar el
  // viaje de ida y vuelta al servidor -- antes cada tap se sentía con
  // "delay" porque la UI no cambiaba nada hasta que llegaba la respuesta.
  // Si el servidor falla, se revierte recargando el pedido real.
  const agregar = async (productoId: number, productoNombre: string, precioUnitario: string): Promise<void> => {
    if (!pedido) return;
    const precio = parseFloat(precioUnitario || '0');
    // Igual que el backend (ver `agregar_item`): si ya hay una línea del
    // mismo producto sin asignar/sin preparar, se suma la cantidad ahí en
    // vez de crear otra línea -- si no, el optimista mostraba "1x Refresco"
    // como línea nueva y luego, al llegar la respuesta real ya fusionada en
    // "2x Refresco", la línea nueva desaparecía y la vieja cambiaba de
    // número: se sentía como que "tardaba" en asentarse.
    const existente = pedido.items.find(
      (i) => i.producto === productoId && i.persona_asignada === null && !i.preparado && !i.notas,
    );
    const items = existente
      ? pedido.items.map((i) => (i.id === existente.id
        ? { ...i, cantidad: i.cantidad + 1, subtotal: String(parseFloat(i.subtotal) + precio) }
        : i))
      : [...pedido.items, {
        id: -Date.now(),
        producto: productoId,
        producto_nombre: productoNombre,
        cantidad: 1,
        precio_unitario: precioUnitario || '0',
        notas: null,
        subtotal: precioUnitario || '0',
        persona_asignada: null,
        preparado: false,
        departamento: null,
        departamento_nombre: null,
        preparado_por_nombre: null,
        fecha_preparado: null,
      }];
    setPedido({ ...pedido, items, total: String(parseFloat(pedido.total) + precio) });
    mutacionesEnVuelo.current += 1;
    try {
      setPedido(await agregarItemPedido(pedidoId, { producto_id: productoId, cantidad: 1 }));
    } catch {
      notify.error('No se pudo agregar el producto.');
      cargarPedido();
    } finally {
      mutacionesEnVuelo.current -= 1;
    }
  };

  const quitar = async (itemId: number, eliminarTodo = false): Promise<void> => {
    if (!pedido) return;
    const anterior = pedido;
    const item = pedido.items.find((i) => i.id === itemId);
    // Simétrico a `agregar`: el "-" quita de a uno (el backend hace lo mismo
    // en `quitar_item`); la basura pasa `eliminarTodo` para quitar la línea
    // completa de un solo golpe aunque tenga cantidad > 1.
    const items = item && item.cantidad > 1 && !eliminarTodo
      ? pedido.items.map((i) => (i.id === itemId
        ? { ...i, cantidad: i.cantidad - 1, subtotal: String(parseFloat(i.subtotal) - parseFloat(i.precio_unitario)) }
        : i))
      : pedido.items.filter((i) => i.id !== itemId);
    const precioQuitado = item
      ? (eliminarTodo ? parseFloat(item.subtotal) : parseFloat(item.precio_unitario))
      : 0;
    setPedido({ ...pedido, items, total: String(parseFloat(pedido.total) - precioQuitado) });
    mutacionesEnVuelo.current += 1;
    try {
      setPedido(await quitarItemPedido(pedidoId, itemId, eliminarTodo));
    } catch {
      notify.error('No se pudo quitar el ítem.');
      setPedido(anterior);
    } finally {
      mutacionesEnVuelo.current -= 1;
    }
  };

  // Si el mesero tocó la mesa sin llegar a pedir nada, cerrar el modal
  // libera la mesa de nuevo en vez de dejarla "ocupada" con un pedido vacío.
  const manejarCierre = async (): Promise<void> => {
    if (pedido && pedido.estado === 'abierto' && pedido.items.length === 0 && !cerrando) {
      setCerrando(true);
      try {
        await cancelarPedidoMesa(pedidoId);
        onPedidoCerrado();
      } catch {
        // Si falla, no pasa nada -- la mesa simplemente queda "ocupada" con
        // un pedido vacío, que se puede seguir usando o cancelar después.
      }
    }
    onClose();
  };

  const abrirCobrar = async (): Promise<void> => {
    if (!pedido?.items.length) {
      notify.error('Agrega al menos un ítem antes de cobrar.');
      return;
    }
    try {
      const [metodos, listaMonedas, listaClientes] = await Promise.all([getMetodosDePago(), getMonedas(), getClientes()]);
      setMetodosPago(metodos);
      setMetodoPagoId(metodos[0]?.id ?? null);
      setMonedas(listaMonedas);
      setMonedaId(listaMonedas.find((m) => m.es_predeterminada)?.id ?? null);
      setClientes(listaClientes);
      setClienteId(pedido.cliente ?? null);
      setVista('cobrar');
    } catch {
      notify.error('No se pudieron cargar los métodos de pago.');
    }
  };

  const cobrar = async (): Promise<void> => {
    if (!metodoPagoId) {
      notify.error('Selecciona un método de pago.');
      return;
    }
    setCobrando(true);
    try {
      await cerrarPedidoMesa(pedidoId, {
        metodo_pago_id: metodoPagoId,
        ...(monedaId ? { moneda_id: monedaId } : {}),
        cliente_id: clienteId,
      });
      notify.success('Mesa cobrada correctamente.');
      onPedidoCerrado();
      onClose();
    } catch {
      notify.error('No se pudo cobrar la mesa.');
    } finally {
      setCobrando(false);
    }
  };

  const atender = async (): Promise<void> => {
    try {
      setPedido(await marcarPedidoAtendido(pedidoId));
    } catch {
      notify.error('No se pudo actualizar.');
    }
  };

  const productosFiltrados = productos
    .filter((p) => !p.es_insumo && p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .slice(0, 20);
  const subdominio = getTenantSubdomain();
  const urlCuenta = pedido && subdominio ? tenantUrl(subdominio, `/cuenta/${pedido.token_publico}`) : '';
  const referenciaTotal = pedido ? referenciaEnMonedaBase(parseFloat(pedido.total), tasas) : null;
  // Precios del menú en la moneda de referencia; se muestran en la moneda de vista.
  const { formatear, referencia } = useMonedaVista();
  const monedaSeleccionada = monedas.find((m) => m.id === monedaId);
  const simboloMonedaCobro = monedaSeleccionada?.simbolo || monedaSeleccionada?.codigo || '$';
  // Los precios se guardan en la moneda de referencia (no-base, ej. USD) --
  // si se eligió cobrar en la moneda BASE (ej. Bs.), hay que convertir el
  // número, no solo cambiarle el símbolo (antes mostraba "Bs. 17" para un
  // total de $17, sin multiplicar por la tasa).
  const totalEnMonedaCobro = pedido
    ? convertirAMoneda(parseFloat(pedido.total), monedaSeleccionada?.es_predeterminada, tasas)
    : 0;

  return (
    <>
    <AppModal
      isOpen
      onClose={manejarCierre}
      title={pedido ? `Mesa ${pedido.mesa_numero}` : 'Cargando...'}
      icon={<UtensilsCrossed size={20} />}
      size="lg"
      footer={
        vista === 'items' ? (
          <>
            <ActionButton variant="secondary" onClick={() => setVista('qr')}>
              <QrCodeIcon size={16} /> Ver QR
            </ActionButton>
            <ActionButton onClick={abrirCobrar}>
              <Receipt size={16} /> Cobrar mesa
            </ActionButton>
          </>
        ) : vista === 'cobrar' ? (
          <>
            <ActionButton variant="secondary" onClick={() => setVista('items')}>Atrás</ActionButton>
            <ActionButton loading={cobrando} onClick={cobrar}>
              <CreditCard size={16} /> Confirmar cobro
            </ActionButton>
          </>
        ) : (
          <ActionButton variant="secondary" onClick={() => setVista('items')}>Volver</ActionButton>
        )
      }
    >
      {!pedido ? (
        <p className="text-sm text-slate-400 text-center py-8">Cargando...</p>
      ) : vista === 'qr' ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <QrCode value={urlCuenta} size={220} />
          <p className="text-xs text-slate-500 text-center max-w-xs">
            Que los comensales escaneen este código para ver la cuenta, dividirla entre el grupo y pedir la cuenta o al mesero.
          </p>
          <p className="text-[11px] font-mono text-slate-400 break-all text-center">{urlCuenta}</p>
        </div>
      ) : vista === 'cobrar' ? (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-xs font-bold text-slate-500 uppercase">Total a cobrar</p>
            <p className="text-3xl font-black text-slate-900">{simboloMonedaCobro} {totalEnMonedaCobro.toFixed(2)}</p>
            {referenciaTotal && !monedaSeleccionada?.es_predeterminada && <p className="text-sm font-semibold text-slate-400 mt-0.5">≈ {referenciaTotal}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cliente (opcional)</label>
            <div className="flex gap-2">
              <select
                value={clienteId ?? ''}
                onChange={(e) => setClienteId(e.target.value ? Number(e.target.value) : null)}
                className="flex-1 min-w-0 px-3 py-2 border rounded-lg text-sm bg-white"
              >
                <option value="">Sin registrar...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setModalNuevoCliente(true)}
                title="Crear cliente nuevo"
                className="shrink-0 px-3 py-2 border rounded-lg text-sm font-bold text-primary-600 border-primary-200 bg-primary-50 hover:bg-primary-100"
              >
                + Nuevo
              </button>
            </div>
          </div>

          {modalNuevoCliente && (
            <ClientModal
              isOpen
              onClose={() => setModalNuevoCliente(false)}
              onClientCreated={(nuevo) => {
                setClientes((prev) => [...prev, nuevo]);
                setClienteId(nuevo.id);
                setModalNuevoCliente(false);
              }}
            />
          )}

          {monedas.length > 1 && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Moneda a cobrar</label>
              <div className="flex flex-wrap gap-2">
                {monedas.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMonedaId(m.id)}
                    className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-colors ${
                      monedaId === m.id ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    {m.codigo}{m.es_predeterminada ? ' (Base)' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Método de pago</label>
            <div className="grid grid-cols-2 gap-2">
              {metodosPago.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetodoPagoId(m.id)}
                  className={`px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-colors ${
                    metodoPagoId === m.id ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {m.nombre}
                </button>
              ))}
              {metodosPago.length === 0 && (
                <p className="text-xs text-slate-400 col-span-2">No hay métodos de pago configurados.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ítems del pedido */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-700">Pedido actual</h4>
              {(pedido.mesero_solicitado || pedido.cuenta_solicitada) && (
                <button
                  type="button"
                  onClick={atender}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-accent-700 bg-accent-50 border border-accent-200 px-2.5 py-1 rounded-full animate-pulse"
                >
                  <Bell size={12} /> {pedido.cuenta_solicitada ? 'Piden la cuenta' : 'Llaman al mesero'}
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {pedido.items.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-8">Agrega productos desde la lista de la derecha.</p>
              )}
              {pedido.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{item.cantidad}x {item.producto_nombre}</p>
                    <p className="text-xs text-slate-400">{formatear(item.subtotal, referencia?.codigo)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => quitar(item.id)}
                      aria-label="Disminuir cantidad"
                      className="w-6 h-6 flex items-center justify-center border rounded-md text-slate-500 hover:bg-slate-100"
                    >
                      <Minus size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => agregar(item.producto, item.producto_nombre, item.precio_unitario)}
                      aria-label="Aumentar cantidad"
                      className="w-6 h-6 flex items-center justify-center border rounded-md text-slate-500 hover:bg-slate-100"
                    >
                      <Plus size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => pinAuth.solicitar(() => quitar(item.id, true))}
                      aria-label="Quitar del pedido"
                      className="p-1.5 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t flex justify-between items-center">
              <span className="text-sm font-bold text-slate-500">Total</span>
              <div className="text-right">
                <span className="text-lg font-black text-slate-900">{formatear(pedido.total, referencia?.codigo)}</span>
                {referenciaTotal && <p className="text-[11px] font-semibold text-slate-400">≈ {referenciaTotal}</p>}
              </div>
            </div>
            {pedido.comprobante_pago && (
              <a
                href={pedido.comprobante_pago}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-bold hover:bg-green-100 transition-colors"
              >
                <FileCheck2 size={13} /> El cliente subió un comprobante de pago -- ver
              </a>
            )}
          </div>

          {/* Buscador de productos */}
          <div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar plato/bebida..."
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {productosFiltrados.map((producto) => (
                <button
                  key={producto.id}
                  type="button"
                  onClick={() => agregar(producto.id, producto.nombre, producto.precio || '0')}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-primary-400 hover:bg-primary-50 text-left transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-700 truncate">{producto.nombre}</span>
                  <span className="flex items-center gap-1 text-xs font-bold text-primary-600 shrink-0">
                    ${parseFloat(producto.precio || '0').toFixed(2)} <Plus size={14} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppModal>
    <PinAutorizacionModal {...pinAuth.modalProps} />
    </>
  );
}
