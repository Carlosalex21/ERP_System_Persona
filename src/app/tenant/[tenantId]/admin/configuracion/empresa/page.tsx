"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Building2, Loader2, ImagePlus, Save, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getConfiguracionEmpresa, updateConfiguracionEmpresa } from '@/services/configuracionService';
import { getApiErrorMessages } from '@/utils/helpers';
import { ConfiguracionEmpresaRequest } from '@/types/api';
import { PageHeader, Card, FadeIn, FormSkeleton } from '@/components/ui';

type FormState = {
  nombre_comercial: string;
  razon_social: string;
  rif: string;
  telefono: string;
  direccion: string;
  logo: File | null;
  mensaje_whatsapp_venta: string;
};

const ESTADO_INICIAL: FormState = {
  nombre_comercial: '',
  razon_social: '',
  rif: '',
  telefono: '',
  direccion: '',
  logo: null,
  mensaje_whatsapp_venta: '',
};

export default function EmpresaPage(): ReactElement {
  const [form, setForm] = useState<FormState>(ESTADO_INICIAL);
  const [logoActualUrl, setLogoActualUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Seguridad: PIN de autorización para eliminar renglones (POS, mesas,
  // etc.) -- separado del formulario principal a propósito, para no
  // arriesgar reenviar un PIN viejo por accidente junto con otro cambio.
  const [requierePinEliminar, setRequierePinEliminar] = useState(false);
  const [nuevoPin, setNuevoPin] = useState('');
  const [confirmarPin, setConfirmarPin] = useState('');
  const [guardandoSeguridad, setGuardandoSeguridad] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await getConfiguracionEmpresa();
      setForm({
        nombre_comercial: data.nombre_comercial || '',
        razon_social: data.razon_social || '',
        rif: data.rif || '',
        telefono: data.telefono || '',
        direccion: data.direccion || '',
        logo: null,
        mensaje_whatsapp_venta: data.mensaje_whatsapp_venta || '',
      });
      setLogoActualUrl(data.logo || null);
      setRequierePinEliminar(!!data.requiere_pin_eliminar);
    } catch (error) {
      console.error('Error cargando datos de la empresa:', error);
      toast.error('No se pudieron cargar los datos de la empresa.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!form.logo) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(form.logo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.logo]);

  const guardar = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setGuardando(true);
    try {
      const payload: Partial<ConfiguracionEmpresaRequest> = {
        nombre_comercial: form.nombre_comercial,
        razon_social: form.razon_social || null,
        rif: form.rif || null,
        telefono: form.telefono || null,
        direccion: form.direccion || null,
        mensaje_whatsapp_venta: form.mensaje_whatsapp_venta,
      };
      if (form.logo) payload.logo = form.logo;
      await updateConfiguracionEmpresa(payload);
      toast.success('Datos de la empresa actualizados.');
      await cargar();
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('No se pudieron guardar los datos de la empresa.');
      }
    } finally {
      setGuardando(false);
    }
  };

  const guardarSeguridad = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (nuevoPin && nuevoPin !== confirmarPin) {
      toast.error('El PIN y su confirmación no coinciden.');
      return;
    }
    if (nuevoPin && !/^\d{4,6}$/.test(nuevoPin)) {
      toast.error('El PIN debe tener entre 4 y 6 dígitos numéricos.');
      return;
    }
    setGuardandoSeguridad(true);
    try {
      const payload: Partial<ConfiguracionEmpresaRequest> = { requiere_pin_eliminar: requierePinEliminar };
      if (nuevoPin) payload.pin = nuevoPin;
      await updateConfiguracionEmpresa(payload);
      toast.success('Configuración de seguridad guardada.');
      setNuevoPin('');
      setConfirmarPin('');
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('No se pudo guardar la configuración de seguridad.');
      }
    } finally {
      setGuardandoSeguridad(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <PageHeader
        icon={<Building2 size={20} />}
        title="Datos de la Empresa"
        description="El teléfono se usa para el botón de WhatsApp de tu catálogo público y para avisarte de nuevos pedidos. El logo se muestra en tu tienda pública."
      />

      {cargando ? (
        <FormSkeleton rows={4} />
      ) : (
      <FadeIn>
      <Card>
      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
              {previewUrl || logoActualUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL dinámica (blob local o servida por Django).
                <img src={previewUrl || logoActualUrl || ''} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus size={22} className="text-slate-300" />
              )}
            </div>
            <div>
              <input
                id="empresa-logo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setForm((f) => ({ ...f, logo: e.target.files?.[0] ?? null }))}
              />
              <label
                htmlFor="empresa-logo"
                className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                <ImagePlus size={14} /> {logoActualUrl || previewUrl ? 'Cambiar logo' : 'Subir logo'}
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="emp-nombre">
              Nombre Comercial
            </label>
            <input
              id="emp-nombre"
              value={form.nombre_comercial}
              onChange={(e) => setForm((f) => ({ ...f, nombre_comercial: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Mi Tienda"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="emp-razon">
              Razón Social
            </label>
            <input
              id="emp-razon"
              value={form.razon_social}
              onChange={(e) => setForm((f) => ({ ...f, razon_social: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Mi Tienda, C.A."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="emp-rif">
              RIF / ID Fiscal
            </label>
            <input
              id="emp-rif"
              value={form.rif}
              onChange={(e) => setForm((f) => ({ ...f, rif: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="J-12345678-9"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="emp-telefono">
              Teléfono (WhatsApp)
            </label>
            <input
              id="emp-telefono"
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="584141234567"
            />
            <p className="text-[11px] text-slate-400 mt-1">Con código de país, sin espacios ni símbolos (ej: 584141234567).</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="emp-direccion">
            Dirección Fiscal
          </label>
          <textarea
            id="emp-direccion"
            value={form.direccion}
            onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="emp-msj-whatsapp">
            Mensaje de WhatsApp al cerrar una venta
          </label>
          <textarea
            id="emp-msj-whatsapp"
            value={form.mensaje_whatsapp_venta}
            onChange={(e) => setForm((f) => ({ ...f, mensaje_whatsapp_venta: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            rows={3}
            placeholder="Hola {cliente}, gracias por tu compra{factura}. Total: {moneda} {total}. ¡Que la disfrutes!"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Variables: <code className="bg-slate-100 px-1 rounded">{'{cliente}'}</code>{' '}
            <code className="bg-slate-100 px-1 rounded">{'{factura}'}</code>{' '}
            <code className="bg-slate-100 px-1 rounded">{'{total}'}</code>{' '}
            <code className="bg-slate-100 px-1 rounded">{'{moneda}'}</code>.
            El link al PDF de la factura se agrega siempre al final -- no se puede quitar, es cómo le llega la factura al cliente.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="submit"
            disabled={guardando}
            className="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2 shadow-md disabled:opacity-70"
          >
            {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Guardar
          </motion.button>
        </div>
      </form>
      </Card>
      </FadeIn>
      )}

      {!cargando && (
      <FadeIn>
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={18} className="text-primary-600" />
          <h3 className="font-bold text-slate-800">Autorización para eliminar renglones</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Si lo activas, quitar un producto ya agregado (en el POS, en una mesa, etc.) va a pedirle el PIN a un encargado antes de aplicarse.
        </p>
        <form onSubmit={guardarSeguridad} className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={requierePinEliminar}
              onChange={(e) => setRequierePinEliminar(e.target.checked)}
              className="w-4 h-4 accent-primary-600"
            />
            <span className="text-sm font-semibold text-slate-700">Exigir PIN para eliminar renglones</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="nuevo-pin">
                {requierePinEliminar ? 'PIN (4-6 dígitos)' : 'Nuevo PIN (opcional)'}
              </label>
              <input
                id="nuevo-pin"
                type="password"
                inputMode="numeric"
                value={nuevoPin}
                onChange={(e) => setNuevoPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-2 border rounded-lg text-sm tracking-widest"
                placeholder="••••"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="confirmar-pin">
                Confirmar PIN
              </label>
              <input
                id="confirmar-pin"
                type="password"
                inputMode="numeric"
                value={confirmarPin}
                onChange={(e) => setConfirmarPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-2 border rounded-lg text-sm tracking-widest"
                placeholder="••••"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">Deja los campos de PIN en blanco para mantener el PIN ya guardado (solo cambia el interruptor de arriba).</p>

          <div className="flex justify-end pt-1">
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="submit"
              disabled={guardandoSeguridad}
              className="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2 shadow-md disabled:opacity-70"
            >
              {guardandoSeguridad ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Guardar seguridad
            </motion.button>
          </div>
        </form>
      </Card>
      </FadeIn>
      )}
    </div>
  );
}
