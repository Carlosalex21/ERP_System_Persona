"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Plus, LifeBuoy, PlayCircle, CheckCircle2, XCircle, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { PageHeader, Card, Badge, EmptyState, ActionButton, AppModal, ExportButton } from '@/components/ui';
import { getReclamos, cambiarEstadoReclamo } from '@/services/postventaService';
import { useTenant } from '@/hooks/useTenant';
import { construirLinkWhatsapp } from '@/utils/whatsapp';
import type { ReclamoPostventa, EstadoReclamoPostventa } from '@/types/api';
import NuevoReclamoModal from './NuevoReclamoModal';

const ESTADO_TONE: Record<EstadoReclamoPostventa, 'slate' | 'amber' | 'green' | 'red'> = {
  abierto: 'slate',
  en_proceso: 'amber',
  resuelto: 'green',
  rechazado: 'red',
};

const ESTADO_LABEL: Record<EstadoReclamoPostventa, string> = {
  abierto: 'Abierto',
  en_proceso: 'En Proceso',
  resuelto: 'Resuelto',
  rechazado: 'Rechazado',
};

const PRIORIDAD_TONE: Record<string, 'slate' | 'amber' | 'red'> = { baja: 'slate', media: 'amber', alta: 'red' };

function CerrarReclamoModal({ reclamo, estadoDestino, onClose, onDone }: {
  reclamo: ReclamoPostventa; estadoDestino: 'resuelto' | 'rechazado'; onClose: () => void; onDone: () => void;
}): ReactElement {
  const [resolucion, setResolucion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const confirmar = async (): Promise<void> => {
    setGuardando(true);
    try {
      await cambiarEstadoReclamo(reclamo.id, estadoDestino, resolucion.trim());
      toast.success(estadoDestino === 'resuelto' ? 'Reclamo marcado como resuelto.' : 'Reclamo rechazado.');
      onDone();
    } catch {
      toast.error('No se pudo actualizar el reclamo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={estadoDestino === 'resuelto' ? 'Resolver Reclamo' : 'Rechazar Reclamo'}
      icon={<LifeBuoy size={20} />}
      size="sm"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={confirmar}>Confirmar</ActionButton>
        </>
      }
    >
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Resolución (opcional)</label>
        <textarea value={resolucion} onChange={(e) => setResolucion(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Qué se hizo para resolverlo..." />
      </div>
    </AppModal>
  );
}

export default function ReclamosPostventaPage(): ReactElement {
  const { tenant } = useTenant();
  const [reclamos, setReclamos] = useState<ReclamoPostventa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [modalCierre, setModalCierre] = useState<{ reclamo: ReclamoPostventa; estado: 'resuelto' | 'rechazado' } | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      setReclamos(await getReclamos());
    } catch {
      toast.error('No se pudieron cargar los reclamos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const marcarEnProceso = async (reclamo: ReclamoPostventa): Promise<void> => {
    setProcesando(reclamo.id);
    try {
      await cambiarEstadoReclamo(reclamo.id, 'en_proceso');
      toast.success('Reclamo en proceso.');
      await cargar();
    } catch {
      toast.error('No se pudo actualizar el reclamo.');
    } finally {
      setProcesando(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<LifeBuoy size={20} />}
        title="Reclamos Postventa"
        description="Tickets de soporte -- con o sin garantía asociada. El Centro de Alertas avisa si uno queda sin cerrar varios días."
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              data={reclamos}
              filename="reclamos_postventa"
              columns={[
                { label: 'Título', value: 'titulo' },
                { label: 'Contacto', value: 'nombre_contacto' },
                { label: 'Prioridad', value: 'prioridad' },
                { label: 'Estado', value: (r) => ESTADO_LABEL[r.estado] },
                { label: 'Abierto', value: (r) => new Date(r.fecha_apertura).toLocaleDateString('es-VE') },
                { label: 'Resolución', value: 'resolucion' },
              ]}
            />
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => setModalNuevo(true)} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"><Plus size={18} /> Nuevo Reclamo</motion.button>
          </div>
        }
      />

      <Card padding="none">
        {cargando ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
        ) : reclamos.length === 0 ? (
          <EmptyState icon={<LifeBuoy size={28} />} title="Sin reclamos" description="Aún no se ha registrado ningún reclamo postventa." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase border-b border-slate-200">
                  <th className="p-3 text-left">Título</th>
                  <th className="p-3 text-left">Contacto</th>
                  <th className="p-3 text-center">Prioridad</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-left">Abierto</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reclamos.map((r) => {
                  const linkWhatsapp = r.telefono_contacto
                    ? construirLinkWhatsapp(
                        r.telefono_contacto,
                        `Hola ${r.nombre_contacto}, te contactamos por tu reclamo "${r.titulo}". ¿En qué podemos ayudarte?`,
                        tenant?.pais_codigo,
                      )
                    : null;
                  return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-700">{r.titulo}</td>
                    <td className="p-3 text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        {r.nombre_contacto}
                        {linkWhatsapp && (
                          <a href={linkWhatsapp} target="_blank" rel="noopener noreferrer" title="Contactar por WhatsApp" className="text-emerald-500 hover:text-emerald-600">
                            <MessageCircle size={14} />
                          </a>
                        )}
                      </span>
                    </td>
                    <td className="p-3 text-center"><Badge tone={PRIORIDAD_TONE[r.prioridad]}>{r.prioridad}</Badge></td>
                    <td className="p-3 text-center"><Badge tone={ESTADO_TONE[r.estado]}>{ESTADO_LABEL[r.estado]}</Badge></td>
                    <td className="p-3 text-slate-400">{new Date(r.fecha_apertura).toLocaleDateString('es-VE')}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.estado === 'abierto' && (
                          <button disabled={procesando === r.id} onClick={() => marcarEnProceso(r)} title="Marcar en proceso" className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 disabled:opacity-40">
                            <PlayCircle size={15} />
                          </button>
                        )}
                        {(r.estado === 'abierto' || r.estado === 'en_proceso') && (
                          <>
                            <button onClick={() => setModalCierre({ reclamo: r, estado: 'resuelto' })} title="Marcar como resuelto" className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50">
                              <CheckCircle2 size={15} />
                            </button>
                            <button onClick={() => setModalCierre({ reclamo: r, estado: 'rechazado' })} title="Rechazar reclamo" className="p-1.5 rounded-lg text-red-500 hover:bg-red-50">
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modalNuevo && (
        <NuevoReclamoModal onClose={() => setModalNuevo(false)} onCreated={() => { setModalNuevo(false); cargar(); }} />
      )}
      {modalCierre && (
        <CerrarReclamoModal
          reclamo={modalCierre.reclamo} estadoDestino={modalCierre.estado}
          onClose={() => setModalCierre(null)}
          onDone={() => { setModalCierre(null); cargar(); }}
        />
      )}
    </div>
  );
}
