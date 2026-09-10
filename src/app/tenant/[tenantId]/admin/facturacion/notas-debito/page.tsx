"use client";

import { useState, useEffect, useCallback, memo, type ReactElement } from 'react';
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Factura, NotaDebito } from '@/types/api';
import { getNotasDebito, getFacturas, deleteNotaDebito } from '@/services/facturacionService';
import { getApiErrorMessages, parseDecimal } from '@/utils/helpers';
import NotaDebitoModal from './NotaDebitoModal';

interface NotaDebitoRowProps {
  nota: NotaDebito;
  facturas: Factura[];
  onEditar: (nota: NotaDebito) => void;
  onEliminar: (nota: NotaDebito) => void;
}

const NotaDebitoRow = memo(function NotaDebitoRow({
  nota,
  facturas,
  onEditar,
  onEliminar,
}: NotaDebitoRowProps): ReactElement {
  const factura = facturas.find((f) => f.id === nota.factura);
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="p-4 pl-6 font-bold text-slate-900">{nota.numero_nota}</td>
      <td className="p-4 font-mono text-slate-500">{nota.numero_control || '—'}</td>
      <td className="p-4 text-slate-600">
        {factura ? `#${factura.correlativo || factura.id}` : `#${nota.factura}`}
      </td>
      <td className="p-4 text-slate-600">{new Date(nota.fecha_emision).toLocaleDateString('es-VE')}</td>
      <td className="p-4 text-slate-700 max-w-[220px] truncate" title={nota.motivo}>
        {nota.motivo}
      </td>
      <td className="p-4 text-right font-mono">{parseDecimal(nota.base_imponible).toFixed(2)}</td>
      <td className="p-4 text-right font-mono">{parseDecimal(nota.iva_total).toFixed(2)}</td>
      <td className="p-4 text-right font-black text-primary-700 font-mono">
        {parseDecimal(nota.total).toFixed(2)}
      </td>
      <td className="p-4 text-right">
        <div className="flex justify-end gap-1">
          <button
            onClick={() => onEditar(nota)}
            className="p-2 text-slate-400 hover:text-primary-600 transition-colors"
            aria-label={`Editar nota ${nota.numero_nota}`}
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onEliminar(nota)}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            aria-label={`Eliminar nota ${nota.numero_nota}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
});

export default function NotasDebitoPage(): ReactElement {
  const [notas, setNotas] = useState<NotaDebito[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<NotaDebito | null>(null);

  const loadData = useCallback(async () => {
    setCargando(true);
    try {
      const [notasData, facturasData] = await Promise.all([getNotasDebito(), getFacturas()]);
      setNotas(notasData);
      setFacturas(facturasData);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('Error al cargar las notas de débito.');
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

  const abrirEditar = useCallback((nota: NotaDebito) => {
    setEditando(nota);
    setModalAbierto(true);
  }, []);

  const eliminar = useCallback(
    async (nota: NotaDebito) => {
      if (!window.confirm(`¿Eliminar la nota de débito ${nota.numero_nota}?`)) return;
      try {
        await deleteNotaDebito(nota.id);
        toast.success('Nota de débito eliminada.');
        loadData();
      } catch (error) {
        const messages = getApiErrorMessages(error);
        if (messages.length > 0) {
          messages.forEach((msg) => toast.error(msg));
        } else {
          toast.error('Error al eliminar la nota de débito.');
        }
      }
    },
    [loadData],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notas de Débito</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registra notas de débito asociadas a facturas (el backend calcula el desglose).
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
        >
          <Plus size={18} /> Nueva Nota de Débito
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center h-48 text-slate-500">
            <Loader2 size={24} className="animate-spin mr-2" /> Cargando notas de débito...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-4 pl-6">N° Nota</th>
                  <th className="p-4">Control</th>
                  <th className="p-4">Factura</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Motivo</th>
                  <th className="p-4 text-right">Base</th>
                  <th className="p-4 text-right">IVA</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notas.map((nota) => (
                  <NotaDebitoRow
                    key={nota.id}
                    nota={nota}
                    facturas={facturas}
                    onEditar={abrirEditar}
                    onEliminar={eliminar}
                  />
                ))}
                {notas.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 text-sm">
                      No hay notas de débito registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAbierto && (
        <NotaDebitoModal
          nota={editando}
          facturas={facturas}
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
