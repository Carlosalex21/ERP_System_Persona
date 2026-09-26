"use client";

import { useState, useEffect, useMemo, useRef, type ReactElement, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CornerDownLeft, X } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';
import { useUsuarioActual } from '@/hooks/useUsuarioActual';
import { MODULOS_PANEL } from '@/utils/modulosPanel';

/**
 * Paleta de comandos (Ctrl+K / Cmd+K) -- busca por nombre entre TODOS los
 * módulos del panel (misma fuente que arma el Sidebar, `MODULOS_PANEL`) y
 * navega con Enter. Antes, encontrar una pantalla que no está en el primer
 * nivel del menú (ej. "Conciliación Bancaria" dentro de Contabilidad)
 * significaba desplazarse por todo el Sidebar a ojo.
 *
 * Respeta exactamente los mismos dos filtros de visibilidad que el
 * Sidebar: `tiposNegocio` (un contador no ve "Punto de Venta") y
 * `modulos_ocultos` del rol del usuario -- nunca ofrece atajos hacia algo
 * que ese usuario no vería en el menú.
 */
export default function CommandPalette(): ReactElement | null {
  const router = useRouter();
  const { tenant } = useTenant();
  const usuario = useUsuarioActual();
  const [abierto, setAbierto] = useState(false);
  const [query, setQuery] = useState('');
  const [indiceActivo, setIndiceActivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const alPresionar = (e: globalThis.KeyboardEvent) => {
      const esAtajo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (esAtajo) {
        e.preventDefault();
        setAbierto((v) => !v);
      } else if (e.key === 'Escape') {
        setAbierto(false);
      }
    };
    // Además del atajo de teclado, `AdminTopbar` dispara este evento desde
    // un botón visible -- nadie descubre Ctrl+K si nada en la interfaz lo
    // menciona.
    const alEventoExterno = () => setAbierto(true);
    document.addEventListener('keydown', alPresionar);
    window.addEventListener('erp:abrir-buscador', alEventoExterno);
    return () => {
      document.removeEventListener('keydown', alPresionar);
      window.removeEventListener('erp:abrir-buscador', alEventoExterno);
    };
  }, []);

  useEffect(() => {
    if (abierto) {
      setQuery('');
      setIndiceActivo(0);
      // Pequeño delay: el input recién se monta en este mismo render.
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [abierto]);

  const modulosVisibles = useMemo(() => {
    const modulosOcultos = new Set(usuario?.modulos_ocultos ?? []);
    return MODULOS_PANEL.filter((m) => {
      if (m.tiposNegocio && tenant?.tipo_negocio && !m.tiposNegocio.includes(tenant.tipo_negocio)) return false;
      if (modulosOcultos.has(m.codigo)) return false;
      return true;
    });
  }, [tenant?.tipo_negocio, usuario]);

  const resultados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return modulosVisibles.slice(0, 8);
    return modulosVisibles.filter((m) => m.etiqueta.toLowerCase().includes(q)).slice(0, 8);
  }, [query, modulosVisibles]);

  if (!abierto) return null;

  const ir = (path: string): void => {
    router.push(path);
    setAbierto(false);
  };

  const manejarTeclado = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceActivo((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceActivo((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && resultados[indiceActivo]) {
      ir(resultados[indiceActivo].path);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setAbierto(false)}>
      <div
        className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIndiceActivo(0); }}
            onKeyDown={manejarTeclado}
            placeholder="Busca cualquier pantalla del panel..."
            className="flex-1 min-w-0 text-sm outline-none placeholder:text-slate-400"
          />
          <button onClick={() => setAbierto(false)} className="text-slate-300 hover:text-slate-500 shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto py-1.5">
          {resultados.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">Sin resultados para &quot;{query}&quot;.</p>
          ) : (
            resultados.map((m, idx) => (
              <button
                key={m.codigo}
                onClick={() => ir(m.path)}
                onMouseEnter={() => setIndiceActivo(idx)}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                  idx === indiceActivo ? 'bg-primary-50 text-primary-700' : 'text-slate-700'
                }`}
              >
                <span className="font-semibold">{m.etiqueta}</span>
                {idx === indiceActivo && <CornerDownLeft size={13} className="text-primary-400" />}
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-3 text-[10px] text-slate-400">
          <span>↑↓ navegar</span>
          <span>↵ ir</span>
          <span>esc cerrar</span>
        </div>
      </div>
    </div>
  );
}
