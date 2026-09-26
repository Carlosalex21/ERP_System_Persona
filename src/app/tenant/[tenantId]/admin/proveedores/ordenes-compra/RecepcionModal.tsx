"use client";

import { useState, type ReactElement } from 'react';
import { PackageCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppModal, ActionButton } from '@/components/ui';
import { recibirOrdenCompra } from '@/services/proveedoresService';
import { toastApiError } from '@/utils/errors';
import type { OrdenCompra, LineaRecepcionRequest } from '@/types/api';

interface RecepcionModalProps {
  orden: OrdenCompra;
  onClose: () => void;
  onSaved: () => void;
}

export default function RecepcionModal({ orden, onClose, onSaved }: RecepcionModalProps): ReactElement {
  const pendientes = orden.detalles.filter((d) => d.cantidad_pendiente > 0);
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [cantidades, setCantidades] = useState<Record<number, string>>(
    Object.fromEntries(pendientes.map((d) => [d.id, String(d.cantidad_pendiente)])),
  );
  const [costos, setCostos] = useState<Record<number, string>>(
    Object.fromEntries(pendientes.map((d) => [d.id, d.costo_unitario_esperado || ''])),
  );
  const [guardando, setGuardando] = useState(false);

  const guardar = async (): Promise<void> => {
    const lineas: LineaRecepcionRequest[] = [];
    for (const d of pendientes) {
      const cantidad = Number(cantidades[d.id] || 0);
      if (cantidad <= 0) continue;
      if (cantidad > d.cantidad_pendiente) {
        toast.error(`"${d.producto_nombre}" -- no puedes recibir más de ${d.cantidad_pendiente} (lo pendiente).`);
        return;
      }
      lineas.push({
        detalle_id: d.id,
        cantidad,
        costo_unitario: costos[d.id]?.trim() ? costos[d.id].trim() : null,
      });
    }
    if (lineas.length === 0) {
      toast.error('Indica la cantidad recibida de al menos un producto.');
      return;
    }
    setGuardando(true);
    try {
      await recibirOrdenCompra(orden.id, { numero_documento: numeroDocumento.trim(), lineas });
      toast.success('Recepción registrada -- el stock y la cuenta por pagar ya se actualizaron.');
      onSaved();
    } catch (error) {
      toastApiError(error, 'No se pudo registrar la recepción.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={`Recibir Orden OC-${orden.numero}`}
      icon={<PackageCheck size={20} />}
      size="lg"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton onClick={guardar} loading={guardando}>Registrar Recepción</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          Cada línea que recibas aplica de inmediato una entrada real de inventario: actualiza el costo promedio, genera su cuenta por pagar con <b>{orden.proveedor_nombre}</b> y postea el asiento contable, todo solo.
        </p>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº de factura / nota de entrega del proveedor (opcional)</label>
          <input value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} placeholder={`Por defecto: OC-${orden.numero}`} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase">
                <th className="p-3 text-left">Producto</th>
                <th className="p-3 text-center w-24">Pendiente</th>
                <th className="p-3 text-center w-28">Recibiendo</th>
                <th className="p-3 text-center w-32">Costo real</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendientes.map((d) => (
                <tr key={d.id}>
                  <td className="p-3 font-semibold text-slate-800">{d.producto_nombre}</td>
                  <td className="p-3 text-center text-slate-500">{d.cantidad_pendiente}</td>
                  <td className="p-3">
                    <input
                      type="number" min={0} max={d.cantidad_pendiente}
                      value={cantidades[d.id] ?? ''}
                      onChange={(e) => setCantidades((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      className="w-full px-2 py-1.5 border rounded-lg text-sm text-center"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number" min={0} step="0.000001"
                      value={costos[d.id] ?? ''}
                      onChange={(e) => setCostos((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      placeholder="—"
                      className="w-full px-2 py-1.5 border rounded-lg text-sm text-center"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppModal>
  );
}
