"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { UserPlus, Loader2, Users, Edit2, X, Check, Sliders, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  getB2BClientes, updateClienteB2B, getNivelesPrecio, createNivelPrecio, updateNivelPrecio, deleteNivelPrecio,
} from '@/services/clientesService';
import { ClienteB2B, ClienteB2BRequest, NivelPrecio, NivelPrecioRequest } from '@/types/api';
import { PageHeader, Card, EmptyState, TableSkeleton, ConfirmDialog } from '@/components/ui';

const ESTADO_ESTILOS: Record<string, string> = {
  activo: 'bg-green-100 text-green-700',
  pendiente: 'bg-amber-100 text-amber-700',
  inactivo: 'bg-slate-100 text-slate-500',
  bloqueado: 'bg-red-100 text-red-700',
};

function EditarClienteModal({
  cliente, niveles, onClose, onGuardado,
}: {
  cliente: ClienteB2B;
  niveles: NivelPrecio[];
  onClose: () => void;
  onGuardado: (actualizado: ClienteB2B) => void;
}): ReactElement {
  const [form, setForm] = useState<ClienteB2BRequest>({
    nivel_precio: cliente.nivel_precio,
    limite_credito: cliente.limite_credito,
    estado: cliente.estado,
  });
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setGuardando(true);
    try {
      const actualizado = await updateClienteB2B(cliente.id, form);
      toast.success('Cliente B2B actualizado.');
      onGuardado(actualizado);
    } catch {
      toast.error('No se pudo actualizar el cliente.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
          <div>
            <h3 className="font-bold">{cliente.razon_social}</h3>
            <p className="text-xs text-slate-400 font-mono">{cliente.rif}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-full"><X size={18} /></button>
        </div>
        <form onSubmit={guardar} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nivel de Precio</label>
            <select
              value={form.nivel_precio ?? ''}
              onChange={e => setForm(f => ({ ...f, nivel_precio: Number(e.target.value) }))}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              {niveles.map(n => (
                <option key={n.id} value={n.id}>{n.nombre} ({n.porcentaje_descuento}%)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Límite de Crédito ($)</label>
            <input
              type="number" step="0.01" min="0"
              value={form.limite_credito ?? ''}
              onChange={e => setForm(f => ({ ...f, limite_credito: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <p className="text-[11px] text-slate-400 mt-1">0 = sin línea de crédito (no se restringen sus pedidos).</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado</label>
            <select
              value={form.estado}
              onChange={e => setForm(f => ({ ...f, estado: e.target.value as ClienteB2B['estado'] }))}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="pendiente">Pendiente de Activación</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm">Cancelar</button>
            <button type="submit" disabled={guardando} className="flex-1 py-2.5 bg-primary-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-70">
              {guardando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NivelesPrecioModal({ onClose }: { onClose: () => void }): ReactElement {
  const [niveles, setNiveles] = useState<NivelPrecio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nuevo, setNuevo] = useState<NivelPrecioRequest>({ nombre: '', porcentaje_descuento: '0', monto_minimo_periodo: '0', activo: true });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setNiveles(await getNivelesPrecio());
    } catch {
      toast.error('No se pudieron cargar los niveles de precio.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!nuevo.nombre.trim()) return;
    setGuardando(true);
    try {
      await createNivelPrecio(nuevo);
      setNuevo({ nombre: '', porcentaje_descuento: '0', monto_minimo_periodo: '0', activo: true });
      await cargar();
      toast.success('Nivel de precio creado.');
    } catch {
      toast.error('No se pudo crear el nivel.');
    } finally {
      setGuardando(false);
    }
  };

  const actualizarCampo = async (nivel: NivelPrecio, campo: 'porcentaje_descuento' | 'monto_minimo_periodo', valor: string): Promise<void> => {
    setNiveles(prev => prev.map(n => (n.id === nivel.id ? { ...n, [campo]: valor } : n)));
    try {
      await updateNivelPrecio(nivel.id, { [campo]: valor });
    } catch {
      toast.error('No se pudo actualizar.');
      cargar();
    }
  };

  const [nivelAEliminar, setNivelAEliminar] = useState<number | null>(null);
  const [eliminandoNivel, setEliminandoNivel] = useState(false);

  const confirmarEliminarNivel = async (): Promise<void> => {
    if (nivelAEliminar == null) return;
    setEliminandoNivel(true);
    try {
      await deleteNivelPrecio(nivelAEliminar);
      setNiveles(prev => prev.filter(n => n.id !== nivelAEliminar));
      setNivelAEliminar(null);
    } catch {
      toast.error('No se pudo eliminar (puede que esté en uso por algún cliente).');
    } finally {
      setEliminandoNivel(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="bg-slate-900 p-5 text-white flex justify-between items-center shrink-0">
          <h3 className="font-bold flex items-center gap-2"><Sliders size={18} /> Niveles de Precio B2B</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-full"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-500">
            El "monto mínimo" es lo que un cliente debe comprar en los últimos 3 meses para subir automáticamente a ese nivel.
          </p>
          {cargando ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                    <th className="p-3 text-left">Nombre</th>
                    <th className="p-3 text-left">% Descuento</th>
                    <th className="p-3 text-left">Monto Mínimo (3 meses)</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {niveles.map(nivel => (
                    <tr key={nivel.id}>
                      <td className="p-3 font-bold text-slate-700">{nivel.nombre}</td>
                      <td className="p-3">
                        <input
                          type="number" step="0.01" value={nivel.porcentaje_descuento}
                          onChange={e => actualizarCampo(nivel, 'porcentaje_descuento', e.target.value)}
                          className="w-20 px-2 py-1 border rounded text-xs"
                        />%
                      </td>
                      <td className="p-3">
                        $<input
                          type="number" step="0.01" value={nivel.monto_minimo_periodo}
                          onChange={e => actualizarCampo(nivel, 'monto_minimo_periodo', e.target.value)}
                          className="w-24 px-2 py-1 border rounded text-xs"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => setNivelAEliminar(nivel.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <form onSubmit={crear} className="flex items-end gap-2 pt-2 border-t border-slate-100">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nuevo Nivel</label>
              <input
                value={nuevo.nombre} onChange={e => setNuevo(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Platino" className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div className="w-24">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">% Desc.</label>
              <input
                type="number" step="0.01" value={nuevo.porcentaje_descuento}
                onChange={e => setNuevo(f => ({ ...f, porcentaje_descuento: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div className="w-28">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mínimo $</label>
              <input
                type="number" step="0.01" value={nuevo.monto_minimo_periodo}
                onChange={e => setNuevo(f => ({ ...f, monto_minimo_periodo: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <button type="submit" disabled={guardando} className="bg-primary-600 text-white p-2.5 rounded-lg disabled:opacity-70">
              {guardando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            </button>
          </form>
        </div>
      </div>

      <ConfirmDialog
        isOpen={nivelAEliminar != null}
        title="Eliminar Nivel de Precio"
        message="¿Eliminar este nivel de precio? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        loading={eliminandoNivel}
        onConfirm={confirmarEliminarNivel}
        onCancel={() => setNivelAEliminar(null)}
      />
    </div>
  );
}

/**
 * Página para listar y gestionar la red de clientes B2B.
 */
export default function RedClientesPage(): ReactElement {
  const router = useRouter();
  const [clientes, setClientes] = useState<ClienteB2B[]>([]);
  const [niveles, setNiveles] = useState<NivelPrecio[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<ClienteB2B | null>(null);
  const [modalNiveles, setModalNiveles] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [clientesData, nivelesData] = await Promise.all([getB2BClientes(), getNivelesPrecio()]);
      setClientes(clientesData);
      setNiveles(nivelesData);
    } catch (error) {
      console.error("Error al cargar clientes B2B:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Users size={20} />}
        title="Red de Clientes B2B"
        description="Gestiona tus clientes mayoristas y distribuidores."
        actions={
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setModalNiveles(true)}
              className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm hover:bg-slate-50 shadow-sm"
            >
              <Sliders size={16} /> Niveles de Precio
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => router.push('/admin/clientes/b2b/importar')}
              className="bg-primary-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm shadow-md"
            >
              <UserPlus size={16} /> Importar Clientes
            </motion.button>
          </div>
        }
      />

      {loading ? (
        <TableSkeleton rows={6} />
      ) : (
      <Card padding="none" className="overflow-hidden">
        {clientes.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                <th className="p-4 text-left">Empresa</th>
                <th className="p-4 text-left">Nivel</th>
                <th className="p-4 text-left">Comprado (3m)</th>
                <th className="p-4 text-left">Crédito</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientes.map(cliente => (
                <tr key={cliente.id} className="hover:bg-slate-50/50">
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{cliente.razon_social}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{cliente.rif}</p>
                  </td>
                  <td className="p-4 text-slate-600">{cliente.nivel_precio_nombre || '—'}</td>
                  <td className="p-4 font-semibold text-slate-700">${parseFloat(cliente.total_comprado_periodo).toFixed(2)}</td>
                  <td className="p-4 text-xs text-slate-500">
                    {parseFloat(cliente.limite_credito) > 0
                      ? `$${parseFloat(cliente.credito_usado).toFixed(2)} / $${parseFloat(cliente.limite_credito).toFixed(2)}`
                      : 'Sin línea'}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${ESTADO_ESTILOS[cliente.estado] || 'bg-slate-100 text-slate-500'}`}>
                      {cliente.estado}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => setEditando(cliente)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-primary-600 hover:text-white transition-colors">
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            icon={<Users size={28} />}
            title="Aún no tienes clientes B2B"
            description='Usa el botón de "Importar Clientes" para empezar a construir tu red.'
          />
        )}
      </Card>
      )}

      {editando && (
        <EditarClienteModal
          cliente={editando}
          niveles={niveles}
          onClose={() => setEditando(null)}
          onGuardado={(actualizado) => {
            setClientes(prev => prev.map(c => (c.id === actualizado.id ? actualizado : c)));
            setEditando(null);
          }}
        />
      )}

      {modalNiveles && <NivelesPrecioModal onClose={() => { setModalNiveles(false); cargar(); }} />}
    </div>
  );
}
