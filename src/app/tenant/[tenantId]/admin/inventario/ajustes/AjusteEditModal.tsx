"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppModal, ActionButton } from '@/components/ui';
import { editarAjusteInventario } from '@/services/inventoryService';
import { getProveedores } from '@/services/proveedoresService';
import { getApiErrorMessages } from '@/utils/helpers';
import type { AjusteInventario, AjusteInventarioEditRequest, Proveedor, MotivoAjusteInventario } from '@/types/api';

const MOTIVOS: { value: MotivoAjusteInventario; label: string }[] = [
  { value: 'compra_con_factura', label: 'Compra con factura fiscal' },
  { value: 'compra_sin_factura', label: 'Compra con nota de entrega (sin factura)' },
  { value: 'conteo_fisico', label: 'Corrección por conteo físico' },
  { value: 'devolucion_proveedor', label: 'Devolución a proveedor' },
  { value: 'merma', label: 'Merma / producto dañado' },
  { value: 'otro', label: 'Otro' },
];

interface AjusteEditModalProps {
  ajuste: AjusteInventario;
  onClose: () => void;
  onSaved: (ajuste: AjusteInventario) => void;
}

/**
 * Corrige la metadata de un ajuste ya aplicado -- nunca el movimiento de
 * stock (tipo/almacén/líneas), que ya se aplicó de verdad y no debe
 * desincronizarse del kardex. El campo que más importa corregir es la
 * fecha del documento: si se cargó al sistema después de recibida la
 * mercancía, es la que toma Cuentas por Pagar para vencimiento y antigüedad.
 */
export default function AjusteEditModal({ ajuste, onClose, onSaved }: AjusteEditModalProps): ReactElement {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [motivo, setMotivo] = useState<MotivoAjusteInventario>(ajuste.motivo);
  const [proveedorId, setProveedorId] = useState<string>(ajuste.proveedor ? String(ajuste.proveedor) : '');
  const [numeroDocumento, setNumeroDocumento] = useState(ajuste.numero_documento || '');
  const [numeroControl, setNumeroControl] = useState(ajuste.numero_control || '');
  const [fechaDocumento, setFechaDocumento] = useState(ajuste.fecha_documento || '');
  const [observaciones, setObservaciones] = useState(ajuste.observaciones || '');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getProveedores().then(setProveedores).catch(() => setProveedores([]));
  }, []);

  const guardar = async (): Promise<void> => {
    setGuardando(true);
    try {
      const payload: AjusteInventarioEditRequest = {
        motivo,
        proveedor: proveedorId ? Number(proveedorId) : null,
        numero_documento: numeroDocumento,
        numero_control: numeroControl,
        fecha_documento: fechaDocumento || null,
        observaciones,
      };
      const actualizado = await editarAjusteInventario(ajuste.id, payload);
      toast.success('Ajuste corregido.');
      onSaved(actualizado);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      messages.forEach((m) => toast.error(m));
      if (messages.length === 0) toast.error('No se pudo corregir el ajuste.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={`Corregir ajuste #${ajuste.id}`}
      icon={<Pencil size={20} />}
      size="sm"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={guardar}>Guardar</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg p-3">
          El movimiento de stock ({ajuste.tipo_display}, {ajuste.detalles.length} línea(s)) ya se aplicó y no se puede editar aquí -- si fue un error, registra un nuevo ajuste en sentido contrario. Esto solo corrige los datos del documento.
        </p>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motivo</label>
          <select value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoAjusteInventario)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
            {MOTIVOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Proveedor</label>
          <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
            <option value="">Sin proveedor</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">N° Documento</label>
            <input value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">N° Control</label>
            <input value={numeroControl} onChange={(e) => setNumeroControl(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha del documento</label>
          <input
            type="date"
            value={fechaDocumento}
            onChange={(e) => setFechaDocumento(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="text-[11px] text-slate-400 mt-1">Es la que toma Cuentas por Pagar para calcular vencimiento y antigüedad -- vacía = se usa la fecha en que se cargó el ajuste.</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observaciones</label>
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
        </div>
      </div>
    </AppModal>
  );
}
