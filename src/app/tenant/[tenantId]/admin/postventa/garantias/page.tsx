"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { ShieldCheck, TriangleAlert, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { PageHeader, Card, Badge, EmptyState, ExportButton } from '@/components/ui';
import { getGarantias } from '@/services/postventaService';
import { useTenant } from '@/hooks/useTenant';
import { construirLinkWhatsapp } from '@/utils/whatsapp';
import type { Garantia } from '@/types/api';

export default function GarantiasPage(): ReactElement {
  const { tenant } = useTenant();
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<'todas' | 'vigente' | 'vencida'>('todas');

  const cargar = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      setGarantias(await getGarantias(filtro === 'todas' ? undefined : filtro));
    } catch {
      toast.error('No se pudieron cargar las garantías.');
    } finally {
      setCargando(false);
    }
  }, [filtro]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ShieldCheck size={20} />}
        title="Garantías"
        description="Se generan solas al pagarse una venta de un producto con meses de garantía asignados (ver Inventario)."
      />

      <div className="flex items-center justify-between">
      <div className="flex gap-2">
        {(['todas', 'vigente', 'vencida'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              filtro === f ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f === 'todas' ? 'Todas' : f === 'vigente' ? 'Vigentes' : 'Vencidas'}
          </button>
        ))}
      </div>
        <ExportButton
          data={garantias}
          filename="garantias"
          columns={[
            { label: 'Producto', value: (g) => g.producto_nombre || '' },
            { label: 'Cliente', value: (g) => g.cliente_nombre || '' },
            { label: 'Factura', value: (g) => g.factura_correlativo || '' },
            { label: 'Inicio', value: 'fecha_inicio' },
            { label: 'Vence', value: 'fecha_vencimiento' },
            { label: 'Estado', value: (g) => (g.esta_vigente ? 'Vigente' : 'Vencida') },
          ]}
        />
      </div>

      <Card padding="none">
        {cargando ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
        ) : garantias.length === 0 ? (
          <EmptyState icon={<ShieldCheck size={28} />} title="Sin garantías" description="Aún no hay garantías generadas para este filtro." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase border-b border-slate-200">
                  <th className="p-3 text-left">Producto</th>
                  <th className="p-3 text-left">Cliente</th>
                  <th className="p-3 text-left">Factura</th>
                  <th className="p-3 text-center">Inicio</th>
                  <th className="p-3 text-center">Vence</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-center">Reclamo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {garantias.map((g) => {
                  const linkWhatsapp = g.cliente_telefono
                    ? construirLinkWhatsapp(
                        g.cliente_telefono,
                        `Hola ${g.cliente_nombre || ''}, te contactamos porque la garantía de tu ${g.producto_nombre || 'producto'} está por vencer (${new Date(g.fecha_vencimiento).toLocaleDateString('es-VE', { timeZone: 'UTC' })}). ¿Necesitas algo antes de esa fecha?`,
                        tenant?.pais_codigo,
                      )
                    : null;
                  return (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-700">{g.producto_nombre || '—'}</td>
                    <td className="p-3 text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        {g.cliente_nombre || '—'}
                        {linkWhatsapp && (
                          <a href={linkWhatsapp} target="_blank" rel="noopener noreferrer" title="Contactar por WhatsApp" className="text-emerald-500 hover:text-emerald-600">
                            <MessageCircle size={14} />
                          </a>
                        )}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-500">{g.factura_correlativo || '—'}</td>
                    <td className="p-3 text-center text-slate-400">{new Date(g.fecha_inicio).toLocaleDateString('es-VE', { timeZone: 'UTC' })}</td>
                    <td className="p-3 text-center text-slate-400">{new Date(g.fecha_vencimiento).toLocaleDateString('es-VE', { timeZone: 'UTC' })}</td>
                    <td className="p-3 text-center">
                      <Badge tone={g.esta_vigente ? 'green' : 'slate'}>{g.esta_vigente ? 'Vigente' : 'Vencida'}</Badge>
                    </td>
                    <td className="p-3 text-center">
                      {g.tiene_reclamo_abierto && (
                        <span title="Tiene un reclamo abierto" className="inline-flex text-amber-500"><TriangleAlert size={15} /></span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
