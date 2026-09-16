"use client";

import { useEffect, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Proveedor, ProveedorRequest } from '@/types/api';
import { createProveedor, updateProveedor } from '@/services/proveedoresService';
import { getApiErrorMessages } from '@/utils/helpers';
import { AppModal, ActionButton } from '@/components/ui';

interface ProveedorModalProps {
  proveedor: Proveedor | null;
  onClose: () => void;
  onSaved: () => void;
}

type ProveedorFormValues = {
  identificador_fiscal: string;
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  plazo_pago: string;
  es_contribuyente_especial: boolean;
  activo: boolean;
};

export default function ProveedorModal({ proveedor, onClose, onSaved }: ProveedorModalProps): ReactElement {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProveedorFormValues>({
    defaultValues: {
      identificador_fiscal: '',
      nombre: '',
      direccion: '',
      telefono: '',
      email: '',
      plazo_pago: '',
      es_contribuyente_especial: false,
      activo: true,
    },
  });

  useEffect(() => {
    if (proveedor) {
      reset({
        identificador_fiscal: proveedor.identificador_fiscal,
        nombre: proveedor.nombre,
        direccion: proveedor.direccion,
        telefono: proveedor.telefono ?? '',
        email: proveedor.email,
        plazo_pago: proveedor.plazo_pago != null ? String(proveedor.plazo_pago) : '',
        es_contribuyente_especial: proveedor.es_contribuyente_especial,
        activo: proveedor.activo,
      });
    } else {
      reset({
        identificador_fiscal: '',
        nombre: '',
        direccion: '',
        telefono: '',
        email: '',
        plazo_pago: '',
        es_contribuyente_especial: false,
        activo: true,
      });
    }
  }, [proveedor, reset]);

  const onSubmit = async (values: ProveedorFormValues) => {
    const payload: ProveedorRequest = {
      identificador_fiscal: values.identificador_fiscal.trim(),
      nombre: values.nombre.trim(),
      direccion: values.direccion.trim(),
      telefono: values.telefono.trim() || null,
      email: values.email.trim(),
      plazo_pago: values.plazo_pago ? Number(values.plazo_pago) : null,
      es_contribuyente_especial: values.es_contribuyente_especial,
      activo: values.activo,
    };
    try {
      if (proveedor) {
        await updateProveedor(proveedor.id, payload);
        toast.success('Proveedor actualizado correctamente.');
      } else {
        await createProveedor(payload);
        toast.success('Proveedor creado correctamente.');
      }
      onSaved();
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('Error al guardar el proveedor.');
      }
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
      icon={<Truck size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton type="submit" loading={isSubmitting} onClick={handleSubmit(onSubmit)}>Guardar</ActionButton>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="prov-nombre">
              Nombre / Razón Social
            </label>
            <input
              id="prov-nombre"
              {...register('nombre', { required: 'El nombre es obligatorio' })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Distribuidora XYZ, C.A."
            />
            {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="prov-rif">
              RIF / Identificador Fiscal
            </label>
            <input
              id="prov-rif"
              maxLength={10}
              {...register('identificador_fiscal', {
                required: 'El identificador fiscal es obligatorio',
                maxLength: { value: 10, message: 'Máximo 10 caracteres (sin guiones), ej: J123456789' },
              })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="J123456789"
            />
            {errors.identificador_fiscal && (
              <p className="text-xs text-red-500 mt-1">{errors.identificador_fiscal.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="prov-direccion">
            Dirección
          </label>
          <textarea
            id="prov-direccion"
            {...register('direccion', { required: 'La dirección es obligatoria' })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            rows={2}
            placeholder="Dirección fiscal del proveedor"
          />
          {errors.direccion && <p className="text-xs text-red-500 mt-1">{errors.direccion.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="prov-email">
              Email
            </label>
            <input
              id="prov-email"
              type="email"
              {...register('email', { required: 'El email es obligatorio' })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="contacto@proveedor.com"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="prov-telefono">
              Teléfono
            </label>
            <input
              id="prov-telefono"
              {...register('telefono')}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="0414-1234567"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="prov-plazo">
              Plazo de pago (días)
            </label>
            <input
              id="prov-plazo"
              type="number"
              min="0"
              {...register('plazo_pago')}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="30"
            />
          </div>
          <label className="flex items-center gap-3 p-3 bg-slate-50 border rounded-lg cursor-pointer self-end">
            <input type="checkbox" {...register('activo')} className="w-5 h-5 accent-primary-600" />
            <span className="text-sm font-semibold text-slate-700">Activo</span>
          </label>
        </div>

        <label className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer">
          <input type="checkbox" {...register('es_contribuyente_especial')} className="w-5 h-5 accent-amber-600 mt-0.5" />
          <span>
            <span className="block text-sm font-semibold text-slate-700">Contribuyente Especial (SENIAT)</span>
            <span className="block text-xs text-slate-500 mt-0.5">Marca esto si el proveedor fue designado como Contribuyente Especial -- aplica un porcentaje de retención de IVA distinto.</span>
          </span>
        </label>
      </form>
    </AppModal>
  );
}
