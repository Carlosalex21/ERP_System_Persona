"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Plus, Warehouse, Trash2, Pencil, MapPin, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import AlmacenModal from './AlmacenModal';
import { getAlmacenes, createAlmacen, updateAlmacen, deleteAlmacen } from '@/services/inventoryService';
import type { Almacen, AlmacenRequest } from '@/types/api';
import { PageHeader, Card, EmptyState, CardGridSkeleton, Stagger, StaggerItem, ConfirmDialog } from '@/components/ui';
import { toastApiError } from '@/utils/errors';

export default function AlmacenesPage(): ReactElement {
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Almacen | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getAlmacenes();
      setAlmacenes(data);
    } catch (error) {
      console.error('Error cargando almacenes:', error);
      toast.error('No se pudieron cargar los almacenes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirNuevo = (): void => {
    setEditando(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (almacen: Almacen): void => {
    setEditando(almacen);
    setModalAbierto(true);
  };

  const guardar = async (data: AlmacenRequest, id?: number): Promise<void> => {
    setSaving(true);
    try {
      if (id) {
        await updateAlmacen(id, data);
        toast.success('Almacén actualizado correctamente.');
      } else {
        await createAlmacen(data);
        toast.success('Almacén creado correctamente.');
      }
      setModalAbierto(false);
      await cargar();
    } catch (error) {
      console.error('Error guardando almacén:', error);
      // El motivo más común acá es el límite de sucursales del plan
      // contratado (`apps.core.plan_limits.verificar_limite`, 403) -- antes
      // se mostraba un genérico "revisa los datos" que no decía nada sobre
      // el plan, dejando al dueño pensando que el sistema estaba fallando.
      toastApiError(error, 'No se pudo guardar el almacén. Revisa los datos.');
    } finally {
      setSaving(false);
    }
  };

  const [almacenAEliminar, setAlmacenAEliminar] = useState<Almacen | null>(null);
  const [eliminandoAlmacen, setEliminandoAlmacen] = useState(false);

  const confirmarEliminarAlmacen = async (): Promise<void> => {
    if (!almacenAEliminar) return;
    setEliminandoAlmacen(true);
    try {
      await deleteAlmacen(almacenAEliminar.id);
      toast.success('Almacén eliminado.');
      setAlmacenAEliminar(null);
      await cargar();
    } catch (error) {
      console.error('Error eliminando almacén:', error);
      toast.error('No se pudo eliminar el almacén. Puede que tenga inventario asociado.');
    } finally {
      setEliminandoAlmacen(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Warehouse size={20} />}
        title="Almacenes"
        description="Configura tus puntos de inventario y sucursales para gestionar el stock."
        actions={
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={abrirNuevo}
            className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
          >
            <Plus size={18} /> Nuevo Almacén
          </motion.button>
        }
      />

      {loading ? (
        <CardGridSkeleton count={3} />
      ) : almacenes.length === 0 ? (
        <EmptyState
          icon={<Warehouse size={28} />}
          title="Aún no tienes almacenes"
          description="Crea tu primer almacén para poder registrar productos y gestionar el inventario."
          action={
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={abrirNuevo}
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 shadow-md"
            >
              <Plus size={18} /> Crear primer almacén
            </motion.button>
          }
        />
      ) : (
        <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {almacenes.map(almacen => (
            <StaggerItem key={almacen.id}>
            <Card
              className="flex flex-col justify-between hover:shadow-lg transition-shadow h-full"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                      <Warehouse size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{almacen.nombre}</h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border mt-1 ${
                          almacen.activo
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}
                      >
                        {almacen.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => abrirEdicion(almacen)}
                      className="p-1.5 text-slate-400 hover:text-primary-600 transition-colors"
                      aria-label="Editar almacén"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setAlmacenAEliminar(almacen)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                      aria-label="Eliminar almacén"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    <span className="text-xs">{almacen.direccion || 'Sin dirección registrada'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone size={14} className="text-slate-400 shrink-0" />
                    <span className="text-xs">{almacen.telefono || 'Sin teléfono registrado'}</span>
                  </div>
                </div>
              </div>
            </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {modalAbierto && (
        <AlmacenModal
          almacen={editando}
          onClose={() => setModalAbierto(false)}
          onSave={guardar}
          cargando={saving}
        />
      )}

      <ConfirmDialog
        isOpen={!!almacenAEliminar}
        title="Eliminar Almacén"
        message={`¿Eliminar el almacén "${almacenAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={eliminandoAlmacen}
        onConfirm={confirmarEliminarAlmacen}
        onCancel={() => setAlmacenAEliminar(null)}
      />
    </div>
  );
}
