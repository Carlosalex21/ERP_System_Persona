"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Tags, Pencil, Trash2, FolderTree } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import CategoriaModal from './CategoriaModal';
import { DataTable, TableSkeleton, PageHeader, Card, EmptyState } from '@/components/ui';
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

  const columns = useMemo<ColumnDef<Categoria>[]>(() => [
    {
      accessorKey: 'nombre',
      header: 'Categoría',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <Tags size={16} />
          </span>
          <span className="font-bold text-slate-900">{row.original.nombre}</span>
        </div>
      ),
    },
    {
      id: 'padre',
      header: 'Padre',
      enableSorting: false,
      cell: ({ row }) => {
        const padreNombre = categorias.find(c => c.id === row.original.padre)?.nombre;
        return (
          <span className="text-xs font-medium text-slate-600">
            {padreNombre || <span className="text-slate-300">— Sin padre —</span>}
          </span>
        );
      },
    },
    {
      accessorKey: 'activo',
      header: () => <div className="text-center">Estado</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span
            className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${
              row.original.activo
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
          >
            {row.original.activo ? 'Activa' : 'Inactiva'}
          </span>
        </div>
      ),
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => abrirEdicion(row.original)}
            className="p-2 text-slate-400 hover:text-primary-600 transition-colors"
            aria-label="Editar categoría"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => eliminar(row.original)}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            aria-label="Eliminar categoría"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ], [categorias]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Tags size={20} />}
        title="Categorías de Productos"
        description="Organiza tu catálogo para que tus clientes encuentren rápido lo que buscan."
        actions={
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={abrirNueva}
            className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
          >
            <Plus size={18} /> Nueva Categoría
          </motion.button>
        }
      />

      {loading ? (
        <TableSkeleton rows={5} />
      ) : categorias.length === 0 ? (
        <EmptyState
          icon={<FolderTree size={28} />}
          title="Aún no tienes categorías"
          description="Crea tu primera categoría para organizar tu inventario y mejorar la experiencia de compra."
          action={
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={abrirNueva}
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 shadow-md"
            >
              <Plus size={18} /> Crear primera categoría
            </motion.button>
          }
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable columns={columns} data={categorias} resultLabel="categorías" />
        </Card>
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
