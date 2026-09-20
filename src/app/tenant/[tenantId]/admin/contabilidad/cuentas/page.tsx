"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Plus, Calculator, Pencil, Trash2 } from 'lucide-react';
import { PageHeader, Card, EmptyState, TableSkeleton, ActionButton, ConfirmDialog } from '@/components/ui';
import { getCuentasContables, deleteCuentaContable, type CuentaContable } from '@/services/contabilidadService';
import { useNotify } from '@/hooks/useNotify';
import EmpresaSelector from '../components/EmpresaSelector';
import CuentaContableModal from './components/CuentaContableModal';

const ETIQUETA_TIPO: Record<string, string> = {
  activo: 'Activo', pasivo: 'Pasivo', patrimonio: 'Patrimonio', ingreso: 'Ingreso', costo: 'Costo', gasto: 'Gasto',
};
const COLOR_TIPO: Record<string, string> = {
  activo: 'bg-sky-50 text-sky-700 border-sky-200',
  pasivo: 'bg-amber-50 text-amber-700 border-amber-200',
  patrimonio: 'bg-violet-50 text-violet-700 border-violet-200',
  ingreso: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  costo: 'bg-orange-50 text-orange-700 border-orange-200',
  gasto: 'bg-red-50 text-red-700 border-red-200',
};

export default function PlanDeCuentasPage(): ReactElement {
  const notify = useNotify();
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<CuentaContable | null>(null);
  const [cuentaAEliminar, setCuentaAEliminar] = useState<CuentaContable | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async (id: number): Promise<void> => {
    setLoading(true);
    try {
      setCuentas(await getCuentasContables(id));
    } catch {
      notify.error('No se pudieron cargar las cuentas.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (empresaId) cargar(empresaId);
  }, [empresaId, cargar]);

  const confirmarEliminar = async (): Promise<void> => {
    if (!cuentaAEliminar || !empresaId) return;
    setEliminando(true);
    try {
      await deleteCuentaContable(cuentaAEliminar.id);
      notify.success('Cuenta eliminada.');
      setCuentaAEliminar(null);
      cargar(empresaId);
    } catch {
      notify.error('No se pudo eliminar la cuenta (puede tener movimientos o subcuentas).');
    } finally {
      setEliminando(false);
    }
  };

  const profundidad = (codigo: string): number => (codigo.match(/\./g) || []).length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Calculator size={20} />}
        title="Plan de Cuentas"
        description="El plan de cuentas de la empresa seleccionada -- las cuentas de grupo organizan, solo las hoja reciben asientos."
        actions={
          <div className="flex items-center gap-3">
            <EmpresaSelector empresaId={empresaId} onChange={(id) => setEmpresaId(id)} />
            {empresaId && (
              <ActionButton onClick={() => { setEditando(null); setModalAbierto(true); }}>
                <Plus size={16} /> Nueva Cuenta
              </ActionButton>
            )}
          </div>
        }
      />

      {!empresaId ? (
        <Card>
          <EmptyState icon={<Calculator size={28} />} title="Selecciona o crea una empresa" description="Necesitas una empresa contable para ver su plan de cuentas." />
        </Card>
      ) : loading ? (
        <TableSkeleton rows={8} />
      ) : cuentas.length === 0 ? (
        <Card>
          <EmptyState icon={<Calculator size={28} />} title="Esta empresa no tiene cuentas" description="Crea la primera cuenta del plan." />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-4">Código</th>
                <th className="p-4">Nombre</th>
                <th className="p-4">Tipo</th>
                <th className="p-4 text-center">Acepta Movimiento</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cuentas.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono text-slate-500">{c.codigo}</td>
                  <td className="p-4" style={{ paddingLeft: `${16 + profundidad(c.codigo) * 20}px` }}>
                    <span className={profundidad(c.codigo) === 0 ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}>{c.nombre}</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${COLOR_TIPO[c.tipo]}`}>{ETIQUETA_TIPO[c.tipo]}</span>
                  </td>
                  <td className="p-4 text-center">{c.acepta_movimiento ? '✓' : <span className="text-slate-300">—</span>}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setEditando(c); setModalAbierto(true); }} className="p-2 text-slate-400 hover:text-primary-600" aria-label="Editar cuenta">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setCuentaAEliminar(c)} className="p-2 text-slate-400 hover:text-red-500" aria-label="Eliminar cuenta">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {modalAbierto && empresaId && (
        <CuentaContableModal
          empresaId={empresaId}
          cuentas={cuentas}
          cuenta={editando}
          onClose={() => setModalAbierto(false)}
          onSaved={() => { setModalAbierto(false); cargar(empresaId); }}
        />
      )}

      <ConfirmDialog
        isOpen={!!cuentaAEliminar}
        title="Eliminar Cuenta"
        message={`¿Eliminar la cuenta "${cuentaAEliminar?.codigo} - ${cuentaAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={eliminando}
        onConfirm={confirmarEliminar}
        onCancel={() => setCuentaAEliminar(null)}
      />
    </div>
  );
}
