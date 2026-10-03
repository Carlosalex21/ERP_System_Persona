"use client";

import { useState, type ReactElement } from 'react';
import { FilePlus2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { ActionButton, AppModal } from '@/components/ui';
import SelectorUnidad from '@/components/inmuebles/SelectorUnidad';
import { hoyISO, opcionesPeriodos, periodoActual, sumarDias } from '@/components/inmuebles/formato';
import { crearCargo } from '@/services/inmueblesService';
import { toastApiError } from '@/utils/errors';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const campo = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const etiqueta = 'block text-xs font-bold text-slate-500 uppercase mb-1';

/** Cobro puntual fuera del ciclo mensual: cuota extraordinaria, multa u otro concepto. */
export default function NuevoCargoModal({ onClose, onSaved }: Props): ReactElement {
  const [unidadId, setUnidadId] = useState<number | null>(null);
  const [tipo, setTipo] = useState<'extraordinaria' | 'multa' | 'otro'>('extraordinaria');
  const [concepto, setConcepto] = useState('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const [monto, setMonto] = useState('');
  const [vence, setVence] = useState(sumarDias(hoyISO(), 15));
  const [guardando, setGuardando] = useState(false);

  const guardar = async (): Promise<void> => {
    if (!unidadId) return void toast.error('Selecciona la unidad.');
    if (!concepto.trim()) return void toast.error('Describe el concepto del cobro.');
    if (!(Number(monto) > 0)) return void toast.error('Indica el monto en USD.');
    setGuardando(true);
    try {
      await crearCargo({ unidad: unidadId, tipo, concepto: concepto.trim(), periodo, monto_usd: String(monto), fecha_vencimiento: vence });
      toast.success('Cobro agregado a la cuenta de la unidad.');
      onSaved();
    } catch (e) {
      toastApiError(e, 'No se pudo crear el cobro.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Nuevo cobro"
      icon={<FilePlus2 size={20} />}
      size="md"
      footer={<><ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton><ActionButton onClick={guardar} loading={guardando}>Crear cobro</ActionButton></>}
    >
      <div className="space-y-4">
        <SelectorUnidad value={unidadId} onChange={(id) => setUnidadId(id)} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={etiqueta}>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} className={campo}>
              <option value="extraordinaria">Cuota extraordinaria</option>
              <option value="multa">Multa</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className={etiqueta}>Monto (USD) *</label>
            <input type="number" min={0} step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className={campo} placeholder="0.00" />
          </div>
          <div className="col-span-2">
            <label className={etiqueta}>Concepto *</label>
            <input value={concepto} onChange={(e) => setConcepto(e.target.value)} className={campo} placeholder="Ej: Reparación del portón" />
          </div>
          <div>
            <label className={etiqueta}>Período</label>
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className={campo}>
              {opcionesPeriodos(12, 1).map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
            </select>
          </div>
          <div>
            <label className={etiqueta}>Vence</label>
            <input type="date" value={vence} onChange={(e) => setVence(e.target.value)} className={campo} />
          </div>
        </div>
      </div>
    </AppModal>
  );
}
