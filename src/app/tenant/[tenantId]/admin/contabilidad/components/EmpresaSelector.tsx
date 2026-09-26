"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { Building2 } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';
import { getEmpresasContables, getMiEmpresaContable, type EmpresaContable } from '@/services/contabilidadService';

interface EmpresaSelectorProps {
  empresaId: number | null;
  onChange: (empresaId: number | null, empresa: EmpresaContable | null) => void;
}

/**
 * Selector de empresa contable compartido por todas las pantallas del
 * módulo. Un tenant del vertical 'contador' lleva la contabilidad de
 * VARIAS empresas -- necesita elegir de cuál está hablando. Cualquier otro
 * negocio (retail, restaurante, farmacia...) solo tiene UNA: la suya
 * propia, resuelta/auto-creada vía `getMiEmpresaContable` -- para esos no
 * tiene sentido mostrar un selector, solo el nombre de su empresa.
 */
export default function EmpresaSelector({ empresaId, onChange }: EmpresaSelectorProps): ReactElement {
  const { tenant } = useTenant();
  const esContador = tenant?.tipo_negocio === 'contador';
  const [empresas, setEmpresas] = useState<EmpresaContable[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!tenant) return;
    const cargar = esContador
      ? getEmpresasContables()
      : getMiEmpresaContable().then((empresa) => [empresa]);
    cargar
      .then((lista) => {
        setEmpresas(lista);
        if (!empresaId && lista.length > 0) {
          onChange(lista[0].id, lista[0]);
        }
      })
      .catch(() => setEmpresas([]))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant, esContador]);

  if (!esContador) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700">
        <Building2 size={16} className="text-slate-400 shrink-0" />
        {cargando ? 'Cargando...' : (empresas[0]?.nombre ?? 'Mi Empresa')}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 size={16} className="text-slate-400 shrink-0" />
      <select
        value={empresaId ?? ''}
        onChange={(e) => {
          const id = e.target.value ? Number(e.target.value) : null;
          onChange(id, empresas.find((emp) => emp.id === id) ?? null);
        }}
        disabled={cargando || empresas.length === 0}
        className="px-3 py-2 border rounded-lg text-sm bg-white font-semibold min-w-[220px]"
      >
        {empresas.length === 0 && <option value="">Sin empresas registradas</option>}
        {empresas.map((emp) => (
          <option key={emp.id} value={emp.id}>{emp.nombre}</option>
        ))}
      </select>
    </div>
  );
}
