"use client";

import { useState, useEffect, use, type ReactElement } from 'react';
import { Plus, CreditCard, Trash2, Loader2 } from 'lucide-react';
import { MetodoPago, MetodoPagoRequest } from '@/types/api';
import { getMetodosDePago, createMetodoDePago, deleteMetodoDePago } from '@/services/pagosService';
import MetodoPagoModal from './components/MetodoPagoModal';

/**
 * Página de Pagos.
 * Permite al administrador del tenant configurar los métodos de pago.
 * @returns {JSX.Element} El componente de la página de Pagos.
 */
export default function PagosPage({ params }: { params: Promise<{ tenantId: string }> }): ReactElement {
  const { tenantId } = use(params);

  const [loading, setLoading] = useState(true);
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getMetodosDePago();
      setMetodos(data);
    } catch (error) {
      console.error("Error al cargar métodos de pago:", error);
      alert("No se pudieron cargar los métodos de pago.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (data: MetodoPagoRequest) => {
    try {
      await createMetodoDePago(data);
      setIsModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error("Error al guardar método de pago:", error);
      alert("No se pudo guardar el método de pago.");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Está seguro de que desea eliminar este método de pago?")) {
      try {
        await deleteMetodoDePago(id);
        await fetchData();
      } catch (error) {
        console.error("Error al eliminar método de pago:", error);
        alert("No se pudo eliminar el método de pago.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center text-slate-500">
        <Loader2 size={32} className="animate-spin mr-3" />
        Cargando métodos de pago...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Métodos de Pago</h1>
          <p className="text-xs text-slate-500 mt-0.5">Configura las formas de pago que aceptarás en el Punto de Venta.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
        >
          <Plus size={18} /> Añadir Método
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metodos.map(metodo => (
          <div key={metodo.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><CreditCard size={18} className="text-primary-600" /> {metodo.nombre}</h3>
              <p className="text-xs text-slate-500 mt-1">Tipo: {metodo.tipo_metodo || 'No especificado'}</p>
              <p className="text-xs text-slate-500">Detalle: {metodo.nro_cuenta || metodo.telefono || 'N/A'}</p>
            </div>
            <div className="mt-4 pt-3 border-t flex justify-end">
              <button onClick={() => handleDelete(metodo.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <MetodoPagoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

