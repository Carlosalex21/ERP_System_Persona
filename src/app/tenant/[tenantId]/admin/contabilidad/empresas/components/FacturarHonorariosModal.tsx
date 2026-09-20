"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { Receipt, Plus, Trash2, FileText, CheckCircle2 } from 'lucide-react';
import { AppModal, ActionButton } from '@/components/ui';
import {
  facturarHonorarios, getCuentasContables, type CuentaContable, type EmpresaContable,
  type LineaHonorarioRequest, type FacturarHonorariosResponse,
} from '@/services/contabilidadService';
import { getProductos } from '@/services/inventoryService';
import { getMetodosDePago, verFacturaPdf } from '@/services/facturacionService';
import { getMonedas } from '@/services/configuracionService';
import { useNotify } from '@/hooks/useNotify';
import type { Producto, MetodoPago, Moneda } from '@/types/api';

interface FacturarHonorariosModalProps {
  empresa: EmpresaContable;
  onClose: () => void;
  onFacturado: () => void;
}

interface LineaForm {
  key: number;
  productoId: string;
  cantidad: string;
  monto: string;
}

export default function FacturarHonorariosModal({ empresa, onClose, onFacturado }: FacturarHonorariosModalProps): ReactElement {
  const notify = useNotify();
  const [servicios, setServicios] = useState<Producto[]>([]);
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [monedaId, setMonedaId] = useState('');
  const [metodoPagoId, setMetodoPagoId] = useState('');
  const [cuentaCobroId, setCuentaCobroId] = useState('');
  const [cuentaIngresoId, setCuentaIngresoId] = useState('');
  const [lineas, setLineas] = useState<LineaForm[]>([{ key: 0, productoId: '', cantidad: '1', monto: '' }]);
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<FacturarHonorariosResponse | null>(null);
  const [abriendoPdf, setAbriendoPdf] = useState(false);

  useEffect(() => {
    getProductos().then((lista) => setServicios(lista.filter((p) => p.tipo === 'servicio'))).catch(() => setServicios([]));
    getMetodosDePago().then((lista) => { setMetodosPago(lista); setMetodoPagoId(String(lista[0]?.id || '')); }).catch(() => setMetodosPago([]));
    getMonedas().then((lista) => {
      setMonedas(lista);
      const base = lista.find((m) => m.es_predeterminada);
      if (base) setMonedaId(String(base.id));
    }).catch(() => setMonedas([]));
    getCuentasContables(empresa.id).then((lista) => {
      const movibles = lista.filter((c) => c.acepta_movimiento);
      setCuentas(movibles);
      const cobro = movibles.find((c) => c.codigo === '1.1.01') || movibles.find((c) => c.codigo === '1.1.02') || movibles.find((c) => c.tipo === 'activo');
      const ingreso = movibles.find((c) => c.codigo === '4.2') || movibles.find((c) => c.tipo === 'ingreso');
      if (cobro) setCuentaCobroId(String(cobro.id));
      if (ingreso) setCuentaIngresoId(String(ingreso.id));
    }).catch(() => setCuentas([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa.id]);

  const actualizarLinea = (key: number, campo: keyof Omit<LineaForm, 'key'>, valor: string): void => {
    setLineas((prev) => prev.map((l) => {
      if (l.key !== key) return l;
      if (campo === 'productoId' && valor) {
        const producto = servicios.find((p) => String(p.id) === valor);
        return { ...l, productoId: valor, monto: l.monto || producto?.precio || '' };
      }
      return { ...l, [campo]: valor };
    }));
  };

  const agregarLinea = (): void => setLineas((prev) => [...prev, { key: Date.now(), productoId: '', cantidad: '1', monto: '' }]);
  const quitarLinea = (key: number): void => setLineas((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));

  const total = lineas.reduce((s, l) => s + (Number(l.monto) || 0) * (Number(l.cantidad) || 0), 0);
  const monedaSeleccionada = monedas.find((m) => String(m.id) === monedaId);
  const simbolo = monedaSeleccionada?.simbolo || monedaSeleccionada?.codigo || '$';

  const guardar = async (): Promise<void> => {
    const lineasValidas: LineaHonorarioRequest[] = [];
    for (const l of lineas) {
      if (!l.productoId && !l.monto) continue;
      if (!l.productoId || !l.monto || Number(l.monto) <= 0) {
        notify.error('Completa el concepto y el monto de cada línea (o elimínala).');
        return;
      }
      lineasValidas.push({ producto_id: Number(l.productoId), cantidad: Number(l.cantidad) || 1, monto: Number(l.monto) });
    }
    if (lineasValidas.length === 0) {
      notify.error('Agrega al menos un concepto para facturar.');
      return;
    }
    if (!metodoPagoId || !cuentaCobroId || !cuentaIngresoId) {
      notify.error('Selecciona el método de pago y las cuentas contables de cobro e ingreso.');
      return;
    }
    setGuardando(true);
    try {
      const resultado = await facturarHonorarios(empresa.id, {
        lineas: lineasValidas,
        metodo_pago_id: Number(metodoPagoId),
        cuenta_cobro_id: Number(cuentaCobroId),
        cuenta_ingreso_id: Number(cuentaIngresoId),
        ...(monedaId ? { moneda_id: Number(monedaId) } : {}),
      });
      notify.success(
        resultado.asiento_numero
          ? `Honorarios facturados (${resultado.correlativo}) y asiento #${resultado.asiento_numero} generado.`
          : `Honorarios facturados (${resultado.correlativo}).`
      );
      // Se queda en el modal mostrando el resultado (con el acceso al PDF)
      // en vez de cerrar de una vez -- si cerramos, el único rastro de la
      // factura recién emitida era el toast, que desaparece solo.
      setResultado(resultado);
    } catch (error: any) {
      notify.error(error?.response?.data?.error || 'No se pudo facturar.');
    } finally {
      setGuardando(false);
    }
  };

  const verPdf = async (): Promise<void> => {
    if (!resultado) return;
    setAbriendoPdf(true);
    try {
      await verFacturaPdf(resultado.factura_id);
    } catch {
      notify.error('No se pudo abrir el PDF de la factura.');
    } finally {
      setAbriendoPdf(false);
    }
  };

  if (resultado) {
    return (
      <AppModal
        isOpen
        onClose={onFacturado}
        title="Honorarios Facturados"
        icon={<CheckCircle2 size={20} />}
        size="md"
        footer={
          <>
            <ActionButton variant="secondary" onClick={onFacturado}>Cerrar</ActionButton>
            <ActionButton loading={abriendoPdf} onClick={verPdf}><FileText size={16} /> Ver / Descargar PDF</ActionButton>
          </>
        }
      >
        <div className="text-center py-6 space-y-3">
          <CheckCircle2 className="mx-auto text-emerald-500" size={48} />
          <p className="text-sm text-slate-600">
            Factura <strong>{resultado.correlativo}</strong> emitida y cobrada a <strong>{empresa.cliente_nombre}</strong>.
          </p>
          {resultado.asiento_numero && (
            <p className="text-xs text-slate-400">Asiento contable #{resultado.asiento_numero} generado automáticamente.</p>
          )}
        </div>
      </AppModal>
    );
  }

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={`Facturar Honorarios — ${empresa.nombre}`}
      icon={<Receipt size={20} />}
      size="lg"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={guardar}>Facturar y Cobrar</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Se factura a <strong>{empresa.cliente_nombre}</strong>. Al cobrar, además de la factura se genera automáticamente el asiento contable en esta empresa.
        </p>

        <div className="space-y-3">
          {lineas.map((linea) => (
            <div key={linea.key} className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <div className="flex-1 min-w-0 space-y-2">
                <select
                  value={linea.productoId}
                  onChange={(e) => actualizarLinea(linea.key, 'productoId', e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                >
                  <option value="">Concepto...</option>
                  {servicios.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <div className="flex gap-2">
                  <input
                    type="number" min={1}
                    value={linea.cantidad}
                    onChange={(e) => actualizarLinea(linea.key, 'cantidad', e.target.value)}
                    placeholder="Cant."
                    className="w-16 px-2 py-1.5 border rounded-lg text-xs"
                  />
                  <input
                    type="number" min={0} step="0.01"
                    value={linea.monto}
                    onChange={(e) => actualizarLinea(linea.key, 'monto', e.target.value)}
                    placeholder={`Monto (${simbolo})`}
                    className="flex-1 min-w-0 px-2 py-1.5 border rounded-lg text-xs"
                  />
                </div>
              </div>
              <button type="button" onClick={() => quitarLinea(linea.key)} disabled={lineas.length === 1} className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30" aria-label="Quitar línea">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        {servicios.length === 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            Todavía no tienes conceptos facturables creados -- ve a &quot;Servicios y Honorarios&quot; en el menú para crear el primero.
          </p>
        )}

        <button type="button" onClick={agregarLinea} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 border-dashed border-slate-200 text-xs font-bold text-slate-500 hover:border-primary-400 hover:text-primary-600 transition-colors">
          <Plus size={14} /> Agregar línea
        </button>

        {monedas.length > 1 && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Moneda a cobrar</label>
            <div className="flex flex-wrap gap-2">
              {monedas.map((m) => (
                <button
                  key={m.id} type="button" onClick={() => setMonedaId(String(m.id))}
                  className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-colors ${monedaId === String(m.id) ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500'}`}
                >
                  {m.codigo}{m.es_predeterminada ? ' (Base)' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-1">
          <span className="text-sm font-bold text-slate-500">Total</span>
          <span className="text-lg font-black text-slate-900">{simbolo} {total.toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cuenta de cobro (Debe)</label>
            <select value={cuentaCobroId} onChange={(e) => setCuentaCobroId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Selecciona...</option>
              {cuentas.map((c) => <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cuenta de ingreso (Haber)</label>
            <select value={cuentaIngresoId} onChange={(e) => setCuentaIngresoId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Selecciona...</option>
              {cuentas.map((c) => <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método de Pago</label>
          <select value={metodoPagoId} onChange={(e) => setMetodoPagoId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">Selecciona...</option>
            {metodosPago.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>
      </div>
    </AppModal>
  );
}
