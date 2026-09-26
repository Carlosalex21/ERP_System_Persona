"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { Card, ActionButton, AppModal, Badge, EmptyState } from '@/components/ui';
import {
  getConceptosNomina, crearConceptoNomina, actualizarConceptoNomina, eliminarConceptoNomina,
} from '@/services/rrhhService';
import type { ConceptoNomina, TipoConceptoNomina, ModoConceptoNomina } from '@/types/api';

function NuevoConceptoModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }): ReactElement {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoConceptoNomina>('bono');
  const [modo, setModo] = useState<ModoConceptoNomina>('fijo');
  const [valor, setValor] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (): Promise<void> => {
    if (!nombre.trim()) { toast.error('Ingresa un nombre para el concepto.'); return; }
    if (!valor || Number(valor) <= 0) { toast.error('Ingresa un valor mayor a cero.'); return; }
    setGuardando(true);
    try {
      await crearConceptoNomina({ nombre: nombre.trim(), tipo, modo, valor, recurrente: true, activo: true });
      toast.success('Concepto creado -- se aplicará desde la próxima nómina que generes.');
      onCreated();
    } catch {
      toast.error('No se pudo crear el concepto.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Nuevo Concepto de Nómina"
      icon={<Settings2 size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={guardar}>Crear</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
          <input
            value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Bono de Alimentación, Seguro Social Obligatorio..."
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoConceptoNomina)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="bono">Bono / Asignación</option>
              <option value="deduccion">Deducción</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modo</label>
            <select value={modo} onChange={(e) => setModo(e.target.value as ModoConceptoNomina)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="fijo">Monto fijo</option>
              <option value="porcentaje">% del sueldo base</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
            {modo === 'porcentaje' ? 'Porcentaje (ej. 4 = 4%)' : 'Monto fijo'}
          </label>
          <input type="number" min={0} step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <p className="text-xs text-slate-400">
          Se aplicará automáticamente a cada empleado en cada nómina nueva que generes, hasta que lo desactives.
        </p>
      </div>
    </AppModal>
  );
}

export default function ConceptosNominaTab(): ReactElement {
  const [conceptos, setConceptos] = useState<ConceptoNomina[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [procesando, setProcesando] = useState<number | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      setConceptos(await getConceptosNomina());
    } catch {
      toast.error('No se pudieron cargar los conceptos de nómina.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const alternarActivo = async (concepto: ConceptoNomina): Promise<void> => {
    setProcesando(concepto.id);
    try {
      await actualizarConceptoNomina(concepto.id, { activo: !concepto.activo });
      await cargar();
    } catch {
      toast.error('No se pudo actualizar el concepto.');
    } finally {
      setProcesando(null);
    }
  };

  const eliminar = async (concepto: ConceptoNomina): Promise<void> => {
    setProcesando(concepto.id);
    try {
      await eliminarConceptoNomina(concepto.id);
      toast.success('Concepto desactivado.');
      await cargar();
    } catch {
      toast.error('No se pudo desactivar el concepto.');
    } finally {
      setProcesando(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 max-w-xl">
          Define aquí los bonos y deducciones recurrentes de tu nómina (ej. bono de alimentación, seguro social) con el nombre y tasa que corresponda a tu país -- el sistema no asume ninguna tasa legal por defecto.
        </p>
        <ActionButton onClick={() => setModalAbierto(true)}><Plus size={16} /> Nuevo Concepto</ActionButton>
      </div>

      {cargando ? (
        <Card><div className="p-8 text-center text-slate-400 text-sm">Cargando...</div></Card>
      ) : conceptos.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Settings2 size={28} />}
            title="Sin conceptos configurados"
            description="Todavía no has definido ningún bono o deducción recurrente."
            action={<ActionButton onClick={() => setModalAbierto(true)}><Plus size={16} /> Nuevo Concepto</ActionButton>}
          />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase border-b border-slate-200">
                <th className="p-3 text-left">Nombre</th>
                <th className="p-3 text-center">Tipo</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conceptos.map((c) => (
                <tr key={c.id} className={!c.activo ? 'opacity-50' : ''}>
                  <td className="p-3 font-semibold text-slate-700">{c.nombre}</td>
                  <td className="p-3 text-center">
                    <Badge tone={c.tipo === 'bono' ? 'green' : 'red'}>{c.tipo === 'bono' ? 'Bono' : 'Deducción'}</Badge>
                  </td>
                  <td className="p-3 text-right font-mono text-slate-600">
                    {c.modo === 'porcentaje' ? `${parseFloat(c.valor)}%` : `$${parseFloat(c.valor).toFixed(2)}`}
                  </td>
                  <td className="p-3 text-center">
                    <button disabled={procesando === c.id} onClick={() => alternarActivo(c)} title={c.activo ? 'Desactivar' : 'Activar'} className="text-slate-400 hover:text-primary-600 disabled:opacity-40">
                      {c.activo ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} />}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <button disabled={procesando === c.id} onClick={() => eliminar(c)} title="Desactivar y quitar de la lista" className="text-slate-400 hover:text-red-500 disabled:opacity-40">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {modalAbierto && (
        <NuevoConceptoModal onClose={() => setModalAbierto(false)} onCreated={() => { setModalAbierto(false); cargar(); }} />
      )}
    </div>
  );
}
