"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import { Plus, Loader2, Pencil, Trash2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { Moneda } from '@/types/api';
import { getMonedas, deleteMoneda } from '@/services/configuracionService';
import { getApiErrorMessages } from '@/utils/helpers';
import MonedaModal from './MonedaModal';

export default function MonedasPage(): ReactElement {
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Moneda | null>(null);

  const loadData = useCallback(async () => {
    setCargando(true);
    try {
      const data = await getMonedas();
      setMonedas(data);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('Error al cargar las monedas.');
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const abrirCrear = useCallback(() => {
    setEditando(null);
    setModalAbierto(true);
  }, []);

  const abrirEditar = useCallback((moneda: Moneda) => {
    setEditando(moneda);
    setModalAbierto(true);
  }, []);

  const eliminar = useCallback(
    async (moneda: Moneda) => {
      if (!window.confirm(`¿Eliminar la moneda ${moneda.codigo} (${moneda.nombre})?`)) return;
      try {
        await deleteMoneda(moneda.id);
        toast.success('Moneda eliminada.');
        loadData();
      } catch (error) {
        const messages = getApiErrorMessages(error);
        if (messages.length > 0) {
          messages.forEach((msg) => toast.error(msg));
        } else {
          toast.error('Error al eliminar la moneda.');
        }
      }
    },
    [loadData],
  );

  const monedaBase = useMemo(() => monedas.find((m) => m.es_predeterminada), [monedas]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Monedas</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestiona las monedas del tenant y define la moneda base.
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
        >
          <Plus size={18} /> Nueva Moneda
        </button>
      </div>

      {monedaBase && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3">
          <Star className="text-amber-500 shrink-0" size={20} />
          <p className="text-sm text-amber-800">
            <strong>Moneda base:</strong> {monedaBase.codigo} ({monedaBase.nombre}) — el backend
            desmarcará las demás si marcas una nueva como base.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center h-48 text-slate-500">
            <Loader2 size={24} className="animate-spin mr-2" /> Cargando monedas...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-4 pl-6">Código</th>
                  <th className="p-4">Nombre</th>
                  <th className="p-4">Símbolo</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monedas.map((moneda) => (
                  <tr key={moneda.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6 font-bold text-slate-900">{moneda.codigo}</td>
                    <td className="p-4 text-slate-700">{moneda.nombre}</td>
                    <td className="p-4 text-slate-500">{moneda.simbolo || '—'}</td>
                    <td className="p-4">
                      {moneda.es_predeterminada ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                          <Star size={10} /> Base
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Secundaria</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${
                          moneda.activa
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        {moneda.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => abrirEditar(moneda)}
                          className="p-2 text-slate-400 hover:text-primary-600 transition-colors"
                          aria-label={`Editar ${moneda.codigo}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => eliminar(moneda)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          aria-label={`Eliminar ${moneda.codigo}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {monedas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                      No hay monedas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAbierto && (
        <MonedaModal
          moneda={editando}
          onClose={() => setModalAbierto(false)}
          onSaved={() => {
            setModalAbierto(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
