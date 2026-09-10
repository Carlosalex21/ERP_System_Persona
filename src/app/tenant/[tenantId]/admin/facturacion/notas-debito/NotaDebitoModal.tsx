"use client";

import { useEffect, type ReactElement } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { Factura, NotaDebito, NotaDebitoRequest } from '@/types/api';
import { createNotaDebito, updateNotaDebito } from '@/services/facturacionService';
import { getApiErrorMessages, parseDecimal, formatCurrency } from '@/utils/helpers';
import { AppModal, ActionButton } from '@/components/ui';

interface NotaDebitoModalProps {
  nota: NotaDebito | null;
  facturas: Factura[];
  onClose: () => void;
  onSaved: () => void;
}

type NotaDebitoFormValues = {
  factura: string;
  monto: string;
  motivo: string;
};

export default function NotaDebitoModal({
  nota,
  facturas,
  onClose,
  onSaved,
}: NotaDebitoModalProps): ReactElement {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<NotaDebitoFormValues>({
    defaultValues: {
      factura: '',
      monto: '',
      motivo: '',
    },
  });

  useEffect(() => {
    if (nota) {
      reset({
        factura: nota.factura ? String(nota.factura) : '',
        monto: nota.total,
        motivo: nota.motivo,
      });
    } else {
      reset({ factura: '', monto: '', motivo: '' });
    }
  }, [nota, reset]);

  const monto = useWatch({ control, name: 'monto' });
  const facturaId = useWatch({ control, name: 'factura' });

  const facturaSeleccionada = facturas.find((f) => f.id === Number(facturaId)) ?? null;

  const ratioIva =
    facturaSeleccionada && parseDecimal(facturaSeleccionada.base_imponible) !== 0
      ? parseDecimal(facturaSeleccionada.iva_total) / parseDecimal(facturaSeleccionada.base_imponible)
      : 0.16;

  const previewBase = parseDecimal(monto);
  const previewIva = previewBase * ratioIva;
  const previewTotal = previewBase + previewIva;

  const onSubmit = async (values: NotaDebitoFormValues) => {
    const payload: NotaDebitoRequest = {
      factura: Number(values.factura),
      monto: String(parseDecimal(values.monto)),
      motivo: values.motivo.trim(),
    };
    try {
      if (nota) {
        await updateNotaDebito(nota.id, payload);
        toast.success('Nota de débito actualizada correctamente.');
      } else {
        await createNotaDebito(payload);
        toast.success('Nota de débito registrada correctamente.');
      }
      onSaved();
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('Error al guardar la nota de débito.');
      }
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={nota ? 'Editar Nota de Débito' : 'Nueva Nota de Débito'}
      icon={<FileText size={20} />}
      size="lg"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton type="submit" loading={isSubmitting} onClick={handleSubmit(onSubmit)}>Guardar</ActionButton>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="nota-debito-factura">
            Factura
          </label>
          <select
            id="nota-debito-factura"
            {...register('factura', { required: 'Selecciona una factura' })}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="">Selecciona una factura...</option>
            {facturas.map((f) => (
              <option key={f.id} value={f.id}>
                #{f.correlativo || f.id} — {f.moneda_codigo || 'base'}{' '}
                {formatCurrency(f.total, f.moneda_codigo || 'USD')}
              </option>
            ))}
          </select>
          {errors.factura && <p className="text-xs text-red-500 mt-1">{errors.factura.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="nota-debito-monto">
            Monto
          </label>
          <input
            id="nota-debito-monto"
            type="number"
            step="0.01"
            min="0"
            {...register('monto', {
              required: 'El monto es obligatorio',
              min: { value: 0.01, message: 'El monto debe ser mayor que 0' },
            })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="0.00"
          />
          {errors.monto && <p className="text-xs text-red-500 mt-1">{errors.monto.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="nota-debito-motivo">
            Motivo
          </label>
          <textarea
            id="nota-debito-motivo"
            rows={3}
            {...register('motivo', { required: 'El motivo es obligatorio' })}
            className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
            placeholder="Describa el motivo de la nota de débito..."
          />
          {errors.motivo && <p className="text-xs text-red-500 mt-1">{errors.motivo.message}</p>}
        </div>

        {/* Previsualización en cliente */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
          <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Previsualización</h4>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Base imponible</span>
            <span className="font-bold text-slate-800">{previewBase.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">IVA ({Math.round(ratioIva * 100)}%)</span>
            <span className="font-bold text-slate-800">{previewIva.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm pt-1 border-t border-slate-200 mt-1">
            <span className="text-slate-500">Total</span>
            <span className="font-black text-primary-700">{previewTotal.toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-slate-400 pt-1">
            * Cálculo orientativo. El backend calcula el desglose autoritativo al guardar.
          </p>
        </div>
      </form>
    </AppModal>
  );
}
