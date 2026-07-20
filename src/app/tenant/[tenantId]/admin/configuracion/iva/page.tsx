"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { getIvaConfigs, createIvaConfig, deleteIvaConfig } from '@/services/configuracionService';
import { Iva, IvaRequest } from '@/types/api';
import { Loader2, Plus, ReceiptText, Trash2 } from 'lucide-react';
// Asumimos que existe un IvaModal
// import IvaModal from './components/IvaModal';

/**
 * Página para gestionar las configuraciones de IVA.
 */
export default function IvaPage(): ReactElement {
  const [ivas, setIvas] = useState<Iva[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getIvaConfigs();
      setIvas(data);
    } catch (error) {
      console.error("Error al cargar configuraciones de IVA:", error);
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
        <h1 className="text-2xl font-bold text-slate-800">Gestión de Impuestos (IVA)</h1>
        <button onClick={() => alert("Abrir modal de nuevo IVA")} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
          <Plus size={18} /> Nuevo Tipo de IVA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ivas.map(iva => (
          <div key={iva.id} className="bg-white p-5 rounded-xl border flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><ReceiptText size={18} /> {iva.nombre}</h3>
              <p className="text-2xl font-light text-primary-600 mt-2">{iva.porcentaje_iva}%</p>
            </div>
            <div className="mt-4 pt-3 border-t flex justify-end">
              <button onClick={() => alert(`Eliminar ${iva.id}`)} className="p-2 text-slate-400 hover:text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* Aquí iría el componente IvaModal */}
    </div>
  );
}