"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppModal, ActionButton } from '@/components/ui';
import { editarAjusteInventario } from '@/services/inventoryService';
import { getProveedores } from '@/services/proveedoresService';
import { toastApiError } from '@/utils/errors';
import type { AjusteInventario, AjusteInventarioEditRequest, Proveedor, MotivoAjusteInventario } from '@/types/api';

const MOTIVOS_INTERNOS: Record<'entrada' | 'salida', { value: MotivoAjusteInventario; label: string }[]> = {
  entrada: [
    { value: 'conteo_fisico', label: 'Corrección por conteo físico' },
    { value: 'inventario_inicial', label: 'Inventario inicial' },
    { value: 'otro', label: 'Otro' },
  ],
  salida: [
    { value: 'conteo_fisico', label: 'Corrección por conteo físico' },
    { value: 'merma', label: 'Merma / producto dañado o vencido' },
    { value: 'consumo_interno', label: 'Consumo interno / uso propio' },
    { value: 'devolucion_proveedor', label: 'Devolución a proveedor' },
    { value: 'otro', label: 'Otro' },
  ],
};

const ES_COMPRA = (m: MotivoAjusteInventario) => m === 'compra_con_factura' || m === 'compra_sin_factura';

interface AjusteEditModalProps {
  ajuste: AjusteInventario;
  onClose: () => void;
  onSaved: (ajuste: AjusteInventario) => void;
}

/**
 * Corrige la metadata de un ajuste ya aplicado -- nunca el movimiento de
 * stock (tipo/almacén/líneas), que ya se aplicó de verdad y no debe
 * desincronizarse del kardex. Los ajustes históricos de compra (de antes del
 * módulo de Facturas de compra) conservan su motivo y sus datos de factura.
 */
export default function AjusteEditModal({ ajuste, onClose, onSaved }: AjusteEditModalProps): ReactElement {
  const esCompra = ES_COMPRA(ajuste.motivo);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [motivo, setMotivo] = useState<MotivoAjusteInventario>(ajuste.motivo);
  const [proveedorId, setProveedorId] = useState<string>(ajuste.proveedor ? String(ajuste.proveedor) : '');
  const [numeroDocumento, setNumeroDocumento] = useState(ajuste.numero_documento || '');
  const [numeroControl, setNumeroControl] = useState(ajuste.numero_control || '');
  const [fechaDocumento, setFechaDocumento] = useState(ajuste.fecha_documento || '');
  const [observaciones, setObservaciones] = useState(ajuste.observaciones || '');
  const [guardando, setGuardando] = useState(false);
  const usaProveedor = esCompra || motivo === 'devolucion_proveedor';

  useEffect(() => {
    getProveedores().then(setProveedores).catch(() => setProveedores([]));
  }, []);

  const guardar = async (): Promise<void> => {
    setGuardando(true);
    try {
      const payload: AjusteInventarioEditRequest = {
        motivo,
        proveedor: usaProveedor && proveedorId ? Number(proveedorId) : null,
        numero_documento: numeroDocumento,
        ...(esCompra ? { numero_control: numeroControl } : {}),
        fecha_documento: fechaDocumento || null,
        observaciones,
      };
      const actualizado = await editarAjusteInventario(ajuste.id, payload);
      toast.success('Ajuste corregido.');
      onSaved(actualizado);
    } catch (error) {
      toastApiError(error, 'No se pudo corregir el ajuste.');
    } finally {
      setGuardando(false);
    }
  };

  const campo = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';

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
          {esCompra ? (
            <input value={ajuste.motivo_display} disabled className={`${campo} bg-slate-50 text-slate-500`} />
          ) : (
            <select value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoAjusteInventario)} className={campo}>
              {MOTIVOS_INTERNOS[ajuste.tipo].map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          )}
        </div>
        {usaProveedor && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Proveedor</label>
            <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className={campo}>
              <option value="">Sin proveedor</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
        )}
        <div className={esCompra ? 'grid grid-cols-2 gap-3' : ''}>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{esCompra ? 'N° Documento' : 'Referencia'}</label>
            <input value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} className={campo} />
          </div>
          {esCompra && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">N° Control</label>
              <input value={numeroControl} onChange={(e) => setNumeroControl(e.target.value)} className={campo} />
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha del documento</label>
          <input type="date" value={fechaDocumento} onChange={(e) => setFechaDocumento(e.target.value)} className={campo} />
          {esCompra && (
            <p className="text-[11px] text-slate-400 mt-1">Es la que toma Cuentas por Pagar para calcular vencimiento y antigüedad -- vacía = se usa la fecha en que se cargó el ajuste.</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observaciones</label>
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className={campo} />
        </div>
      </div>
    </AppModal>
  );
}
