"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import { AppModal, ActionButton } from '@/components/ui';
import {
  crearAsientoContable, getCuentasContables, getPlantillasAsiento,
  type CuentaContable, type LineaAsientoRequest, type AsientoPlantilla,
} from '@/services/contabilidadService';
import { useNotify } from '@/hooks/useNotify';

import { mensajeDeErrorUnico } from '@/utils/mensajesError';
interface NuevoAsientoModalProps {
  empresaId: number;
  onClose: () => void;
  onCreado: () => void;
}

interface LineaForm {
  key: number;
  cuentaId: string;
  debe: string;
  haber: string;
  descripcion: string;
}

const hoyISO = (): string => new Date().toISOString().slice(0, 10);

export default function NuevoAsientoModal({ empresaId, onClose, onCreado }: NuevoAsientoModalProps): ReactElement {
  const notify = useNotify();
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [plantillas, setPlantillas] = useState<AsientoPlantilla[]>([]);
  const [plantillaId, setPlantillaId] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [descripcion, setDescripcion] = useState('');
  const [estado, setEstado] = useState<'borrador' | 'contabilizado'>('contabilizado');
  const [lineas, setLineas] = useState<LineaForm[]>([
    { key: 0, cuentaId: '', debe: '', haber: '', descripcion: '' },
    { key: 1, cuentaId: '', debe: '', haber: '', descripcion: '' },
  ]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getCuentasContables(empresaId).then((lista) => setCuentas(lista.filter((c) => c.acepta_movimiento))).catch(() => setCuentas([]));
    getPlantillasAsiento(empresaId).then(setPlantillas).catch(() => setPlantillas([]));
  }, [empresaId]);

  const usarPlantilla = (id: string): void => {
    setPlantillaId(id);
    const plantilla = plantillas.find((p) => String(p.id) === id);
    if (!plantilla) return;
    if (plantilla.descripcion_asiento) setDescripcion(plantilla.descripcion_asiento);
    setLineas(plantilla.lineas.map((l, i) => ({
      key: Date.now() + i,
      cuentaId: String(l.cuenta),
      debe: parseFloat(l.debe) > 0 ? l.debe : '',
      haber: parseFloat(l.haber) > 0 ? l.haber : '',
      descripcion: l.descripcion || '',
    })));
  };

  const actualizarLinea = (key: number, campo: keyof Omit<LineaForm, 'key'>, valor: string): void => {
    // Ninguno de los dos se borra nunca solo -- en vez de eso, el campo
    // contrario se DESHABILITA en cuanto este tiene un monto > 0 (ver el
    // `disabled` de cada input más abajo), así es imposible llegar a
    // guardar con ambos llenos sin que se pierda nada que el usuario ya
    // escribió: basta con vaciar este campo para que el otro se reactive.
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)));
  };

  const agregarLinea = (): void => setLineas((prev) => [...prev, { key: Date.now(), cuentaId: '', debe: '', haber: '', descripcion: '' }]);
  const quitarLinea = (key: number): void => setLineas((prev) => (prev.length > 2 ? prev.filter((l) => l.key !== key) : prev));

  const totalDebe = lineas.reduce((s, l) => s + (Number(l.debe) || 0), 0);
  const totalHaber = lineas.reduce((s, l) => s + (Number(l.haber) || 0), 0);
  const diferencia = Math.round((totalDebe - totalHaber) * 100) / 100;
  const cuadra = diferencia === 0 && totalDebe > 0;

  const guardar = async (estadoFinal: 'borrador' | 'contabilizado'): Promise<void> => {
    if (!descripcion.trim()) {
      notify.error('Describe de qué se trata el asiento.');
      return;
    }
    const lineasValidas: LineaAsientoRequest[] = [];
    for (const l of lineas) {
      if (!l.cuentaId && !l.debe && !l.haber) continue;
      if (!l.cuentaId || (!l.debe && !l.haber)) {
        notify.error('Completa la cuenta y el monto (Debe o Haber) de cada línea.');
        return;
      }
      if (Number(l.debe) > 0 && Number(l.haber) > 0) {
        notify.error('Cada línea va en Debe O en Haber, no en ambos -- deja uno de los dos en 0.');
        return;
      }
      lineasValidas.push({
        cuenta_id: Number(l.cuentaId),
        debe: Number(l.debe) || 0,
        haber: Number(l.haber) || 0,
        descripcion: l.descripcion || undefined,
      });
    }
    if (!cuadra) {
      notify.error(`El asiento no cuadra: Debe ${totalDebe.toFixed(2)} ≠ Haber ${totalHaber.toFixed(2)}.`);
      return;
    }
    setEstado(estadoFinal);
    setGuardando(true);
    try {
      await crearAsientoContable({ empresa: empresaId, fecha, descripcion: descripcion.trim(), lineas: lineasValidas, estado: estadoFinal });
      notify.success(estadoFinal === 'borrador' ? 'Asiento guardado como borrador.' : 'Asiento contabilizado.');
      onCreado();
    } catch (error: any) {
      notify.error(mensajeDeErrorUnico(error, 'No se pudo crear el asiento.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Nuevo Asiento Contable"
      icon={<BookOpen size={20} />}
      size="lg"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton variant="secondary" loading={guardando && estado === 'borrador'} onClick={() => guardar('borrador')}>Guardar Borrador</ActionButton>
          <ActionButton loading={guardando && estado === 'contabilizado'} onClick={() => guardar('contabilizado')}>Contabilizar</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        {plantillas.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Usar plantilla (opcional)</label>
            <select value={plantillaId} onChange={(e) => usarPlantilla(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Empezar en blanco...</option>
              {plantillas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción del asiento</label>
            <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Pago de nómina de septiembre" className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-bold text-slate-400 uppercase">
            <span className="col-span-5">Cuenta</span>
            <span className="col-span-2 text-right">Debe</span>
            <span className="col-span-2 text-right">Haber</span>
            <span className="col-span-2">Detalle</span>
          </div>
          {lineas.map((linea) => (
            <div key={linea.key} className="grid grid-cols-12 gap-2 items-center">
              <select
                value={linea.cuentaId}
                onChange={(e) => actualizarLinea(linea.key, 'cuentaId', e.target.value)}
                className="col-span-5 px-2 py-2 border rounded-lg text-xs bg-white"
              >
                <option value="">Cuenta...</option>
                {cuentas.map((c) => <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>)}
              </select>
              <input
                type="number" min={0} step="0.01"
                value={linea.debe}
                onChange={(e) => actualizarLinea(linea.key, 'debe', e.target.value)}
                disabled={Number(linea.haber) > 0}
                placeholder="0.00"
                className="col-span-2 px-2 py-2 border rounded-lg text-xs text-right disabled:bg-slate-100 disabled:text-slate-300"
              />
              <input
                type="number" min={0} step="0.01"
                value={linea.haber}
                onChange={(e) => actualizarLinea(linea.key, 'haber', e.target.value)}
                disabled={Number(linea.debe) > 0}
                placeholder="0.00"
                className="col-span-2 px-2 py-2 border rounded-lg text-xs text-right disabled:bg-slate-100 disabled:text-slate-300"
              />
              <input
                type="text"
                value={linea.descripcion}
                onChange={(e) => actualizarLinea(linea.key, 'descripcion', e.target.value)}
                placeholder="Opcional"
                className="col-span-2 px-2 py-2 border rounded-lg text-xs"
              />
              <button type="button" onClick={() => quitarLinea(linea.key)} disabled={lineas.length <= 2} className="col-span-1 p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30" aria-label="Quitar línea">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={agregarLinea} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 border-dashed border-slate-200 text-xs font-bold text-slate-500 hover:border-primary-400 hover:text-primary-600 transition-colors">
          <Plus size={14} /> Agregar línea
        </button>

        <div className={`flex justify-between items-center px-4 py-3 rounded-xl border-2 ${cuadra ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
          <div className="text-xs font-bold text-slate-500 uppercase">
            Debe: <span className="text-slate-800">{totalDebe.toFixed(2)}</span> · Haber: <span className="text-slate-800">{totalHaber.toFixed(2)}</span>
          </div>
          <span className={`text-sm font-black ${cuadra ? 'text-emerald-700' : 'text-red-600'}`}>
            {cuadra ? '✓ Cuadra' : `Diferencia: ${diferencia.toFixed(2)}`}
          </span>
        </div>
      </div>
    </AppModal>
  );
}
