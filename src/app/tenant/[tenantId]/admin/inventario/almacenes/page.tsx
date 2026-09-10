"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Plus, Loader2, Warehouse, Trash2, Pencil, MapPin, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

import AlmacenModal from './AlmacenModal';
import { getAlmacenes, createAlmacen, updateAlmacen, deleteAlmacen } from '@/services/inventoryService';
import type { Almacen, AlmacenRequest } from '@/types/api';

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
      toast.error('No se pudo guardar el almacén. Revisa los datos.');
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (almacen: Almacen): Promise<void> => {
    if (!confirm(`¿Eliminar el almacén "${almacen.nombre}"?`)) return;
    try {
      await deleteAlmacen(almacen.id);
      toast.success('Almacén eliminado.');
      await cargar();
    } catch (error) {
      console.error('Error eliminando almacén:', error);
      toast.error('No se pudo eliminar el almacén. Puede que tenga inventario asociado.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Warehouse size={24} className="text-primary-600" /> Almacenes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configura tus puntos de inventario y sucursales para gestionar el stock.
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
        >
          <Plus size={18} /> Nuevo Almacén
        </button>
      </div>

      {almacenes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <Warehouse size={48} className="mx-auto text-slate-300" />
          <h3 className="mt-4 text-lg font-bold text-slate-700">Aún no tienes almacenes</h3>
          <p className="mt-1 text-sm text-slate-500">
            Crea tu primer almacén para poder registrar productos y gestionar el inventario.
          </p>
          <button
            onClick={abrirNuevo}
            className="mt-6 inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 shadow-md"
          >
            <Plus size={18} /> Crear primer almacén
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {almacenes.map(almacen => (
            <div
              key={almacen.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-lg transition-all"
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
                      onClick={() => eliminar(almacen)}
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
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <AlmacenModal
          almacen={editando}
          onClose={() => setModalAbierto(false)}
          onSave={guardar}
          cargando={saving}
        />
      )}
    </div>
  );
}
