"use client";

import { useEffect, useState, type ReactElement } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ReceiptText } from 'lucide-react';
import toast from 'react-hot-toast';
import { Factura, Retencion, RetencionRequest } from '@/types/api';
import { apiPrivada } from '@/services/api';
import { createRetencion, updateRetencion } from '@/services/facturacionService';
import { getApiErrorMessages, parseDecimal, formatCurrency } from '@/utils/helpers';
import { AppModal, ActionButton } from '@/components/ui';

interface Proveedor {
  id: number;
  nombre: string;
  identificador_fiscal?: string | null;
}

interface RetencionModalProps {
  retencion: Retencion | null;
  onClose: () => void;
  onSaved: () => void;
}

type RetencionFormValues = {
  vinculo: 'factura' | 'proveedor';
  factura: string;
  proveedor: string;
  tipo_retencion: 'islr' | 'iva' | 'otros';
  porcentaje: string;
  base: string;
  periodo_imposicion: string;
};

export default function RetencionModal({
  retencion,
  onClose,
  onSaved,
}: RetencionModalProps): ReactElement {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RetencionFormValues>({
    defaultValues: {
      vinculo: 'factura',
      factura: '',
      proveedor: '',
      tipo_retencion: 'islr',
      porcentaje: '',
      base: '',
      periodo_imposicion: '',
    },
  });

  useEffect(() => {
    const cargarOpciones = async () => {
      try {
        const [facturasRes, proveedoresRes] = await Promise.allSettled([
          apiPrivada.get<Factura[]>('/facturacion/lista/'),
          apiPrivada.get<Proveedor[]>('/proveedores/proveedores/'),
        ]);
        if (facturasRes.status === 'fulfilled') setFacturas(facturasRes.value.data);
        if (proveedoresRes.status === 'fulfilled') setProveedores(proveedoresRes.value.data);
        const fallo = [facturasRes, proveedoresRes].find(
          (r): r is PromiseRejectedResult => r.status === 'rejected',
        );
        if (fallo) {
          const messages = getApiErrorMessages(fallo.reason);
          if (messages.length > 0) {
            messages.forEach((msg) => toast.error(msg));
          }
        }
      } catch (error) {
        const messages = getApiErrorMessages(error);
        if (messages.length > 0) {
          messages.forEach((msg) => toast.error(msg));
        }
      }
    };
    cargarOpciones();
  }, []);

  useEffect(() => {
    if (retencion) {
      const vinculo = retencion.factura ? 'factura' : retencion.proveedor ? 'proveedor' : 'factura';
      reset({
        vinculo,
        factura: retencion.factura ? String(retencion.factura) : '',
        proveedor: retencion.proveedor ? String(retencion.proveedor) : '',
        tipo_retencion: retencion.tipo_retencion,
        porcentaje: retencion.porcentaje,
        base: retencion.base,
        periodo_imposicion: retencion.periodo_imposicion || '',
      });
    } else {
      reset({
        vinculo: 'factura',
        factura: '',
        proveedor: '',
        tipo_retencion: 'islr',
        porcentaje: '',
        base: '',
        periodo_imposicion: '',
      });
    }
  }, [retencion, reset]);

  const vinculo = useWatch({ control, name: 'vinculo' });
  const porcentaje = useWatch({ control, name: 'porcentaje' });
  const base = useWatch({ control, name: 'base' });
  const facturaId = useWatch({ control, name: 'factura' });
  const tipoRetencion = useWatch({ control, name: 'tipo_retencion' });

  // Con factura, la base la define el documento (y el backend la vuelve a
  // fijar igual al guardar -- ver `retencion_service.resolver_base_retencion`):
  // IVA se retiene sobre el IVA de la factura, ISLR sobre su base imponible.
  const facturaSeleccionada = vinculo === 'factura'
    ? facturas.find((f) => String(f.id) === String(facturaId)) ?? null
    : null;
  const baseFijadaPorFactura = facturaSeleccionada !== null;

  useEffect(() => {
    if (!facturaSeleccionada) return;
    setValue('base', tipoRetencion === 'iva' ? facturaSeleccionada.iva_total : facturaSeleccionada.base_imponible);
  }, [facturaSeleccionada, tipoRetencion, setValue]);

  const previewMonto = (parseDecimal(base) * parseDecimal(porcentaje)) / 100;

  const onSubmit = async (values: RetencionFormValues) => {
    const payload: RetencionRequest = {
      factura: values.vinculo === 'factura' && values.factura ? Number(values.factura) : null,
      proveedor: values.vinculo === 'proveedor' && values.proveedor ? Number(values.proveedor) : null,
      tipo_retencion: values.tipo_retencion,
      porcentaje: String(parseDecimal(values.porcentaje)),
      base: String(parseDecimal(values.base)),
      periodo_imposicion: values.periodo_imposicion.trim() || null,
    };
    try {
      if (retencion) {
        await updateRetencion(retencion.id, payload);
        toast.success('Retención actualizada correctamente.');
      } else {
        await createRetencion(payload);
        toast.success('Retención registrada correctamente.');
      }
      onSaved();
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('Error al guardar la retención.');
      }
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={retencion ? 'Editar Retención' : 'Nueva Retención'}
      icon={<ReceiptText size={20} />}
      size="lg"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton type="submit" loading={isSubmitting} onClick={handleSubmit(onSubmit)}>Guardar</ActionButton>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label
            className={`flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer text-sm font-bold transition-colors ${
              vinculo === 'factura'
                ? 'bg-primary-50 text-primary-700 border-primary-300'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            <input type="radio" value="factura" {...register('vinculo')} className="hidden" />
            Factura
          </label>
          <label
            className={`flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer text-sm font-bold transition-colors ${
              vinculo === 'proveedor'
                ? 'bg-primary-50 text-primary-700 border-primary-300'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            <input type="radio" value="proveedor" {...register('vinculo')} className="hidden" />
            Proveedor
          </label>
        </div>

        {vinculo === 'factura' && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="retencion-factura">
              Factura
            </label>
            <select
              id="retencion-factura"
              {...register('factura')}
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
          </div>
        )}

        {vinculo === 'proveedor' && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="retencion-proveedor">
              Proveedor
            </label>
            <select
              id="retencion-proveedor"
              {...register('proveedor')}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
            >
              <option value="">Selecciona un proveedor...</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.identificador_fiscal ? `(${p.identificador_fiscal})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="retencion-tipo">
            Tipo de Retención
          </label>
          <select
            id="retencion-tipo"
            {...register('tipo_retencion', { required: 'Selecciona un tipo' })}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="islr">ISLR</option>
            <option value="iva">IVA</option>
            <option value="otros">Otros</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="retencion-porcentaje">
              Porcentaje (%)
            </label>
            <input
              id="retencion-porcentaje"
              type="number"
              step="0.01"
              min="0"
              {...register('porcentaje', {
                required: 'El porcentaje es obligatorio',
                min: { value: 0, message: 'Debe ser mayor o igual a 0' },
              })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Ej: 2, 75 o 100"
            />
            {/* Sin `max`: algunas retenciones (ej. IVA especial) son del 75% o
                100% -- un tope de 100 en el input HTML bloqueaba escribir esos
                valores válidos antes de que el usuario terminara de tipear. */}
            {errors.porcentaje && (
              <p className="text-xs text-red-500 mt-1">{errors.porcentaje.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="retencion-base">
              {tipoRetencion === 'iva' ? 'IVA de la factura' : 'Base imponible'}
            </label>
            <input
              id="retencion-base"
              type="number"
              step="0.01"
              min="0"
              {...register('base', {
                required: 'La base es obligatoria',
                min: { value: 0.01, message: 'Debe ser mayor que 0' },
              })}
              readOnly={baseFijadaPorFactura}
              className={`w-full px-3 py-2 border rounded-lg text-sm ${baseFijadaPorFactura ? 'bg-slate-50 text-slate-600' : ''}`}
              placeholder="0.00"
            />
            {baseFijadaPorFactura && (
              <p className="text-[11px] text-slate-400 mt-1">
                {tipoRetencion === 'iva'
                  ? 'La retención de IVA se aplica sobre el impuesto de la factura, no sobre su base.'
                  : 'Tomada de la factura seleccionada.'}
              </p>
            )}
            {errors.base && <p className="text-xs text-red-500 mt-1">{errors.base.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="retencion-periodo">
            Periodo de Imposición
          </label>
          <input
            id="retencion-periodo"
            type="text"
            {...register('periodo_imposicion')}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="Ej: 2026 o 01/2026"
          />
          <p className="text-[10px] text-slate-400 mt-1">Opcional. El periodo fiscal que declara el proveedor en su comprobante.</p>
        </div>

        {/* Previsualización del monto */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm text-slate-500">Monto estimado</span>
          <span className="font-black text-primary-700 font-mono text-lg">
            {previewMonto.toFixed(2)}
          </span>
        </div>
        <p className="text-[10px] text-slate-400">
          * El backend genera el número de comprobante y confirma el monto autoritativamente.
        </p>
      </form>
    </AppModal>
  );
}
