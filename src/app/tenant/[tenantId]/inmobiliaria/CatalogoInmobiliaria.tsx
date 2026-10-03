"use client";

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { Bath, BedDouble, Building2, ChevronLeft, ChevronRight, Loader2, MapPin, MessageCircle, Search, SlidersHorizontal, Car } from 'lucide-react';

import { getPropiedadesPublicas, type FiltrosCatalogo, type OpcionesFiltros, type PaginaPropiedades, type PropiedadPublica } from '@/services/inmueblesPublicService';
import type { PublicEmpresaInfo } from '@/services/publicCatalogService';
import { usd } from '@/components/inmuebles/formato';

interface Props {
  subdominio: string;
  empresa: PublicEmpresaInfo | null;
  inicial: PaginaPropiedades | null;
  opciones: OpcionesFiltros | null;
}

export const precioDe = (p: PropiedadPublica): string => {
  if (p.operacion === 'venta') return p.precio_venta_usd ? usd(p.precio_venta_usd) : 'Consultar';
  if (p.operacion === 'alquiler') return p.canon_usd ? `${usd(p.canon_usd)} /mes` : 'Consultar';
  return p.canon_usd ? `${usd(p.canon_usd)} /mes` : p.precio_venta_usd ? usd(p.precio_venta_usd) : 'Consultar';
};

export const etiquetaOperacion = (o: PropiedadPublica['operacion']): string => (o === 'venta' ? 'En venta' : o === 'alquiler' ? 'En alquiler' : 'Alquiler o venta');

const campo = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500';

/** Catálogo público de una inmobiliaria: filtros por operación, tipo, zona, precio y dormitorios. */
export default function CatalogoInmobiliaria({ subdominio, empresa, inicial, opciones }: Props): ReactElement {
  const [filtros, setFiltros] = useState<FiltrosCatalogo>({});
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<PaginaPropiedades | null>(inicial);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);
  const [verFiltros, setVerFiltros] = useState(false);
  const primera = useRef(true);
  const [texto, setTexto] = useState('');

  const cambiar = <K extends keyof FiltrosCatalogo>(k: K, v: FiltrosCatalogo[K]): void => { setFiltros((f) => ({ ...f, [k]: v })); setPagina(1); };

  useEffect(() => {
    const t = setTimeout(() => { if (texto.trim() !== (filtros.q ?? '')) cambiar('q', texto.trim()); }, 400);
    return () => clearTimeout(t);
  }, [texto, filtros.q]);

  const cargar = useCallback(async (): Promise<void> => {
    setCargando(true);
    setError(false);
    try {
      setDatos(await getPropiedadesPublicas(subdominio, filtros, pagina));
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }, [subdominio, filtros, pagina]);

  useEffect(() => {
    // La primera página ya llegó renderizada desde el servidor.
    if (primera.current) { primera.current = false; if (inicial) return; }
    void cargar();
  }, [cargar, inicial]);

  const whatsapp = empresa?.telefono ? `https://wa.me/${empresa.telefono.replace(/\D/g, '')}` : null;
  const items = datos?.items ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {empresa?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- logo dinámico del tenant
              <img src={empresa.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
            ) : (
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white"><Building2 size={20} /></div>
            )}
            <h1 className="text-lg font-black tracking-tight uppercase text-slate-800 truncate">{empresa?.nombre_comercial ?? 'Inmobiliaria'}</h1>
          </div>
          {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="shrink-0 flex items-center gap-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl px-4 py-2"><MessageCircle size={16} /> <span className="hidden sm:inline">Escríbenos</span></a>}
        </div>
      </header>

      <section className="bg-gradient-to-br from-primary-700 to-primary-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Encuentra tu próximo hogar</h2>
          <p className="mt-2 text-primary-100 max-w-xl">Casas, apartamentos y locales en alquiler y venta. Filtra, mira las fotos y contáctanos directamente.</p>
          <div className="mt-6 bg-white rounded-2xl p-3 flex flex-col sm:flex-row gap-3 shadow-xl text-slate-800">
            {opciones && (opciones.hay_alquiler || opciones.hay_venta) && (
              <div className="flex rounded-xl bg-slate-100 p-1 shrink-0">
                {([['', 'Todas'], ['alquiler', 'Alquiler'], ['venta', 'Venta']] as const).filter(([v]) => v === '' || (v === 'alquiler' ? opciones.hay_alquiler : opciones.hay_venta)).map(([v, t]) => (
                  <button key={v} onClick={() => cambiar('operacion', v || undefined)} className={`px-4 py-2 rounded-lg text-sm font-bold ${(filtros.operacion ?? '') === v ? 'bg-white shadow text-primary-700' : 'text-slate-500'}`}>{t}</button>
                ))}
              </div>
            )}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Zona, ciudad o palabra clave..." className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <button onClick={() => setVerFiltros((v) => !v)} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-50"><SlidersHorizontal size={16} /> Filtros</button>
          </div>
          {verFiltros && opciones && (
            <div className="mt-3 bg-white rounded-2xl p-4 grid grid-cols-2 lg:grid-cols-6 gap-3 text-slate-800">
              <select value={filtros.tipo ?? ''} onChange={(e) => cambiar('tipo', e.target.value || undefined)} className={campo} aria-label="Tipo"><option value="">Todos los tipos</option>{opciones.tipos.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}</select>
              <select value={filtros.zona ?? ''} onChange={(e) => cambiar('zona', e.target.value || undefined)} className={campo} aria-label="Zona"><option value="">Todas las zonas</option>{opciones.zonas.map((z) => <option key={z} value={z}>{z}</option>)}</select>
              <select value={filtros.habitaciones ?? ''} onChange={(e) => cambiar('habitaciones', e.target.value || undefined)} className={campo} aria-label="Habitaciones"><option value="">Habitaciones</option>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+</option>)}</select>
              <input type="number" min={0} placeholder="Precio mín. (USD)" value={filtros.precio_min ?? ''} onChange={(e) => cambiar('precio_min', e.target.value || undefined)} className={campo} />
              <input type="number" min={0} placeholder="Precio máx. (USD)" value={filtros.precio_max ?? ''} onChange={(e) => cambiar('precio_max', e.target.value || undefined)} className={campo} />
              <select value={filtros.orden ?? ''} onChange={(e) => cambiar('orden', (e.target.value || '') as FiltrosCatalogo['orden'])} className={campo} aria-label="Orden"><option value="">Más recientes</option><option value="precio_asc">Precio: menor a mayor</option><option value="precio_desc">Precio: mayor a menor</option></select>
            </div>
          )}
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {error ? (
          <div className="text-center py-16"><p className="text-slate-500 mb-3">No pudimos cargar las propiedades.</p><button onClick={() => void cargar()} className="text-sm font-bold text-primary-600 hover:underline">Reintentar</button></div>
        ) : cargando && items.length === 0 ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-600" size={32} /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-20"><Building2 size={44} className="mx-auto text-slate-300 mb-3" /><p className="font-bold text-slate-700">No encontramos propiedades con esos filtros</p><p className="text-sm text-slate-500 mt-1">Prueba quitando alguno o escríbenos y te ayudamos a encontrar lo que buscas.</p></div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">{datos?.total} {datos?.total === 1 ? 'propiedad' : 'propiedades'}</p>
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity ${cargando ? 'opacity-50' : ''}`}>
              {items.map((p) => (
                <Link key={p.id} href={`/propiedades/${p.id}`} className="group bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-shadow flex flex-col">
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    {p.portada_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- fotos dinámicas del tenant
                      <img src={p.portada_url} alt={p.titulo_visible} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : <div className="w-full h-full flex items-center justify-center text-slate-300"><Building2 size={40} /></div>}
                    <span className="absolute top-3 left-3 bg-white/95 text-primary-700 text-[11px] font-black uppercase px-2.5 py-1 rounded-lg">{etiquetaOperacion(p.operacion)}</span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col gap-2">
                    <p className="text-xl font-black text-slate-900 font-mono">{precioDe(p)}</p>
                    <h3 className="font-bold text-slate-800 leading-snug line-clamp-2">{p.titulo_visible}</h3>
                    {(p.zona || p.ciudad) && <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={14} /> {[p.zona, p.ciudad].filter(Boolean).join(', ')}</p>}
                    <div className="mt-auto pt-3 flex items-center gap-4 text-sm text-slate-600 border-t border-slate-100">
                      {p.habitaciones != null && <span className="flex items-center gap-1"><BedDouble size={15} /> {p.habitaciones}</span>}
                      {p.banos != null && <span className="flex items-center gap-1"><Bath size={15} /> {p.banos}</span>}
                      {p.estacionamientos != null && p.estacionamientos > 0 && <span className="flex items-center gap-1"><Car size={15} /> {p.estacionamientos}</span>}
                      {p.area_construida_m2 && <span>{Number(p.area_construida_m2)} m²</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {datos && datos.totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button disabled={pagina <= 1 || cargando} onClick={() => setPagina((p) => p - 1)} className="p-2.5 rounded-xl border border-slate-200 bg-white disabled:opacity-40" aria-label="Página anterior"><ChevronLeft size={18} /></button>
                <span className="text-sm text-slate-600">Página {datos.pagina} de {datos.totalPaginas}</span>
                <button disabled={pagina >= datos.totalPaginas || cargando} onClick={() => setPagina((p) => p + 1)} className="p-2.5 rounded-xl border border-slate-200 bg-white disabled:opacity-40" aria-label="Página siguiente"><ChevronRight size={18} /></button>
              </div>
            )}
          </>
        )}
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">{empresa?.nombre_comercial}</footer>
    </div>
  );
}
