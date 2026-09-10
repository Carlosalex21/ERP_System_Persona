/**
 * @file Modal de pago del POS (flujo paso a paso).
 * Paso 1: seleccionar método de pago. Paso 2: monto recibido + cambio.
 * Al cobrar muestra animación de procesado y de éxito antes de cerrar.
 * Envía metodo_pago (id) y el monto calculado por el motor fiscal.
 */
"use client";

import { useState, useEffect, useMemo, type ReactElement } from 'react';
import {
  Loader2,
  Banknote,
  CreditCard,
  DollarSign,
  Wallet,
  SplitSquareHorizontal,
  Landmark,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ReceiptText,
} from 'lucide-react';

import { useNotify } from '@/hooks/useNotify';
import { MetodoPago } from '@/types/api';
import { getMetodosDePago } from '@/services/facturacionService';
import { roundMoney } from '@/utils/taxCalculator';
import { AppModal } from '@/components/ui';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Recibe el ID del método de pago seleccionado; debe resolver con true si la venta fue exitosa. */
  onFinalize: (paymentMethodId: number) => Promise<boolean>;
  /** Total a cobrar en la moneda de la venta. */
  totalAmount: number;
  /** Código/símbolo de la moneda de la venta. */
  currencyCode: string;
}

type Paso = 'metodo' | 'monto' | 'exito';

/** Devuelve el icono (lucide) según el método de pago. */
function iconoMetodo(nombre: string, tipoMetodo?: string | null): ReactElement {
  const n = (nombre || '').toLowerCase();
  const t = (tipoMetodo || '').toLowerCase();

  if (n.includes('efectivo') || t.includes('efectivo')) {
    return <Banknote size={22} />;
  }
  if (n.includes('dólar') || n.includes('dolar') || t.includes('dolar')) {
    return <DollarSign size={22} />;
  }
  if (n.includes('bolívar') || n.includes('bolivar') || t.includes('venezuela')) {
    return <Landmark size={22} />;
  }
  if (n.includes('combinado') || n.includes('zelle') || t.includes('combinado')) {
    return <SplitSquareHorizontal size={22} />;
  }
  if (n.includes('tarjeta') || n.includes('punto') || n.includes('debito') || n.includes('credito')) {
    return <CreditCard size={22} />;
  }
  if (n.includes('pago móvil') || n.includes('pagomovil') || t.includes('movil')) {
    return <Wallet size={22} />;
  }
  return <Wallet size={22} />;
}

/**
 * Modal para seleccionar el método de pago, ingresar el monto recibido y
 * finalizar la venta con animaciones fluidas entre pasos.
 */
export default function PaymentModal({
  isOpen,
  onClose,
  onFinalize,
  totalAmount,
  currencyCode,
}: PaymentModalProps): ReactElement | null {
  const notify = useNotify();
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<MetodoPago[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<number | null>(null);
  const [paso, setPaso] = useState<Paso>('metodo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [metodoSeleccionadoNombre, setMetodoSeleccionadoNombre] = useState('');

  // Carga los métodos de pago cada vez que abre.
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setPaso('metodo');
      setSelectedMethod(null);
      setMontoRecibido('');
      setProcesando(false);
      setMetodoSeleccionadoNombre('');
      const fetchPaymentMethods = async () => {
        try {
          const methods = await getMetodosDePago();
          setPaymentMethods(methods);
        } catch (error) {
          console.error("Error al cargar métodos de pago:", error);
          notify.error("No se pudieron cargar los métodos de pago.");
        } finally {
          setLoading(false);
        }
      };
      fetchPaymentMethods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const montoRecibidoNum = useMemo(() => {
    const v = parseFloat(montoRecibido);
    return Number.isFinite(v) ? v : 0;
  }, [montoRecibido]);

  const cambio = useMemo(
    () => roundMoney(montoRecibidoNum - totalAmount),
    [montoRecibidoNum, totalAmount],
  );

  const pagoCompleto = montoRecibidoNum >= totalAmount;

  const handleSeleccionarMetodo = (metodo: MetodoPago) => {
    setSelectedMethod(metodo.id);
    setMetodoSeleccionadoNombre(metodo.nombre);
    // Pequeño delay para que se aprecie la selección antes de avanzar.
    setTimeout(() => setPaso('monto'), 180);
  };

  const handleCobrar = async () => {
    if (!selectedMethod || procesando) return;
    setProcesando(true);

    let exito = false;
    try {
      exito = await onFinalize(selectedMethod);
    } catch {
      exito = false;
    }

    if (exito) {
      setPaso('exito');
      // Mantiene la animación de éxito visible un momento y luego cierra.
      setTimeout(() => {
        onClose();
        setProcesando(false);
      }, 1600);
    } else {
      setProcesando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Cobrar Venta"
      icon={<ReceiptText size={20} />}
      size="md"
    >
      <div className="p-1">
        {/* Subtítulo contextual */}
        <p className="text-[11px] text-slate-400 mb-4">
          {paso === 'metodo' ? 'Selecciona el método de pago' : paso === 'monto' ? 'Ingresa el monto recibido' : 'Procesando pago'}
        </p>

        {/* Indicador de pasos */}
        {paso !== 'exito' && (
          <div className="flex items-center justify-center gap-2 mb-5">
            <span className={`h-1.5 w-8 rounded-full transition-all ${paso === 'metodo' ? 'bg-primary-600' : 'bg-slate-200'}`} />
            <span className={`h-1.5 w-8 rounded-full transition-all ${paso === 'monto' ? 'bg-primary-600' : 'bg-slate-200'}`} />
          </div>
        )}

        {/* PASO 1: Método de pago */}
        {paso === 'metodo' && (
          <div className="animate-fade-in">
            <div className="text-center mb-5">
              <p className="text-slate-500 text-sm">Total a Pagar</p>
              <p className="text-4xl font-black text-slate-900 tracking-tight">
                {currencyCode} {totalAmount.toFixed(2)}
              </p>
            </div>

            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Método de Pago</label>
            {loading ? (
              <div className="flex items-center justify-center h-28 text-slate-400">
                <Loader2 className="animate-spin" size={28} />
              </div>
            ) : paymentMethods.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-8">No hay métodos de pago configurados.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {paymentMethods.map((metodo, idx) => {
                  const activo = selectedMethod === metodo.id;
                  return (
                    <button
                      key={metodo.id}
                      type="button"
                      onClick={() => handleSeleccionarMetodo(metodo)}
                      style={{ animationDelay: `${idx * 60}ms` }}
                      className={`w-full text-left p-4 rounded-xl border-2 flex items-center gap-3 transition-all duration-200 animate-slide-up ${
                        activo
                          ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-300 shadow-md'
                          : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${activo ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {iconoMetodo(metodo.nombre, metodo.tipo_metodo)}
                      </div>
                      <span className="font-bold text-slate-800 flex-1">{metodo.nombre}</span>
                      <ChevronRight size={18} className={activo ? 'text-primary-600' : 'text-slate-300'} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PASO 2: Monto recibido / cambio */}
        {paso === 'monto' && (
          <div className="animate-fade-in">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 text-center">
              <p className="text-xs text-slate-500 uppercase font-bold">Total</p>
              <p className="text-3xl font-black text-slate-900">{currencyCode} {totalAmount.toFixed(2)}</p>
              <p className="text-[11px] text-slate-400 mt-1">Método: {metodoSeleccionadoNombre}</p>
            </div>

            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto Recibido</label>
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">{currencyCode}</span>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                autoFocus
                value={montoRecibido}
                onChange={e => setMontoRecibido(e.target.value)}
                placeholder="0.00"
                className="w-full pl-14 pr-4 py-3 border-2 rounded-xl text-2xl font-black text-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Botones de montos rápidos */}
            <div className="flex gap-2 mb-4">
              {[totalAmount, totalAmount * 2].map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMontoRecibido((Math.round(m * 100) / 100).toFixed(2))}
                  className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-primary-50 text-xs font-bold text-slate-600 transition-colors"
                >
                  {currencyCode} {m.toFixed(2)}
                </button>
              ))}
            </div>

            {/* Cambio */}
            <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
              <span className="text-sm font-bold text-emerald-700">Cambio</span>
              <span className={`text-xl font-black ${cambio >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {currencyCode} {Math.max(cambio, 0).toFixed(2)}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPaso('metodo')}
                disabled={procesando}
                className="px-4 py-3 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl flex items-center gap-1 hover:bg-slate-200 transition-colors"
              >
                <ChevronLeft size={16} /> Atrás
              </button>
              <button
                type="button"
                onClick={handleCobrar}
                disabled={!pagoCompleto || procesando}
                className="flex-1 py-3 text-sm font-black text-white bg-primary-600 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {procesando ? (
                  <><Loader2 size={18} className="animate-spin" /> Procesando...</>
                ) : (
                  <>Cobrar Pago <CheckCircle2 size={18} /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: Éxito */}
        {paso === 'exito' && (
          <div className="py-8 text-center animate-scale-in">
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4 animate-bounce-in">
              <CheckCircle2 size={44} className="text-emerald-600" />
            </div>
            <h4 className="text-xl font-black text-slate-900">¡Pago Completado!</h4>
            <p className="text-slate-500 text-sm mt-1">
              Venta registrada correctamente.
            </p>
          </div>
        )}
      </div>
    </AppModal>
  );
}
