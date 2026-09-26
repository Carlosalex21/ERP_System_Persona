"use client";

import { useState, type ReactElement } from 'react';
import { CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppModal, ActionButton } from '@/components/ui';
import { registrarVacacionTomada } from '@/services/rrhhService';
import type { UserManaged, VacacionesResumen } from '@/types/api';

interface RegistrarVacacionModalProps {
  empleado: UserManaged;
  onClose: () => void;
  onSaved: (resumen: VacacionesResumen) => void;
}

/** Registra un período de vacaciones ya tomado por un empleado -- resta de su saldo acumulado y no se descuenta como ausencia al generar la nómina. */
export default function RegistrarVacacionModal({ empleado, onClose, onSaved }: RegistrarVacacionModalProps): ReactElement {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (): Promise<void> => {
    if (!fechaInicio || !fechaFin) { toast.error('Indica la fecha de inicio y de fin.'); return; }
    if (fechaFin < fechaInicio) { toast.error('La fecha de fin no puede ser anterior a la de inicio.'); return; }
    setGuardando(true);
    try {
      const resumen = await registrarVacacionTomada(empleado.usuario_id, {
        fecha_inicio: fechaInicio, fecha_fin: fechaFin, observaciones: observaciones.trim(),
      });
      toast.success('Vacación registrada.');
      onSaved(resumen);
    } catch {
      toast.error('No se pudo registrar la vacación.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={`Registrar vacación -- ${empleado.first_name} ${empleado.last_name}`}
      icon={<CalendarDays size={20} />}
      size="sm"
      footer={<ActionButton loading={guardando} onClick={guardar}>Registrar</ActionButton>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Desde</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hasta</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observaciones (opcional)</label>
          <input
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Ej: Vacaciones anuales 2026"
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>
    </AppModal>
  );
}
