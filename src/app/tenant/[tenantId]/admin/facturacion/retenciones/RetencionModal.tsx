"use client";

import { useEffect, useState, type ReactElement } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ReceiptText } from 'lucide-react';
import toast from 'react-hot-toast';
import { Factura, FacturaCompra, Retencion, RetencionRequest } from '@/types/api';
import { apiPrivada } from '@/services/api';
import { createRetencion, updateRetencion } from '@/services/facturacionService';
import { getFacturasCompra } from '@/services/proveedoresService';
import { parseDecimal, formatCurrency } from '@/utils/helpers';
import { toastApiError } from '@/utils/errors';
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

/**
 * - factura_compra / proveedor: el negocio RETIENE a un proveedor (agente de
 *   retención). El número de comprobante lo genera el sistema (AAAAMM + 8).
 * - factura_venta: un cliente le RETUVO al negocio sobre una venta. El
 *   número es el del comprobante que entregó el cliente.
 */
type Vinculo = 'factura_compra' | 'proveedor' | 'factura_venta';

type RetencionFormValues = {
  vinculo: Vinculo;
  factura: string;
  factura_compra: string;
  proveedor: string;
  numero_comprobante: string;
  tipo_retencion: 'islr' | 'iva' | 'otros';
  porcentaje: string;
  base: string;
  periodo_imposicion: string;
};

const VINCULOS: { value: Vinculo; titulo: string; detalle: string }[] = [
  { value: 'factura_compra', titulo: 'Factura de compra', detalle: 'Le retengo a un proveedor' },
  { value: 'proveedor', titulo: 'Proveedor', detalle: 'Retención sin factura cargada' },
  { value: 'factura_venta', titulo: 'Factura de venta', detalle: 'Un cliente me retuvo' },
];

const VACIO: RetencionFormValues = {
  vinculo: 'factura_compra',
  factura: '',
  factura_compra: '',
  proveedor: '',
  numero_comprobante: '',
  tipo_retencion: 'iva',
  porcentaje: '75',
  base: '',
  periodo_imposicion: '',
};

export default function RetencionModal({ retencion, onClose, onSaved }: RetencionModalProps): ReactElement {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [facturasCompra, setFacturasCompra] = useState<FacturaCompra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  const {
    register, handleSubmit, reset, control, setValue,
    formState: { errors, isSubmitting },
  } = useForm<RetencionFormValues>({ defaultValues: VACIO });

  useEffect(() => {
    (async () => {
      const [ventas, compras, prov] = await Promise.allSettled([
        apiPrivada.get<Factura[]>('/facturacion/lista/'),
        getFacturasCompra({ estado: 'registrada', tipo_documento: 'factura' }),
        apiPrivada.get<Proveedor[]>('/proveedores/proveedores/'),
      ]);
      if (ventas.status === 'fulfilled') setFacturas(ventas.value.data);
      if (compras.status === 'fulfilled') setFacturasCompra(compras.value);
      if (prov.status === 'fulfilled') setProveedores(prov.value.data);
      const fallo = [ventas, compras, prov].find((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (fallo) toastApiError(fallo.reason, 'No se pudieron cargar todas las opciones.');
    })();
  }, []);

  useEffect(() => {
    if (!retencion) {
      reset(VACIO);
      return;
    }
    const vinculo: Vinculo = retencion.factura_compra ? 'factura_compra' : retencion.factura ? 'factura_venta' : 'proveedor';
    reset({
      vinculo,
      factura: retencion.factura ? String(retencion.factura) : '',
      factura_compra: retencion.factura_compra ? String(retencion.factura_compra) : '',
      proveedor: retencion.proveedor ? String(retencion.proveedor) : '',
      numero_comprobante: retencion.numero_comprobante || '',
      tipo_retencion: retencion.tipo_retencion,
      porcentaje: retencion.porcentaje,
      base: retencion.base,
      periodo_imposicion: retencion.periodo_imposicion || '',
    });
  }, [retencion, reset]);

  const vinculo = useWatch({ control, name: 'vinculo' });
  const porcentaje = useWatch({ control, name: 'porcentaje' });
  const base = useWatch({ control, name: 'base' });
  const facturaId = useWatch({ control, name: 'factura' });
  const facturaCompraId = useWatch({ control, name: 'factura_compra' });
  const tipoRetencion = useWatch({ control, name: 'tipo_retencion' });

  // Con factura, la base la define el documento (y el backend la vuelve a
  // fijar igual al guardar -- ver `retencion_service.resolver_base_retencion`):
  // IVA se retiene sobre el IVA de la factura, ISLR sobre su base imponible.
  const facturaVenta = vinculo === 'factura_venta'
    ? facturas.find((f) => String(f.id) === String(facturaId)) ?? null
    : null;
  const facturaCompra = vinculo === 'factura_compra'
    ? facturasCompra.find((f) => String(f.id) === String(facturaCompraId)) ?? null
    : null;
  const baseFijada = facturaVenta !== null || facturaCompra !== null;

  useEffect(() => {
    if (facturaVenta) {
      setValue('base', tipoRetencion === 'iva' ? facturaVenta.iva_total : facturaVenta.base_imponible);
    } else if (facturaCompra) {
      setValue('base', tipoRetencion === 'iva' ? facturaCompra.iva : facturaCompra.base_imponible);
    }
  }, [facturaVenta, facturaCompra, tipoRetencion, setValue]);

  const previewMonto = (parseDecimal(base) * parseDecimal(porcentaje)) / 100;

  const onSubmit = async (values: RetencionFormValues) => {
    const payload: RetencionRequest = {
      factura: values.vinculo === 'factura_venta' && values.factura ? Number(values.factura) : null,
      factura_compra: values.vinculo === 'factura_compra' && values.factura_compra ? Number(values.factura_compra) : null,
      proveedor: values.vinculo === 'proveedor' && values.proveedor ? Number(values.proveedor) : null,
      numero_comprobante: values.vinculo === 'factura_venta' ? values.numero_comprobante.trim() || null : null,
      tipo_retencion: values.tipo_retencion,
      porcentaje: String(parseDecimal(values.porcentaje)),
      base: String(parseDecimal(values.base)),
      periodo_imposicion: values.periodo_imposicion.trim() || null,
    };
    if (!payload.factura && !payload.factura_compra && !payload.proveedor) {
      toast.error('Selecciona a qué documento o proveedor corresponde la retención.');
      return;
    }
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
      toastApiError(error, 'Error al guardar la retención.');
    }
  };

  const campo = 'w-full px-3 py-2 border rounded-lg text-sm bg-white';
  const etiqueta = 'block text-xs font-bold text-slate-500 uppercase mb-1';

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {VINCULOS.map((v) => (
            <label
              key={v.value}
              className={`flex flex-col gap-0.5 p-3 border rounded-lg cursor-pointer transition-colors ${
                vinculo === v.value ? 'bg-primary-50 border-primary-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <input type="radio" value={v.value} {...register('vinculo')} className="hidden" />
              <span className={`text-sm font-bold ${vinculo === v.value ? 'text-primary-700' : 'text-slate-600'}`}>{v.titulo}</span>
              <span className="text-[11px] text-slate-400">{v.detalle}</span>
            </label>
          ))}
        </div>

        {vinculo === 'factura_compra' && (
          <div>
            <label className={etiqueta} htmlFor="retencion-factura-compra">Factura de compra</label>
            <select id="retencion-factura-compra" {...register('factura_compra')} className={campo}>
              <option value="">Selecciona una factura de compra...</option>
              {facturasCompra.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.numero_factura} — {f.proveedor_nombre} — IVA {Number(f.iva).toFixed(2)}
                </option>
              ))}
            </select>
            {facturasCompra.length === 0 && (
              <p className="text-[11px] text-slate-400 mt-1">Registra primero la factura en Compras &gt; Facturas de compra.</p>
            )}
          </div>
        )}

        {vinculo === 'proveedor' && (
          <div>
            <label className={etiqueta} htmlFor="retencion-proveedor">Proveedor</label>
            <select id="retencion-proveedor" {...register('proveedor')} className={campo}>
              <option value="">Selecciona un proveedor...</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.identificador_fiscal ? `(${p.identificador_fiscal})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {vinculo === 'factura_venta' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={etiqueta} htmlFor="retencion-factura">Factura de venta</label>
              <select id="retencion-factura" {...register('factura')} className={campo}>
                <option value="">Selecciona una factura...</option>
                {facturas.map((f) => (
                  <option key={f.id} value={f.id}>
                    #{f.correlativo || f.id} — {formatCurrency(f.total, f.moneda_codigo || 'USD')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={etiqueta} htmlFor="retencion-numero">N° de comprobante del cliente</label>
              <input id="retencion-numero" {...register('numero_comprobante')} className={campo} placeholder="Ej: 20261000000123" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={etiqueta} htmlFor="retencion-tipo">Tipo</label>
            <select id="retencion-tipo" {...register('tipo_retencion', { required: 'Selecciona un tipo' })} className={campo}>
              <option value="iva">IVA</option>
              <option value="islr">ISLR</option>
              <option value="otros">Otros</option>
            </select>
          </div>
          <div>
            <label className={etiqueta} htmlFor="retencion-porcentaje">Porcentaje (%)</label>
            <input
              id="retencion-porcentaje"
              type="number" step="0.01" min="0"
              {...register('porcentaje', {
                required: 'El porcentaje es obligatorio',
                min: { value: 0, message: 'Debe ser mayor o igual a 0' },
              })}
              className={campo}
              placeholder={tipoRetencion === 'iva' ? '75 o 100' : 'Ej: 1, 2, 3'}
            />
            {errors.porcentaje && <p className="text-xs text-red-500 mt-1">{errors.porcentaje.message}</p>}
          </div>
          <div>
            <label className={etiqueta} htmlFor="retencion-base">
              {tipoRetencion === 'iva' ? 'IVA de la factura' : 'Base imponible'}
            </label>
            <input
              id="retencion-base"
              type="number" step="0.01" min="0"
              {...register('base', {
                required: 'La base es obligatoria',
                min: { value: 0.01, message: 'Debe ser mayor que 0' },
              })}
              readOnly={baseFijada}
              className={`${campo} ${baseFijada ? 'bg-slate-50 text-slate-600' : ''}`}
              placeholder="0.00"
            />
            {errors.base && <p className="text-xs text-red-500 mt-1">{errors.base.message}</p>}
          </div>
        </div>
        {baseFijada && (
          <p className="text-[11px] text-slate-400 -mt-2">
            {tipoRetencion === 'iva'
              ? 'La retención de IVA se aplica sobre el impuesto de la factura, no sobre su base.'
              : 'Tomada de la factura seleccionada.'}
          </p>
        )}

        <div>
          <label className={etiqueta} htmlFor="retencion-periodo">Periodo de Imposición</label>
          <input id="retencion-periodo" type="text" {...register('periodo_imposicion')} className={campo} placeholder="Ej: 2026 o 01/2026" />
          <p className="text-[10px] text-slate-400 mt-1">Opcional. El periodo fiscal declarado en el comprobante.</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm text-slate-500">Monto a retener</span>
          <span className="font-black text-primary-700 font-mono text-lg">{previewMonto.toFixed(2)}</span>
        </div>
        <p className="text-[10px] text-slate-400">
          {vinculo === 'factura_venta'
            ? '* Registra el comprobante que te entregó tu cliente.'
            : '* El sistema asigna el N° de comprobante (formato SENIAT AAAAMM + 8 dígitos) y, si es sobre una factura de compra, rebaja lo que le debes al proveedor.'}
        </p>
      </form>
    </AppModal>
  );
}
