/**
 * @file Modal de pago del POS (flujo paso a paso).
 * Paso 1: seleccionar método de pago. Paso 2: monto recibido + cambio.
 * Soporta PAGO DIVIDIDO: se puede pagar el total con varios métodos (ej.
 * mitad efectivo, mitad Pago Móvil) agregando una línea de pago a la vez.
 * Si la venta es a crédito y el cliente no cubre el total, el resto queda
 * como saldo pendiente (abono parcial) -- para una venta de contado, se
 * exige cubrir el total completo antes de poder cobrar.
 * Al cobrar muestra animación de procesado y de éxito antes de cerrar.
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
  Trash2,
  Plus,
} from 'lucide-react';

import { useNotify } from '@/hooks/useNotify';
import { MetodoPago } from '@/types/api';
import { getMetodosDePago } from '@/services/facturacionService';
import { roundMoney } from '@/utils/taxCalculator';
import { AppModal } from '@/components/ui';

/** Una línea de pago ya confirmada (puede haber varias si la venta se dividió entre métodos). */
export interface PagoLinea {
  metodoPagoId: number;
  metodoNombre: string;
  monto: number;
  montoRecibido: number;
  referencia: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Recibe las líneas de pago confirmadas; debe resolver con true si la venta fue exitosa. */
  onFinalize: (pagos: PagoLinea[]) => Promise<boolean>;
  /** Total a cobrar en la moneda de la venta. */
  totalAmount: number;
  /** Código/símbolo de la moneda de la venta. */
  currencyCode: string;
  totalBase?: number;
  baseCurrencyCode?: string;
  /** 'contado' exige cubrir el total completo; 'credito' permite dejar saldo pendiente (abono). */
  condicionPago: 'contado' | 'credito';
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
  totalBase,
  baseCurrencyCode,
  condicionPago,
}: PaymentModalProps): ReactElement | null {
  const notify = useNotify();
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<MetodoPago[]>([]);
  const [paso, setPaso] = useState<Paso>('metodo');
  const [lineas, setLineas] = useState<PagoLinea[]>([]);
  const [metodoActual, setMetodoActual] = useState<MetodoPago | null>(null);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [referenciaPago, setReferenciaPago] = useState('');

  const reiniciar = () => {
    setPaso('metodo');
    setLineas([]);
    setMetodoActual(null);
    setMontoRecibido('');
    setProcesando(false);
    setReferenciaPago('');
  };

  // Carga los métodos de pago cada vez que abre.
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      reiniciar();
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

  const totalYaAsignado = useMemo(() => roundMoney(lineas.reduce((acc, l) => acc + l.monto, 0)), [lineas]);
  const restante = useMemo(() => roundMoney(totalAmount - totalYaAsignado), [totalAmount, totalYaAsignado]);

  const montoRecibidoNum = useMemo(() => {
    const v = parseFloat(montoRecibido);
    return Number.isFinite(v) ? v : 0;
  }, [montoRecibido]);

  // El monto que esta línea APLICA al saldo es, como mucho, lo recibido --
  // pero nunca más de lo que falta por cubrir (el excedente en efectivo es
  // vuelto, no un pago de más).
  const montoLineaActual = useMemo(
    () => roundMoney(Math.min(montoRecibidoNum, Math.max(restante, 0))),
    [montoRecibidoNum, restante],
  );
  const cambio = useMemo(() => roundMoney(montoRecibidoNum - montoLineaActual), [montoRecibidoNum, montoLineaActual]);

  const esEfectivo = useMemo(() => {
    const n = (metodoActual?.nombre || '').toLowerCase();
    const t = (metodoActual?.tipo_metodo || '').toLowerCase();
    return n.includes('efectivo') || t.includes('efectivo');
  }, [metodoActual]);

  // Solo tiene sentido mostrar el equivalente si la venta NO está ya en la
  // moneda base (si lo está, `totalBase` sería el mismo número repetido).
  const mostrarEquivalente = totalBase !== undefined && baseCurrencyCode !== undefined && baseCurrencyCode !== currencyCode;

  const handleSeleccionarMetodo = (metodo: MetodoPago) => {
    setMetodoActual(metodo);
    // El monto sugerido por defecto es lo que falta por cubrir -- el
    // cajero solo lo cambia si de verdad va a dividir el pago o si el
    // cliente entrega efectivo de más (para calcular el vuelto).
    setMontoRecibido(restante > 0 ? restante.toFixed(2) : '0.00');
    setReferenciaPago('');
    setTimeout(() => setPaso('monto'), 180);
  };

  /** Guarda la línea actual (el método+monto en curso) en la lista de líneas confirmadas. */
  const confirmarLineaActual = (): PagoLinea[] => {
    if (!metodoActual) return lineas;
    const nuevaLinea: PagoLinea = {
      metodoPagoId: metodoActual.id,
      metodoNombre: metodoActual.nombre,
      monto: montoLineaActual,
      montoRecibido: montoRecibidoNum,
      referencia: referenciaPago.trim(),
    };
    const nuevasLineas = [...lineas, nuevaLinea];
    setLineas(nuevasLineas);
    return nuevasLineas;
  };

  /** "Dividir con otro método": guarda la línea actual y vuelve a elegir método para lo que falta. */
  const handleAgregarOtroMetodo = () => {
    if (montoLineaActual <= 0) {
      notify.error('Ingresa un monto para este método antes de agregar otro.');
      return;
    }
    confirmarLineaActual();
    setMetodoActual(null);
    setMontoRecibido('');
    setReferenciaPago('');
    setPaso('metodo');
  };

  const quitarLinea = (index: number) => {
    setLineas(prev => prev.filter((_, i) => i !== index));
  };

  const restanteTrasLineaActual = useMemo(
    () => roundMoney(restante - montoLineaActual),
    [restante, montoLineaActual],
  );
  // De contado hay que cubrir el 100% antes de poder cobrar; a crédito se
  // permite dejar saldo pendiente (abono parcial) -- pero siempre hace
  // falta que la línea actual tenga algún monto.
  const puedeCobrar = montoLineaActual > 0 && (condicionPago === 'credito' || restanteTrasLineaActual <= 0.01);

  const handleCobrar = async () => {
    if (!metodoActual || procesando) return;
    setProcesando(true);

    const pagosFinales = confirmarLineaActual();

    let exito = false;
    try {
      exito = await onFinalize(pagosFinales);
    } catch {
      exito = false;
    }

    if (exito) {
      setPaso('exito');
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

        {/* Líneas de pago ya agregadas (pago dividido) */}
        {paso !== 'exito' && lineas.length > 0 && (
          <div className="mb-4 space-y-1.5">
            {lineas.map((l, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs">
                <span className="font-bold text-slate-700">{l.metodoNombre}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-800">{currencyCode} {l.monto.toFixed(2)}</span>
                  <button type="button" onClick={() => quitarLinea(i)} className="text-slate-400 hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PASO 1: Método de pago */}
        {paso === 'metodo' && (
          <div className="animate-fade-in">
            <div className="text-center mb-5">
              <p className="text-slate-500 text-sm">{lineas.length > 0 ? 'Falta por cubrir' : 'Total a Pagar'}</p>
              <p className="text-4xl font-black text-slate-900 tracking-tight">
                {currencyCode} {restante.toFixed(2)}
              </p>
              {lineas.length === 0 && mostrarEquivalente && (
                <p className="text-sm font-bold text-primary-600 mt-1">
                  ≈ {baseCurrencyCode} {totalBase!.toFixed(2)}
                </p>
              )}
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
                {paymentMethods.map((metodo, idx) => (
                  <button
                    key={metodo.id}
                    type="button"
                    onClick={() => handleSeleccionarMetodo(metodo)}
                    style={{ animationDelay: `${idx * 60}ms` }}
                    className="w-full text-left p-4 rounded-xl border-2 flex items-center gap-3 transition-all duration-200 animate-slide-up border-slate-200 hover:border-primary-300 hover:bg-slate-50"
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 text-slate-500">
                      {iconoMetodo(metodo.nombre, metodo.tipo_metodo)}
                    </div>
                    <span className="font-bold text-slate-800 flex-1">{metodo.nombre}</span>
                    <ChevronRight size={18} className="text-slate-300" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PASO 2: Monto recibido / cambio */}
        {paso === 'monto' && metodoActual && (
          <div className="animate-fade-in">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 text-center">
              <p className="text-xs text-slate-500 uppercase font-bold">{lineas.length > 0 ? 'Falta por cubrir' : 'Total'}</p>
              <p className="text-3xl font-black text-slate-900">{currencyCode} {restante.toFixed(2)}</p>
              {lineas.length === 0 && mostrarEquivalente && (
                <p className="text-sm font-bold text-primary-600">≈ {baseCurrencyCode} {totalBase!.toFixed(2)}</p>
              )}
              <p className="text-[11px] text-slate-400 mt-1">Método: {metodoActual.nombre}</p>
            </div>

            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              {esEfectivo ? 'Monto Recibido' : 'Monto a aplicar'}
            </label>
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
              {[restante, restante * 2].filter(m => m > 0).map((m, i) => (
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

            {/* Cambio -- solo tiene sentido para efectivo; en otros métodos no se "entrega de más". */}
            {esEfectivo && (
              <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
                <span className="text-sm font-bold text-emerald-700">Cambio</span>
                <span className="text-xl font-black text-emerald-700">
                  {currencyCode} {Math.max(cambio, 0).toFixed(2)}
                </span>
              </div>
            )}

            {/* Si el monto no cubre lo que falta, muestra cuánto quedaría pendiente. */}
            {restanteTrasLineaActual > 0.01 && montoLineaActual > 0 && (
              <div className={`flex justify-between items-center border rounded-xl px-4 py-3 mb-4 ${
                condicionPago === 'credito' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
              }`}>
                <span className={`text-sm font-bold ${condicionPago === 'credito' ? 'text-amber-700' : 'text-red-700'}`}>
                  {condicionPago === 'credito' ? 'Quedará pendiente' : 'Falta cubrir'}
                </span>
                <span className={`text-lg font-black ${condicionPago === 'credito' ? 'text-amber-700' : 'text-red-700'}`}>
                  {currencyCode} {restanteTrasLineaActual.toFixed(2)}
                </span>
              </div>
            )}

            {/* Referencia de pago -- no aplica a efectivo; sirve para corroborar
                después el Pago Móvil/transferencia/Zelle contra lo registrado. */}
            {!esEfectivo && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  N° de referencia (opcional)
                </label>
                <input
                  type="text"
                  value={referenciaPago}
                  onChange={e => setReferenciaPago(e.target.value)}
                  placeholder="Ej. 000123456789"
                  className="w-full px-4 py-2.5 border-2 rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            )}

            {/* Dividir el pago con otro método -- solo si aún queda algo por cubrir. */}
            {restanteTrasLineaActual > 0.01 && montoLineaActual > 0 && (
              <button
                type="button"
                onClick={handleAgregarOtroMetodo}
                className="w-full mb-4 py-2.5 rounded-xl border-2 border-dashed border-primary-300 text-primary-600 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary-50 transition-colors"
              >
                <Plus size={14} /> Agregar otro método para el resto
              </button>
            )}

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
                disabled={!puedeCobrar || procesando}
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
