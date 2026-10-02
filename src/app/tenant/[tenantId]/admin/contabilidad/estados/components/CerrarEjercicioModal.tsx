"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';
import { AppModal, ActionButton } from '@/components/ui';
import { getCuentasContables, cerrarEjercicio, type CuentaContable } from '@/services/contabilidadService';
import { useNotify } from '@/hooks/useNotify';

import { mensajeDeErrorUnico } from '@/utils/mensajesError';
interface CerrarEjercicioModalProps {
  empresaId: number;
  onClose: () => void;
  onCerrado: () => void;
}

const hoyISO = (): string => new Date().toISOString().slice(0, 10);
const primerDiaDelAnioISO = (): string => `${new Date().getFullYear()}-01-01`;

export default function CerrarEjercicioModal({ empresaId, onClose, onCerrado }: CerrarEjercicioModalProps): ReactElement {
  const notify = useNotify();
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [fechaDesde, setFechaDesde] = useState(primerDiaDelAnioISO());
  const [fechaHasta, setFechaHasta] = useState(hoyISO());
  const [cuentaPatrimonioId, setCuentaPatrimonioId] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getCuentasContables(empresaId)
      .then((lista) => setCuentas(lista.filter((c) => c.acepta_movimiento && c.tipo === 'patrimonio')))
      .catch(() => setCuentas([]));
  }, [empresaId]);

  const cerrar = async (): Promise<void> => {
    if (!cuentaPatrimonioId) {
      notify.error('Selecciona a qué cuenta de Patrimonio se enviará la utilidad/pérdida del período.');
      return;
    }
    if (fechaDesde > fechaHasta) {
      notify.error('La fecha desde no puede ser posterior a la fecha hasta.');
      return;
    }
    setGuardando(true);
    try {
      await cerrarEjercicio(empresaId, {
        fecha_desde: fechaDesde, fecha_hasta: fechaHasta, cuenta_patrimonio_id: Number(cuentaPatrimonioId),
      });
      notify.success('Ejercicio cerrado -- Ingresos/Costos/Gastos quedaron en cero y la utilidad se trasladó a Patrimonio.');
      onCerrado();
    } catch (error: any) {
      notify.error(mensajeDeErrorUnico(error, 'No se pudo cerrar el ejercicio.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Cerrar Ejercicio"
      icon={<Lock size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={cerrar}>Cerrar Ejercicio</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-2.5 rounded-lg">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Esto genera un asiento que deja en cero las cuentas de Ingreso/Costo/Gasto con movimiento en el rango y traslada la diferencia a Patrimonio. No se puede cerrar el mismo período dos veces.</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Desde</label>
            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hasta</label>
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cuenta de Patrimonio destino</label>
          <select value={cuentaPatrimonioId} onChange={(e) => setCuentaPatrimonioId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">Selecciona una cuenta...</option>
            {cuentas.map((c) => <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>)}
          </select>
          {cuentas.length === 0 && (
            <p className="mt-1 text-[11px] text-red-500">Esta empresa no tiene cuentas de Patrimonio que acepten movimiento -- créala en Plan de Cuentas primero.</p>
          )}
        </div>
      </div>
    </AppModal>
  );
}
