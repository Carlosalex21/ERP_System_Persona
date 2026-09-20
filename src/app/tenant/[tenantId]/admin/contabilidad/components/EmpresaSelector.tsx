"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { Building2 } from 'lucide-react';
import { getEmpresasContables, type EmpresaContable } from '@/services/contabilidadService';

interface EmpresaSelectorProps {
  empresaId: number | null;
  onChange: (empresaId: number | null, empresa: EmpresaContable | null) => void;
}

/**
 * Selector de empresa contable compartido por todas las pantallas del
 * módulo -- un contador lleva la contabilidad de VARIAS empresas, así que
 * cada reporte/pantalla necesita saber de cuál está hablando antes de
 * mostrar nada.
 */
export default function EmpresaSelector({ empresaId, onChange }: EmpresaSelectorProps): ReactElement {
  const [empresas, setEmpresas] = useState<EmpresaContable[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    getEmpresasContables()
      .then((lista) => {
        setEmpresas(lista);
        if (!empresaId && lista.length > 0) {
          onChange(lista[0].id, lista[0]);
        }
      })
      .catch(() => setEmpresas([]))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
