/**
 * @file Modal para crear/editar métodos de pago del tenant.
 * Permite configurar nombre, número de cuenta, teléfono, tipo y estado.
 */
"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { Save, Landmark, CreditCard, Banknote, Wallet, DollarSign } from 'lucide-react';
import type { MetodoPago, MetodoPagoRequest } from '@/types/api';
import { AppModal, ActionButton } from '@/components/ui';

interface MetodoPagoModalProps {
  metodo?: MetodoPago | null;
  onClose: () => void;
  onSave: (data: MetodoPagoRequest, id?: number) => Promise<void>;
  cargando: boolean;
}

const TIPOS = [
  'Efectivo',
  'Pago Móvil',
  'Zelle',
  'Tarjeta de Débito',
  'Tarjeta de Crédito',
  'Punto de Venta',
  'Transferencia',
  'Otros',
];

export default function MetodoPagoModal({
  metodo,
  onClose,
  onSave,
  cargando,
}: MetodoPagoModalProps): ReactElement {
  const [nombre, setNombre] = useState('');
  const [tipo_metodo, setTipoMetodo] = useState('Efectivo');
  const [nro_cuenta, setNroCuenta] = useState('');
  const [telefono, setTelefono] = useState('');
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    if (metodo) {
      setNombre(metodo.nombre);
      setTipoMetodo(metodo.tipo_metodo || 'Efectivo');
      setNroCuenta(metodo.nro_cuenta || '');
      setTelefono(metodo.telefono || '');
      setActivo(metodo.activo);
    } else {
      setNombre('');
      setTipoMetodo('Efectivo');
      setNroCuenta('');
      setTelefono('');
      setActivo(true);
    }
  }, [metodo]);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const payload: MetodoPagoRequest = {
      nombre,
      tipo_metodo,
      nro_cuenta: nro_cuenta || null,
      telefono: telefono || null,
      activo,
    };
    await onSave(payload, metodo?.id);
  };

  const icono = (tipo: string): ReactElement => {
    const t = tipo.toLowerCase();
    if (t.includes('efectivo')) return <Banknote size={18} />;
    if (t.includes('móvil') || t.includes('movil')) return <Wallet size={18} />;
    if (t.includes('dólar') || t.includes('dolar')) return <DollarSign size={18} />;
    if (t.includes('tarjeta') || t.includes('débito') || t.includes('debito')) return <CreditCard size={18} />;
    if (t.includes('zelle') || t.includes('transferencia')) return <Landmark size={18} />;
    return <CreditCard size={18} />;
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={metodo ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
      icon={<Save size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton type="submit" loading={cargando} onClick={submit}>
            {metodo ? 'Guardar Cambios' : 'Crear Método'}
          </ActionButton>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej. Efectivo en Bolívares, Pago Móvil, Zelle..."
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-600 focus:bg-white"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Método</label>
          <div className="flex flex-wrap gap-2">
            {TIPOS.map(tipo => {
              const activoTipo = tipo_metodo === tipo;
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setTipoMetodo(tipo)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                    activoTipo
                      ? 'bg-primary-100 text-primary-700 border-primary-500 ring-2 ring-primary-300'
                      : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {icono(tipo)} {tipo}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">N° Cuenta / Referencia</label>
            <input
              type="text"
              value={nro_cuenta}
              onChange={e => setNroCuenta(e.target.value)}
              placeholder="Opcional"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-600 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
            <input
              type="text"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              placeholder="Opcional"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-600 focus:bg-white"
            />
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={activo}
            onChange={e => setActivo(e.target.checked)}
            className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm font-semibold text-slate-700">Método activo (visible en el POS)</span>
        </label>
      </form>
    </AppModal>
  );
}
