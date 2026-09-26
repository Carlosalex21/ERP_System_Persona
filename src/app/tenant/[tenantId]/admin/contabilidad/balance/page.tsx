"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Scale, FileDown, FileSpreadsheet } from 'lucide-react';
import { PageHeader, Card, EmptyState, TableSkeleton, ActionButton } from '@/components/ui';
import { getBalanceComprobacion, exportarBalanceComprobacion, type FilaBalanceComprobacion } from '@/services/contabilidadService';
import { useNotify } from '@/hooks/useNotify';
import EmpresaSelector from '../components/EmpresaSelector';

export default function BalanceComprobacionPage(): ReactElement {
  const notify = useNotify();
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [filas, setFilas] = useState<FilaBalanceComprobacion[] | null>(null);
  const [loading, setLoading] = useState(true);
  // Hasta que `EmpresaSelector` resuelva la lista, no se sabe si hay empresa:
  // antes se mostraba "Selecciona o crea una empresa" durante la carga.
  const [empresaResuelta, setEmpresaResuelta] = useState(false);
  const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);

  const consultar = useCallback(async (): Promise<void> => {
    if (!empresaId) return;
    setLoading(true);
    try {
      setFilas(await getBalanceComprobacion(empresaId, desde || undefined, hasta || undefined));
    } catch {
      notify.error('No se pudo cargar el balance de comprobación.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, desde, hasta]);

  useEffect(() => { if (empresaId) consultar(); }, [empresaId, consultar]);

  const exportar = async (formato: 'pdf' | 'excel'): Promise<void> => {
    if (!empresaId) return;
    setExportando(formato);
    try {
      await exportarBalanceComprobacion(empresaId, formato, desde || undefined, hasta || undefined);
    } catch {
      notify.error('No se pudo generar el archivo.');
    } finally {
      setExportando(null);
    }
  };

  const totalDebe = (filas || []).reduce((s, f) => s + parseFloat(f.debe), 0);
  const totalHaber = (filas || []).reduce((s, f) => s + parseFloat(f.haber), 0);
  const cuadra = Math.abs(totalDebe - totalHaber) < 0.01;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Scale size={20} />}
        title="Balance de Comprobación"
        description="Suma de débitos/créditos y saldo por cuenta -- confirma que la contabilidad sigue cuadrada."
        actions={
          <div className="flex items-center gap-2">
            <EmpresaSelector empresaId={empresaId} onChange={(id) => setEmpresaId(id)} onResuelto={() => setEmpresaResuelta(true)} />
            {empresaId && filas && filas.length > 0 && (
              <>
                <ActionButton variant="secondary" loading={exportando === 'pdf'} onClick={() => exportar('pdf')}><FileDown size={16} /> PDF</ActionButton>
                <ActionButton variant="secondary" loading={exportando === 'excel'} onClick={() => exportar('excel')}><FileSpreadsheet size={16} /> Excel</ActionButton>
              </>
            )}
          </div>
        }
      />

      {!empresaResuelta ? (
        <TableSkeleton rows={6} />
      ) : !empresaId ? (
        <Card><EmptyState icon={<Scale size={28} />} title="Selecciona o crea una empresa" description="Necesitas una empresa contable para ver su balance." /></Card>
      ) : (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Desde</label>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} onBlur={consultar} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hasta</label>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} onBlur={consultar} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
        </Card>
      )}

      {empresaId && (
        loading ? (
          <TableSkeleton rows={6} />
        ) : !filas || filas.length === 0 ? (
          <Card><EmptyState icon={<Scale size={28} />} title="Sin movimientos" description="No hay asientos contabilizados en el rango seleccionado." /></Card>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-4">Código</th>
                  <th className="p-4">Cuenta</th>
                  <th className="p-4 text-right">Debe</th>
                  <th className="p-4 text-right">Haber</th>
                  <th className="p-4 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map((f) => (
                  <tr key={f.cuenta_id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono text-slate-500">{f.codigo}</td>
                    <td className="p-4 font-semibold text-slate-800">{f.nombre}</td>
                    <td className="p-4 text-right">{parseFloat(f.debe).toFixed(2)}</td>
                    <td className="p-4 text-right">{parseFloat(f.haber).toFixed(2)}</td>
                    <td className="p-4 text-right font-bold">{parseFloat(f.saldo).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 font-black text-slate-900">
                  <td className="p-4" colSpan={2}>Totales</td>
                  <td className="p-4 text-right">{totalDebe.toFixed(2)}</td>
                  <td className="p-4 text-right">{totalHaber.toFixed(2)}</td>
                  <td className={`p-4 text-right ${cuadra ? 'text-emerald-600' : 'text-red-600'}`}>{cuadra ? '✓ Cuadra' : '⚠ No cuadra'}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
        )
      )}
    </div>
  );
}
