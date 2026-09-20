"use client";

import { useState, useEffect, useCallback, use, type ReactElement } from 'react';
import { Wrench, CheckCircle2, PackageCheck, Loader2, Circle } from 'lucide-react';
import { getOrdenServicioPublico, type PublicOrdenServicio } from '@/services/publicServiciosService';

const PASOS: { estado: PublicOrdenServicio['estado']; etiqueta: string }[] = [
  { estado: 'recibido', etiqueta: 'Recibido' },
  { estado: 'en_proceso', etiqueta: 'En Proceso' },
  { estado: 'listo', etiqueta: 'Listo para Retirar' },
  { estado: 'entregado', etiqueta: 'Entregado' },
];

export default function SeguimientoPublico({ params }: { params: Promise<{ tenantId: string; token: string }> }): ReactElement {
  const { tenantId, token } = use(params);
  const subdominio = tenantId;

  const [orden, setOrden] = useState<PublicOrdenServicio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setOrden(await getOrdenServicioPublico(subdominio, token));
      setError(null);
    } catch {
      setError('No encontramos esta orden de servicio.');
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdominio, token]);

  useEffect(() => {
    cargar();
    // Refresco periódico -- para que el cliente vea en vivo cuando el
    // técnico marca la orden como "lista", sin tener que recargar la página.
    const intervalo = window.setInterval(cargar, 15000);
    return () => window.clearInterval(intervalo);
  }, [cargar]);

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  if (error || !orden) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <Wrench size={40} className="text-slate-300 mb-4" />
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }

  const cancelada = orden.estado === 'cancelado';
  const pasoActualIdx = PASOS.findIndex((p) => p.estado === orden.estado);
  const lista = orden.estado === 'listo';

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-slate-900 text-white px-5 py-5 text-center">
        <Wrench className="mx-auto mb-2" size={24} />
        <h1 className="font-bold text-lg">Orden OS-{orden.numero}</h1>
        <p className="text-xs text-slate-400 mt-1">{orden.equipo}</p>
      </header>

      <div className="max-w-md mx-auto px-4 -mt-4">
        {lista && (
          <div className="bg-emerald-500 text-white rounded-2xl p-5 mb-4 text-center shadow-lg">
            <PackageCheck className="mx-auto mb-2" size={28} />
            <p className="font-black text-lg">¡Tu equipo está listo!</p>
            <p className="text-sm opacity-90 mt-1">Ya puedes pasar a retirarlo.</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
          {cancelada ? (
            <p className="text-sm font-bold text-red-500 text-center py-4">Esta orden fue cancelada.</p>
          ) : (
            <div className="space-y-0">
              {PASOS.map((paso, i) => {
                const completado = i <= pasoActualIdx;
                const esActual = i === pasoActualIdx;
                return (
                  <div key={paso.estado} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      {completado ? (
                        <CheckCircle2 size={22} className={esActual ? 'text-primary-600' : 'text-emerald-500'} />
                      ) : (
                        <Circle size={22} className="text-slate-200" />
                      )}
                      {i < PASOS.length - 1 && (
                        <div className={`w-0.5 flex-1 min-h-[24px] ${i < pasoActualIdx ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                      )}
                    </div>
                    <div className={`pb-6 ${esActual ? 'font-bold text-slate-900' : completado ? 'text-slate-500' : 'text-slate-300'}`}>
                      <p className="text-sm">{paso.etiqueta}</p>
                      {esActual && <p className="text-xs font-normal text-primary-600 mt-0.5">Estado actual</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Recibido el</span>
            <span className="font-semibold text-slate-700">{new Date(orden.fecha_recepcion).toLocaleDateString()}</span>
          </div>
          {orden.fecha_entrega_estimada && (
            <div className="flex justify-between">
              <span className="text-slate-400">Entrega estimada</span>
              <span className="font-semibold text-slate-700">{new Date(orden.fecha_entrega_estimada).toLocaleDateString()}</span>
            </div>
          )}
          {orden.fecha_entrega_real && (
            <div className="flex justify-between">
              <span className="text-slate-400">Entregado el</span>
              <span className="font-semibold text-slate-700">{new Date(orden.fecha_entrega_real).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
