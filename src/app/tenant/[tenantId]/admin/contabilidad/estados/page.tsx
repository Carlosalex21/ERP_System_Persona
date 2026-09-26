"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { FileBarChart, AlertTriangle, FileDown, FileSpreadsheet, Lock } from 'lucide-react';
import { PageHeader, Card, EmptyState, TableSkeleton, ActionButton } from '@/components/ui';
import { getEstadosFinancieros, exportarEstadosFinancieros, type EstadosFinancierosResponse, type FilaBalanceComprobacion } from '@/services/contabilidadService';
import { useNotify } from '@/hooks/useNotify';
import EmpresaSelector from '../components/EmpresaSelector';
import CerrarEjercicioModal from './components/CerrarEjercicioModal';
import { useMonedaVista } from '@/context/MonedaVistaContext';

function GrupoCuentas({ titulo, filas, total }: { titulo: string; filas: FilaBalanceComprobacion[]; total: string }): ReactElement {
  const { formatearEnBase } = useMonedaVista();
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase mb-2">{titulo}</p>
      {filas.length === 0 ? (
        <p className="text-xs text-slate-300 pl-2">Sin movimientos</p>
      ) : (
        <div className="space-y-1">
          {filas.map((f) => (
            <div key={f.cuenta_id} className="flex justify-between text-sm pl-2">
              <span className="text-slate-600">{f.nombre}</span>
              <span className="font-semibold text-slate-800">{formatearEnBase(parseFloat(f.saldo))}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-between text-sm font-black text-slate-900 border-t border-dashed mt-2 pt-2">
        <span>Total {titulo}</span>
        <span>{formatearEnBase(parseFloat(total))}</span>
      </div>
    </div>
  );
}

export default function EstadosFinancierosPage(): ReactElement {
  const { formatearEnBase } = useMonedaVista();
  const notify = useNotify();
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [datos, setDatos] = useState<EstadosFinancierosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  // Hasta que `EmpresaSelector` resuelva la lista, no se sabe si hay empresa:
  // antes se mostraba "Selecciona o crea una empresa" durante la carga.
  const [empresaResuelta, setEmpresaResuelta] = useState(false);
  const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);
  const [modalCierreAbierto, setModalCierreAbierto] = useState(false);

  const consultar = useCallback(async (): Promise<void> => {
    if (!empresaId) return;
    setLoading(true);
    try {
      setDatos(await getEstadosFinancieros(empresaId, desde || undefined, hasta || undefined));
    } catch {
      notify.error('No se pudieron cargar los estados financieros.');
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
      await exportarEstadosFinancieros(empresaId, formato, desde || undefined, hasta || undefined);
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
        title="Estados Financieros"
        description="Balance General y Estado de Resultados, derivados de los asientos contabilizados."
        actions={
          <div className="flex items-center gap-2">
            <EmpresaSelector empresaId={empresaId} onChange={(id) => setEmpresaId(id)} onResuelto={() => setEmpresaResuelta(true)} />
            {empresaId && datos && (
              <>
                <ActionButton variant="secondary" loading={exportando === 'pdf'} onClick={() => exportar('pdf')}><FileDown size={16} /> PDF</ActionButton>
                <ActionButton variant="secondary" loading={exportando === 'excel'} onClick={() => exportar('excel')}><FileSpreadsheet size={16} /> Excel</ActionButton>
                <ActionButton variant="secondary" onClick={() => setModalCierreAbierto(true)}><Lock size={16} /> Cerrar Ejercicio</ActionButton>
              </>
            )}
          </div>
        }
      />

      {!empresaResuelta ? (
        <TableSkeleton rows={6} />
      ) : !empresaId ? (
        <Card><EmptyState icon={<FileBarChart size={28} />} title="Selecciona o crea una empresa" description="Necesitas una empresa contable para ver sus estados financieros." /></Card>
      ) : (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Desde</label>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} onBlur={consultar} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hasta (corte)</label>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} onBlur={consultar} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
        </Card>
      )}

      {empresaId && (
        loading ? (
          <TableSkeleton rows={8} />
        ) : !datos ? (
          <Card><EmptyState icon={<FileBarChart size={28} />} title="Sin datos" description="No hay asientos contabilizados en el rango seleccionado." /></Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-bold text-slate-800 mb-4">Balance General</h3>
              {!datos.balance_general.cuadra && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-2 rounded-lg mb-4">
                  <AlertTriangle size={14} /> Activo ≠ Pasivo + Patrimonio -- revisa los asientos.
                </div>
              )}
              <div className="space-y-5">
                <GrupoCuentas titulo="Activo" filas={datos.balance_general.activo} total={datos.balance_general.total_activo} />
                <GrupoCuentas titulo="Pasivo" filas={datos.balance_general.pasivo} total={datos.balance_general.total_pasivo} />
                <GrupoCuentas titulo="Patrimonio" filas={datos.balance_general.patrimonio} total={datos.balance_general.total_patrimonio} />
                <div className="flex justify-between text-sm font-semibold text-slate-500 pl-2">
                  <span>Utilidad del período (no cerrada a Patrimonio)</span>
                  <span>{formatearEnBase(parseFloat(datos.balance_general.utilidad_periodo))}</span>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="font-bold text-slate-800 mb-4">Estado de Resultados</h3>
              <div className="space-y-5">
                <GrupoCuentas titulo="Ingresos" filas={datos.estado_resultados.ingresos} total={datos.estado_resultados.total_ingresos} />
                <GrupoCuentas titulo="Costos" filas={datos.estado_resultados.costos} total={datos.estado_resultados.total_costos} />
                <GrupoCuentas titulo="Gastos" filas={datos.estado_resultados.gastos} total={datos.estado_resultados.total_gastos} />
                <div className={`flex justify-between items-center px-4 py-3 rounded-xl border-2 ${
                  parseFloat(datos.estado_resultados.utilidad_periodo) >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
                }`}>
                  <span className="text-sm font-bold text-slate-600">
                    {parseFloat(datos.estado_resultados.utilidad_periodo) >= 0 ? 'Utilidad del Período' : 'Pérdida del Período'}
                  </span>
                  <span className={`text-lg font-black ${parseFloat(datos.estado_resultados.utilidad_periodo) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatearEnBase(Math.abs(parseFloat(datos.estado_resultados.utilidad_periodo)))}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )
      )}

      {modalCierreAbierto && empresaId && (
        <CerrarEjercicioModal
          empresaId={empresaId}
          onClose={() => setModalCierreAbierto(false)}
          onCerrado={() => { setModalCierreAbierto(false); consultar(); }}
        />
      )}
    </div>
  );
}
