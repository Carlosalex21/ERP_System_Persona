"use client";

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Check, Search, X } from 'lucide-react';

import { useSession } from '@/context/SessionContext';
import { getUnidades, type RecursoUnidad, type Unidad } from '@/services/inmueblesService';
import { toastApiError } from '@/utils/errors';

/** Condominios usan la ruta `unidades`; las inmobiliarias, `propiedades` (así cada módulo se vende por separado). */
export function useRecursoUnidades(): RecursoUnidad {
  const { tenant } = useSession();
  return tenant?.tipo_negocio === 'inmobiliaria' ? 'propiedades' : 'unidades';
}

interface Props {
  value: number | null;
  onChange: (id: number | null, unidad?: Unidad) => void;
  etiqueta?: string;
  disabled?: boolean;
  /** Solo las que tienen ocupante o propietario que pague (útil para cobrar). */
  filtro?: (u: Unidad) => boolean;
}

const norm = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Buscador de unidades/propiedades por código, edificio o persona. */
export default function SelectorUnidad({ value, onChange, etiqueta = 'Unidad', disabled = false, filtro }: Props): ReactElement {
  const recurso = useRecursoUnidades();
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getUnidades({}, recurso).then(setUnidades).catch((e) => toastApiError(e, 'No se pudieron cargar las unidades.'));
  }, [recurso]);

  useEffect(() => {
    const cerrar = (e: MouseEvent): void => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, []);

  const base = useMemo(() => (filtro ? unidades.filter(filtro) : unidades), [unidades, filtro]);
  const seleccionada = useMemo(() => unidades.find((u) => u.id === value) ?? null, [unidades, value]);
  const resultados = useMemo(() => {
    const q = norm(busqueda.trim());
    const lista = q ? base.filter((u) => norm(`${u.codigo} ${u.edificio_nombre ?? ''} ${u.propietario_nombre ?? ''} ${u.ocupante_nombre ?? ''} ${u.titulo}`).includes(q)) : base;
    return lista.slice(0, 10);
  }, [base, busqueda]);

  const campo = 'w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';

  return (
    <div ref={contenedor} className="relative">
      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{etiqueta}</label>
      {seleccionada && !abierto ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm">
          <button type="button" disabled={disabled} onClick={() => setAbierto(true)} className="text-left min-w-0 flex-1 disabled:cursor-default">
            <span className="font-semibold text-slate-800 block truncate">{seleccionada.codigo}{seleccionada.edificio_nombre ? ` · ${seleccionada.edificio_nombre}` : ''}</span>
            <span className="text-[11px] text-slate-400">{seleccionada.ocupante_nombre ?? seleccionada.propietario_nombre ?? 'Sin responsable'}</span>
          </button>
          {!disabled && <button type="button" onClick={() => onChange(null)} className="p-1 text-slate-400 hover:text-red-500" aria-label="Quitar"><X size={16} /></button>}
        </div>
      ) : (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busqueda} disabled={disabled} onChange={(e) => { setBusqueda(e.target.value); setAbierto(true); }} onFocus={() => setAbierto(true)} placeholder="Busca por código, edificio o persona..." className={campo} />
        </div>
      )}
      {abierto && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-y-auto">
          {resultados.map((u) => (
            <button key={u.id} type="button" onClick={() => { onChange(u.id, u); setAbierto(false); setBusqueda(''); }} className="w-full text-left px-3 py-2 hover:bg-primary-50 flex items-center justify-between gap-2 border-b border-slate-50 last:border-0">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800 truncate">{u.codigo}{u.edificio_nombre ? ` · ${u.edificio_nombre}` : ''}</span>
                <span className="block text-[11px] text-slate-400">{u.ocupante_nombre ?? u.propietario_nombre ?? 'Sin responsable'}</span>
              </span>
              {u.id === value ? <Check size={15} className="text-primary-600 shrink-0" /> : Number(u.vencido_usd) > 0 ? <span className="text-[10px] font-bold text-red-500 shrink-0">debe {Number(u.vencido_usd).toFixed(0)}$</span> : null}
            </button>
          ))}
          {resultados.length === 0 && <p className="px-3 py-3 text-xs text-slate-400">Ninguna unidad coincide con “{busqueda}”.</p>}
        </div>
      )}
    </div>
  );
}
