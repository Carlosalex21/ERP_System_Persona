"use client";

import { useState, type ReactElement } from 'react';
import { Wallet } from 'lucide-react';
import { AppModal, ActionButton } from '@/components/ui';
import { generarPeriodoNomina } from '@/services/rrhhService';
import { useNotify } from '@/hooks/useNotify';
import { getApiErrorMessages } from '@/utils/helpers';

interface GenerarNominaModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function primerDiaMesActual(): string {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function GenerarNominaModal({ onClose, onSaved }: GenerarNominaModalProps): ReactElement {
  const notify = useNotify();
  const [fechaDesde, setFechaDesde] = useState(primerDiaMesActual());
  const [fechaHasta, setFechaHasta] = useState(hoyISO());
  const [guardando, setGuardando] = useState(false);

  const guardar = async (): Promise<void> => {
    if (!fechaDesde || !fechaHasta) {
      notify.error('Selecciona el rango de fechas del período.');
      return;
    }
    if (fechaDesde > fechaHasta) {
      notify.error('La fecha desde no puede ser posterior a la fecha hasta.');
      return;
    }
    setGuardando(true);
    try {
      await generarPeriodoNomina({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta });
      notify.success('Período de nómina generado.');
      onSaved();
    } catch (error) {
      const messages = getApiErrorMessages(error);
      notify.error(messages[0] || 'No se pudo generar el período de nómina.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Generar Nómina"
      icon={<Wallet size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={guardar}>Generar</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
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
        <p className="text-[11px] text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          Se genera una línea por cada empleado con sueldo base asignado (edítalo desde Empleados). Los días marcados como &quot;Ausente&quot; en Asistencia dentro de este rango se descuentan automáticamente del sueldo.
        </p>
      </div>
    </AppModal>
  );
}
