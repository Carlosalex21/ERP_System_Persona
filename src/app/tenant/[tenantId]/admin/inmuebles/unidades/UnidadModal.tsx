"use client";

import { useState, type ReactElement } from 'react';
import { Home } from 'lucide-react';
import toast from 'react-hot-toast';

import { ActionButton, AppModal } from '@/components/ui';
import SelectorCliente from '@/components/inmuebles/SelectorCliente';
import { ETIQUETA_TIPO_UNIDAD } from '@/components/inmuebles/formato';
import { actualizarUnidad, crearUnidad, type Edificio, type EstadoUnidad, type TipoUnidad, type Unidad } from '@/services/inmueblesService';
import { toastApiError } from '@/utils/errors';

interface Props {
  unidad: Unidad | null;
  edificioInicial: number | null;
  edificios: Edificio[];
  onClose: () => void;
  onSaved: () => void;
}

const campo = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const etiqueta = 'block text-xs font-bold text-slate-500 uppercase mb-1';
const TIPOS_CONDOMINIO: TipoUnidad[] = ['apartamento', 'casa', 'townhouse', 'local', 'oficina', 'estacionamiento', 'deposito', 'otro'];

export default function UnidadModal({ unidad, edificioInicial, edificios, onClose, onSaved }: Props): ReactElement {
  const [edificio, setEdificio] = useState(String(unidad?.edificio ?? edificioInicial ?? (edificios.length === 1 ? edificios[0].id : '')));
  const [codigo, setCodigo] = useState(unidad?.codigo ?? '');
  const [tipo, setTipo] = useState<TipoUnidad>(unidad?.tipo ?? 'apartamento');
  const [estado, setEstado] = useState<EstadoUnidad>(unidad?.estado ?? 'ocupada');
  const [alicuota, setAlicuota] = useState(unidad?.alicuota ?? '');
  const [area, setArea] = useState(unidad?.area_m2 ?? '');
  const [propietario, setPropietario] = useState<number | null>(unidad?.propietario ?? null);
  const [ocupante, setOcupante] = useState<number | null>(unidad?.ocupante ?? null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async (): Promise<void> => {
    if (!edificio) return void toast.error('Selecciona el edificio.');
    if (!codigo.trim()) return void toast.error('Escribe el código de la unidad (ej. Apto 3-B).');
    const alic = Number(alicuota || 0);
    if (!(alic >= 0 && alic <= 100)) return void toast.error('La alícuota debe estar entre 0 y 100.');
    setGuardando(true);
    try {
      const datos = {
        edificio: Number(edificio), codigo: codigo.trim(), tipo, estado, alicuota: String(alic), area_m2: area ? String(area) : null,
        propietario, ocupante,
      };
      if (unidad) await actualizarUnidad(unidad.id, datos);
      else await crearUnidad(datos);
      toast.success(unidad ? 'Unidad actualizada.' : 'Unidad creada.');
      onSaved();
    } catch (e) {
      toastApiError(e, 'No se pudo guardar la unidad.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={unidad ? `Editar ${unidad.codigo}` : 'Nueva unidad'}
      icon={<Home size={20} />}
      size="lg"
      footer={<><ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton><ActionButton onClick={guardar} loading={guardando}>Guardar</ActionButton></>}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={etiqueta}>Edificio *</label>
            <select value={edificio} onChange={(e) => setEdificio(e.target.value)} className={campo}>
              <option value="">Selecciona...</option>
              {edificios.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={etiqueta}>Código de la unidad *</label>
            <input value={codigo} onChange={(e) => setCodigo(e.target.value)} className={campo} placeholder="Apto 3-B" autoFocus={!unidad} />
          </div>
          <div>
            <label className={etiqueta}>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoUnidad)} className={campo}>
              {TIPOS_CONDOMINIO.map((t) => <option key={t} value={t}>{ETIQUETA_TIPO_UNIDAD[t]}</option>)}
            </select>
          </div>
          <div>
            <label className={etiqueta}>Estado</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoUnidad)} className={campo}>
              <option value="ocupada">Ocupada</option>
              <option value="disponible">Disponible</option>
              <option value="mantenimiento">En mantenimiento</option>
            </select>
          </div>
          <div>
            <label className={etiqueta}>Alícuota (%)</label>
            <input type="number" min={0} max={100} step="0.0001" value={alicuota} onChange={(e) => setAlicuota(e.target.value)} className={campo} placeholder="2.5000" />
            <p className="text-[11px] text-slate-400 mt-1">Su parte de los gastos comunes. Las de todo el edificio deben sumar 100 %.</p>
          </div>
          <div>
            <label className={etiqueta}>Área (m²)</label>
            <input type="number" min={0} step="0.01" value={area} onChange={(e) => setArea(e.target.value)} className={campo} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectorCliente etiqueta="Propietario (paga la cuota)" value={propietario} onChange={(id) => setPropietario(id)} />
          <SelectorCliente etiqueta="Ocupante (si es distinto)" value={ocupante} onChange={(id) => setOcupante(id)} placeholder="Opcional: inquilino o familiar" />
        </div>
      </div>
    </AppModal>
  );
}
