"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { getAlmacenes, createAlmacen, deleteAlmacen } from '@/services/inventoryService';
import { Almacen, AlmacenRequest } from '@/types/api';
import { Loader2, Plus, Warehouse, Trash2 } from 'lucide-react';
// Asumimos que existe un AlmacenModal similar a MetodoPagoModal
// import AlmacenModal from './components/AlmacenModal';

/**
 * Página para gestionar los almacenes del tenant.
 */
export default function AlmacenesPage(): ReactElement {
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getAlmacenes();
      setAlmacenes(data);
    } catch (error) {
      console.error("Error al cargar almacenes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Gestión de Almacenes</h1>
        <button onClick={() => alert("Abrir modal de nuevo almacén")} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
          <Plus size={18} /> Nuevo Almacén
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {almacenes.map(almacen => (
          <div key={almacen.id} className="bg-white p-5 rounded-xl border flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Warehouse size={18} /> {almacen.nombre}</h3>
              <p className="text-xs text-slate-500 mt-1">{almacen.direccion}</p>
            </div>
            <div className="mt-4 pt-3 border-t flex justify-end">
              <button onClick={() => alert(`Eliminar ${almacen.id}`)} className="p-2 text-slate-400 hover:text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* Aquí iría el componente AlmacenModal */}
    </div>
  );
}