"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { SlidersHorizontal, Save, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { getRoles, updateModulosOcultosRol } from '@/services/rrhhService';
import { getApiErrorMessages } from '@/utils/helpers';
import { useTenant } from '@/hooks/useTenant';
import { GRUPOS_MODULOS_PANEL } from '@/utils/modulosPanel';
import { PageHeader, Card, CardHeader, ActionButton, FormSkeleton } from '@/components/ui';
import type { Rol } from '@/types/api';

/**
 * Qué módulos del panel ve cada rol -- antes un cajero veía exactamente el
 * mismo menú que un administrador (el backend igual le bloqueaba la
 * acción al intentarla, pero mostrar una opción que después falla
 * confunde). El rol "admin" no aparece aquí a propósito: no tendría
 * sentido dejar que alguien se oculte el panel a sí mismo -- ver
 * `Sidebar.tsx`, que igual lo excluye del filtro y le muestra todo.
 */
export default function PermisosPorRolPage(): ReactElement {
  const { tenant } = useTenant();
  const [roles, setRoles] = useState<Rol[]>([]);
  const [seleccion, setSeleccion] = useState<Record<number, Set<string>>>({});
  const [guardandoId, setGuardandoId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await getRoles();
      setRoles(data);
      const inicial: Record<number, Set<string>> = {};
      data.forEach((rol) => { inicial[rol.id] = new Set(rol.modulos_ocultos); });
      setSeleccion(inicial);
    } catch {
      toast.error('No se pudieron cargar los roles.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const alternar = (rolId: number, codigo: string): void => {
    setSeleccion((prev) => {
      const actual = new Set(prev[rolId] ?? []);
      if (actual.has(codigo)) actual.delete(codigo); else actual.add(codigo);
      return { ...prev, [rolId]: actual };
    });
  };

  const guardar = async (rol: Rol): Promise<void> => {
    setGuardandoId(rol.id);
    try {
      const modulosOcultos = Array.from(seleccion[rol.id] ?? []);
      const actualizado = await updateModulosOcultosRol(rol.id, modulosOcultos);
      setRoles((prev) => prev.map((r) => (r.id === rol.id ? actualizado : r)));
      toast.success(`Permisos de "${rol.nombre}" actualizados.`);
    } catch (error) {
      const mensajes = getApiErrorMessages(error);
      mensajes.length > 0 ? mensajes.forEach((m) => toast.error(m)) : toast.error('No se pudieron guardar los permisos.');
    } finally {
      setGuardandoId(null);
    }
  };

  const rolesConfigurables = roles.filter((r) => r.codigo !== 'admin');

  if (cargando) {
    return (
      <div className="space-y-6">
        <PageHeader icon={<SlidersHorizontal size={20} />} title="Permisos por Rol" />
        <FormSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<SlidersHorizontal size={20} />}
        title="Permisos por Rol"
        description="Elige qué secciones del panel ve cada rol. Un administrador siempre ve todo."
      />

      {rolesConfigurables.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500 text-center py-6">
            No hay otros roles además de administrador todavía. Crea empleados con otro rol desde "Empleados" para poder configurar sus permisos aquí.
          </p>
        </Card>
      )}

      {rolesConfigurables.map((rol) => {
        const ocultos = seleccion[rol.id] ?? new Set<string>();
        return (
          <Card key={rol.id}>
            <CardHeader
              title={rol.nombre}
              subtitle={rol.descripcion || undefined}
              action={
                <ActionButton onClick={() => guardar(rol)} loading={guardandoId === rol.id}>
                  <Save size={16} /> Guardar
                </ActionButton>
              }
            />
            <div className="space-y-4 mt-2">
              {GRUPOS_MODULOS_PANEL.map((grupo) => {
                const modulosVisibles = grupo.modulos.filter(
                  (m) => m.codigo !== 'permisos_rol' && (!m.tiposNegocio || (tenant?.tipo_negocio && m.tiposNegocio.includes(tenant.tipo_negocio))),
                );
                if (modulosVisibles.length === 0) return null;
                return (
                  <div key={grupo.etiqueta}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{grupo.etiqueta}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {modulosVisibles.map((modulo) => (
                        <label
                          key={modulo.codigo}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-semibold text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={!ocultos.has(modulo.codigo)}
                            onChange={() => alternar(rol.id, modulo.codigo)}
                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          />
                          {modulo.etiqueta}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      <div className="flex items-start gap-2 text-xs text-slate-400 px-1">
        <ShieldCheck size={14} className="shrink-0 mt-0.5" />
        <p>
          Esto solo controla qué ve cada rol en el menú -- las acciones sensibles (borrar, editar precios, ver reportes
          financieros, etc.) ya están protegidas aparte, sin importar esta configuración.
        </p>
      </div>
    </div>
  );
}
