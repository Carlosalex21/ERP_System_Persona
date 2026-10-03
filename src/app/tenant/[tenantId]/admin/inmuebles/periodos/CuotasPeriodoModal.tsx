"use client";

import { useEffect, useState, type ReactElement } from 'react';
import { Download, FileText, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppModal, Badge } from '@/components/ui';
import { useSession } from '@/context/SessionContext';
import { getAccesoPortal, getCargos, pdfReciboCondominio, type Cargo, type PeriodoCondominio } from '@/services/inmueblesService';
import { construirLinkWhatsapp } from '@/utils/whatsapp';
import { toastApiError } from '@/utils/errors';
import { fechaCorta, periodoLabel, usd } from '@/components/inmuebles/formato';

interface Props {
  periodo: PeriodoCondominio;
  onClose: () => void;
}

/** Las cuotas de un mes emitido: recibo en PDF por unidad y aviso por WhatsApp con el enlace del portal. */
export default function CuotasPeriodoModal({ periodo, onClose }: Props): ReactElement {
  const { tenant } = useSession();
  const [cuotas, setCuotas] = useState<Cargo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState<number | null>(null);

  useEffect(() => {
    getCargos({ periodo: periodo.periodo, unidad__edificio: periodo.edificio, tipo: 'cuota_condominio' })
      .then((lista) => setCuotas(lista.filter((c) => c.periodo_condominio === periodo.id)))
      .catch((e) => toastApiError(e, 'No se pudieron cargar las cuotas.'))
      .finally(() => setCargando(false));
  }, [periodo]);

  const avisarPorWhatsapp = async (cuota: Cargo): Promise<void> => {
    if (!cuota.pagador) return void toast.error('Esta unidad no tiene propietario registrado.');
    setEnviando(cuota.id);
    try {
      // El teléfono vive en la ficha de la persona: se pide junto con su enlace del portal.
      const acceso = await getAccesoPortal(cuota.pagador);
      if (!acceso.telefono) return void toast.error(`${acceso.nombre} no tiene teléfono registrado.`);
      const enlace = `${window.location.origin}/portal/${acceso.token}`;
      const mensaje = `Hola ${acceso.nombre.split(' ')[0]}, ya está disponible tu recibo de condominio de ${periodoLabel(cuota.periodo)} (unidad ${cuota.unidad_codigo}): ${usd(cuota.monto_usd)}, vence el ${fechaCorta(cuota.fecha_vencimiento)}. Míralo, descárgalo y reporta tu pago aquí: ${enlace}`;
      const link = construirLinkWhatsapp(acceso.telefono, mensaje, tenant?.pais_codigo);
      if (link) window.open(link, '_blank', 'noopener');
    } catch (e) {
      toastApiError(e, 'No se pudo preparar el mensaje.');
    } finally {
      setEnviando(null);
    }
  };

  return (
    <AppModal isOpen onClose={onClose} title={`Cuotas de ${periodoLabel(periodo.periodo)} · ${periodo.edificio_nombre}`} icon={<FileText size={20} />} size="xl">
      {cargando ? (
        <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />)}</div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0"><tr className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold"><th className="px-3 py-2.5 text-left">Unidad</th><th className="px-3 py-2.5 text-left">Propietario</th><th className="px-3 py-2.5 text-right">Cuota</th><th className="px-3 py-2.5 text-right">Pagado</th><th className="px-3 py-2.5 text-center">Estado</th><th className="px-3 py-2.5 text-right">Recibo</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {cuotas.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2.5 font-bold text-slate-800">{c.unidad_codigo}</td>
                  <td className="px-3 py-2.5 text-slate-600">{c.pagador_nombre ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{usd(c.monto_usd)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-green-600">{usd(c.monto_pagado_usd)}</td>
                  <td className="px-3 py-2.5 text-center"><Badge tone={c.estado === 'pagado' ? 'green' : c.vencido ? 'red' : 'amber'}>{c.estado === 'pagado' ? 'Pagada' : c.vencido ? 'Vencida' : 'Pendiente'}</Badge></td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => pdfReciboCondominio(c.id).catch((e) => toastApiError(e, 'No se pudo generar el recibo.'))} className="p-2 text-slate-400 hover:text-primary-600" title="Ver recibo en PDF" aria-label={`Recibo de ${c.unidad_codigo}`}><Download size={16} /></button>
                      <button onClick={() => avisarPorWhatsapp(c)} disabled={enviando === c.id} className="p-2 text-slate-400 hover:text-green-600 disabled:opacity-40" title="Avisar por WhatsApp" aria-label={`Avisar a ${c.unidad_codigo}`}><MessageCircle size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {cuotas.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">No hay cuotas para mostrar.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </AppModal>
  );
}
