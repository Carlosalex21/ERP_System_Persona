"use client";

import { useState, type ReactElement } from 'react';
import { CircleDollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppModal, ActionButton } from '@/components/ui';
import { agregarConceptoNominaEmpleado } from '@/services/rrhhService';
import type { NominaEmpleado, TipoConceptoNomina } from '@/types/api';

interface AgregarConceptoManualModalProps {
  nominaEmpleado: NominaEmpleado;
  onClose: () => void;
  onSaved: (actualizado: NominaEmpleado) => void;
}

/**
 * Agrega un concepto puntual (ej. una comisión de ventas del mes) a UNA
 * línea de nómina ya generada -- distinto de "Bonos y Deducciones", que son
 * reglas recurrentes aplicadas a TODOS los empleados. Esto es exclusivo de
 * este empleado en este período, para montos que varían persona a persona.
 */
export default function AgregarConceptoManualModal({ nominaEmpleado, onClose, onSaved }: AgregarConceptoManualModalProps): ReactElement {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoConceptoNomina>('bono');
  const [monto, setMonto] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (): Promise<void> => {
    const montoNum = parseFloat(monto);
    if (!nombre.trim()) { toast.error('Ponle un nombre al concepto.'); return; }
    if (!montoNum || montoNum <= 0) { toast.error('El monto debe ser mayor a 0.'); return; }
    setGuardando(true);
    try {
      const actualizado = await agregarConceptoNominaEmpleado(nominaEmpleado.id, { nombre: nombre.trim(), tipo, monto: montoNum });
      toast.success('Concepto agregado.');
      onSaved(actualizado);
    } catch {
      toast.error('No se pudo agregar el concepto.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={`Agregar concepto -- ${nominaEmpleado.usuario_nombre}`}
      icon={<CircleDollarSign size={20} />}
      size="sm"
      footer={<ActionButton loading={guardando} onClick={guardar}>Agregar</ActionButton>}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Comisión de ventas de marzo"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTipo('bono')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-colors ${tipo === 'bono' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500'}`}
              >
                Bono
              </button>
              <button
                type="button"
                onClick={() => setTipo('deduccion')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-colors ${tipo === 'deduccion' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500'}`}
              >
                Deducción
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>
    </AppModal>
  );
}
