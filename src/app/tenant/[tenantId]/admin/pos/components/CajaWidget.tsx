/**
 * @file Widget de turno de caja del POS: muestra si el cajero tiene un
 * turno abierto y deja abrir/cerrarlo. Cada usuario abre y cierra el suyo
 * propio (no es por terminal) -- mientras está abierto, sus cobros quedan
 * enlazados a este turno para poder cuadrar caja al cerrar.
 */
"use client";

import { useEffect, useState, type ReactElement } from 'react';
import { Lock, Unlock, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { Moneda } from '@/types/api';
import { CajaSesion, getCajaActual, abrirCaja, cerrarCaja } from '@/services/cajaService';
import { getApiErrorMessages } from '@/utils/helpers';
import { AppModal, ActionButton } from '@/components/ui';

interface CajaWidgetProps {
  monedas: Moneda[];
}

export default function CajaWidget({ monedas }: CajaWidgetProps): ReactElement {
  const [caja, setCaja] = useState<CajaSesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [modalAbrir, setModalAbrir] = useState(false);
  const [modalCerrar, setModalCerrar] = useState(false);
  const [montos, setMontos] = useState<Record<number, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [resultadoCierre, setResultadoCierre] = useState<CajaSesion | null>(null);

  const cargar = async () => {
    setCargando(true);
    try {
      setCaja(await getCajaActual());
    } catch {
      // Si falla, se asume sin turno abierto -- no bloquea el POS.
      setCaja(null);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirModalApertura = () => {
    const iniciales: Record<number, string> = {};
    monedas.forEach(m => { iniciales[m.id] = ''; });
    setMontos(iniciales);
    setModalAbrir(true);
  };

  const abrirModalCierre = () => {
    const iniciales: Record<number, string> = {};
    (caja?.montos || []).forEach(m => { iniciales[m.moneda] = ''; });
    setMontos(iniciales);
    setModalCerrar(true);
  };

  const confirmarApertura = async () => {
    setGuardando(true);
    try {
      const nueva = await abrirCaja(montos);
      setCaja(nueva);
      setModalAbrir(false);
      toast.success('Turno de caja abierto.');
    } catch (error) {
      const messages = getApiErrorMessages(error);
      messages.length > 0 ? messages.forEach((m) => toast.error(m)) : toast.error('No se pudo abrir el turno de caja.');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarCierre = async () => {
    setGuardando(true);
    try {
      const cerrada = await cerrarCaja(montos);
      setResultadoCierre(cerrada);
      setCaja(null);
      setModalCerrar(false);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      messages.length > 0 ? messages.forEach((m) => toast.error(m)) : toast.error('No se pudo cerrar el turno de caja.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <div className="text-xs text-slate-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Caja...</div>;
  }

  return (
    <>
      {caja ? (
        <button
          type="button"
          onClick={abrirModalCierre}
          className="flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
        >
          <Unlock size={13} /> Caja abierta -- Cerrar turno
        </button>
      ) : (
        <button
          type="button"
          onClick={abrirModalApertura}
          className="flex items-center gap-1.5 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
        >
          <Lock size={13} /> Caja cerrada -- Abrir turno
        </button>
      )}

      {modalAbrir && (
        <AppModal
          isOpen
          onClose={() => setModalAbrir(false)}
          title="Abrir Turno de Caja"
          icon={<Unlock size={20} />}
          size="sm"
          footer={
            <>
              <ActionButton variant="secondary" onClick={() => setModalAbrir(false)}>Cancelar</ActionButton>
              <ActionButton loading={guardando} onClick={confirmarApertura}>Abrir Turno</ActionButton>
            </>
          }
        >
          <p className="text-xs text-slate-500 mb-4">
            Indica con cuánto efectivo arrancas la caja en cada moneda (puedes dejar en 0 la que no uses).
          </p>
          <div className="space-y-3">
            {monedas.map(m => (
              <div key={m.id}>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{m.codigo} — {m.nombre}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montos[m.id] ?? ''}
                  onChange={e => setMontos(prev => ({ ...prev, [m.id]: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            ))}
          </div>
        </AppModal>
      )}

      {modalCerrar && caja && (
        <AppModal
          isOpen
          onClose={() => setModalCerrar(false)}
          title="Cerrar Turno de Caja"
          icon={<Lock size={20} />}
          size="sm"
          footer={
            <>
              <ActionButton variant="secondary" onClick={() => setModalCerrar(false)}>Cancelar</ActionButton>
              <ActionButton loading={guardando} onClick={confirmarCierre}>Cerrar Turno</ActionButton>
            </>
          }
        >
          <p className="text-xs text-slate-500 mb-4">
            Cuenta físicamente el efectivo de cada moneda y anota cuánto tienes -- el sistema lo compara contra lo esperado.
          </p>
          <div className="space-y-3">
            {caja.montos.map(cm => (
              <div key={cm.moneda}>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{cm.moneda_codigo}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montos[cm.moneda] ?? ''}
                  onChange={e => setMontos(prev => ({ ...prev, [cm.moneda]: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            ))}
          </div>
        </AppModal>
      )}

      {resultadoCierre && (
        <AppModal
          isOpen
          onClose={() => setResultadoCierre(null)}
          title="Turno Cerrado"
          icon={<CheckCircle2 size={20} />}
          size="sm"
          footer={<ActionButton onClick={() => setResultadoCierre(null)}>Entendido</ActionButton>}
        >
          <div className="space-y-3">
            {resultadoCierre.montos.map(cm => {
              const diferencia = cm.diferencia !== null ? parseFloat(cm.diferencia) : null;
              return (
                <div key={cm.moneda} className="bg-slate-50 border rounded-xl p-3">
                  <p className="font-bold text-sm text-slate-800 mb-1">{cm.moneda_codigo}</p>
                  <div className="text-xs text-slate-500 flex justify-between"><span>Esperado</span><span className="font-mono">{cm.monto_cierre_esperado}</span></div>
                  <div className="text-xs text-slate-500 flex justify-between"><span>Declarado</span><span className="font-mono">{cm.monto_cierre_declarado}</span></div>
                  {diferencia !== null && (
                    <div className={`text-xs flex justify-between font-bold mt-1 pt-1 border-t ${
                      Math.abs(diferencia) < 0.01 ? 'text-emerald-600' : diferencia > 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      <span className="flex items-center gap-1">{Math.abs(diferencia) >= 0.01 && <AlertTriangle size={12} />} Diferencia</span>
                      <span className="font-mono">{diferencia > 0 ? '+' : ''}{cm.diferencia}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </AppModal>
      )}
    </>
  );
}
