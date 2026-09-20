"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { FileBarChart, FileDown, FileSpreadsheet } from 'lucide-react';
import { PageHeader, Card, EmptyState, TableSkeleton, ActionButton } from '@/components/ui';
import { getCuentasContables, getLibroMayor, exportarLibroMayor, type CuentaContable, type LibroMayorResponse } from '@/services/contabilidadService';
import { useNotify } from '@/hooks/useNotify';
import EmpresaSelector from '../components/EmpresaSelector';

export default function LibroMayorPage(): ReactElement {
  const notify = useNotify();
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [cuentaId, setCuentaId] = useState<number | null>(null);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [datos, setDatos] = useState<LibroMayorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);

  useEffect(() => {
    if (!empresaId) return;
    setCuentaId(null);
    setDatos(null);
    getCuentasContables(empresaId).then((lista) => setCuentas(lista.filter((c) => c.acepta_movimiento))).catch(() => setCuentas([]));
  }, [empresaId]);

  const consultar = useCallback(async (): Promise<void> => {
    if (!empresaId || !cuentaId) return;
    setLoading(true);
    try {
      setDatos(await getLibroMayor(empresaId, cuentaId, desde || undefined, hasta || undefined));
    } catch {
      notify.error('No se pudo cargar el libro mayor.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, cuentaId, desde, hasta]);

  useEffect(() => { if (cuentaId) consultar(); }, [cuentaId, consultar]);

  const exportar = async (formato: 'pdf' | 'excel'): Promise<void> => {
    if (!empresaId || !cuentaId) return;
    setExportando(formato);
    try {
      await exportarLibroMayor(empresaId, cuentaId, formato, desde || undefined, hasta || undefined);
    } catch {
      notify.error('No se pudo generar el archivo.');
    } finally {
      setExportando(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileBarChart size={20} />}
        title="Libro Mayor"
        description="Movimientos de una cuenta específica, con saldo corriente."
        actions={
          <div className="flex items-center gap-2">
            <EmpresaSelector empresaId={empresaId} onChange={(id) => setEmpresaId(id)} />
            {cuentaId && datos && datos.movimientos.length > 0 && (
              <>
                <ActionButton variant="secondary" loading={exportando === 'pdf'} onClick={() => exportar('pdf')}><FileDown size={16} /> PDF</ActionButton>
                <ActionButton variant="secondary" loading={exportando === 'excel'} onClick={() => exportar('excel')}><FileSpreadsheet size={16} /> Excel</ActionButton>
              </>
            )}
          </div>
        }
      />

      {!empresaId ? (
        <Card><EmptyState icon={<FileBarChart size={28} />} title="Selecciona o crea una empresa" description="Necesitas una empresa contable para ver su libro mayor." /></Card>
      ) : (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cuenta</label>
              <select value={cuentaId ?? ''} onChange={(e) => setCuentaId(e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                <option value="">Selecciona una cuenta...</option>
                {cuentas.map((c) => <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>)}
              </select>
            </div>
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

      {empresaId && cuentaId && (
        loading ? (
          <TableSkeleton rows={6} />
        ) : !datos || datos.movimientos.length === 0 ? (
          <Card><EmptyState icon={<FileBarChart size={28} />} title="Sin movimientos" description="Esta cuenta no tiene movimientos en el rango seleccionado." /></Card>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <div className="px-5 py-3 border-b bg-slate-50 flex justify-between items-center">
              <span className="font-bold text-slate-800">{datos.cuenta.codigo} - {datos.cuenta.nombre}</span>
              <span className="text-sm font-black text-slate-900">Saldo final: ${parseFloat(datos.saldo_final).toFixed(2)}</span>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Asiento</th>
                  <th className="p-4">Descripción</th>
                  <th className="p-4 text-right">Debe</th>
                  <th className="p-4 text-right">Haber</th>
                  <th className="p-4 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datos.movimientos.map((m, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-4">{new Date(m.fecha + 'T00:00:00').toLocaleDateString()}</td>
                    <td className="p-4 font-mono text-slate-500">#{m.asiento_numero}</td>
                    <td className="p-4">{m.descripcion}</td>
                    <td className="p-4 text-right">{parseFloat(m.debe) > 0 ? parseFloat(m.debe).toFixed(2) : ''}</td>
                    <td className="p-4 text-right">{parseFloat(m.haber) > 0 ? parseFloat(m.haber).toFixed(2) : ''}</td>
                    <td className="p-4 text-right font-bold">{parseFloat(m.saldo).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}
    </div>
  );
}
