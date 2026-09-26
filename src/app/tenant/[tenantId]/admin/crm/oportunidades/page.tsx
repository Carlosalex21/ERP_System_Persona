"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import { Plus, Target, DollarSign, Calendar, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { PageHeader, Card } from '@/components/ui';
import { getOportunidades, cambiarEtapaOportunidad, ETAPAS_OPORTUNIDAD, type Oportunidad, type EtapaOportunidad } from '@/services/crmService';
import { useTenant } from '@/hooks/useTenant';
import { construirLinkWhatsapp } from '@/utils/whatsapp';
import NuevaOportunidadModal from './NuevaOportunidadModal';

const COLOR_ETAPA: Record<EtapaOportunidad, string> = {
  nuevo: 'border-slate-300',
  contactado: 'border-sky-300',
  cotizado: 'border-amber-300',
  negociacion: 'border-orange-400',
  ganado: 'border-emerald-400',
  perdido: 'border-red-300',
};

export default function OportunidadesPage(): ReactElement {
  const { tenant } = useTenant();
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalNueva, setModalNueva] = useState(false);

  const cargar = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      setOportunidades(await getOportunidades());
    } catch {
      toast.error('No se pudieron cargar las oportunidades.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const columnas = useMemo(() => {
    const grupos: Record<EtapaOportunidad, Oportunidad[]> = {
      nuevo: [], contactado: [], cotizado: [], negociacion: [], ganado: [], perdido: [],
    };
    for (const op of oportunidades) grupos[op.etapa].push(op);
    return grupos;
  }, [oportunidades]);

  const avanzarEtapa = async (op: Oportunidad, nuevaEtapa: EtapaOportunidad): Promise<void> => {
    try {
      await cambiarEtapaOportunidad(op.id, nuevaEtapa);
      toast.success(`"${op.titulo}" movida a ${ETAPAS_OPORTUNIDAD.find((e) => e.value === nuevaEtapa)?.label}.`);
      cargar();
    } catch {
      toast.error('No se pudo mover la oportunidad.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Target size={20} />}
        title="Oportunidades"
        description="Pipeline comercial: desde el primer contacto hasta ganada o perdida. El Centro de Alertas avisa solo cuando un seguimiento programado ya venció."
        actions={<motion.button whileTap={{ scale: 0.96 }} onClick={() => setModalNueva(true)} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"><Plus size={18} /> Nueva Oportunidad</motion.button>}
      />

      {!cargando && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {ETAPAS_OPORTUNIDAD.map((etapa) => (
            <div key={etapa.value} className={`bg-white rounded-xl border-t-4 ${COLOR_ETAPA[etapa.value]} border-x border-b border-slate-200 p-3 min-h-[120px]`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase">{etapa.label}</span>
                <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full">{columnas[etapa.value].length}</span>
              </div>
              <div className="space-y-2">
                {columnas[etapa.value].map((op) => {
                  const linkWhatsapp = op.telefono_prospecto
                    ? construirLinkWhatsapp(
                        op.telefono_prospecto,
                        `Hola ${op.nombre_contacto}, te escribo sobre "${op.titulo}". ¿Seguimos conversando?`,
                        tenant?.pais_codigo,
                      )
                    : null;
                  return (
                  <div key={op.id} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs">
                    <p className="font-bold text-slate-800 truncate">{op.titulo}</p>
                    <p className="text-slate-400 truncate flex items-center gap-1.5">
                      {op.nombre_contacto}
                      {linkWhatsapp && (
                        <a href={linkWhatsapp} target="_blank" rel="noopener noreferrer" title="Contactar por WhatsApp" className="text-emerald-500 hover:text-emerald-600 shrink-0">
                          <MessageCircle size={12} />
                        </a>
                      )}
                    </p>
                    {op.valor_estimado && (
                      <p className="flex items-center gap-1 text-emerald-600 font-bold mt-1"><DollarSign size={11} /> {parseFloat(op.valor_estimado).toFixed(2)}</p>
                    )}
                    {op.proximo_seguimiento && (
                      <p className="flex items-center gap-1 text-slate-400 mt-0.5"><Calendar size={11} /> {new Date(op.proximo_seguimiento).toLocaleDateString('es-VE', { timeZone: 'UTC' })}</p>
                    )}
                    {etapa.value !== 'ganado' && etapa.value !== 'perdido' && (
                      <div className="flex gap-1 mt-2">
                        {ETAPAS_OPORTUNIDAD.filter((e) => e.value !== etapa.value).map((e) => (
                          <button
                            key={e.value}
                            onClick={() => avanzarEtapa(op, e.value)}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 hover:bg-white hover:border-primary-300 hover:text-primary-600"
                          >
                            {e.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  );
                })}
                {columnas[etapa.value].length === 0 && (
                  <p className="text-[11px] text-slate-300 text-center py-4">Vacío</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {cargando && <Card><div className="p-8 text-center text-slate-400 text-sm">Cargando...</div></Card>}

      {modalNueva && (
        <NuevaOportunidadModal onClose={() => setModalNueva(false)} onCreated={() => { setModalNueva(false); cargar(); }} />
      )}
    </div>
  );
}
