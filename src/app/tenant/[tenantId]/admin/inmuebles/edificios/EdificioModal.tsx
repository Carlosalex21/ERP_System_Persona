"use client";

import { useState, type ReactElement } from 'react';
import { Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { ActionButton, AppModal } from '@/components/ui';
import { actualizarEdificio, crearEdificio, type Edificio } from '@/services/inmueblesService';
import { toastApiError } from '@/utils/errors';

interface Props {
  edificio: Edificio | null;
  onClose: () => void;
  onSaved: () => void;
}

const campo = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const etiqueta = 'block text-xs font-bold text-slate-500 uppercase mb-1';

export default function EdificioModal({ edificio, onClose, onSaved }: Props): ReactElement {
  const [nombre, setNombre] = useState(edificio?.nombre ?? '');
  const [direccion, setDireccion] = useState(edificio?.direccion ?? '');
  const [rif, setRif] = useState(edificio?.rif ?? '');
  const [diaVencimiento, setDiaVencimiento] = useState(String(edificio?.dia_vencimiento ?? 5));
  const [mora, setMora] = useState(edificio?.mora_pct_mensual ?? '0');
  const [gracia, setGracia] = useState(String(edificio?.dias_gracia ?? 0));
  const [fondo, setFondo] = useState(edificio?.fondo_reserva_pct ?? '0');
  const [muestraMorosidad, setMuestraMorosidad] = useState(edificio?.portal_muestra_morosidad ?? false);
  const [guardando, setGuardando] = useState(false);

  const guardar = async (): Promise<void> => {
    if (!nombre.trim()) return void toast.error('Escribe el nombre del edificio.');
    const dia = Number(diaVencimiento);
    if (!(dia >= 1 && dia <= 28)) return void toast.error('El día de vencimiento debe estar entre 1 y 28.');
    setGuardando(true);
    try {
      const datos = {
        nombre: nombre.trim(), direccion: direccion.trim(), rif: rif.trim(), dia_vencimiento: dia,
        mora_pct_mensual: mora || '0', dias_gracia: Number(gracia) || 0, fondo_reserva_pct: fondo || '0', portal_muestra_morosidad: muestraMorosidad,
      };
      if (edificio) await actualizarEdificio(edificio.id, datos);
      else await crearEdificio(datos);
      toast.success(edificio ? 'Edificio actualizado.' : 'Edificio creado.');
      onSaved();
    } catch (e) {
      toastApiError(e, 'No se pudo guardar el edificio.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={edificio ? 'Editar edificio' : 'Nuevo edificio'}
      icon={<Building2 size={20} />}
      size="lg"
      footer={<><ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton><ActionButton onClick={guardar} loading={guardando}>Guardar</ActionButton></>}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={etiqueta}>Nombre del edificio *</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} placeholder="Residencias Los Pinos" autoFocus />
          </div>
          <div>
            <label className={etiqueta}>RIF</label>
            <input value={rif} onChange={(e) => setRif(e.target.value)} className={campo} placeholder="J-12345678-9" />
          </div>
          <div>
            <label className={etiqueta}>Dirección</label>
            <input value={direccion} onChange={(e) => setDireccion(e.target.value)} className={campo} />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Reglas de cobro</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className={etiqueta}>Vence el día</label>
              <input type="number" min={1} max={28} value={diaVencimiento} onChange={(e) => setDiaVencimiento(e.target.value)} className={campo} />
            </div>
            <div>
              <label className={etiqueta}>Días de gracia</label>
              <input type="number" min={0} value={gracia} onChange={(e) => setGracia(e.target.value)} className={campo} />
            </div>
            <div>
              <label className={etiqueta}>Mora mensual %</label>
              <input type="number" min={0} max={100} step="0.01" value={mora} onChange={(e) => setMora(e.target.value)} className={campo} />
            </div>
            <div>
              <label className={etiqueta}>Fondo de reserva %</label>
              <input type="number" min={0} max={100} step="0.01" value={fondo} onChange={(e) => setFondo(e.target.value)} className={campo} />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            La mora se calcula una vez al mes sobre el saldo vencido (0 = no cobra mora). El fondo de reserva se suma a los gastos del mes antes de repartirlos.
          </p>
        </div>

        <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
          <input type="checkbox" checked={muestraMorosidad} onChange={(e) => setMuestraMorosidad(e.target.checked)} className="mt-0.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
          <span>
            <span className="block text-sm font-bold text-slate-700">Mostrar la morosidad del edificio en el portal de los vecinos</span>
            <span className="block text-xs text-slate-400">Cada vecino vería qué unidades están atrasadas (solo el código de la unidad, nunca nombres).</span>
          </span>
        </label>
      </div>
    </AppModal>
  );
}
