"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Plus, Tags, Pencil, Trash2, FolderTree } from 'lucide-react';
import toast from 'react-hot-toast';

import CategoriaModal from './CategoriaModal';
import { TableSkeleton } from '@/components/ui';
import {
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
} from '@/services/inventoryService';
import type { Categoria, CategoriaRequest } from '@/types/api';

export default function CategoriasPage(): ReactElement {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getCategorias();
      setCategorias(data);
    } catch (error) {
      console.error('Error cargando categorías:', error);
      toast.error('No se pudieron cargar las categorías.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirNueva = (): void => {
    setEditando(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (categoria: Categoria): void => {
    setEditando(categoria);
    setModalAbierto(true);
  };

  const guardar = async (data: CategoriaRequest, id?: number): Promise<void> => {
    setSaving(true);
    try {
      if (id) {
        await updateCategoria(id, data);
        toast.success('Categoría actualizada correctamente.');
      } else {
        await createCategoria(data);
        toast.success('Categoría creada correctamente.');
      }
      setModalAbierto(false);
      await cargar();
    } catch (error) {
      console.error('Error guardando categoría:', error);
      toast.error('No se pudo guardar la categoría. Revisa los datos.');
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (categoria: Categoria): Promise<void> => {
    if (!confirm(`¿Eliminar la categoría "${categoria.nombre}"?`)) return;
    try {
      await deleteCategoria(categoria.id);
      toast.success('Categoría eliminada.');
      await cargar();
    } catch (error) {
      console.error('Error eliminando categoría:', error);
      toast.error('No se pudo eliminar la categoría. Puede que tenga productos asociados.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <div className="h-7 w-64 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-3 w-44 bg-slate-200 rounded mt-2 animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-slate-200 rounded-xl animate-pulse" />
        </div>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Tags size={24} className="text-primary-600" /> Categorías de Productos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organiza tu catálogo para que tus clientes encuentren rápido lo que buscan.
          </p>
        </div>
        <button
          onClick={abrirNueva}
          className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
        >
          <Plus size={18} /> Nueva Categoría
        </button>
      </div>

      {categorias.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <FolderTree size={48} className="mx-auto text-slate-300" />
          <h3 className="mt-4 text-lg font-bold text-slate-700">Aún no tienes categorías</h3>
          <p className="mt-1 text-sm text-slate-500">
            Crea tu primera categoría para organizar tu inventario y mejorar la experiencia de compra.
          </p>
          <button
            onClick={abrirNueva}
            className="mt-6 inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 shadow-md"
          >
            <Plus size={18} /> Crear primera categoría
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-4 pl-6">Categoría</th>
                <th className="p-4">Padre</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categorias.map(categoria => {
                const padreNombre = categorias.find(c => c.id === categoria.padre)?.nombre;
                return (
                  <tr key={categoria.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6 font-bold text-slate-900 flex items-center gap-3">
                      <span className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                        <Tags size={16} />
                      </span>
                      {categoria.nombre}
                    </td>
                    <td className="p-4 text-xs font-medium text-slate-600">
                      {padreNombre || <span className="text-slate-300">— Sin padre —</span>}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${
                          categoria.activo
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}
                      >
                        {categoria.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => abrirEdicion(categoria)}
                          className="p-2 text-slate-400 hover:text-primary-600 transition-colors"
                          aria-label="Editar categoría"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => eliminar(categoria)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          aria-label="Eliminar categoría"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && (
        <CategoriaModal
          categoria={editando}
          categorias={categorias}
          onClose={() => setModalAbierto(false)}
          onSave={guardar}
          cargando={saving}
        />
      )}
    </div>
  );
}
