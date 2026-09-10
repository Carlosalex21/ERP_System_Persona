/**
 * @file Página de administración de métodos de pago del tenant.
 * CRUD completo con toasts y diseño Mobile-First.
 */
"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Plus, Loader2, Pencil, Trash2, Wallet, CreditCard, Banknote, Landmark, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

import MetodoPagoModal from './MetodoPagoModal';
import {
  getMetodosDePago,
  createMetodoPago,
  updateMetodoPago,
  deleteMetodoPago,
} from '@/services/facturacionService';
import type { MetodoPago, MetodoPagoRequest } from '@/types/api';

function iconoMetodo(tipo?: string | null): ReactElement {
  const t = (tipo || '').toLowerCase();
  if (t.includes('efectivo')) return <Banknote size={18} />;
  if (t.includes('móvil') || t.includes('movil')) return <Wallet size={18} />;
  if (t.includes('dólar') || t.includes('dolar')) return <DollarSign size={18} />;
  if (t.includes('zelle') || t.includes('transferencia')) return <Landmark size={18} />;
  return <CreditCard size={18} />;
}

export default function MetodosPagoPage(): ReactElement {
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<MetodoPago | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getMetodosDePago();
      setMetodos(data);
    } catch (error) {
      console.error('Error cargando métodos de pago:', error);
      toast.error('No se pudieron cargar los métodos de pago.');
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

  const abrirEdicion = (metodo: MetodoPago): void => {
    setEditando(metodo);
    setModalAbierto(true);
  };

  const guardar = async (data: MetodoPagoRequest, id?: number): Promise<void> => {
    setSaving(true);
    try {
      if (id) {
        await updateMetodoPago(id, data);
        toast.success('Método de pago actualizado correctamente.');
      } else {
        await createMetodoPago(data);
        toast.success('Método de pago creado correctamente.');
      }
      setModalAbierto(false);
      await cargar();
    } catch (error) {
      console.error('Error guardando método de pago:', error);
      toast.error('No se pudo guardar el método de pago. Revisa los datos.');
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (metodo: MetodoPago): Promise<void> => {
    if (!confirm(`¿Eliminar el método de pago "${metodo.nombre}"?`)) return;
    try {
      await deleteMetodoPago(metodo.id);
      toast.success('Método de pago eliminado.');
      await cargar();
    } catch (error) {
      console.error('Error eliminando método de pago:', error);
      toast.error('No se pudo eliminar el método de pago. Puede que tenga transacciones asociadas.');
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
            <Wallet size={24} className="text-primary-600" /> Métodos de Pago
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configura cómo tus clientes y el POS aceptan pagos: efectivo, bolívares, dólares, pago móvil, etc.
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
        >
          <Plus size={18} /> Nuevo Método de Pago
        </button>
      </div>

      {metodos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <Wallet size={48} className="mx-auto text-slate-300" />
          <h3 className="mt-4 text-lg font-bold text-slate-700">Aún no tienes métodos de pago</h3>
          <p className="mt-1 text-sm text-slate-500">
            Crea tu primer método de pago para habilitar el cobro en el POS.
          </p>
          <button
            onClick={abrirNuevo}
            className="mt-6 inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 shadow-md"
          >
            <Plus size={18} /> Crear primer método de pago
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-4 pl-6">Método</th>
                <th className="p-4">Tipo</th>
                <th className="p-4 hidden md:table-cell">N° Cuenta</th>
                <th className="p-4 hidden md:table-cell">Teléfono</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metodos.map(metodo => (
                <tr key={metodo.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 pl-6 font-bold text-slate-900 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                      {iconoMetodo(metodo.tipo_metodo)}
                    </span>
                    {metodo.nombre}
                  </td>
                  <td className="p-4 text-xs font-medium text-slate-600">
                    {metodo.tipo_metodo || '—'}
                  </td>
                  <td className="p-4 text-xs text-slate-500 hidden md:table-cell">
                    {metodo.nro_cuenta || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="p-4 text-xs text-slate-500 hidden md:table-cell">
                    {metodo.telefono || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${
                        metodo.activo
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      {metodo.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => abrirEdicion(metodo)}
                        className="p-2 text-slate-400 hover:text-primary-600 transition-colors"
                        aria-label="Editar método de pago"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => eliminar(metodo)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        aria-label="Eliminar método de pago"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && (
        <MetodoPagoModal
          metodo={editando}
          onClose={() => setModalAbierto(false)}
          onSave={guardar}
          cargando={saving}
        />
      )}
    </div>
  );
}
