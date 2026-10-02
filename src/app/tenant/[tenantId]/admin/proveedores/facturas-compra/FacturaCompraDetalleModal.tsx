"use client";

import { useState, type ReactElement } from 'react';
import { Ban, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppModal, ActionButton, Badge, ConfirmDialog } from '@/components/ui';
import { anularFacturaCompra } from '@/services/proveedoresService';
import { useSession } from '@/context/SessionContext';
import { toastApiError } from '@/utils/errors';
import type { FacturaCompra } from '@/types/api';

const fmt = (v: string | number): string =>
  Number(v).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  factura: FacturaCompra;
  onClose: () => void;
  onAnulada: () => void;
}

export default function FacturaCompraDetalleModal({ factura, onClose, onAnulada }: Props): ReactElement {
  const { usuario } = useSession();
  const esAdmin = usuario?.rol_codigo === 'admin';
  const [confirmando, setConfirmando] = useState(false);
  const [anulando, setAnulando] = useState(false);
  const retenido = Number(factura.retencion_iva) + Number(factura.retencion_islr);

  const anular = async (): Promise<void> => {
    setAnulando(true);
    try {
      await anularFacturaCompra(factura.id);
      toast.success('Compra anulada: se revirtió el inventario, la deuda y el libro de compras.');
      onAnulada();
    } catch (error) {
      toastApiError(error, 'No se pudo anular la compra.');
    } finally {
      setAnulando(false);
      setConfirmando(false);
    }
  };

  const dato = (etiqueta: string, valor: string | null | undefined) => (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{etiqueta}</p>
      <p className="text-sm font-semibold text-slate-800">{valor || '—'}</p>
    </div>
  );

  return (
    <>
      <AppModal
        isOpen
        onClose={onClose}
        title={`${factura.tipo_documento_display} ${factura.numero_factura}`}
        icon={<FileText size={20} />}
        size="lg"
        footer={
          <>
            {esAdmin && factura.estado === 'registrada' && (
              <ActionButton variant="secondary" onClick={() => setConfirmando(true)}>
                <span className="flex items-center gap-1.5 text-red-600"><Ban size={14} /> Anular</span>
              </ActionButton>
            )}
            <ActionButton onClick={onClose}>Cerrar</ActionButton>
          </>
        }
      >
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            {factura.estado === 'anulada'
              ? <Badge tone="red">Anulada</Badge>
              : Number(factura.saldo_pendiente) > 0
                ? <Badge tone="amber">Saldo pendiente {fmt(factura.saldo_pendiente)}</Badge>
                : <Badge tone="green">Pagada</Badge>}
            {factura.orden_compra_numero && <Badge tone="primary">OC-{factura.orden_compra_numero}</Badge>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {dato('Proveedor', factura.proveedor_nombre)}
            {dato('RIF', factura.proveedor_rif)}
            {dato('Fecha de emisión', new Date(`${factura.fecha_emision}T00:00:00`).toLocaleDateString('es-VE'))}
            {factura.tipo_documento === 'factura' && dato('N° de control', factura.numero_control)}
            {dato('Almacén', factura.almacen_nombre)}
            {dato('Registrada por', factura.usuario_nombre)}
          </div>

          {factura.detalles.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wide">
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-center">Cant.</th>
                    <th className="px-3 py-2 text-right">Costo unit.</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {factura.detalles.map((d) => (
                    <tr key={d.id}>
                      <td className="px-3 py-2 font-semibold text-slate-800">
                        {d.producto_nombre}{d.variante_nombre ? ` (${d.variante_nombre})` : ''}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">{d.cantidad}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{fmt(d.costo_unitario)}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{fmt(d.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="ml-auto max-w-xs rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-1.5 text-sm">
            {Number(factura.monto_exento) > 0 && <Fila etiqueta="Exento" valor={factura.monto_exento} />}
            <Fila etiqueta="Base imponible" valor={factura.base_imponible} />
            <Fila etiqueta={`IVA ${Number(factura.porcentaje_iva)}%`} valor={factura.iva} />
            <div className="border-t border-slate-200 my-1" />
            <Fila etiqueta="Total" valor={factura.total} fuerte />
            {retenido > 0 && <Fila etiqueta="Retenido" valor={-retenido} tono="text-amber-700" />}
            {retenido > 0 && <Fila etiqueta="Neto al proveedor" valor={factura.neto_a_pagar} fuerte />}
          </div>

          {factura.observaciones && <p className="text-sm text-slate-500 italic">{factura.observaciones}</p>}
        </div>
      </AppModal>

      <ConfirmDialog
        isOpen={confirmando}
        title="Anular compra"
        message="Se sacará del inventario la mercancía que entró, se anulará la cuenta por pagar, las retenciones, el asiento y la línea del Libro de Compras. Solo es posible si aún no le has pagado nada al proveedor."
        confirmLabel="Anular compra"
        danger
        loading={anulando}
        onConfirm={anular}
        onCancel={() => setConfirmando(false)}
      />
    </>
  );
}

function Fila({ etiqueta, valor, fuerte = false, tono = '' }: { etiqueta: string; valor: string | number; fuerte?: boolean; tono?: string }): ReactElement {
  return (
    <div className={`flex items-center justify-between ${fuerte ? 'font-bold text-slate-900' : 'text-slate-600'} ${tono}`}>
      <span>{etiqueta}</span>
      <span className="font-mono tabular-nums">{fmt(valor)}</span>
    </div>
  );
}
