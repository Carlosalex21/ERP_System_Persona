"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { FolderTree } from 'lucide-react';
import type { Categoria, CategoriaRequest } from '@/types/api';
import { AppModal, ActionButton } from '@/components/ui';

interface CategoriaModalProps {
  categoria?: Categoria | null;
  categorias: Categoria[];
  onClose: () => void;
  onSave: (data: CategoriaRequest, id?: number) => Promise<void>;
  cargando: boolean;
}

export default function CategoriaModal({
  categoria,
  categorias,
  onClose,
  onSave,
  cargando,
}: CategoriaModalProps): ReactElement {
  const [nombre, setNombre] = useState('');
  const [activo, setActivo] = useState(true);
  const [padre, setPadre] = useState<string>('');

  useEffect(() => {
    if (categoria) {
      setNombre(categoria.nombre);
      setActivo(categoria.activo);
      setPadre(categoria.padre ? String(categoria.padre) : '');
    } else {
      setNombre('');
      setActivo(true);
      setPadre('');
    }
  }, [categoria]);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const payload: CategoriaRequest = {
      nombre,
      activo,
      padre: padre ? Number(padre) : null,
    };
    await onSave(payload, categoria?.id);
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={categoria ? 'Editar Categoría' : 'Nueva Categoría'}
      icon={<FolderTree size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton type="submit" loading={cargando} onClick={submit}>
            {categoria ? 'Guardar Cambios' : 'Crear Categoría'}
          </ActionButton>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de la Categoría</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej. Ropa, Calzado, Accesorios..."
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-600 focus:bg-white"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría Padre (Opcional)</label>
          <select
            value={padre}
            onChange={e => setPadre(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-600 focus:bg-white"
          >
            <option value="">— Sin categoría padre —</option>
            {categorias
              .filter(c => !categoria || c.id !== categoria.id)
              .map(c => (
                <option key={c.id} value={String(c.id)}>{c.nombre}</option>
              ))}
          </select>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={activo}
            onChange={e => setActivo(e.target.checked)}
            className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm font-semibold text-slate-700">Categoría activa (visible en el catálogo)</span>
        </label>
      </form>
    </AppModal>
  );
}
