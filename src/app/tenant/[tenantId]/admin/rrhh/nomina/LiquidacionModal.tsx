"use client";

import { useState, type ReactElement } from 'react';
import { Calculator, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppModal, ActionButton } from '@/components/ui';
import { calcularLiquidacion } from '@/services/rrhhService';
import { useMonedaVista } from '@/context/MonedaVistaContext';
import type { UserManaged, Liquidacion } from '@/types/api';

import { mensajeDeErrorUnico } from '@/utils/mensajesError';
interface LiquidacionModalProps {
  empleado: UserManaged;
  onClose: () => void;
}

/**
 * Calculadora de REFERENCIA para la liquidación de un empleado -- no paga ni
 * registra nada, solo desglosa vacaciones pendientes + prestaciones
 * acumuladas según lo configurado en RRHH, para que el admin/contador lo
 * revise antes de procesar el pago real por fuera del sistema.
 */
export default function LiquidacionModal({ empleado, onClose }: LiquidacionModalProps): ReactElement {
  const { formatear } = useMonedaVista();
  const [fechaEgreso, setFechaEgreso] = useState(() => new Date().toISOString().slice(0, 10));
  const [resultado, setResultado] = useState<Liquidacion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calcular = async (): Promise<void> => {
    setCargando(true);
    setError(null);
    setResultado(null);
    try {
      setResultado(await calcularLiquidacion(empleado.usuario_id, fechaEgreso));
    } catch (err: any) {
      setError(mensajeDeErrorUnico(err, 'No se pudo calcular la liquidación.'));
    } finally {
      setCargando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={`Calculadora de liquidación -- ${empleado.first_name} ${empleado.last_name}`}
      icon={<Calculator size={20} />}
      size="sm"
      footer={<ActionButton loading={cargando} onClick={calcular}>Calcular</ActionButton>}
    >
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 text-xs flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          Esto es solo una referencia calculada con los parámetros configurados en RRHH -- revísala antes de procesar cualquier pago real.
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha de egreso</label>
          <input type="date" value={fechaEgreso} onChange={(e) => setFechaEgreso(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>

        {cargando && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary-600" size={22} /></div>}
        {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-md">{error}</p>}

        {resultado && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Antigüedad</span>
              <span className="font-semibold text-slate-700">{parseFloat(resultado.antiguedad_anios).toFixed(2)} años</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Sueldo diario de referencia</span>
              <span className="font-semibold text-slate-700">{formatear(parseFloat(resultado.sueldo_diario))}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Vacaciones pendientes ({resultado.dias_vacaciones_pendientes}d)</span>
              <span className="font-semibold text-emerald-600">{formatear(parseFloat(resultado.monto_vacaciones_pendientes))}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Prestaciones acumuladas ({resultado.dias_prestaciones_acumulados}d)</span>
              <span className="font-semibold text-emerald-600">{formatear(parseFloat(resultado.monto_prestaciones))}</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-bold text-slate-900">
              <span>Total de referencia</span>
              <span>{formatear(parseFloat(resultado.total_liquidacion))}</span>
            </div>
          </div>
        )}
      </div>
    </AppModal>
  );
}
