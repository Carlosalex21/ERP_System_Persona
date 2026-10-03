"use client";

import { useState, type ReactElement } from 'react';
import { FileSignature } from 'lucide-react';
import toast from 'react-hot-toast';

import { ActionButton, AppModal } from '@/components/ui';
import SelectorCliente from '@/components/inmuebles/SelectorCliente';
import SelectorUnidad from '@/components/inmuebles/SelectorUnidad';
import { hoyISO } from '@/components/inmuebles/formato';
import { crearContrato, type Unidad } from '@/services/inmueblesService';
import { toastApiError } from '@/utils/errors';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const campo = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const etiqueta = 'block text-xs font-bold text-slate-500 uppercase mb-1';

const sumarAnio = (iso: string): string => {
  const [a, m, d] = iso.split('-').map(Number);
  const f = new Date(a + 1, m - 1, d - 1);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
};

/** Contrato de alquiler en borrador; al activarlo se generan los cánones mensuales. */
export default function ContratoModal({ onClose, onSaved }: Props): ReactElement {
  const [unidadId, setUnidadId] = useState<number | null>(null);
  const [inquilino, setInquilino] = useState<number | null>(null);
  const [inicio, setInicio] = useState(hoyISO());
  const [fin, setFin] = useState(sumarAnio(hoyISO()));
  const [canon, setCanon] = useState('');
  const [diaPago, setDiaPago] = useState('5');
  const [deposito, setDeposito] = useState('0');
  const [honorario, setHonorario] = useState('10');
  const [ajuste, setAjuste] = useState('0');
  const [mora, setMora] = useState('0');
  const [gracia, setGracia] = useState('3');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  const elegirUnidad = (id: number | null, u?: Unidad): void => {
    setUnidadId(id);
    if (u?.canon_usd && !canon) setCanon(String(Number(u.canon_usd)));
  };

  const guardar = async (): Promise<void> => {
    if (!unidadId) return void toast.error('Selecciona la propiedad.');
    if (!inquilino) return void toast.error('Selecciona al inquilino.');
    if (!(Number(canon) > 0)) return void toast.error('Indica el canon mensual en USD.');
    if (fin <= inicio) return void toast.error('La fecha de fin debe ser posterior al inicio.');
    setGuardando(true);
    try {
      await crearContrato({
        unidad: unidadId, inquilino, fecha_inicio: inicio, fecha_fin: fin, canon_usd: String(canon), dia_pago: Number(diaPago) || 5,
        deposito_usd: String(deposito || 0), honorario_pct: String(honorario || 0), ajuste_anual_pct: String(ajuste || 0),
        mora_pct_mensual: String(mora || 0), dias_gracia: Number(gracia) || 0, observaciones: observaciones.trim(),
      });
      toast.success('Contrato creado en borrador. Actívalo para generar los cobros.');
      onSaved();
    } catch (e) {
      toastApiError(e, 'No se pudo crear el contrato.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Nuevo contrato de alquiler"
      icon={<FileSignature size={20} />}
      size="xl"
      footer={<><ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton><ActionButton onClick={guardar} loading={guardando}>Crear contrato</ActionButton></>}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectorUnidad etiqueta="Propiedad" value={unidadId} onChange={elegirUnidad} />
          <SelectorCliente etiqueta="Inquilino" value={inquilino} onChange={(id) => setInquilino(id)} requerido />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div><label className={etiqueta}>Inicio</label><input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className={campo} /></div>
          <div><label className={etiqueta}>Fin</label><input type="date" value={fin} onChange={(e) => setFin(e.target.value)} className={campo} /></div>
          <div><label className={etiqueta}>Canon mensual (USD) *</label><input type="number" min={0} step="0.01" value={canon} onChange={(e) => setCanon(e.target.value)} className={campo} /></div>
          <div><label className={etiqueta}>Día de pago</label><input type="number" min={1} max={28} value={diaPago} onChange={(e) => setDiaPago(e.target.value)} className={campo} /></div>
          <div><label className={etiqueta}>Depósito (USD)</label><input type="number" min={0} step="0.01" value={deposito} onChange={(e) => setDeposito(e.target.value)} className={campo} /></div>
          <div><label className={etiqueta}>Tu honorario (%)</label><input type="number" min={0} max={100} step="0.01" value={honorario} onChange={(e) => setHonorario(e.target.value)} className={campo} /></div>
          <div><label className={etiqueta}>Ajuste anual (%)</label><input type="number" min={0} step="0.01" value={ajuste} onChange={(e) => setAjuste(e.target.value)} className={campo} /></div>
          <div><label className={etiqueta}>Mora mensual (%)</label><input type="number" min={0} step="0.01" value={mora} onChange={(e) => setMora(e.target.value)} className={campo} /></div>
          <div><label className={etiqueta}>Días de gracia</label><input type="number" min={0} value={gracia} onChange={(e) => setGracia(e.target.value)} className={campo} /></div>
        </div>
        <div><label className={etiqueta}>Observaciones</label><textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className={campo} /></div>
        <p className="text-[11px] text-slate-400">Tu honorario se descuenta del canon cuando liquidas al propietario. El depósito no entra en la liquidación.</p>
      </div>
    </AppModal>
  );
}
