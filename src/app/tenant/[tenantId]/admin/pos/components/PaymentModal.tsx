"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { X, Loader2, CreditCard } from 'lucide-react';
import { useNotify } from '@/hooks/useNotify';
import { MetodoPago } from '@/types/api';
import { getMetodosDePago } from '@/services/facturacionService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinalize: (paymentMethodId: number) => void;
  totalAmount: number;
}

/**
 * Modal para seleccionar el método de pago y finalizar la venta.
 * @param {PaymentModalProps} props - Propiedades para controlar el modal.
 * @returns {ReactElement | null} El componente del modal de pago.
 */
export default function PaymentModal({ isOpen, onClose, onFinalize, totalAmount }: PaymentModalProps): ReactElement | null {
  const notify = useNotify();
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<MetodoPago[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchPaymentMethods = async () => {
        try {
          setLoading(true);
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
  }, [isOpen]);

  const handleFinalizeClick = () => {
    if (selectedMethod) {
      onFinalize(selectedMethod);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-scale-in">
        <div className="bg-primary-900 p-4 text-white flex justify-between items-center">
          <h3 className="font-bold">Finalizar Venta</h3>
          <button onClick={onClose} className="hover:text-primary-200"><X size={20}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-slate-500">Total a Pagar</p>
            <p className="text-4xl font-black text-slate-900">${totalAmount.toFixed(2)}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Método de Pago</label>
            {loading ? (
              <div className="flex items-center justify-center h-24 text-slate-400"><Loader2 className="animate-spin" /></div>
            ) : (
              <div className="space-y-2">
                {paymentMethods.map(method => (
                  <button key={method.id} onClick={() => setSelectedMethod(method.id)} className={`w-full text-left p-3 border rounded-lg flex items-center gap-3 transition-all ${selectedMethod === method.id ? 'bg-primary-50 border-primary-500 ring-2 ring-primary-300' : 'hover:bg-slate-50'}`}>
                    <CreditCard size={20} className={selectedMethod === method.id ? 'text-primary-600' : 'text-slate-400'} />
                    <span className="font-semibold">{method.nombre}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-6 pt-4 border-t flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 bg-slate-100 rounded-lg">Cancelar</button>
            <button onClick={handleFinalizeClick} disabled={!selectedMethod || loading} className="px-6 py-2 text-sm font-bold text-white bg-primary-600 rounded-lg flex items-center gap-2 disabled:bg-slate-300">
              Finalizar Venta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}