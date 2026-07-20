"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Loader2, Users } from 'lucide-react';
import { getB2BClientes } from '@/services/clientesService';
import { ClienteB2B } from '@/types/api';

/**
 * Página para listar y gestionar la red de clientes B2B.
 */
export default function RedClientesPage(): ReactElement {
  const router = useRouter();
  const [clientes, setClientes] = useState<ClienteB2B[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getB2BClientes();
        setClientes(data);
      } catch (error) {
        console.error("Error al cargar clientes B2B:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Red de Clientes B2B</h1>
          <p className="text-slate-500">Gestiona tus clientes mayoristas y distribuidores.</p>
        </div>
        <button
          onClick={() => router.push('/admin/clientes/b2b/importar')}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
        >
          <UserPlus size={18} /> Importar Clientes
        </button>
      </div>

      {/* Aquí iría la tabla de clientes */}
      <div className="bg-white p-6 rounded-xl border">
        {clientes.length > 0 ? (
          <p>Tabla de clientes B2B iría aquí.</p>
        ) : (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-700">Aún no tienes clientes B2B</h3>
            <p className="mt-1 text-sm text-slate-500">Usa el botón de "Importar Clientes" para empezar a construir tu red.</p>
          </div>
        )}
      </div>
    </div>
  );
}