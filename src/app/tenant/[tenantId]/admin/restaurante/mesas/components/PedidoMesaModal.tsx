"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { UtensilsCrossed, Plus, Minus, Trash2, QrCode as QrCodeIcon, Bell, Receipt, Search, CreditCard } from 'lucide-react';
import { AppModal, ActionButton } from '@/components/ui';
import QrCode from '@/components/QrCode';
import { useNotify } from '@/hooks/useNotify';
import { getTenantSubdomain, tenantUrl } from '@/utils/tenantUrl';
import { referenciaEnMonedaBase } from '@/utils/currencyReference';
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
import { getTasasCambioActual, getMonedas, type TasaCambioActual } from '@/services/configuracionService';
import type { Producto, MetodoPago, Moneda } from '@/types/api';

interface PedidoMesaModalProps {
  pedidoId: number;
  onClose: () => void;
  /** Se dispara al cerrar/cobrar el pedido -- el padre debe refrescar la grilla de mesas. */
  onPedidoCerrado: () => void;
}

export default function PedidoMesaModal({ pedidoId, onClose, onPedidoCerrado }: PedidoMesaModalProps): ReactElement {
  const notify = useNotify();
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

  const cargarPedido = useCallback(async () => {
    try {
      setPedido(await getPedidoMesa(pedidoId));
    } catch {
      notify.error('No se pudo cargar el pedido.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId]);

  useEffect(() => {
    cargarPedido();
    getProductos().then(setProductos).catch(() => setProductos([]));
    getTasasCambioActual().then(setTasas).catch(() => setTasas({}));
    // Refresco periódico -- para que el mesero vea si alguien tocó "Llamar
    // al mesero"/"Pedir la cuenta" desde el QR mientras tiene este modal abierto.
    const intervalo = window.setInterval(cargarPedido, 5000);
    return () => window.clearInterval(intervalo);
  }, [cargarPedido]);

  // Optimista: el ítem aparece/desaparece al instante en vez de esperar el
  // viaje de ida y vuelta al servidor -- antes cada tap se sentía con
  // "delay" porque la UI no cambiaba nada hasta que llegaba la respuesta.
  // Si el servidor falla, se revierte recargando el pedido real.
  const agregar = async (producto: Producto): Promise<void> => {
    if (!pedido) return;
    const itemOptimista = {
      id: -Date.now(),
      producto: producto.id,
      producto_nombre: producto.nombre,
      cantidad: 1,
      precio_unitario: producto.precio || '0',
      notas: null,
      subtotal: producto.precio || '0',
    };
    setPedido({ ...pedido, items: [...pedido.items, itemOptimista], total: String(parseFloat(pedido.total) + parseFloat(producto.precio || '0')) });
    try {
      setPedido(await agregarItemPedido(pedidoId, { producto_id: producto.id, cantidad: 1 }));
    } catch {
      notify.error('No se pudo agregar el producto.');
      cargarPedido();
    }
  };

  const quitar = async (itemId: number): Promise<void> => {
    if (!pedido) return;
    const anterior = pedido;
    setPedido({ ...pedido, items: pedido.items.filter((i) => i.id !== itemId) });
    try {
      setPedido(await quitarItemPedido(pedidoId, itemId));
    } catch {
      notify.error('No se pudo quitar el ítem.');
      setPedido(anterior);
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
      const [metodos, listaMonedas] = await Promise.all([getMetodosDePago(), getMonedas()]);
      setMetodosPago(metodos);
      setMetodoPagoId(metodos[0]?.id ?? null);
      setMonedas(listaMonedas);
      setMonedaId(listaMonedas.find((m) => m.es_predeterminada)?.id ?? null);
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
      await cerrarPedidoMesa(pedidoId, { metodo_pago_id: metodoPagoId, ...(monedaId ? { moneda_id: monedaId } : {}) });
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
  const monedaSeleccionada = monedas.find((m) => m.id === monedaId);
  const simboloMonedaCobro = monedaSeleccionada?.simbolo || monedaSeleccionada?.codigo || '$';

  return (
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
            <p className="text-3xl font-black text-slate-900">{simboloMonedaCobro} {parseFloat(pedido.total).toFixed(2)}</p>
            {referenciaTotal && <p className="text-sm font-semibold text-slate-400 mt-0.5">≈ {referenciaTotal}</p>}
          </div>

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
                    <p className="text-xs text-slate-400">${parseFloat(item.subtotal).toFixed(2)}</p>
                  </div>
                  <button type="button" onClick={() => quitar(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t flex justify-between items-center">
              <span className="text-sm font-bold text-slate-500">Total</span>
              <div className="text-right">
                <span className="text-lg font-black text-slate-900">${parseFloat(pedido.total).toFixed(2)}</span>
                {referenciaTotal && <p className="text-[11px] font-semibold text-slate-400">≈ {referenciaTotal}</p>}
              </div>
            </div>
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
                  onClick={() => agregar(producto)}
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
  );
}
