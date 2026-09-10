"use client";

import { useEffect, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Coins } from 'lucide-react';
import toast from 'react-hot-toast';
import { Moneda, MonedaRequest } from '@/types/api';
import { createMoneda, updateMoneda } from '@/services/configuracionService';
import { getApiErrorMessages } from '@/utils/helpers';
import { AppModal, ActionButton } from '@/components/ui';

interface MonedaModalProps {
  moneda: Moneda | null;
  onClose: () => void;
  onSaved: () => void;
}

type MonedaFormValues = {
  codigo: string;
  nombre: string;
  simbolo: string;
  es_predeterminada: boolean;
  activa: boolean;
};

export default function MonedaModal({ moneda, onClose, onSaved }: MonedaModalProps): ReactElement {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MonedaFormValues>({
    defaultValues: {
      codigo: '',
      nombre: '',
      simbolo: '',
      es_predeterminada: false,
      activa: true,
    },
  });

  useEffect(() => {
    if (moneda) {
      reset({
        codigo: moneda.codigo,
        nombre: moneda.nombre,
        simbolo: moneda.simbolo ?? '',
        es_predeterminada: moneda.es_predeterminada,
        activa: moneda.activa,
      });
    } else {
      reset({ codigo: '', nombre: '', simbolo: '', es_predeterminada: false, activa: true });
    }
  }, [moneda, reset]);

  const onSubmit = async (values: MonedaFormValues) => {
    const payload: MonedaRequest = {
      codigo: values.codigo.trim().toUpperCase(),
      nombre: values.nombre.trim(),
      simbolo: values.simbolo.trim() || null,
      es_predeterminada: values.es_predeterminada,
      activa: values.activa,
    };
    try {
      if (moneda) {
        await updateMoneda(moneda.id, payload);
        toast.success('Moneda actualizada correctamente.');
      } else {
        await createMoneda(payload);
        toast.success('Moneda creada correctamente.');
      }
      onSaved();
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('Error al guardar la moneda.');
      }
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={moneda ? 'Editar Moneda' : 'Nueva Moneda'}
      icon={<Coins size={20} />}
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
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="moneda-codigo">
            Código ISO 4217
          </label>
          <input
            id="moneda-codigo"
            {...register('codigo', {
              required: 'El código es obligatorio',
              maxLength: { value: 3, message: 'Máximo 3 caracteres' },
            })}
            className="w-full px-3 py-2 border rounded-lg text-sm uppercase"
            placeholder="VES, USD, EUR..."
          />
          {errors.codigo && <p className="text-xs text-red-500 mt-1">{errors.codigo.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="moneda-nombre">
            Nombre
          </label>
          <input
            id="moneda-nombre"
            {...register('nombre', { required: 'El nombre es obligatorio' })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="Bolívar, Dólar..."
          />
          {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="moneda-simbolo">
            Símbolo
          </label>
          <input
            id="moneda-simbolo"
            {...register('simbolo')}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="Bs., $..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-3 bg-slate-50 border rounded-lg cursor-pointer">
            <input type="checkbox" {...register('es_predeterminada')} className="w-5 h-5 accent-primary-600" />
            <span className="text-sm font-semibold text-slate-700">Moneda base</span>
          </label>
          <label className="flex items-center gap-3 p-3 bg-slate-50 border rounded-lg cursor-pointer">
            <input type="checkbox" {...register('activa')} className="w-5 h-5 accent-primary-600" />
            <span className="text-sm font-semibold text-slate-700">Activa</span>
          </label>
        </div>
      </form>
    </AppModal>
  );
}
