"use client";

import { useEffect, useState, type ReactElement } from 'react';
import { Check, Copy, Link2, MessageCircle, RefreshCw, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';

import { ActionButton, AppModal } from '@/components/ui';
import { getAccesoPortal, regenerarAccesoPortal, revocarAccesoPortal } from '@/services/inmueblesService';
import { construirLinkWhatsapp } from '@/utils/whatsapp';
import { toastApiError } from '@/utils/errors';
import { useSession } from '@/context/SessionContext';

interface Props {
  clienteId: number;
  nombre: string;
  telefono?: string | null;
  onClose: () => void;
}

/** Enlace personal al portal de una persona: se copia o se manda por WhatsApp; se puede renovar o desactivar. */
export default function EnlacePortalModal({ clienteId, nombre, telefono, onClose }: Props): ReactElement {
  const { tenant } = useSession();
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    getAccesoPortal(clienteId)
      .then((a) => setToken(a.token))
      .catch((e) => toastApiError(e, 'No se pudo generar el enlace.'))
      .finally(() => setCargando(false));
  }, [clienteId]);

  const url = token ? `${window.location.origin}/portal/${token}` : '';
  const mensaje = `Hola ${nombre.split(' ')[0]}, este es tu enlace personal para ver tu estado de cuenta, tus recibos y reportar tus pagos: ${url}`;
  const whatsapp = telefono && token ? construirLinkWhatsapp(telefono, mensaje, tenant?.pais_codigo) : null;

  const copiar = async (): Promise<void> => {
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  };

  const regenerar = async (): Promise<void> => {
    setTrabajando(true);
    try {
      setToken((await regenerarAccesoPortal(clienteId)).token);
      toast.success('Enlace renovado: el anterior ya no funciona.');
    } catch (e) {
      toastApiError(e, 'No se pudo renovar el enlace.');
    } finally {
      setTrabajando(false);
    }
  };

  const desactivar = async (): Promise<void> => {
    setTrabajando(true);
    try {
      await revocarAccesoPortal(clienteId);
      toast.success('Enlace desactivado.');
      onClose();
    } catch (e) {
      toastApiError(e, 'No se pudo desactivar el enlace.');
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <AppModal isOpen onClose={onClose} title={`Portal de ${nombre}`} icon={<Link2 size={20} />} size="md" footer={<ActionButton variant="secondary" onClick={onClose}>Cerrar</ActionButton>}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Con este enlace personal, {nombre.split(' ')[0]} ve sus deudas, descarga sus recibos y te avisa sus pagos con el comprobante.
          No necesita usuario ni contraseña: <b>quien tenga el enlace puede verlo</b>, así que envíalo solo a esa persona.
        </p>
        {cargando ? (
          <div className="h-12 rounded-xl bg-slate-100 animate-pulse" />
        ) : token ? (
          <>
            <div className="flex items-center gap-2 p-2 pl-3 border border-slate-200 rounded-xl bg-slate-50">
              <code className="text-[11px] text-slate-600 truncate flex-1">{url}</code>
              <button type="button" onClick={copiar} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100">
                {copiado ? <><Check size={14} className="text-green-600" /> Copiado</> : <><Copy size={14} /> Copiar</>}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {whatsapp ? (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 shadow-md">
                  <MessageCircle size={16} /> Enviar por WhatsApp
                </a>
              ) : (
                <span className="text-xs text-slate-400 self-center">Agrega el teléfono de la persona para enviarlo por WhatsApp.</span>
              )}
              <ActionButton variant="ghost" onClick={regenerar} loading={trabajando}><RefreshCw size={15} /> Renovar enlace</ActionButton>
              <ActionButton variant="ghost" onClick={desactivar} disabled={trabajando}><ShieldOff size={15} /> Desactivar</ActionButton>
            </div>
          </>
        ) : (
          <p className="text-sm text-red-500">No se pudo generar el enlace.</p>
        )}
      </div>
    </AppModal>
  );
}
