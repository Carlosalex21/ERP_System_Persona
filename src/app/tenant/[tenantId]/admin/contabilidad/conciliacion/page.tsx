"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Landmark, Check } from 'lucide-react';
import { PageHeader, Card, EmptyState, TableSkeleton } from '@/components/ui';
import {
  getCuentasContables, getConciliacionBancaria, marcarMovimientoConciliado,
  type CuentaContable, type ConciliacionBancariaResponse,
} from '@/services/contabilidadService';
import { useNotify } from '@/hooks/useNotify';
import EmpresaSelector from '../components/EmpresaSelector';

export default function ConciliacionBancariaPage(): ReactElement {
  const notify = useNotify();
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [cuentaId, setCuentaId] = useState<number | null>(null);
  const [hasta, setHasta] = useState('');
  const [datos, setDatos] = useState<ConciliacionBancariaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [marcando, setMarcando] = useState<number | null>(null);

  useEffect(() => {
    if (!empresaId) return;
    setCuentaId(null);
    setDatos(null);
    // Solo cuentas de Activo (Caja/Bancos) tienen sentido para conciliar
    // contra un estado de cuenta bancario real -- filtrar por 'activo' evita
    // que el contador intente conciliar, por ejemplo, una cuenta de Gastos.
    getCuentasContables(empresaId)
      .then((lista) => setCuentas(lista.filter((c) => c.acepta_movimiento && c.tipo === 'activo')))
      .catch(() => setCuentas([]));
  }, [empresaId]);

  const consultar = useCallback(async (): Promise<void> => {
    if (!empresaId || !cuentaId) return;
    setLoading(true);
    try {
      setDatos(await getConciliacionBancaria(empresaId, cuentaId, hasta || undefined));
    } catch {
      notify.error('No se pudo cargar la conciliación bancaria.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, cuentaId, hasta]);

  useEffect(() => { if (cuentaId) consultar(); }, [cuentaId, consultar]);

  const toggleConciliado = async (detalleId: number, actual: boolean): Promise<void> => {
    if (!empresaId) return;
    setMarcando(detalleId);
    try {
      await marcarMovimientoConciliado(empresaId, detalleId, !actual);
      await consultar();
    } catch {
      notify.error('No se pudo actualizar el movimiento.');
    } finally {
      setMarcando(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Landmark size={20} />}
        title="Conciliación Bancaria"
        description="Cruza los movimientos de Caja/Bancos según libros contra el estado de cuenta real."
        actions={<EmpresaSelector empresaId={empresaId} onChange={(id) => setEmpresaId(id)} />}
      />

      {!empresaId ? (
        <Card><EmptyState icon={<Landmark size={28} />} title="Selecciona o crea una empresa" description="Necesitas una empresa contable para conciliar sus cuentas." /></Card>
      ) : (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cuenta de Caja/Banco</label>
              <select value={cuentaId ?? ''} onChange={(e) => setCuentaId(e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                <option value="">Selecciona una cuenta...</option>
                {cuentas.map((c) => <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>)}
              </select>
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
          <Card><EmptyState icon={<Landmark size={28} />} title="Sin movimientos" description="Esta cuenta no tiene movimientos para conciliar." /></Card>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <div className="px-5 py-3 border-b bg-slate-50 grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-slate-400 text-xs font-bold uppercase block">Saldo según libros</span><span className="font-black text-slate-900">${parseFloat(datos.saldo_libros).toFixed(2)}</span></div>
              <div><span className="text-slate-400 text-xs font-bold uppercase block">Saldo conciliado</span><span className="font-black text-slate-900">${parseFloat(datos.saldo_conciliado).toFixed(2)}</span></div>
              <div>
                <span className="text-slate-400 text-xs font-bold uppercase block">Diferencia (pendiente)</span>
                <span className={`font-black ${Math.abs(parseFloat(datos.diferencia)) < 0.01 ? 'text-emerald-600' : 'text-amber-600'}`}>${parseFloat(datos.diferencia).toFixed(2)}</span>
              </div>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Asiento</th>
                  <th className="p-4">Descripción</th>
                  <th className="p-4 text-right">Debe</th>
                  <th className="p-4 text-right">Haber</th>
                  <th className="p-4 text-center">Conciliado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datos.movimientos.map((m) => (
                  <tr key={m.detalle_id} className={`hover:bg-slate-50 ${m.conciliado ? 'bg-emerald-50/40' : ''}`}>
                    <td className="p-4">{new Date(m.fecha + 'T00:00:00').toLocaleDateString()}</td>
                    <td className="p-4 font-mono text-slate-500">#{m.asiento_numero}</td>
                    <td className="p-4">{m.descripcion}</td>
                    <td className="p-4 text-right">{parseFloat(m.debe) > 0 ? parseFloat(m.debe).toFixed(2) : ''}</td>
                    <td className="p-4 text-right">{parseFloat(m.haber) > 0 ? parseFloat(m.haber).toFixed(2) : ''}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleConciliado(m.detalle_id, m.conciliado)}
                        disabled={marcando === m.detalle_id}
                        aria-label={m.conciliado ? 'Marcar como no conciliado' : 'Marcar como conciliado'}
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-md border-2 transition-colors disabled:opacity-40 ${
                          m.conciliado ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-primary-400'
                        }`}
                      >
                        <Check size={14} />
                      </button>
                    </td>
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
