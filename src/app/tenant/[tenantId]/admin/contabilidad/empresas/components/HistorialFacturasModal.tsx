"use client";

import { useState, useEffect, useMemo, type ReactElement } from 'react';
import { History, FileText } from 'lucide-react';
import { AppModal, ActionButton, EmptyState, TableSkeleton } from '@/components/ui';
import { getFacturasPorCliente, verFacturaPdf } from '@/services/facturacionService';
import { useNotify } from '@/hooks/useNotify';
import type { Factura } from '@/types/api';
import type { EmpresaContable } from '@/services/contabilidadService';
import { useMonedaVista } from '@/context/MonedaVistaContext';

interface HistorialFacturasModalProps {
  empresa: EmpresaContable;
  onClose: () => void;
}

const mesISO = (fecha: string): string => fecha.slice(0, 7);

export default function HistorialFacturasModal({ empresa, onClose }: HistorialFacturasModalProps): ReactElement {
  const { formatear, formatearDocumento } = useMonedaVista();
  const notify = useNotify();
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState('');
  const [abriendoId, setAbriendoId] = useState<number | null>(null);

  useEffect(() => {
    if (!empresa.cliente) return;
    setLoading(true);
    getFacturasPorCliente(empresa.cliente)
      .then((lista) => setFacturas(lista.sort((a, b) => b.fecha_operacion.localeCompare(a.fecha_operacion))))
      .catch(() => notify.error('No se pudo cargar el historial de facturas.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa.cliente]);

  const facturasFiltradas = useMemo(
    () => (mes ? facturas.filter((f) => mesISO(f.fecha_operacion) === mes) : facturas),
    [facturas, mes],
  );
  const total = facturasFiltradas.reduce((s, f) => s + parseFloat(f.total_base || f.total), 0);

  const verPdf = async (facturaId: number): Promise<void> => {
    setAbriendoId(facturaId);
    try {
      await verFacturaPdf(facturaId);
    } catch {
      notify.error('No se pudo abrir el PDF de la factura.');
    } finally {
      setAbriendoId(null);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={`Historial de Facturas — ${empresa.cliente_nombre || empresa.nombre}`}
      icon={<History size={20} />}
      size="lg"
      footer={<ActionButton variant="secondary" onClick={onClose}>Cerrar</ActionButton>}
    >
      <div className="space-y-4">
        {!empresa.cliente ? (
          <EmptyState icon={<History size={28} />} title="Sin cliente vinculado" description="Enlaza un cliente en Editar para poder ver y facturar su historial." />
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filtrar por mes</label>
                <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
              </div>
              {facturasFiltradas.length > 0 && (
                <div className="text-right">
                  <span className="block text-xs font-bold text-slate-400 uppercase">Total {mes ? 'del mes' : 'histórico'}</span>
                  <span className="text-lg font-black text-slate-900">{formatear(total)}</span>
                </div>
              )}
            </div>

            {loading ? (
              <TableSkeleton rows={4} />
            ) : facturasFiltradas.length === 0 ? (
              <EmptyState icon={<History size={28} />} title="Sin facturas" description={mes ? 'No hay facturas para el mes seleccionado.' : 'Todavía no se le ha facturado nada a esta empresa.'} />
            ) : (
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Correlativo</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {facturasFiltradas.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50">
                        <td className="p-3">{new Date(f.fecha_operacion).toLocaleDateString()}</td>
                        <td className="p-3 font-mono text-slate-500">{f.correlativo || `#${f.id}`}</td>
                        <td className="p-3 text-right font-semibold">{formatearDocumento(f.total, f.total_base, f.moneda_codigo)}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => verPdf(f.id)}
                            disabled={abriendoId === f.id}
                            className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 ml-auto disabled:opacity-40"
                          >
                            <FileText size={14} /> PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AppModal>
  );
}
