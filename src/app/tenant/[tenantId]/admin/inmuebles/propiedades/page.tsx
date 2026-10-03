"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { Bath, BedDouble, Building2, Eye, EyeOff, ImageOff, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { Badge, ConfirmDialog, EmptyState, PageHeader, TableSkeleton } from '@/components/ui';
import { useListaPaginada } from '@/hooks/useListaPaginada';
import { actualizarUnidad, eliminarUnidad, getPaginaUnidades, type Unidad } from '@/services/inmueblesService';
import { ETIQUETA_TIPO_UNIDAD, usd } from '@/components/inmuebles/formato';
import { toastApiError } from '@/utils/errors';
import PropiedadModal from './PropiedadModal';

const OPERACION: Record<string, string> = { alquiler: 'Alquiler', venta: 'Venta', alquiler_venta: 'Alquiler / Venta', ninguna: 'Administración' };
const ESTADO: Record<string, { tono: 'green' | 'amber' | 'slate'; texto: string }> = {
  disponible: { tono: 'green', texto: 'Disponible' }, ocupada: { tono: 'amber', texto: 'Alquilada' }, mantenimiento: { tono: 'slate', texto: 'Mantenimiento' },
};

export default function PropiedadesPage(): ReactElement {
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('');
  const [operacion, setOperacion] = useState('');
  const [editando, setEditando] = useState<Unidad | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [aEliminar, setAEliminar] = useState<Unidad | null>(null);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBusqueda(textoBusqueda.trim()), 350);
    return () => clearTimeout(t);
  }, [textoBusqueda]);

  const filtros = useMemo(() => ({ search: busqueda || undefined, estado: estado || undefined, operacion: operacion || undefined }), [busqueda, estado, operacion]);
  const cargarPagina = useCallback((p: number) => getPaginaUnidades(filtros, p, 'propiedades', 12), [filtros]);
  const lista = useListaPaginada<Unidad>(cargarPagina);
  useEffect(() => { if (lista.error) toastApiError(lista.error, 'No se pudieron cargar las propiedades.'); }, [lista.error]);

  const alternarPublicada = async (p: Unidad): Promise<void> => {
    try {
      await actualizarUnidad(p.id, { publicada: !p.publicada }, 'propiedades');
      toast.success(p.publicada ? 'Retirada del catálogo.' : 'Publicada en el catálogo.');
      void lista.recargar(true);
    } catch (e) {
      toastApiError(e, 'No se pudo cambiar la publicación.');
    }
  };

  const confirmarEliminar = async (): Promise<void> => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await eliminarUnidad(aEliminar.id, 'propiedades');
      toast.success('Propiedad desactivada.');
      setAEliminar(null);
      void lista.recargar();
    } catch (e) {
      toastApiError(e, 'No se pudo desactivar la propiedad.');
    } finally {
      setEliminando(false);
    }
  };

  const abrir = (p: Unidad | null): void => { setEditando(p); setModalAbierto(true); };
  const sinFiltros = !busqueda && !estado && !operacion;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Building2 size={20} />}
        title="Propiedades"
        description="Tu cartera de inmuebles. Las que publiques aparecen en tu catálogo web con fotos y precio."
        actions={<motion.button whileTap={{ scale: 0.96 }} onClick={() => abrir(null)} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2 shadow-md"><Plus size={18} /> Nueva propiedad</motion.button>}
      />

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={textoBusqueda} onChange={(e) => setTextoBusqueda(e.target.value)} placeholder="Buscar por código, título, zona o propietario..." className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white" />
        </div>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white" aria-label="Estado">
          <option value="">Todos los estados</option><option value="disponible">Disponibles</option><option value="ocupada">Alquiladas</option><option value="mantenimiento">En mantenimiento</option>
        </select>
        <select value={operacion} onChange={(e) => setOperacion(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white" aria-label="Operación">
          <option value="">Alquiler y venta</option><option value="alquiler">Alquiler</option><option value="venta">Venta</option>
        </select>
      </div>

      {lista.cargando && lista.items.length === 0 ? (
        <TableSkeleton rows={4} />
      ) : lista.total === 0 && sinFiltros ? (
        <EmptyState icon={<Building2 size={28} />} title="Aún no tienes propiedades" description="Registra tu primera propiedad con fotos, precio y ubicación. Si la publicas, tus clientes la verán en tu catálogo web." action={<button onClick={() => abrir(null)} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2"><Plus size={16} /> Nueva propiedad</button>} />
      ) : lista.items.length === 0 ? (
        <div className="p-10 text-center text-sm text-slate-400 bg-white border border-slate-200 rounded-2xl">Ninguna propiedad coincide con los filtros.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {lista.items.map((p) => {
              const e = ESTADO[p.estado] ?? ESTADO.disponible;
              return (
                <div key={p.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative aspect-[16/10] bg-slate-100">
                    {p.portada_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.portada_url} alt={p.titulo || p.codigo} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1"><ImageOff size={28} /><span className="text-[11px] font-semibold">Sin fotos</span></div>
                    )}
                    <div className="absolute top-2.5 left-2.5 flex gap-1.5"><Badge tone={e.tono}>{e.texto}</Badge></div>
                    <span className={`absolute top-2.5 right-2.5 text-[10px] font-black px-2 py-1 rounded-md ${p.publicada ? 'bg-green-600 text-white' : 'bg-white/90 text-slate-500'}`}>{p.publicada ? 'PUBLICADA' : 'NO PUBLICADA'}</span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col gap-2">
                    <div>
                      <p className="font-bold text-slate-900 leading-snug line-clamp-2">{p.titulo || `${ETIQUETA_TIPO_UNIDAD[p.tipo]} ${p.codigo}`}</p>
                      <p className="text-xs text-slate-500">{p.codigo} · {[p.zona, p.ciudad].filter(Boolean).join(', ') || 'Sin ubicación'}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {p.habitaciones != null && <span className="flex items-center gap-1"><BedDouble size={14} /> {p.habitaciones}</span>}
                      {p.banos != null && <span className="flex items-center gap-1"><Bath size={14} /> {p.banos}</span>}
                      {p.area_construida_m2 && <span>{Number(p.area_construida_m2)} m²</span>}
                    </div>
                    <div className="mt-auto flex items-end justify-between pt-2">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">{OPERACION[p.operacion]}</p>
                        <p className="font-black text-slate-900 font-mono">
                          {p.canon_usd ? `${usd(p.canon_usd)}/mes` : p.precio_venta_usd ? usd(p.precio_venta_usd) : '—'}
                        </p>
                        {p.propietario_nombre && <p className="text-[11px] text-slate-400">Dueño: {p.propietario_nombre}</p>}
                      </div>
                      <div className="flex">
                        <button onClick={() => alternarPublicada(p)} className="p-2 text-slate-400 hover:text-green-600" title={p.publicada ? 'Retirar del catálogo' : 'Publicar en el catálogo'} aria-label={p.publicada ? 'Retirar del catálogo' : 'Publicar'}>{p.publicada ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                        <button onClick={() => abrir(p)} className="p-2 text-slate-400 hover:text-primary-600" aria-label="Editar"><Pencil size={16} /></button>
                        <button onClick={() => setAEliminar(p)} className="p-2 text-slate-400 hover:text-red-500" aria-label="Desactivar"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {lista.totalPaginas > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{lista.total} propiedades · página {lista.pagina} de {lista.totalPaginas}</span>
              <div className="flex gap-2">
                <button disabled={lista.pagina <= 1 || lista.cargando} onClick={() => lista.irAPagina(lista.pagina - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40">Anterior</button>
                <button disabled={lista.pagina >= lista.totalPaginas || lista.cargando} onClick={() => lista.irAPagina(lista.pagina + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40">Siguiente</button>
              </div>
            </div>
          )}
        </>
      )}

      {modalAbierto && <PropiedadModal propiedad={editando} onClose={() => setModalAbierto(false)} onSaved={() => { setModalAbierto(false); void lista.recargar(); }} />}
      <ConfirmDialog isOpen={!!aEliminar} title="Desactivar propiedad" message={`¿Desactivar "${aEliminar?.codigo}"? Se retira del catálogo; su historial y contratos se conservan.`} confirmLabel="Desactivar" danger loading={eliminando} onConfirm={confirmarEliminar} onCancel={() => setAEliminar(null)} />
    </div>
  );
}
