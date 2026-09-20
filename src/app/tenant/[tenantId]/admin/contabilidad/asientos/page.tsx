"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, BookOpen, Ban, ChevronDown, ChevronUp, CheckCircle2, Paperclip, FileCheck2, Copy } from 'lucide-react';
import { PageHeader, Card, EmptyState, TableSkeleton, DataTable, ActionButton, ConfirmDialog } from '@/components/ui';
import {
  getAsientosContables, anularAsientoContable, contabilizarAsientoBorrador,
  subirComprobanteAsiento, guardarAsientoComoPlantilla, type AsientoContable,
} from '@/services/contabilidadService';
import { useNotify } from '@/hooks/useNotify';
import EmpresaSelector from '../components/EmpresaSelector';
import NuevoAsientoModal from './components/NuevoAsientoModal';
import GuardarPlantillaModal from './components/GuardarPlantillaModal';

const ESTADO_ESTILOS: Record<string, string> = {
  anulado: 'bg-red-50 text-red-600 border-red-200',
  borrador: 'bg-amber-50 text-amber-700 border-amber-200',
  contabilizado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const ESTADO_ETIQUETAS: Record<string, string> = {
  anulado: 'Anulado', borrador: 'Borrador', contabilizado: 'Contabilizado',
};

interface FilaExpandibleProps {
  asiento: AsientoContable;
  onAnular: (a: AsientoContable) => void;
  onContabilizar: (a: AsientoContable) => void;
  onSubirComprobante: (a: AsientoContable, archivo: File) => void;
  onGuardarPlantilla: (a: AsientoContable) => void;
  subiendoComprobante: boolean;
}

function FilaExpandible({ asiento, onAnular, onContabilizar, onSubirComprobante, onGuardarPlantilla, subiendoComprobante }: FilaExpandibleProps): ReactElement {
  const [abierto, setAbierto] = useState(false);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setAbierto((v) => !v)}>
        <td className="p-4 font-mono text-slate-500">
          <div className="flex items-center gap-1.5">
            {abierto ? <ChevronUp size={14} /> : <ChevronDown size={14} />} #{asiento.numero}
          </div>
        </td>
        <td className="p-4">{new Date(asiento.fecha + 'T00:00:00').toLocaleDateString()}</td>
        <td className="p-4 font-semibold text-slate-800">{asiento.descripcion}</td>
        <td className="p-4 text-right font-bold">${parseFloat(asiento.total).toFixed(2)}</td>
        <td className="p-4">
          <span className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${ESTADO_ESTILOS[asiento.estado]}`}>
            {ESTADO_ETIQUETAS[asiento.estado]}
          </span>
        </td>
        <td className="p-4">
          <div className="flex justify-end items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {asiento.estado === 'borrador' && (
              <button onClick={() => onContabilizar(asiento)} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-emerald-600" aria-label={`Contabilizar asiento ${asiento.numero}`}>
                <CheckCircle2 size={14} /> Contabilizar
              </button>
            )}
            {asiento.estado !== 'anulado' && (
              <button onClick={() => onGuardarPlantilla(asiento)} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-primary-600" aria-label={`Guardar asiento ${asiento.numero} como plantilla`}>
                <Copy size={14} /> Plantilla
              </button>
            )}
            {asiento.comprobante ? (
              <a
                href={asiento.comprobante}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-primary-600"
              >
                <FileCheck2 size={14} /> Ver comprobante
              </a>
            ) : asiento.estado !== 'anulado' && (
              <>
                <button onClick={() => inputArchivoRef.current?.click()} disabled={subiendoComprobante} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-primary-600 disabled:opacity-40" aria-label={`Adjuntar comprobante al asiento ${asiento.numero}`}>
                  <Paperclip size={14} /> Adjuntar
                </button>
                <input
                  ref={inputArchivoRef} type="file" className="hidden" accept="image/*,application/pdf"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onSubirComprobante(asiento, f); e.target.value = ''; }}
                />
              </>
            )}
            {asiento.estado === 'contabilizado' && (
              <button
                onClick={() => onAnular(asiento)}
                className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-red-500"
                aria-label={`Anular asiento ${asiento.numero}`}
              >
                <Ban size={14} /> Anular
              </button>
            )}
          </div>
        </td>
      </tr>
      {abierto && (
        <tr>
          <td colSpan={6} className="p-0 bg-slate-50">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200">
                  <th className="py-2 pl-10 text-left">Cuenta</th>
                  <th className="py-2 text-right">Debe</th>
                  <th className="py-2 pr-6 text-right">Haber</th>
                </tr>
              </thead>
              <tbody>
                {asiento.detalles.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pl-10">{d.cuenta_codigo} - {d.cuenta_nombre}{d.descripcion ? ` (${d.descripcion})` : ''}</td>
                    <td className="py-2 text-right">{parseFloat(d.debe) > 0 ? parseFloat(d.debe).toFixed(2) : ''}</td>
                    <td className="py-2 pr-6 text-right">{parseFloat(d.haber) > 0 ? parseFloat(d.haber).toFixed(2) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AsientosContablesPage(): ReactElement {
  const notify = useNotify();
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [asientos, setAsientos] = useState<AsientoContable[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [asientoAAnular, setAsientoAAnular] = useState<AsientoContable | null>(null);
  const [anulando, setAnulando] = useState(false);
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);
  const [asientoParaPlantilla, setAsientoParaPlantilla] = useState<AsientoContable | null>(null);

  const cargar = useCallback(async (id: number): Promise<void> => {
    setLoading(true);
    try {
      setAsientos(await getAsientosContables(id));
    } catch {
      notify.error('No se pudieron cargar los asientos.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (empresaId) cargar(empresaId);
  }, [empresaId, cargar]);

  const confirmarAnular = async (): Promise<void> => {
    if (!asientoAAnular || !empresaId) return;
    setAnulando(true);
    try {
      await anularAsientoContable(asientoAAnular.id);
      notify.success('Asiento anulado.');
      setAsientoAAnular(null);
      cargar(empresaId);
    } catch {
      notify.error('No se pudo anular el asiento.');
    } finally {
      setAnulando(false);
    }
  };

  const handleContabilizar = async (asiento: AsientoContable): Promise<void> => {
    if (!empresaId) return;
    try {
      await contabilizarAsientoBorrador(asiento.id);
      notify.success('Asiento contabilizado.');
      cargar(empresaId);
    } catch (error: any) {
      notify.error(error?.response?.data?.error || 'No se pudo contabilizar el asiento.');
    }
  };

  const handleSubirComprobante = async (asiento: AsientoContable, archivo: File): Promise<void> => {
    if (!empresaId) return;
    setSubiendoComprobante(true);
    try {
      await subirComprobanteAsiento(asiento.id, archivo);
      notify.success('Comprobante adjuntado.');
      cargar(empresaId);
    } catch {
      notify.error('No se pudo adjuntar el comprobante.');
    } finally {
      setSubiendoComprobante(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BookOpen size={20} />}
        title="Asientos Contables"
        description="Partida doble -- cada asiento debe cuadrar (Debe = Haber) para poder contabilizarse."
        actions={
          <div className="flex items-center gap-3">
            <EmpresaSelector empresaId={empresaId} onChange={(id) => setEmpresaId(id)} />
            {empresaId && (
              <ActionButton onClick={() => setModalAbierto(true)}>
                <Plus size={16} /> Nuevo Asiento
              </ActionButton>
            )}
          </div>
        }
      />

      {!empresaId ? (
        <Card><EmptyState icon={<BookOpen size={28} />} title="Selecciona o crea una empresa" description="Necesitas una empresa contable para ver sus asientos." /></Card>
      ) : loading ? (
        <TableSkeleton rows={6} />
      ) : asientos.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen size={28} />}
            title="Esta empresa no tiene asientos todavía"
            description="Registra el primer asiento contable."
            action={<ActionButton onClick={() => setModalAbierto(true)}><Plus size={16} /> Crear primer asiento</ActionButton>}
          />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-4">N°</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Descripción</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4">Estado</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {asientos.map((a) => (
                <FilaExpandible
                  key={a.id}
                  asiento={a}
                  onAnular={setAsientoAAnular}
                  onContabilizar={handleContabilizar}
                  onSubirComprobante={handleSubirComprobante}
                  onGuardarPlantilla={setAsientoParaPlantilla}
                  subiendoComprobante={subiendoComprobante}
                />
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {modalAbierto && empresaId && (
        <NuevoAsientoModal
          empresaId={empresaId}
          onClose={() => setModalAbierto(false)}
          onCreado={() => { setModalAbierto(false); cargar(empresaId); }}
        />
      )}

      <ConfirmDialog
        isOpen={!!asientoAAnular}
        title="Anular Asiento"
        message={`¿Anular el asiento #${asientoAAnular?.numero}? Queda en el historial marcado como anulado, no se borra.`}
        confirmLabel="Anular"
        loading={anulando}
        onConfirm={confirmarAnular}
        onCancel={() => setAsientoAAnular(null)}
      />

      {asientoParaPlantilla && empresaId && (
        <GuardarPlantillaModal
          asiento={asientoParaPlantilla}
          onClose={() => setAsientoParaPlantilla(null)}
          onGuardada={() => setAsientoParaPlantilla(null)}
        />
      )}
    </div>
  );
}
