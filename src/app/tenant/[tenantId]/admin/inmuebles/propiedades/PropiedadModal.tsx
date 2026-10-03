"use client";

import { useRef, useState, type ReactElement } from 'react';
import { Building2, ImagePlus, Star, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { ActionButton, AppModal } from '@/components/ui';
import SelectorCliente from '@/components/inmuebles/SelectorCliente';
import { ETIQUETA_TIPO_UNIDAD } from '@/components/inmuebles/formato';
import {
  actualizarUnidad, crearUnidad, eliminarFoto, marcarPortada, subirFotoUnidad,
  type EstadoUnidad, type OperacionUnidad, type TipoUnidad, type Unidad, type UnidadFoto,
} from '@/services/inmueblesService';
import { toastApiError } from '@/utils/errors';

interface Props {
  propiedad: Unidad | null;
  onClose: () => void;
  onSaved: () => void;
}

const campo = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const etiqueta = 'block text-xs font-bold text-slate-500 uppercase mb-1';
const TIPOS: TipoUnidad[] = ['apartamento', 'casa', 'townhouse', 'local', 'oficina', 'galpon', 'terreno', 'estacionamiento', 'deposito', 'otro'];
const AMENIDADES = ['Piscina', 'Gimnasio', 'Vigilancia 24h', 'Planta eléctrica', 'Ascensor', 'Aire acondicionado', 'Cocina equipada', 'Terraza', 'Jardín', 'Área de BBQ', 'Pozo de agua', 'Parque infantil', 'Salón de fiestas', 'Amoblado'];

export default function PropiedadModal({ propiedad, onClose, onSaved }: Props): ReactElement {
  const [actual, setActual] = useState<Unidad | null>(propiedad);
  const [codigo, setCodigo] = useState(propiedad?.codigo ?? '');
  const [titulo, setTitulo] = useState(propiedad?.titulo ?? '');
  const [tipo, setTipo] = useState<TipoUnidad>(propiedad?.tipo ?? 'apartamento');
  const [estado, setEstado] = useState<EstadoUnidad>(propiedad?.estado ?? 'disponible');
  const [operacion, setOperacion] = useState<OperacionUnidad>(propiedad?.operacion ?? 'alquiler');
  const [canon, setCanon] = useState(propiedad?.canon_usd ?? '');
  const [precio, setPrecio] = useState(propiedad?.precio_venta_usd ?? '');
  const [direccion, setDireccion] = useState(propiedad?.direccion ?? '');
  const [zona, setZona] = useState(propiedad?.zona ?? '');
  const [ciudad, setCiudad] = useState(propiedad?.ciudad ?? '');
  const [hab, setHab] = useState(String(propiedad?.habitaciones ?? ''));
  const [banos, setBanos] = useState(String(propiedad?.banos ?? ''));
  const [estac, setEstac] = useState(String(propiedad?.estacionamientos ?? ''));
  const [areaC, setAreaC] = useState(propiedad?.area_construida_m2 ?? '');
  const [descripcion, setDescripcion] = useState(propiedad?.descripcion ?? '');
  const [amenidades, setAmenidades] = useState<string[]>(propiedad?.amenidades ?? []);
  const [publicada, setPublicada] = useState(propiedad?.publicada ?? false);
  const [propietario, setPropietario] = useState<number | null>(propiedad?.propietario ?? null);
  const [fotos, setFotos] = useState<UnidadFoto[]>(propiedad?.fotos ?? []);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const quiereVenta = operacion === 'venta' || operacion === 'alquiler_venta';
  const quiereAlquiler = operacion === 'alquiler' || operacion === 'alquiler_venta';

  const guardar = async (): Promise<void> => {
    if (!codigo.trim()) return void toast.error('Escribe un código para identificarla (ej. CASA-014).');
    if (publicada && !titulo.trim()) return void toast.error('Para publicarla en el catálogo necesita un título.');
    if (publicada && quiereAlquiler && !(Number(canon) > 0)) return void toast.error('Indica el canon mensual para publicarla en alquiler.');
    if (publicada && quiereVenta && !(Number(precio) > 0)) return void toast.error('Indica el precio de venta para publicarla.');
    setGuardando(true);
    try {
      const num = (v: string): number | null => (v === '' ? null : Number(v));
      const datos = {
        codigo: codigo.trim(), titulo: titulo.trim(), tipo, estado, operacion, publicada, descripcion: descripcion.trim(),
        direccion: direccion.trim(), zona: zona.trim(), ciudad: ciudad.trim(), amenidades, propietario,
        canon_usd: quiereAlquiler && canon !== '' ? String(canon) : null,
        precio_venta_usd: quiereVenta && precio !== '' ? String(precio) : null,
        habitaciones: num(hab), banos: num(banos), estacionamientos: num(estac), area_construida_m2: areaC !== '' ? String(areaC) : null,
      };
      if (actual) {
        await actualizarUnidad(actual.id, datos, 'propiedades');
        toast.success('Propiedad actualizada.');
        onSaved();
      } else {
        const creada = await crearUnidad(datos, 'propiedades');
        setActual(creada);
        toast.success('Propiedad creada. Ahora puedes subir sus fotos.');
      }
    } catch (e) {
      toastApiError(e, 'No se pudo guardar la propiedad.');
    } finally {
      setGuardando(false);
    }
  };

  const subir = async (archivos: FileList | null): Promise<void> => {
    if (!actual || !archivos?.length) return;
    setSubiendo(true);
    try {
      for (const archivo of Array.from(archivos)) {
        const foto = await subirFotoUnidad(actual.id, archivo);
        setFotos((prev) => [...prev, foto]);
      }
    } catch (e) {
      toastApiError(e, 'No se pudo subir una de las fotos.');
    } finally {
      setSubiendo(false);
      if (input.current) input.current.value = '';
    }
  };

  const hacerPortada = async (f: UnidadFoto): Promise<void> => {
    if (!actual) return;
    try {
      await marcarPortada(actual.id, f.id);
      setFotos((prev) => prev.map((x) => ({ ...x, es_portada: x.id === f.id })));
    } catch (e) { toastApiError(e, 'No se pudo cambiar la portada.'); }
  };

  const quitar = async (f: UnidadFoto): Promise<void> => {
    if (!actual) return;
    try {
      await eliminarFoto(actual.id, f.id);
      setFotos((prev) => prev.filter((x) => x.id !== f.id));
    } catch (e) { toastApiError(e, 'No se pudo eliminar la foto.'); }
  };

  const alternarAmenidad = (a: string): void => setAmenidades((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  return (
    <AppModal
      isOpen
      onClose={actual && !propiedad ? onSaved : onClose}
      title={actual ? `Propiedad ${actual.codigo}` : 'Nueva propiedad'}
      icon={<Building2 size={20} />}
      size="xl"
      footer={<><ActionButton variant="secondary" onClick={actual && !propiedad ? onSaved : onClose}>{actual && !propiedad ? 'Terminar' : 'Cancelar'}</ActionButton><ActionButton onClick={guardar} loading={guardando}>{actual ? 'Guardar cambios' : 'Crear propiedad'}</ActionButton></>}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><label className={etiqueta}>Código interno *</label><input value={codigo} onChange={(e) => setCodigo(e.target.value)} className={campo} placeholder="CASA-014" autoFocus={!actual} /></div>
          <div className="sm:col-span-2"><label className={etiqueta}>Título del anuncio</label><input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={campo} placeholder="Casa de 3 habitaciones en Los Palos Grandes" /></div>
          <div><label className={etiqueta}>Tipo</label><select value={tipo} onChange={(e) => setTipo(e.target.value as TipoUnidad)} className={campo}>{TIPOS.map((t) => <option key={t} value={t}>{ETIQUETA_TIPO_UNIDAD[t]}</option>)}</select></div>
          <div><label className={etiqueta}>Operación</label><select value={operacion} onChange={(e) => setOperacion(e.target.value as OperacionUnidad)} className={campo}><option value="alquiler">Alquiler</option><option value="venta">Venta</option><option value="alquiler_venta">Alquiler o venta</option><option value="ninguna">Solo administración</option></select></div>
          <div><label className={etiqueta}>Estado</label><select value={estado} onChange={(e) => setEstado(e.target.value as EstadoUnidad)} className={campo}><option value="disponible">Disponible</option><option value="ocupada">Ocupada (alquilada)</option><option value="mantenimiento">En mantenimiento</option></select></div>
          {quiereAlquiler && <div><label className={etiqueta}>Canon mensual (USD)</label><input type="number" min={0} step="0.01" value={canon} onChange={(e) => setCanon(e.target.value)} className={campo} /></div>}
          {quiereVenta && <div><label className={etiqueta}>Precio de venta (USD)</label><input type="number" min={0} step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className={campo} /></div>}
          <div className="sm:col-span-3"><SelectorCliente etiqueta="Propietario" value={propietario} onChange={(id) => setPropietario(id)} placeholder="Dueño del inmueble (recibe la liquidación)" /></div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase text-slate-400 mb-2">Ubicación y características</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3"><label className={etiqueta}>Dirección (solo la ves tú)</label><input value={direccion} onChange={(e) => setDireccion(e.target.value)} className={campo} /></div>
            <div><label className={etiqueta}>Zona / urbanización</label><input value={zona} onChange={(e) => setZona(e.target.value)} className={campo} placeholder="Los Palos Grandes" /></div>
            <div><label className={etiqueta}>Ciudad</label><input value={ciudad} onChange={(e) => setCiudad(e.target.value)} className={campo} placeholder="Caracas" /></div>
            <div><label className={etiqueta}>Área construida (m²)</label><input type="number" min={0} step="0.01" value={areaC} onChange={(e) => setAreaC(e.target.value)} className={campo} /></div>
            <div><label className={etiqueta}>Habitaciones</label><input type="number" min={0} value={hab} onChange={(e) => setHab(e.target.value)} className={campo} /></div>
            <div><label className={etiqueta}>Baños</label><input type="number" min={0} value={banos} onChange={(e) => setBanos(e.target.value)} className={campo} /></div>
            <div><label className={etiqueta}>Puestos de estacionamiento</label><input type="number" min={0} value={estac} onChange={(e) => setEstac(e.target.value)} className={campo} /></div>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase text-slate-400 mb-2">Comodidades</p>
          <div className="flex flex-wrap gap-2">
            {AMENIDADES.map((a) => (
              <button key={a} type="button" onClick={() => alternarAmenidad(a)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${amenidades.includes(a) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'}`}>{a}</button>
            ))}
          </div>
        </div>

        <div><label className={etiqueta}>Descripción</label><textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} className={campo} placeholder="Cuenta lo mejor de la propiedad: estado, vistas, entorno..." /></div>

        <div>
          <p className="text-xs font-bold uppercase text-slate-400 mb-2">Fotos</p>
          {!actual ? (
            <p className="text-sm text-slate-400 bg-slate-50 rounded-xl px-4 py-3">Guarda la propiedad primero y podrás subir sus fotos.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {fotos.map((f) => (
                <div key={f.id} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt="" className="w-full h-full object-cover" />
                  {f.es_portada && <span className="absolute top-1.5 left-1.5 bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded">PORTADA</span>}
                  <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 p-1.5 bg-gradient-to-t from-black/60 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {!f.es_portada && <button type="button" onClick={() => hacerPortada(f)} className="p-1.5 bg-white/90 rounded-lg text-amber-600" title="Usar de portada" aria-label="Usar de portada"><Star size={14} /></button>}
                    <button type="button" onClick={() => quitar(f)} className="p-1.5 bg-white/90 rounded-lg text-red-600" title="Eliminar foto" aria-label="Eliminar foto"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => input.current?.click()} disabled={subiendo} className="aspect-square rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-primary-400 hover:text-primary-600 flex flex-col items-center justify-center gap-1 text-xs font-semibold disabled:opacity-50"><ImagePlus size={20} />{subiendo ? 'Subiendo...' : 'Agregar'}</button>
              <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void subir(e.target.files)} />
            </div>
          )}
        </div>

        <label className="flex items-start gap-3 p-4 rounded-xl bg-primary-50/60 border border-primary-100 cursor-pointer">
          <input type="checkbox" checked={publicada} onChange={(e) => setPublicada(e.target.checked)} className="mt-0.5 rounded border-slate-300 text-primary-600" />
          <span><span className="block text-sm font-bold text-slate-800">Publicar en mi catálogo web</span><span className="block text-xs text-slate-500">Aparece en tu página pública con fotos y precio. Tu dirección exacta y el propietario nunca se muestran.</span></span>
        </label>
      </div>
    </AppModal>
  );
}
