"use client";

import { useEffect, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Repeat } from 'lucide-react';
import toast from 'react-hot-toast';
import { Moneda, TasaCambio, TasaCambioRequest } from '@/types/api';
import { createTasaCambio, updateTasaCambio } from '@/services/configuracionService';
import { getApiErrorMessages, parseDecimal } from '@/utils/helpers';
import { AppModal, ActionButton } from '@/components/ui';

interface TasaCambioModalProps {
  tasa: TasaCambio | null;
  monedas: Moneda[];
  onClose: () => void;
  onSaved: () => void;
}

type TasaCambioFormValues = {
  moneda: string;
  tasa: string;
  fuente: string;
  activa: boolean;
};

export default function TasaCambioModal({
  tasa,
  monedas,
  onClose,
  onSaved,
}: TasaCambioModalProps): ReactElement {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TasaCambioFormValues>({
    defaultValues: {
      moneda: '',
      tasa: '',
      fuente: '',
      activa: true,
    },
  });

  useEffect(() => {
    if (tasa) {
      reset({
        moneda: String(tasa.moneda),
        tasa: tasa.tasa,
        fuente: tasa.fuente ?? '',
        activa: tasa.activa,
      });
    } else {
      reset({ moneda: '', tasa: '', fuente: '', activa: true });
    }
  }, [tasa, reset]);

  const onSubmit = async (values: TasaCambioFormValues) => {
    const payload: TasaCambioRequest = {
      moneda: Number(values.moneda),
      tasa: String(parseDecimal(values.tasa)),
      fuente: values.fuente.trim() || null,
      activa: values.activa,
    };
    try {
      if (tasa) {
        await updateTasaCambio(tasa.id, payload);
        toast.success('Tasa de cambio actualizada correctamente.');
      } else {
        await createTasaCambio(payload);
        toast.success('Tasa de cambio registrada correctamente.');
      }
      onSaved();
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('Error al guardar la tasa de cambio.');
      }
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={tasa ? 'Editar Tasa de Cambio' : 'Nueva Tasa de Cambio'}
      icon={<Repeat size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton type="submit" loading={isSubmitting} onClick={handleSubmit(onSubmit)}>Guardar</ActionButton>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="tasa-moneda">
            Moneda
          </label>
          <select
            id="tasa-moneda"
            {...register('moneda', { required: 'Selecciona una moneda' })}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="">Selecciona una moneda...</option>
            {monedas
              .filter((m) => !m.es_predeterminada)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.codigo} — {m.nombre}
                </option>
              ))}
          </select>
          {errors.moneda && <p className="text-xs text-red-500 mt-1">{errors.moneda.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="tasa-valor">
            Tasa (1 unidad = X en moneda base)
          </label>
          <input
            id="tasa-valor"
            type="number"
            step="0.000001"
            min="0"
            {...register('tasa', {
              required: 'La tasa es obligatoria',
              min: { value: 0.000001, message: 'La tasa debe ser mayor que 0' },
            })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="Ej: 36.50"
          />
          {errors.tasa && <p className="text-xs text-red-500 mt-1">{errors.tasa.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="tasa-fuente">
            Fuente
          </label>
          <input
            id="tasa-fuente"
            {...register('fuente')}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="BCV, Oficial, Libre..."
          />
        </div>

        <label className="flex items-center gap-3 p-3 bg-slate-50 border rounded-lg cursor-pointer">
          <input type="checkbox" {...register('activa')} className="w-5 h-5 accent-primary-600" />
          <span className="text-sm font-semibold text-slate-700">Tasa vigente</span>
        </label>
      </form>
    </AppModal>
  );
}
