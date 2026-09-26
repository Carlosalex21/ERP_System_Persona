"use client";

/**
 * @file Caja y Bancos: el cierre de turno se mueve aquí (antes vivía solo
 * en el widget rápido del POS) porque cerrar exige poder JUSTIFICAR la
 * cifra -- ver el detalle de qué ventas en efectivo componen el total
 * esperado, no solo un número a ciegas -- y después decidir qué hacer con
 * ese efectivo (ej. registrar que se llevó al banco). El reporte diario de
 * abajo junta cobros (ventas) y movimientos manuales (ingresos/egresos) en
 * una sola línea de tiempo por día, con el saldo neto de cada uno.
 */

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Landmark, ChevronDown, ChevronUp, LockKeyhole, Plus, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getCajaActual,
  previsualizarCierreCaja,
  cerrarCaja,
  crearMovimientoCaja,
  getReporteCajaBancos,
  type CajaSesion,
  type PrevisualizacionCierre,
  type ReporteDiaCajaBancos,
  type MovimientoCajaRequest,
} from '@/services/cajaService';
import { getBancos } from '@/services/bancosService';
import { getMonedas } from '@/services/configuracionService';
import { getApiErrorMessages, parseDecimal } from '@/utils/helpers';
import { PageHeader, Card, ActionButton, TableSkeleton, AppModal } from '@/components/ui';
import type { Banco, Moneda } from '@/types/api';

export default function CajaBancosPage(): ReactElement {
  const [sesionActual, setSesionActual] = useState<CajaSesion | null>(null);
  const [previsualizacion, setPrevisualizacion] = useState<PrevisualizacionCierre | null>(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [declarados, setDeclarados] = useState<Record<number, string>>({});
  const [observaciones, setObservaciones] = useState('');
  const [cerrando, setCerrando] = useState(false);
  const [sesionRecienCerrada, setSesionRecienCerrada] = useState<CajaSesion | null>(null);

  const [bancos, setBancos] = useState<Banco[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [reporte, setReporte] = useState<ReporteDiaCajaBancos[]>([]);
  const [cargandoReporte, setCargandoReporte] = useState(true);
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);

  const [modalMovimientoAbierto, setModalMovimientoAbierto] = useState(false);
  const [movTipo, setMovTipo] = useState<'ingreso' | 'egreso'>('egreso');
  const [movMoneda, setMovMoneda] = useState<number | null>(null);
  const [movMonto, setMovMonto] = useState('');
  const [movConcepto, setMovConcepto] = useState('');
  const [movBanco, setMovBanco] = useState<number | null>(null);
  const [movCajaSesion, setMovCajaSesion] = useState<number | null>(null);
  const [guardandoMovimiento, setGuardandoMovimiento] = useState(false);

  const cargarSesion = useCallback(async () => {
    try {
      const sesion = await getCajaActual();
      setSesionActual(sesion);
    } catch {
      setSesionActual(null);
    }
  }, []);

  const cargarReporte = useCallback(async () => {
    setCargandoReporte(true);
    try {
      const data = await getReporteCajaBancos();
      setReporte(data);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      messages.forEach((m) => toast.error(m));
      if (messages.length === 0) toast.error('No se pudo cargar el reporte de caja y bancos.');
    } finally {
      setCargandoReporte(false);
    }
  }, []);

  useEffect(() => {
    cargarSesion();
    cargarReporte();
    getBancos().then(setBancos).catch(() => setBancos([]));
    getMonedas().then(setMonedas).catch(() => setMonedas([]));
  }, [cargarSesion, cargarReporte]);

  const abrirCuadre = useCallback(async () => {
    setCargandoPreview(true);
    try {
      const preview = await previsualizarCierreCaja();
      setPrevisualizacion(preview);
      const iniciales: Record<number, string> = {};
      preview.monedas.forEach((m) => { iniciales[m.moneda_id] = m.monto_cierre_esperado; });
      setDeclarados(iniciales);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      messages.forEach((m) => toast.error(m));
      if (messages.length === 0) toast.error('No se pudo calcular el cuadre de caja.');
    } finally {
      setCargandoPreview(false);
    }
  }, []);

  const confirmarCierre = useCallback(async () => {
    setCerrando(true);
    try {
      const sesion = await cerrarCaja(declarados, observaciones);
      toast.success('Caja cerrada.');
      setSesionRecienCerrada(sesion);
      setPrevisualizacion(null);
      setSesionActual(null);
      setObservaciones('');
      cargarReporte();
    } catch (error) {
      const messages = getApiErrorMessages(error);
      messages.forEach((m) => toast.error(m));
      if (messages.length === 0) toast.error('No se pudo cerrar la caja.');
    } finally {
      setCerrando(false);
    }
  }, [declarados, observaciones, cargarReporte]);

  const abrirRegistrarEgreso = useCallback((moneda_id: number, monto: string, caja_sesion_id: number | null) => {
    setMovTipo('egreso');
    setMovMoneda(moneda_id);
    setMovMonto(monto);
    setMovConcepto('Depósito del cierre de caja al banco');
    setMovBanco(bancos[0]?.id ?? null);
    setMovCajaSesion(caja_sesion_id);
    setModalMovimientoAbierto(true);
  }, [bancos]);

  const abrirNuevoMovimiento = useCallback(() => {
    setMovTipo('egreso');
    setMovMoneda(monedas.find((m) => m.es_predeterminada)?.id ?? monedas[0]?.id ?? null);
    setMovMonto('');
    setMovConcepto('');
    setMovBanco(null);
    setMovCajaSesion(null);
    setModalMovimientoAbierto(true);
  }, [monedas]);

  const guardarMovimiento = useCallback(async () => {
    if (!movMoneda || !movMonto || !movConcepto) {
      toast.error('Completa moneda, monto y concepto.');
      return;
    }
    setGuardandoMovimiento(true);
    try {
      const payload: MovimientoCajaRequest = {
        tipo: movTipo,
        moneda: movMoneda,
        monto: movMonto,
        concepto: movConcepto,
        banco: movBanco ?? undefined,
        caja_sesion: movCajaSesion ?? undefined,
      };
      await crearMovimientoCaja(payload);
      toast.success(movTipo === 'egreso' ? 'Egreso registrado.' : 'Ingreso registrado.');
      setModalMovimientoAbierto(false);
      setSesionRecienCerrada(null);
      cargarReporte();
    } catch (error) {
      const messages = getApiErrorMessages(error);
      messages.forEach((m) => toast.error(m));
      if (messages.length === 0) toast.error('No se pudo registrar el movimiento.');
    } finally {
      setGuardandoMovimiento(false);
    }
  }, [movTipo, movMoneda, movMonto, movConcepto, movBanco, movCajaSesion, cargarReporte]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Landmark size={20} />}
        title="Caja y Bancos"
        description="Cierra tu turno viendo el detalle que justifica la cifra, y lleva el registro de todo lo que entra y sale de caja hacia el banco."
        actions={
          <ActionButton variant="secondary" onClick={abrirNuevoMovimiento}>
            <Plus size={16} /> Registrar movimiento
          </ActionButton>
        }
      />

      {/* Turno actual -- cerrar caja con el detalle que justifica el total */}
      <Card>
        {sesionActual ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><LockKeyhole size={16} className="text-primary-600" /> Turno abierto</h3>
                <p className="text-xs text-slate-400">Desde {new Date(sesionActual.fecha_apertura).toLocaleString('es-VE')}</p>
              </div>
              {!previsualizacion && (
                <ActionButton loading={cargandoPreview} onClick={abrirCuadre}>Ver cuadre y cerrar caja</ActionButton>
              )}
            </div>

            {previsualizacion && (
              <div className="space-y-4 border-t pt-4">
                {previsualizacion.monedas.map((m) => (
                  <div key={m.moneda_id} className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-700">{m.moneda_codigo}</span>
                      <span className="text-xs text-slate-400">Apertura: {parseDecimal(m.monto_apertura).toFixed(2)} + Ventas efectivo: {parseDecimal(m.total_ventas_efectivo).toFixed(2)} = Esperado: <strong className="text-slate-700">{parseDecimal(m.monto_cierre_esperado).toFixed(2)}</strong></span>
                    </div>
                    {m.movimientos.length > 0 && (
                      <div className="max-h-32 overflow-y-auto space-y-1 mb-3 text-xs">
                        {m.movimientos.map((mv) => (
                          <div key={mv.id} className="flex justify-between text-slate-500 bg-white px-2 py-1 rounded">
                            <span>{mv.factura_correlativo || 'Venta'}</span>
                            <span className="font-mono">{parseDecimal(mv.monto).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Monto contado (declarado)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={declarados[m.moneda_id] ?? ''}
                        onChange={(e) => setDeclarados((d) => ({ ...d, [m.moneda_id]: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observaciones (opcional)</label>
                  <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div className="flex justify-end gap-2">
                  <ActionButton variant="secondary" onClick={() => setPrevisualizacion(null)}>Cancelar</ActionButton>
                  <ActionButton loading={cerrando} onClick={confirmarCierre}>Confirmar cierre</ActionButton>
                </div>
              </div>
            )}
          </div>
        ) : sesionRecienCerrada ? (
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800">Caja cerrada</h3>
            <div className="space-y-2">
              {sesionRecienCerrada.montos.map((m) => (
                <div key={m.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                  <div>
                    <span className="font-bold text-slate-700">{m.moneda_codigo}</span>
                    <span className="text-xs text-slate-400 ml-2">Declarado: {parseDecimal(m.monto_cierre_declarado || '0').toFixed(2)}</span>
                    {m.diferencia !== null && parseDecimal(m.diferencia) !== 0 && (
                      <span className={`text-xs ml-2 font-bold ${parseDecimal(m.diferencia) > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        Diferencia: {parseDecimal(m.diferencia).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => abrirRegistrarEgreso(m.moneda, m.monto_cierre_declarado || '0', sesionRecienCerrada.id)}
                    className="text-xs font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1"
                  >
                    <ArrowDownCircle size={14} /> Llevar al banco
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">No tienes un turno de caja abierto ahora mismo.</p>
        )}
      </Card>

      {/* Reporte diario: cobros + movimientos manuales, con saldo neto por día */}
      {cargandoReporte ? (
        <TableSkeleton rows={5} />
      ) : reporte.length === 0 ? (
        <Card><p className="text-sm text-slate-400 text-center py-8">No hay movimientos registrados todavía.</p></Card>
      ) : (
        <div className="space-y-3">
          {reporte.map((dia) => {
            const abierto = diaAbierto === dia.fecha;
            const saldo = parseDecimal(dia.saldo_neto);
            return (
              <Card key={dia.fecha} padding="none" className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDiaAbierto(abierto ? null : dia.fecha)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {abierto ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    <span className="font-bold text-slate-800">{new Date(dia.fecha + 'T00:00:00').toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-slate-400">Cobros: <strong className="text-slate-700">{parseDecimal(dia.total_cobros).toFixed(2)}</strong></span>
                    <span className="text-slate-400">Egresos: <strong className="text-slate-700">{parseDecimal(dia.total_egresos).toFixed(2)}</strong></span>
                    <span className={`font-black ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>Saldo: {saldo.toFixed(2)}</span>
                  </div>
                </button>
                {abierto && (
                  <div className="border-t px-5 py-4 space-y-3">
                    {dia.cobros.map((c) => (
                      <div key={`c-${c.id}`} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <ArrowUpCircle size={14} className="text-green-500" />
                          <span className="text-slate-700">{c.factura_correlativo || `#${c.factura}`}</span>
                          <span className="text-[10px] text-slate-400">{c.metodo_pago_nombre}{c.banco_nombre ? ` · ${c.banco_nombre}` : ''}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-800">{c.moneda_codigo} {parseDecimal(c.monto).toFixed(2)}</span>
                      </div>
                    ))}
                    {dia.movimientos.map((m) => (
                      <div key={`m-${m.id}`} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {m.tipo === 'ingreso' ? <ArrowUpCircle size={14} className="text-green-500" /> : <ArrowDownCircle size={14} className="text-red-500" />}
                          <span className="text-slate-700">{m.concepto}</span>
                          <span className="text-[10px] text-slate-400">{m.banco_nombre || 'Sin banco'} · {m.usuario_nombre}</span>
                        </div>
                        <span className={`font-mono font-bold ${m.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                          {m.tipo === 'ingreso' ? '+' : '-'}{m.moneda_codigo} {parseDecimal(m.monto).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal registrar movimiento manual */}
      {modalMovimientoAbierto && (
        <AppModal
          isOpen
          onClose={() => setModalMovimientoAbierto(false)}
          title="Registrar movimiento"
          icon={<Landmark size={20} />}
          size="sm"
          footer={
            <>
              <ActionButton variant="secondary" onClick={() => setModalMovimientoAbierto(false)}>Cancelar</ActionButton>
              <ActionButton loading={guardandoMovimiento} onClick={guardarMovimiento}>Guardar</ActionButton>
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-bold">
              <button type="button" onClick={() => setMovTipo('egreso')} className={`flex-1 py-2 transition-colors ${movTipo === 'egreso' ? 'bg-red-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                <span className="inline-flex items-center gap-1.5"><ArrowDownCircle size={14} /> Egreso (sale)</span>
              </button>
              <button type="button" onClick={() => setMovTipo('ingreso')} className={`flex-1 py-2 transition-colors ${movTipo === 'ingreso' ? 'bg-green-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                <span className="inline-flex items-center gap-1.5"><ArrowUpCircle size={14} /> Ingreso (entra)</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Moneda</label>
                <select value={movMoneda ?? ''} onChange={(e) => setMovMoneda(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                  {monedas.map((m) => <option key={m.id} value={m.id}>{m.codigo}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto</label>
                <input type="number" step="0.01" placeholder="0.00" value={movMonto} onChange={(e) => setMovMonto(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Banco (opcional)</label>
              <select value={movBanco ?? ''} onChange={(e) => setMovBanco(e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                <option value="">Sin banco</option>
                {bancos.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Concepto</label>
              <input value={movConcepto} onChange={(e) => setMovConcepto(e.target.value)} placeholder="Ej: Depósito del cierre al Banco Mercantil" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
}
