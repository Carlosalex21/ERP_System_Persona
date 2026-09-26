"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Plus, FileText, Send, CheckCircle2, XCircle, ArrowRightCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { PageHeader, Card } from '@/components/ui';
import { getCotizaciones, cambiarEstadoCotizacion, convertirCotizacion, type Cotizacion, type EstadoCotizacion } from '@/services/crmService';
import { toastApiError } from '@/utils/errors';
import NuevaCotizacionModal from './NuevaCotizacionModal';
import { useMonedaVista } from '@/context/MonedaVistaContext';

const ESTADO_ESTILO: Record<EstadoCotizacion, string> = {
  borrador: 'bg-slate-100 text-slate-600',
  enviada: 'bg-sky-100 text-sky-700',
  aceptada: 'bg-emerald-100 text-emerald-700',
  rechazada: 'bg-red-100 text-red-700',
  vencida: 'bg-amber-100 text-amber-700',
  convertida: 'bg-purple-100 text-purple-700',
};

const ESTADO_LABEL: Record<EstadoCotizacion, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  vencida: 'Vencida',
  convertida: 'Convertida',
};

export default function CotizacionesPage(): ReactElement {
  const { formatear } = useMonedaVista();
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalNueva, setModalNueva] = useState(false);
  const [procesando, setProcesando] = useState<number | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      setCotizaciones(await getCotizaciones());
    } catch {
      toast.error('No se pudieron cargar las cotizaciones.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiarEstado = async (cot: Cotizacion, estado: EstadoCotizacion): Promise<void> => {
    setProcesando(cot.id);
    try {
      await cambiarEstadoCotizacion(cot.id, estado);
      toast.success(`Cotización ${cot.numero} actualizada a ${ESTADO_LABEL[estado]}.`);
      cargar();
    } catch (error) {
      toastApiError(error, 'No se pudo actualizar la cotización.');
    } finally {
      setProcesando(null);
    }
  };

  const convertir = async (cot: Cotizacion): Promise<void> => {
    setProcesando(cot.id);
    try {
      await convertirCotizacion(cot.id, 'contado');
      toast.success(`Cotización ${cot.numero} convertida en factura.`);
      cargar();
    } catch (error) {
      toastApiError(error, 'No se pudo convertir la cotización.');
    } finally {
      setProcesando(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileText size={20} />}
        title="Cotizaciones"
        description="Presupuestos formales para clientes y prospectos. El IVA real se calcula solo al convertir en factura."
        actions={<motion.button whileTap={{ scale: 0.96 }} onClick={() => setModalNueva(true)} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"><Plus size={18} /> Nueva Cotización</motion.button>}
      />

      <Card padding="none">
        {cargando ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
        ) : cotizaciones.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Aún no hay cotizaciones registradas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase border-b border-slate-200">
                  <th className="p-3 text-left">Número</th>
                  <th className="p-3 text-left">Cliente / Prospecto</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-left">Vence</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cotizaciones.map((cot) => (
                  <tr key={cot.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-700">{cot.numero}</td>
                    <td className="p-3 text-slate-600">{cot.nombre_contacto}</td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${ESTADO_ESTILO[cot.estado]}`}>{ESTADO_LABEL[cot.estado]}</span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-700">{formatear(cot.total, cot.moneda_codigo)}</td>
                    <td className="p-3 text-slate-400">{cot.fecha_vencimiento ? new Date(cot.fecha_vencimiento).toLocaleDateString('es-VE', { timeZone: 'UTC' }) : '—'}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {cot.estado === 'borrador' && (
                          <button disabled={procesando === cot.id} onClick={() => cambiarEstado(cot, 'enviada')} title="Marcar como enviada" className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50 disabled:opacity-40">
                            <Send size={15} />
                          </button>
                        )}
                        {cot.estado === 'enviada' && (
                          <>
                            <button disabled={procesando === cot.id} onClick={() => cambiarEstado(cot, 'aceptada')} title="Marcar como aceptada" className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-40">
                              <CheckCircle2 size={15} />
                            </button>
                            <button disabled={procesando === cot.id} onClick={() => cambiarEstado(cot, 'rechazada')} title="Marcar como rechazada" className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40">
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                        {cot.estado === 'aceptada' && (
                          <button disabled={procesando === cot.id} onClick={() => convertir(cot)} title="Convertir en factura" className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 disabled:opacity-40 flex items-center gap-1 text-xs font-bold">
                            <ArrowRightCircle size={15} /> Convertir
                          </button>
                        )}
                        {cot.estado === 'convertida' && cot.factura_generada && (
                          <span className="text-[11px] text-purple-500 font-semibold">Factura #{cot.factura_generada}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modalNueva && (
        <NuevaCotizacionModal onClose={() => setModalNueva(false)} onCreated={() => { setModalNueva(false); cargar(); }} />
      )}
    </div>
  );
}
