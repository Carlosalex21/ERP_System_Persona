"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Plus, Building2, Trash2, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { PageHeader, Card, EmptyState, CardGridSkeleton, Stagger, StaggerItem, ConfirmDialog } from '@/components/ui';
import { getDepartamentos, deleteDepartamento } from '@/services/rrhhService';
import type { Departamento } from '@/types/api';
import DepartamentoModal from './DepartamentoModal';

export default function DepartamentosPage(): ReactElement {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Departamento | null>(null);
  const [aEliminar, setAEliminar] = useState<Departamento | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setDepartamentos(await getDepartamentos());
    } catch {
      toast.error('No se pudieron cargar los departamentos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const confirmarEliminar = async (): Promise<void> => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await deleteDepartamento(aEliminar.id);
      toast.success('Departamento eliminado.');
      setAEliminar(null);
      await cargar();
    } catch {
      toast.error('No se pudo eliminar el departamento.');
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Building2 size={20} />}
        title="Departamentos"
        description="Equipos de trabajo (Cocina, Barra, Almacén, Taller...) a los que se puede asignar un empleado, un producto o una orden -- para que el trabajo se pueda seguir por equipo, no solo por una persona."
        actions={
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { setEditando(null); setModalAbierto(true); }}
            className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
          >
            <Plus size={18} /> Nuevo Departamento
          </motion.button>
        }
      />

      {loading ? (
        <CardGridSkeleton count={3} />
      ) : departamentos.length === 0 ? (
        <EmptyState
          icon={<Building2 size={28} />}
          title="Aún no tienes departamentos"
          description="Crea tu primer departamento (ej. Cocina, Almacén) para empezar a asignar trabajo por equipo."
          action={
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { setEditando(null); setModalAbierto(true); }}
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 shadow-md"
            >
              <Plus size={18} /> Crear primer departamento
            </motion.button>
          }
        />
      ) : (
        <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departamentos.map((d) => (
            <StaggerItem key={d.id}>
              <Card className="flex flex-col justify-between hover:shadow-lg transition-shadow h-full">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                        <Building2 size={18} />
                      </div>
                      <h3 className="font-bold text-slate-900">{d.nombre}</h3>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditando(d); setModalAbierto(true); }} className="p-1.5 text-slate-400 hover:text-primary-600 transition-colors" aria-label="Editar departamento">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setAEliminar(d)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" aria-label="Eliminar departamento">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{d.descripcion || 'Sin descripción.'}</p>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {modalAbierto && (
        <DepartamentoModal
          departamento={editando}
          onClose={() => setModalAbierto(false)}
          onSaved={() => { setModalAbierto(false); cargar(); }}
        />
      )}

      <ConfirmDialog
        isOpen={!!aEliminar}
        title="Eliminar Departamento"
        message={`¿Eliminar el departamento "${aEliminar?.nombre}"? Los empleados/productos/órdenes ya asignados a él quedarán sin departamento.`}
        confirmLabel="Eliminar"
        loading={eliminando}
        onConfirm={confirmarEliminar}
        onCancel={() => setAEliminar(null)}
      />
    </div>
  );
}
