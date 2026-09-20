"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { Building2, UserPlus } from 'lucide-react';
import { AppModal, ActionButton } from '@/components/ui';
import {
  createEmpresaContable, updateEmpresaContable, getCuentasContables,
  type EmpresaContable, type CuentaContable,
} from '@/services/contabilidadService';
import { getClientes } from '@/services/clientesService';
import { useNotify } from '@/hooks/useNotify';
import type { Cliente } from '@/types/api';
import ClientModal from '../../../pos/components/ClientModal';

interface EmpresaContableModalProps {
  empresa?: EmpresaContable | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EmpresaContableModal({ empresa, onClose, onSaved }: EmpresaContableModalProps): ReactElement {
  const notify = useNotify();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [nombre, setNombre] = useState(empresa?.nombre || '');
  const [identificacion, setIdentificacion] = useState(empresa?.identificacion_fiscal || '');
  const [clienteId, setClienteId] = useState(empresa?.cliente ? String(empresa.cliente) : '');
  const [esNegocioPropio, setEsNegocioPropio] = useState(empresa?.es_negocio_propio || false);
  const [cuentaCobroId, setCuentaCobroId] = useState(empresa?.cuenta_cobro_default ? String(empresa.cuenta_cobro_default) : '');
  const [cuentaIngresoId, setCuentaIngresoId] = useState(empresa?.cuenta_ingreso_default ? String(empresa.cuenta_ingreso_default) : '');
  const [cuentaIvaId, setCuentaIvaId] = useState(empresa?.cuenta_iva_default ? String(empresa.cuenta_iva_default) : '');
  const [guardando, setGuardando] = useState(false);
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false);
  const editando = !!empresa;

  useEffect(() => {
    getClientes().then(setClientes).catch(() => setClientes([]));
  }, []);

  useEffect(() => {
    if (!empresa) return;
    getCuentasContables(empresa.id).then((lista) => setCuentas(lista.filter((c) => c.acepta_movimiento))).catch(() => setCuentas([]));
  }, [empresa]);

  const guardar = async (): Promise<void> => {
    if (!nombre.trim()) {
      notify.error('Ponle un nombre a la empresa.');
      return;
    }
    if (esNegocioPropio && (!cuentaCobroId || !cuentaIngresoId)) {
      notify.error('Para generar asientos automáticos de venta necesitas elegir al menos la cuenta de cobro y la de ingreso.');
      return;
    }
    setGuardando(true);
    try {
      const data = {
        nombre: nombre.trim(),
        identificacion_fiscal: identificacion.trim() || null,
        cliente: clienteId ? Number(clienteId) : null,
        es_negocio_propio: esNegocioPropio,
        cuenta_cobro_default: cuentaCobroId ? Number(cuentaCobroId) : null,
        cuenta_ingreso_default: cuentaIngresoId ? Number(cuentaIngresoId) : null,
        cuenta_iva_default: cuentaIvaId ? Number(cuentaIvaId) : null,
      };
      if (editando) {
        await updateEmpresaContable(empresa.id, data);
        notify.success('Empresa actualizada.');
      } else {
        await createEmpresaContable(data);
        notify.success('Empresa creada, con su plan de cuentas base ya listo.');
      }
      onSaved();
    } catch (error: any) {
      const detalle = error?.response?.data?.es_negocio_propio?.[0];
      notify.error(detalle || 'No se pudo guardar la empresa.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={editando ? 'Editar Empresa' : 'Nueva Empresa Contable'}
      icon={<Building2 size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={guardar}>{editando ? 'Guardar' : 'Crear'}</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de la Empresa</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Inversiones Acme, C.A." className="w-full px-3 py-2 border rounded-lg text-sm" autoFocus />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RIF / NIT / RUC (opcional)</label>
          <input type="text" value={identificacion} onChange={(e) => setIdentificacion(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente para facturar honorarios (opcional)</label>
          <div className="flex gap-2">
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="flex-1 min-w-0 px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Sin vincular todavía...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setModalNuevoCliente(true)}
              title="Crear cliente nuevo"
              className="shrink-0 px-3 py-2 border rounded-lg text-sm font-bold text-primary-600 border-primary-200 bg-primary-50 hover:bg-primary-100 flex items-center gap-1.5"
            >
              <UserPlus size={16} /> Nuevo
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Enlázalo con el registro de Cliente correspondiente para poder facturarle tus honorarios profesionales desde Facturación, sin perder de vista que es la misma empresa. Si todavía no existe, créalo aquí mismo con &quot;Nuevo&quot;.
          </p>
        </div>

        {modalNuevoCliente && (
          <ClientModal
            isOpen
            onClose={() => setModalNuevoCliente(false)}
            onClientCreated={(nuevo) => {
              setClientes((prev) => [...prev, nuevo]);
              setClienteId(String(nuevo.id));
              setModalNuevoCliente(false);
            }}
          />
        )}
        {!editando && (
          <p className="text-xs text-slate-500 bg-slate-50 border rounded-lg p-3">
            Al crearla se siembra un plan de cuentas base (Activo, Pasivo, Patrimonio, Ingresos, Costos, Gastos) que puedes editar libremente después.
          </p>
        )}
        {editando && (
          <div className="border-t pt-4 space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={esNegocioPropio} onChange={(e) => setEsNegocioPropio(e.target.checked)} className="mt-0.5" />
              <span className="text-sm">
                <span className="font-bold text-slate-700">Es el negocio propio del tenant</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Márcala si esta empresa representa al propio negocio (no a un cliente). Con esto, las ventas normales del sistema (POS, catálogo, servicios, etc.) generarán su asiento contable automáticamente.
                </p>
              </span>
            </label>
            {esNegocioPropio && (
              <div className="grid grid-cols-1 gap-3 pl-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cuenta de cobro (Caja/Bancos)</label>
                  <select value={cuentaCobroId} onChange={(e) => setCuentaCobroId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                    <option value="">Selecciona una cuenta...</option>
                    {cuentas.map((c) => <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cuenta de ingreso</label>
                  <select value={cuentaIngresoId} onChange={(e) => setCuentaIngresoId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                    <option value="">Selecciona una cuenta...</option>
                    {cuentas.map((c) => <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cuenta de IVA por pagar (opcional)</label>
                  <select value={cuentaIvaId} onChange={(e) => setCuentaIvaId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                    <option value="">Sin separar el IVA...</option>
                    {cuentas.map((c) => <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppModal>
  );
}
