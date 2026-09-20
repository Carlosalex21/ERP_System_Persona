"use client";

import { useState, type ReactElement } from 'react';
import { Calculator } from 'lucide-react';
import { AppModal, ActionButton } from '@/components/ui';
import { createCuentaContable, updateCuentaContable, type CuentaContable, type TipoCuenta } from '@/services/contabilidadService';
import { useNotify } from '@/hooks/useNotify';

const TIPOS: { valor: TipoCuenta; etiqueta: string }[] = [
  { valor: 'activo', etiqueta: 'Activo' },
  { valor: 'pasivo', etiqueta: 'Pasivo' },
  { valor: 'patrimonio', etiqueta: 'Patrimonio' },
  { valor: 'ingreso', etiqueta: 'Ingreso' },
  { valor: 'costo', etiqueta: 'Costo' },
  { valor: 'gasto', etiqueta: 'Gasto' },
];

interface CuentaContableModalProps {
  empresaId: number;
  cuentas: CuentaContable[];
  cuenta?: CuentaContable | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function CuentaContableModal({ empresaId, cuentas, cuenta, onClose, onSaved }: CuentaContableModalProps): ReactElement {
  const notify = useNotify();
  const [codigo, setCodigo] = useState(cuenta?.codigo || '');
  const [nombre, setNombre] = useState(cuenta?.nombre || '');
  const [tipo, setTipo] = useState<TipoCuenta>(cuenta?.tipo || 'activo');
  const [cuentaPadre, setCuentaPadre] = useState(cuenta?.cuenta_padre ? String(cuenta.cuenta_padre) : '');
  const [aceptaMovimiento, setAceptaMovimiento] = useState(cuenta?.acepta_movimiento ?? true);
  const [guardando, setGuardando] = useState(false);
  const editando = !!cuenta;

  const guardar = async (): Promise<void> => {
    if (!codigo.trim() || !nombre.trim()) {
      notify.error('Completa el código y el nombre de la cuenta.');
      return;
    }
    setGuardando(true);
    try {
      const data = {
        empresa: empresaId,
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        tipo,
        cuenta_padre: cuentaPadre ? Number(cuentaPadre) : null,
        acepta_movimiento: aceptaMovimiento,
      };
      if (editando) {
        await updateCuentaContable(cuenta.id, data);
        notify.success('Cuenta actualizada.');
      } else {
        await createCuentaContable(data);
        notify.success('Cuenta creada.');
      }
      onSaved();
    } catch (error: any) {
      const msg = error?.response?.data?.codigo?.[0] || error?.response?.data?.non_field_errors?.[0];
      notify.error(msg || 'No se pudo guardar la cuenta (¿el código ya existe en esta empresa?).');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={editando ? 'Editar Cuenta' : 'Nueva Cuenta Contable'}
      icon={<Calculator size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={guardar}>{editando ? 'Guardar' : 'Crear'}</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código</label>
            <input type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="1.1.06" className="w-full px-3 py-2 border rounded-lg text-sm font-mono" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCuenta)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Caja Chica" className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cuenta Padre (opcional)</label>
          <select value={cuentaPadre} onChange={(e) => setCuentaPadre(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">Ninguna (cuenta de primer nivel)</option>
            {cuentas.filter((c) => c.id !== cuenta?.id).map((c) => (
              <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-3 p-3 bg-slate-50 border rounded-lg cursor-pointer">
          <input type="checkbox" checked={aceptaMovimiento} onChange={(e) => setAceptaMovimiento(e.target.checked)} className="w-5 h-5 accent-primary-600" />
          <span className="text-sm font-semibold text-slate-700">
            Acepta movimiento
            <span className="block text-xs font-normal text-slate-400 mt-0.5">Desmárcalo si es una cuenta "de grupo" (organiza el plan pero no recibe asientos directamente).</span>
          </span>
        </label>
      </div>
    </AppModal>
  );
}
