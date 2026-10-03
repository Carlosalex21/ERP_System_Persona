"use client";

import type { ReactElement } from 'react';
import { GRUPOS_MODULOS_VENDIBLES, type TipoNegocio } from '@/utils/modulosPanel';

const ETIQUETA_TIPO: Record<TipoNegocio, string> = {
  retail: 'Retail', b2b: 'B2B', restaurante: 'Restaurante', farmacia: 'Farmacia', servicios: 'Servicios', contador: 'Contador',
  condominios: 'Condominios', inmobiliaria: 'Inmobiliaria',
};

interface SelectorModulosPlanProps {
  /** Códigos incluidos; vacío = el plan incluye TODOS los módulos. */
  value: string[];
  onChange: (modulos: string[]) => void;
  /** Tipos de negocio del plan: los módulos que no aplican a ninguno se atenúan. Vacío = todos. */
  tiposNegocio: string[];
}

/**
 * Editor de "qué módulos incluye este plan" (superadmin). Los módulos
 * básicos (dashboard, datos de la empresa, monedas...) no aparecen: van en
 * todos los planes. Ver `Plan.modulos` en el backend.
 */
export default function SelectorModulosPlan({ value, onChange, tiposNegocio }: SelectorModulosPlanProps): ReactElement {
  const todos = value.length === 0;
  const seleccion = new Set(value);
  const todosLosCodigos = GRUPOS_MODULOS_VENDIBLES.flatMap((g) => g.modulos.map((m) => m.codigo));

  const aplica = (tipos?: TipoNegocio[]): boolean =>
    !tipos || tiposNegocio.length === 0 || tipos.some((t) => tiposNegocio.includes(t));

  const alternar = (codigo: string): void => {
    const nueva = new Set(seleccion);
    if (nueva.has(codigo)) nueva.delete(codigo);
    else nueva.add(codigo);
    onChange([...nueva]);
  };

  const alternarGrupo = (codigos: string[]): void => {
    const nueva = new Set(seleccion);
    const completos = codigos.every((c) => nueva.has(c));
    codigos.forEach((c) => (completos ? nueva.delete(c) : nueva.add(c)));
    onChange([...nueva]);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange([])}
          className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border-2 ${todos ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500'}`}
        >
          Todos los módulos
        </button>
        <button
          type="button"
          // Arranca con todo marcado para ir quitando lo que no entra en el plan.
          onClick={() => { if (todos) onChange(todosLosCodigos); }}
          className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border-2 ${!todos ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500'}`}
        >
          Elegir módulos
        </button>
      </div>

      {!todos && (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
          {GRUPOS_MODULOS_VENDIBLES.map((grupo) => {
            const codigos = grupo.modulos.map((m) => m.codigo);
            const marcados = codigos.filter((c) => seleccion.has(c)).length;
            return (
              <div key={grupo.id} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    {grupo.etiqueta} <span className="text-slate-300">({marcados}/{codigos.length})</span>
                  </span>
                  <button type="button" onClick={() => alternarGrupo(codigos)} className="text-[11px] font-bold text-primary-600 hover:underline">
                    {marcados === codigos.length ? 'Quitar todos' : 'Marcar todos'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {grupo.modulos.map((m) => (
                    <label
                      key={m.codigo}
                      className={`flex items-center gap-2 text-xs font-semibold cursor-pointer ${aplica(m.tiposNegocio) ? 'text-slate-700' : 'text-slate-300'}`}
                      title={m.tiposNegocio ? `Solo aplica a: ${m.tiposNegocio.map((t) => ETIQUETA_TIPO[t]).join(', ')}` : undefined}
                    >
                      <input
                        type="checkbox"
                        checked={seleccion.has(m.codigo)}
                        onChange={() => alternar(m.codigo)}
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      {m.etiqueta}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-slate-400">
        Dashboard, alertas, datos de la empresa, monedas, tasas, impuestos y la suscripción van incluidos en todos los planes.
      </p>
    </div>
  );
}
