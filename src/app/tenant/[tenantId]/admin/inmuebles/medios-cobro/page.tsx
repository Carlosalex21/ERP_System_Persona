"use client";

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Landmark, Pencil, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { ActionButton, AppModal, Badge, Card, ConfirmDialog, EmptyState, PageHeader, TableSkeleton } from '@/components/ui';
import { actualizarMedioPago, crearMedioPago, eliminarMedioPago, getEdificios, getMediosPago, type Edificio, type MedioPago, type TipoMedioPago } from '@/services/inmueblesService';
import { ETIQUETA_METODO } from '@/components/inmuebles/formato';
import { toastApiError } from '@/utils/errors';

const TIPOS: TipoMedioPago[] = ['pago_movil', 'transferencia', 'zelle', 'efectivo', 'deposito', 'otro'];
const campo = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const etiqueta = 'block text-xs font-bold text-slate-500 uppercase mb-1';

type Formulario = { edificio: string; tipo: TipoMedioPago; titular: string; documento_titular: string; banco: string; numero_cuenta: string; moneda: string; instrucciones: string; activo: boolean };

const vacio = (): Formulario => ({ edificio: '', tipo: 'pago_movil', titular: '', documento_titular: '', banco: '', numero_cuenta: '', moneda: 'VES', instrucciones: '', activo: true });

export default function MediosCobroPage(): ReactElement {
  const [medios, setMedios] = useState<MedioPago[]>([]);
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<MedioPago | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<Formulario>(vacio());
  const [guardando, setGuardando] = useState(false);
  const [aEliminar, setAEliminar] = useState<MedioPago | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    try {
      const [m, e] = await Promise.all([getMediosPago(), getEdificios()]);
      setMedios(m);
      setEdificios(e);
    } catch (err) {
      toastApiError(err, 'No se pudieron cargar los medios de cobro.');
    } finally {
      setCargando(false);
    }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos externos
  useEffect(() => { void cargar(); }, [cargar]);

  const abrir = (m: MedioPago | null): void => {
    setEditando(m);
    setForm(m ? { edificio: m.edificio ? String(m.edificio) : '', tipo: m.tipo, titular: m.titular, documento_titular: m.documento_titular, banco: m.banco, numero_cuenta: m.numero_cuenta, moneda: m.moneda, instrucciones: m.instrucciones, activo: m.activo } : vacio());
    setAbierto(true);
  };
  const set = <K extends keyof Formulario>(k: K, v: Formulario[K]): void => setForm((f) => ({ ...f, [k]: v }));

  const guardar = async (): Promise<void> => {
    if (!form.titular.trim()) return void toast.error('Indica el titular de la cuenta.');
    setGuardando(true);
    try {
      const datos = { ...form, edificio: form.edificio ? Number(form.edificio) : null };
      if (editando) await actualizarMedioPago(editando.id, datos);
      else await crearMedioPago(datos);
      toast.success('Medio de cobro guardado.');
      setAbierto(false);
      void cargar();
    } catch (e) {
      toastApiError(e, 'No se pudo guardar el medio de cobro.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (): Promise<void> => {
    if (!aEliminar) return;
    try {
      await eliminarMedioPago(aEliminar.id);
      toast.success('Medio de cobro eliminado.');
      setAEliminar(null);
      void cargar();
    } catch (e) {
      toastApiError(e, 'No se pudo eliminar.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Landmark size={20} />}
        title="Medios de cobro"
        description="Las cuentas donde tus propietarios e inquilinos te pagan. Se muestran en su portal junto a cada deuda."
        actions={<motion.button whileTap={{ scale: 0.96 }} onClick={() => abrir(null)} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2 shadow-md"><Plus size={18} /> Nuevo medio</motion.button>}
      />
      {cargando ? <TableSkeleton rows={3} /> : medios.length === 0 ? (
        <EmptyState icon={<Landmark size={28} />} title="Aún no cargas tus datos de pago" description="Agrega tu pago móvil, cuenta bancaria o Zelle para que tus clientes sepan dónde pagar y puedan reportar su pago desde el portal." action={<button onClick={() => abrir(null)} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2"><Plus size={16} /> Agregar medio</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {medios.map((m) => (
            <Card key={m.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-bold text-slate-900">{ETIQUETA_METODO[m.tipo] ?? m.tipo}{m.banco ? ` · ${m.banco}` : ''}</p><p className="text-xs text-slate-500">{m.edificio_nombre ?? 'Todos los edificios'}</p></div>
                <Badge tone={m.activo ? 'green' : 'slate'}>{m.activo ? 'Activo' : 'Inactivo'}</Badge>
              </div>
              <div className="text-sm text-slate-700 space-y-0.5">
                <p><span className="text-slate-400">Titular:</span> {m.titular}{m.documento_titular ? ` (${m.documento_titular})` : ''}</p>
                {m.numero_cuenta && <p className="font-mono"><span className="font-sans text-slate-400">Cuenta/teléfono:</span> {m.numero_cuenta}</p>}
                <p><span className="text-slate-400">Moneda:</span> {m.moneda}</p>
                {m.instrucciones && <p className="text-xs text-slate-500">{m.instrucciones}</p>}
              </div>
              <div className="flex justify-end gap-1 pt-1">
                <button onClick={() => abrir(m)} className="p-2 text-slate-400 hover:text-primary-600" aria-label="Editar"><Pencil size={16} /></button>
                <button onClick={() => setAEliminar(m)} className="p-2 text-slate-400 hover:text-red-500" aria-label="Eliminar"><Trash2 size={16} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {abierto && (
        <AppModal isOpen onClose={() => setAbierto(false)} title={editando ? 'Editar medio de cobro' : 'Nuevo medio de cobro'} icon={<Landmark size={20} />} size="lg"
          footer={<><ActionButton variant="secondary" onClick={() => setAbierto(false)}>Cancelar</ActionButton><ActionButton onClick={guardar} loading={guardando}>Guardar</ActionButton></>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={etiqueta}>Tipo</label><select value={form.tipo} onChange={(e) => set('tipo', e.target.value as TipoMedioPago)} className={campo}>{TIPOS.map((t) => <option key={t} value={t}>{ETIQUETA_METODO[t]}</option>)}</select></div>
            <div><label className={etiqueta}>Aplica a</label><select value={form.edificio} onChange={(e) => set('edificio', e.target.value)} className={campo}><option value="">Todos los edificios</option>{edificios.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div>
            <div><label className={etiqueta}>Titular *</label><input value={form.titular} onChange={(e) => set('titular', e.target.value)} className={campo} /></div>
            <div><label className={etiqueta}>Cédula / RIF</label><input value={form.documento_titular} onChange={(e) => set('documento_titular', e.target.value)} className={campo} /></div>
            <div><label className={etiqueta}>Banco</label><input value={form.banco} onChange={(e) => set('banco', e.target.value)} className={campo} /></div>
            <div><label className={etiqueta}>{form.tipo === 'pago_movil' ? 'Teléfono' : form.tipo === 'zelle' ? 'Correo Zelle' : 'N° de cuenta'}</label><input value={form.numero_cuenta} onChange={(e) => set('numero_cuenta', e.target.value)} className={campo} /></div>
            <div><label className={etiqueta}>Moneda</label><select value={form.moneda} onChange={(e) => set('moneda', e.target.value)} className={campo}><option value="VES">Bolívares (VES)</option><option value="USD">Dólares (USD)</option></select></div>
            <div className="flex items-end"><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.activo} onChange={(e) => set('activo', e.target.checked)} className="rounded border-slate-300 text-primary-600" /> Visible en el portal</label></div>
            <div className="sm:col-span-2"><label className={etiqueta}>Instrucciones</label><textarea value={form.instrucciones} onChange={(e) => set('instrucciones', e.target.value)} rows={2} className={campo} placeholder="Ej: Indica el número de apartamento en el concepto." /></div>
          </div>
        </AppModal>
      )}
      <ConfirmDialog isOpen={!!aEliminar} title="Eliminar medio de cobro" message={`¿Eliminar ${aEliminar ? (ETIQUETA_METODO[aEliminar.tipo] ?? aEliminar.tipo) : ''} de ${aEliminar?.titular}?`} confirmLabel="Eliminar" danger onConfirm={eliminar} onCancel={() => setAEliminar(null)} />
    </div>
  );
}
