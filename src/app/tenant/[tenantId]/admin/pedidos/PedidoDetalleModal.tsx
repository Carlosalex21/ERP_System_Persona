"use client";

import { useState, type ReactElement } from 'react';
import { FileText, Loader2, User, Phone, MapPin, MessageSquare, CreditCard, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppModal, ActionButton, Badge } from '@/components/ui';
import { verFacturaPdf } from '@/services/facturacionService';
import { parseDecimal } from '@/utils/helpers';
import type { Factura, Cliente, MetodoPago, TransaccionPasarela, Transaccionpago } from '@/types/api';

interface PedidoDetalleModalProps {
  factura: Factura;
  clientes: Cliente[];
  metodosPago: MetodoPago[];
  /** Transacción de pasarela (Pago Móvil/Zelle/Stripe) si el pedido vino del catálogo público. */
  transaccionPasarela?: TransaccionPasarela | null;
  /** Transacción de pago registrada desde el POS. */
  transaccionPago?: Transaccionpago | null;
  onClose: () => void;
}

export default function PedidoDetalleModal({ factura, clientes, metodosPago, transaccionPasarela, transaccionPago, onClose }: PedidoDetalleModalProps): ReactElement {
  const [descargando, setDescargando] = useState(false);

  const cliente = clientes.find((c) => c.id === factura.cliente);
  const metodoPago = metodosPago.find((m) => m.id === factura.metodo_pago);
  const moneda = factura.moneda_codigo || '$';

  // Referencia del pago -- del catálogo público (Pago Móvil/Zelle reportado
  // por el cliente) o del POS (anotada a mano por el cajero). Es lo que el
  // admin necesita para corroborar el pago real antes de confirmar.
  const referenciaPago = transaccionPasarela?.referencia_externa || transaccionPago?.referencia || null;
  const estadoTransaccion = transaccionPasarela?.estado || transaccionPago?.estado || null;

  const abrirPdf = async (descargar: boolean): Promise<void> => {
    setDescargando(true);
    try {
      await verFacturaPdf(factura.id, { descargar });
    } catch {
      toast.error('No se pudo abrir la factura.');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={`Pedido ${factura.correlativo || `#${factura.id}`}`}
      icon={<FileText size={20} />}
      size="lg"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cerrar</ActionButton>
          <ActionButton onClick={() => abrirPdf(false)} loading={descargando}>
            <FileText size={16} /> Ver factura (PDF)
          </ActionButton>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-500">
            {new Date(factura.fecha_operacion).toLocaleString('es-VE', { dateStyle: 'long', timeStyle: 'short' })}
          </span>
          <Badge tone={
            (factura.estado || '').toLowerCase().includes('pagad') ? 'green'
              : (factura.estado || '').toLowerCase().includes('pendient') ? 'amber'
              : (factura.estado || '').toLowerCase().includes('anulad') ? 'red' : 'slate'
          }>
            {factura.estado || '—'}
          </Badge>
        </div>

        {/* Datos del cliente */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Cliente</p>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <User size={14} className="text-slate-400" />
            {cliente?.nombre || factura.nombre_cliente_pendiente || 'Consumidor final'}
          </div>
          {cliente?.telefono && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Phone size={13} className="text-slate-400" /> {cliente.telefono}
            </div>
          )}
          {cliente?.direccion && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <MapPin size={13} className="text-slate-400 shrink-0" /> {cliente.direccion}
            </div>
          )}
          {factura.comentario_pendiente && (
            <div className="flex items-start gap-2 text-xs text-slate-600 pt-1 border-t border-slate-200 mt-2">
              <MessageSquare size={13} className="text-slate-400 shrink-0 mt-0.5" />
              <span>{factura.comentario_pendiente}</span>
            </div>
          )}
          {metodoPago && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <CreditCard size={13} className="text-slate-400" /> {metodoPago.nombre}
            </div>
          )}
        </div>

        {/* Datos del pago reportado -- referencia a corroborar antes de confirmar. */}
        {(referenciaPago || estadoTransaccion) && (
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-bold text-primary-500 uppercase">Datos del pago</p>
            {referenciaPago ? (
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Hash size={14} className="text-primary-500 shrink-0" />
                <span className="font-mono">{referenciaPago}</span>
              </div>
            ) : (
              <p className="text-xs text-slate-500">El cliente/cajero no reportó un número de referencia.</p>
            )}
            {estadoTransaccion && (
              <p className="text-xs text-slate-500">
                Estado de la transacción: <span className="font-semibold capitalize">{estadoTransaccion}</span>
              </p>
            )}
          </div>
        )}

        {/* Líneas del pedido */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Productos pedidos</p>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase">
                  <th className="p-3 text-left">Producto</th>
                  <th className="p-3 text-center w-16">Cant.</th>
                  <th className="p-3 text-right w-24">Precio</th>
                  <th className="p-3 text-right w-24">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {factura.detalles.map((d) => (
                  <tr key={d.id}>
                    <td className="p-3 font-semibold text-slate-800">{d.nombre}</td>
                    <td className="p-3 text-center text-slate-600">{d.cantidad}</td>
                    <td className="p-3 text-right font-mono text-slate-600">{parseDecimal(d.precio_unitario).toFixed(2)}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-800">{parseDecimal(d.total_linea).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totales */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-mono">{moneda} {parseDecimal(factura.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>IVA</span>
            <span className="font-mono">{moneda} {parseDecimal(factura.iva_total).toFixed(2)}</span>
          </div>
          {parseDecimal(factura.retencion_total) > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Retención</span>
              <span className="font-mono">-{moneda} {parseDecimal(factura.retencion_total).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-slate-900 text-base pt-1.5 border-t border-slate-200">
            <span>Total</span>
            <span className="font-mono">{moneda} {parseDecimal(factura.total).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </AppModal>
  );
}
