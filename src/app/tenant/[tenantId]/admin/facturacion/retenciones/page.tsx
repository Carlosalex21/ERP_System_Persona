"use client";

import { useState, useEffect, useCallback, memo, type ReactElement } from 'react';
import { Plus, Loader2, Pencil, Trash2, ReceiptText } from 'lucide-react';
import toast from 'react-hot-toast';
import { Retencion } from '@/types/api';
import { getRetenciones, deleteRetencion } from '@/services/facturacionService';
import { getApiErrorMessages, parseDecimal } from '@/utils/helpers';
import RetencionModal from './RetencionModal';

interface RetencionRowProps {
  retencion: Retencion;
  onEditar: (retencion: Retencion) => void;
  onEliminar: (retencion: Retencion) => void;
}

const RETENCION_LABELS: Record<string, string> = {
  islr: 'ISLR',
  iva: 'IVA',
  otros: 'Otros',
};

const RetencionRow = memo(function RetencionRow({
  retencion,
  onEditar,
  onEliminar,
}: RetencionRowProps): ReactElement {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="p-4 pl-6 text-slate-600">
        {retencion.factura ? `#${retencion.factura}` : '—'}
      </td>
      <td className="p-4 text-slate-600">{retencion.proveedor ? `#${retencion.proveedor}` : '—'}</td>
      <td className="p-4">
        <span className="px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 text-[10px] font-bold uppercase">
          {RETENCION_LABELS[retencion.tipo_retencion] || retencion.tipo_retencion}
        </span>
      </td>
      <td className="p-4 font-mono font-bold text-slate-900">{retencion.numero_comprobante || '—'}</td>
      <td className="p-4 text-right font-mono">{parseDecimal(retencion.porcentaje).toFixed(2)}%</td>
      <td className="p-4 text-right font-mono">{parseDecimal(retencion.base).toFixed(2)}</td>
      <td className="p-4 text-right font-black text-primary-700 font-mono">
        {parseDecimal(retencion.monto).toFixed(2)}
      </td>
      <td className="p-4 text-slate-600">{new Date(retencion.fecha_emision).toLocaleDateString('es-VE')}</td>
      <td className="p-4 text-right">
        <div className="flex justify-end gap-1">
          <button
            onClick={() => onEditar(retencion)}
            className="p-2 text-slate-400 hover:text-primary-600 transition-colors"
            aria-label={`Editar retención ${retencion.id}`}
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onEliminar(retencion)}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            aria-label={`Eliminar retención ${retencion.id}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
});

export default function RetencionesPage(): ReactElement {
  const [retenciones, setRetenciones] = useState<Retencion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Retencion | null>(null);

  const loadData = useCallback(async () => {
    setCargando(true);
    try {
      const data = await getRetenciones();
      setRetenciones(data);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('Error al cargar las retenciones.');
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const abrirCrear = useCallback(() => {
    setEditando(null);
    setModalAbierto(true);
  }, []);

  const abrirEditar = useCallback((retencion: Retencion) => {
    setEditando(retencion);
    setModalAbierto(true);
  }, []);

  const eliminar = useCallback(
    async (retencion: Retencion) => {
      if (!window.confirm(`¿Eliminar la retención #${retencion.id}?`)) return;
      try {
        await deleteRetencion(retencion.id);
        toast.success('Retención eliminada.');
        loadData();
      } catch (error) {
        const messages = getApiErrorMessages(error);
        if (messages.length > 0) {
          messages.forEach((msg) => toast.error(msg));
        } else {
          toast.error('Error al eliminar la retención.');
        }
      }
    },
    [loadData],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Retenciones</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestiona comprobantes de retención (el backend calcula el monto y genera el N° de comprobante).
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
        >
          <Plus size={18} /> Nueva Retención
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center h-48 text-slate-500">
            <Loader2 size={24} className="animate-spin mr-2" /> Cargando retenciones...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-4 pl-6">Factura</th>
                  <th className="p-4">Proveedor</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">N° Comprobante</th>
                  <th className="p-4 text-right">%</th>
                  <th className="p-4 text-right">Base</th>
                  <th className="p-4 text-right">Monto</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {retenciones.map((retencion) => (
                  <RetencionRow
                    key={retencion.id}
                    retencion={retencion}
                    onEditar={abrirEditar}
                    onEliminar={eliminar}
                  />
                ))}
                {retenciones.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 text-sm">
                      No hay retenciones registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAbierto && (
        <RetencionModal
          retencion={editando}
          onClose={() => setModalAbierto(false)}
          onSaved={() => {
            setModalAbierto(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
