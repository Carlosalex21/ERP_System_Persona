"use client";

import { type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { ReceiptText } from 'lucide-react';
import toast from 'react-hot-toast';
import { IvaRequest } from '@/types/api';
import { createIvaConfig } from '@/services/configuracionService';
import { getApiErrorMessages } from '@/utils/helpers';
import { AppModal, ActionButton } from '@/components/ui';

interface IvaModalProps {
  onClose: () => void;
  onSaved: () => void;
}

type IvaFormValues = {
  nombre: string;
  porcentaje_iva: string;
  activo: boolean;
};

export default function IvaModal({ onClose, onSaved }: IvaModalProps): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IvaFormValues>({
    defaultValues: { nombre: '', porcentaje_iva: '', activo: true },
  });

  const onSubmit = async (values: IvaFormValues) => {
    const payload: IvaRequest = {
      nombre: values.nombre.trim(),
      porcentaje_iva: values.porcentaje_iva,
      activo: values.activo,
    };
    try {
      await createIvaConfig(payload);
      toast.success('Tipo de IVA creado correctamente.');
      onSaved();
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('Error al crear el tipo de IVA.');
      }
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Nuevo Tipo de IVA"
      icon={<ReceiptText size={20} />}
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
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="iva-nombre">
            Nombre
          </label>
          <input
            id="iva-nombre"
            {...register('nombre', { required: 'El nombre es obligatorio' })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="General, Reducido, Exento..."
          />
          {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="iva-porcentaje">
            Porcentaje (%)
          </label>
          <input
            id="iva-porcentaje"
            type="number"
            step="0.01"
            min="0"
            max="100"
            {...register('porcentaje_iva', { required: 'El porcentaje es obligatorio' })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="16.00"
          />
          {errors.porcentaje_iva && <p className="text-xs text-red-500 mt-1">{errors.porcentaje_iva.message}</p>}
        </div>

        <label className="flex items-center gap-3 p-3 bg-slate-50 border rounded-lg cursor-pointer">
          <input type="checkbox" {...register('activo')} className="w-5 h-5 accent-primary-600" />
          <span className="text-sm font-semibold text-slate-700">Activo</span>
        </label>
      </form>
    </AppModal>
  );
}
