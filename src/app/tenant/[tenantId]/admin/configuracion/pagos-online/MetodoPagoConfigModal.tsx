"use client";

import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Smartphone, Mail, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { MetodoPagoConfig } from '@/types/api';
import { getProtocol } from '@/utils/tenantUrl';
import {
  createMetodoPagoConfig,
  createPagoMovilConfig,
  createZelleConfig,
  createStripeConfig,
  updateMetodoPagoConfig,
  updatePagoMovilConfig,
  updateZelleConfig,
  updateStripeConfig,
} from '@/services/pagosOnlineService';
import { getApiErrorMessages } from '@/utils/helpers';
import { AppModal, ActionButton } from '@/components/ui';

interface MetodoPagoConfigModalProps {
  metodo: MetodoPagoConfig | null;
  onClose: () => void;
  onSaved: () => void;
}

type Tipo = 'pago_movil' | 'zelle' | 'stripe';

type FormValues = {
  nombre: string;
  instrucciones: string;
  activo: boolean;
  banco: string;
  cedula: string;
  telefono: string;
  email_zelle: string;
  nombre_beneficiario: string;
  publishable_key: string;
  secret_key: string;
  webhook_secret: string;
  moneda: string;
};

function tipoInicial(metodo: MetodoPagoConfig | null): Tipo {
  if (metodo?.zelle_config) return 'zelle';
  if (metodo?.stripe_config) return 'stripe';
  return 'pago_movil';
}

const NOMBRES_POR_DEFECTO = ['Pago Móvil', 'Zelle', 'Tarjeta (internacional)'];

export default function MetodoPagoConfigModal({ metodo, onClose, onSaved }: MetodoPagoConfigModalProps): ReactElement {
  const [tipo, setTipo] = useState<Tipo>(tipoInicial(metodo));
  // El webhook lo llama Stripe directamente al backend, no al frontend --
  // se arma con el mismo subdominio del tenant que ya se está viendo en el
  // panel. En producción el backend vive detrás del mismo host (el reverse
  // proxy enruta `/api/` hacia él, ver `NEXT_PUBLIC_API_SAME_ORIGIN`), sin
  // el puerto `:8000` de desarrollo.
  const webhookUrl = typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_SAME_ORIGIN === 'true'
      ? `${getProtocol()}://${window.location.hostname}/api/v1/public/pagos/stripe/webhook/`
      : `http://${window.location.hostname}:8000/api/v1/public/pagos/stripe/webhook/`
    : '';

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      nombre: metodo?.nombre || (tipo === 'zelle' ? 'Zelle' : tipo === 'stripe' ? 'Tarjeta (internacional)' : 'Pago Móvil'),
      instrucciones: metodo?.instrucciones || '',
      activo: metodo?.activo ?? true,
      banco: metodo?.pago_movil_config?.banco || '',
      cedula: metodo?.pago_movil_config?.cedula || '',
      telefono: metodo?.pago_movil_config?.telefono || '',
      email_zelle: metodo?.zelle_config?.email_zelle || '',
      nombre_beneficiario: metodo?.zelle_config?.nombre_beneficiario || '',
      publishable_key: metodo?.stripe_config?.publishable_key || '',
      secret_key: '',
      webhook_secret: '',
      moneda: metodo?.stripe_config?.moneda || 'usd',
    },
  });

  // Al cambiar de tipo en un método nuevo, actualiza el nombre sugerido --
  // pero solo si el admin no escribió ya algo propio (si no, un cambio de
  // tipo le borraría lo que tecleó).
  const cambiarTipo = (nuevoTipo: Tipo) => {
    const actual = getValues('nombre');
    if (!actual || NOMBRES_POR_DEFECTO.includes(actual)) {
      setValue('nombre', nuevoTipo === 'zelle' ? 'Zelle' : nuevoTipo === 'stripe' ? 'Tarjeta (internacional)' : 'Pago Móvil');
    }
    setTipo(nuevoTipo);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (metodo) {
        // Edición: actualiza la config base y la sub-config existente.
        await updateMetodoPagoConfig(metodo.id, {
          nombre: values.nombre,
          instrucciones: values.instrucciones,
          activo: values.activo,
          es_manual: tipo !== 'stripe',
        });
        if (tipo === 'pago_movil' && metodo.pago_movil_config) {
          await updatePagoMovilConfig(metodo.pago_movil_config.id, {
            banco: values.banco,
            cedula: values.cedula,
            telefono: values.telefono,
          });
        } else if (tipo === 'zelle' && metodo.zelle_config) {
          await updateZelleConfig(metodo.zelle_config.id, {
            email_zelle: values.email_zelle,
            nombre_beneficiario: values.nombre_beneficiario,
          });
        } else if (tipo === 'stripe' && metodo.stripe_config) {
          // secret_key/webhook_secret solo se envían si el admin escribió
          // algo nuevo -- si los deja vacíos, se conservan los ya guardados
          // (nunca se muestran de vuelta, así que no hay nada que "editar").
          await updateStripeConfig(metodo.stripe_config.id, {
            publishable_key: values.publishable_key,
            moneda: values.moneda,
            ...(values.secret_key ? { secret_key: values.secret_key } : {}),
            ...(values.webhook_secret ? { webhook_secret: values.webhook_secret } : {}),
          });
        }
        toast.success('Método de pago actualizado.');
      } else {
        // Creación: primero la config base, luego la sub-config específica
        // enlazada por su ID (son dos recursos separados en el backend).
        const nuevo = await createMetodoPagoConfig({
          nombre: values.nombre,
          instrucciones: values.instrucciones,
          activo: values.activo,
          es_manual: tipo !== 'stripe',
        });
        if (tipo === 'pago_movil') {
          await createPagoMovilConfig({
            metodo_pago: nuevo.id,
            banco: values.banco,
            cedula: values.cedula,
            telefono: values.telefono,
          });
        } else if (tipo === 'zelle') {
          await createZelleConfig({
            metodo_pago: nuevo.id,
            email_zelle: values.email_zelle,
            nombre_beneficiario: values.nombre_beneficiario,
          });
        } else {
          await createStripeConfig({
            metodo_pago: nuevo.id,
            publishable_key: values.publishable_key,
            secret_key: values.secret_key,
            webhook_secret: values.webhook_secret,
            moneda: values.moneda,
          });
        }
        toast.success('Método de pago creado.');
      }
      onSaved();
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('No se pudo guardar el método de pago.');
      }
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={metodo ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
      icon={tipo === 'zelle' ? <Mail size={20} /> : tipo === 'stripe' ? <CreditCard size={20} /> : <Smartphone size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton type="submit" loading={isSubmitting} onClick={handleSubmit(onSubmit)}>Guardar</ActionButton>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
        {!metodo && (
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => cambiarTipo('pago_movil')}
              className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 font-bold text-xs transition-colors ${
                tipo === 'pago_movil' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500'
              }`}
            >
              <Smartphone size={16} /> Pago Móvil
            </button>
            <button
              type="button"
              onClick={() => cambiarTipo('zelle')}
              className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 font-bold text-xs transition-colors ${
                tipo === 'zelle' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500'
              }`}
            >
              <Mail size={16} /> Zelle
            </button>
            <button
              type="button"
              onClick={() => cambiarTipo('stripe')}
              className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 font-bold text-xs transition-colors ${
                tipo === 'stripe' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500'
              }`}
            >
              <CreditCard size={16} /> Tarjeta (Stripe)
            </button>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="mp-nombre">
            Nombre visible para el cliente
          </label>
          <input
            id="mp-nombre"
            {...register('nombre', { required: 'El nombre es obligatorio' })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder={tipo === 'zelle' ? 'Zelle' : tipo === 'stripe' ? 'Tarjeta (internacional)' : 'Pago Móvil Banesco'}
          />
          {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
        </div>

        {tipo === 'pago_movil' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="mp-banco">Banco</label>
              <input id="mp-banco" {...register('banco', { required: true })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Banesco" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="mp-cedula">Cédula/RIF</label>
              <input id="mp-cedula" {...register('cedula', { required: true })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="V-12345678" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="mp-telefono">Teléfono</label>
              <input id="mp-telefono" {...register('telefono', { required: true })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="0414-1234567" />
            </div>
          </div>
        )}

        {tipo === 'zelle' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="mp-email">Email de Zelle</label>
              <input id="mp-email" type="email" {...register('email_zelle', { required: true })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="pagos@tunegocio.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="mp-beneficiario">Nombre del beneficiario</label>
              <input id="mp-beneficiario" {...register('nombre_beneficiario', { required: true })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Nombre completo" />
            </div>
          </div>
        )}

        {tipo === 'stripe' && (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              Necesitas una cuenta de Stripe propia. Copia estas claves desde{' '}
              <span className="font-mono">dashboard.stripe.com/apikeys</span>. Empieza con tus claves de{' '}
              <strong>test</strong> (sk_test_/pk_test_) para probar sin cobrar de verdad.
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="mp-pk">Publishable Key</label>
              <input id="mp-pk" {...register('publishable_key', { required: true })} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" placeholder="pk_test_..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="mp-sk">
                Secret Key {metodo?.stripe_config?.tiene_secret_key && <span className="text-green-600 normal-case">(ya configurada — deja en blanco para no cambiarla)</span>}
              </label>
              <input
                id="mp-sk"
                type="password"
                {...register('secret_key', { required: !metodo?.stripe_config?.tiene_secret_key })}
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                placeholder="sk_test_..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="mp-whsec">
                Webhook Signing Secret (opcional, para confirmar pagos automático)
              </label>
              <input id="mp-whsec" type="password" {...register('webhook_secret')} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" placeholder="whsec_..." />
              <p className="text-[11px] text-slate-400 mt-1">
                Créalo en Stripe Dashboard → Developers → Webhooks → &ldquo;Add endpoint&rdquo;, con esta URL
                (evento a escuchar: <span className="font-mono">checkout.session.completed</span>):
              </p>
              <p className="text-[11px] font-mono bg-slate-100 rounded px-2 py-1 mt-1 break-all select-all">
                {webhookUrl}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                (Esta URL es para desarrollo local. En producción, usa tu dominio real en vez de localhost.)
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="mp-moneda">Moneda</label>
              <select id="mp-moneda" {...register('moneda')} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                <option value="usd">USD — Dólar</option>
                <option value="eur">EUR — Euro</option>
                <option value="cop">COP — Peso Colombiano</option>
                <option value="pen">PEN — Sol Peruano</option>
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="mp-instrucciones">
            Instrucciones adicionales (opcional)
          </label>
          <textarea
            id="mp-instrucciones"
            {...register('instrucciones')}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            rows={2}
            placeholder="Ej: envía el comprobante por WhatsApp al confirmar tu pedido."
          />
        </div>

        <label className="flex items-center gap-3 p-3 bg-slate-50 border rounded-lg cursor-pointer">
          <input type="checkbox" {...register('activo')} className="w-5 h-5 accent-primary-600" />
          <span className="text-sm font-semibold text-slate-700">Visible en el catálogo público</span>
        </label>
      </form>
    </AppModal>
  );
}
