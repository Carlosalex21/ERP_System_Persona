"use client";

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Check, Plus, Search, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { createCliente, getClientes } from '@/services/clientesService';
import { toastApiError } from '@/utils/errors';
import type { Cliente } from '@/types/api';

interface Props {
  value: number | null;
  onChange: (id: number | null, cliente?: Cliente) => void;
  etiqueta: string;
  placeholder?: string;
  /** Permite dar de alta a la persona sin salir de la pantalla. */
  permitirCrear?: boolean;
  requerido?: boolean;
}

const norm = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Selector de personas (propietarios, inquilinos, vecinos) con búsqueda por nombre,
 * documento o teléfono y alta rápida: así quien carga una unidad no tiene que ir
 * a otra pantalla a crear al propietario primero.
 */
export default function SelectorCliente({ value, onChange, etiqueta, placeholder = 'Buscar por nombre, cédula o teléfono...', permitirCrear = true, requerido = false }: Props): ReactElement {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: '', documento: '', telefono: '', email: '' });
  const [guardando, setGuardando] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getClientes().then(setClientes).catch(() => setClientes([]));
  }, []);

  useEffect(() => {
    const cerrar = (e: MouseEvent): void => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, []);

  const seleccionado = useMemo(() => clientes.find((c) => c.id === value) ?? null, [clientes, value]);

  const resultados = useMemo(() => {
    const q = norm(busqueda.trim());
    const lista = q
      ? clientes.filter((c) => norm(`${c.nombre} ${c.documento ?? ''} ${c.telefono ?? ''}`).includes(q))
      : clientes;
    return lista.slice(0, 8);
  }, [clientes, busqueda]);

  const guardarNuevo = async (): Promise<void> => {
    if (!nuevo.nombre.trim()) {
      toast.error('Escribe el nombre de la persona.');
      return;
    }
    setGuardando(true);
    try {
      const creado = await createCliente({
        nombre: nuevo.nombre.trim(), documento: nuevo.documento.trim() || null, telefono: nuevo.telefono.trim() || null,
        email: nuevo.email.trim() || null, tipo_documento: nuevo.documento.trim() ? 'V' : null, direccion: '', activo: true,
      });
      setClientes((prev) => [creado, ...prev]);
      onChange(creado.id, creado);
      setCreando(false);
      setAbierto(false);
      setNuevo({ nombre: '', documento: '', telefono: '', email: '' });
      toast.success(`${creado.nombre} agregado.`);
    } catch (error) {
      toastApiError(error, 'No se pudo crear a la persona.');
    } finally {
      setGuardando(false);
    }
  };

  const campo = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';

  return (
    <div ref={contenedor} className="relative">
      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{etiqueta}{requerido && <span className="text-red-500"> *</span>}</label>

      {seleccionado && !abierto ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm">
          <button type="button" onClick={() => setAbierto(true)} className="text-left min-w-0 flex-1">
            <span className="font-semibold text-slate-800 block truncate">{seleccionado.nombre}</span>
            <span className="text-[11px] text-slate-400">{[seleccionado.documento, seleccionado.telefono].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</span>
          </button>
          <button type="button" onClick={() => onChange(null)} className="p-1 text-slate-400 hover:text-red-500" aria-label="Quitar">
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setAbierto(true); }}
            onFocus={() => setAbierto(true)}
            placeholder={placeholder}
            className={`${campo} pl-9`}
          />
        </div>
      )}

      {abierto && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-y-auto">
          {resultados.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onChange(c.id, c); setAbierto(false); setBusqueda(''); }}
              className="w-full text-left px-3 py-2 hover:bg-primary-50 flex items-center justify-between gap-2 border-b border-slate-50 last:border-0"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800 truncate">{c.nombre}</span>
                <span className="block text-[11px] text-slate-400">{[c.documento, c.telefono].filter(Boolean).join(' · ')}</span>
              </span>
              {c.id === value && <Check size={15} className="text-primary-600 shrink-0" />}
            </button>
          ))}
          {resultados.length === 0 && <p className="px-3 py-3 text-xs text-slate-400">Nadie coincide con “{busqueda}”.</p>}
          {permitirCrear && !creando && (
            <button
              type="button"
              onClick={() => { setCreando(true); setNuevo((p) => ({ ...p, nombre: busqueda })); }}
              className="w-full text-left px-3 py-2.5 text-sm font-bold text-primary-600 hover:bg-primary-50 flex items-center gap-2 border-t border-slate-100"
            >
              <Plus size={15} /> Agregar nueva persona
            </button>
          )}
          {creando && (
            <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50">
              <p className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1.5"><UserPlus size={13} /> Nueva persona</p>
              <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Nombre completo *" className={campo} />
              <div className="grid grid-cols-2 gap-2">
                <input value={nuevo.documento} onChange={(e) => setNuevo({ ...nuevo, documento: e.target.value })} placeholder="Cédula / RIF" className={campo} />
                <input value={nuevo.telefono} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} placeholder="Teléfono (WhatsApp)" className={campo} />
              </div>
              <input value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} placeholder="Correo (opcional)" className={campo} />
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setCreando(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
                <button type="button" onClick={guardarNuevo} disabled={guardando} className="px-3 py-1.5 text-xs font-bold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60">
                  {guardando ? 'Guardando…' : 'Guardar y usar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
