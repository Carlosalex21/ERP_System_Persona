"use client";

import React, { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import { Landmark, ChevronDown, ChevronRight, MessageCircle, HandCoins } from 'lucide-react';
import toast from 'react-hot-toast';

import { PageHeader, Card, EmptyState, TableSkeleton, StatCard, ExportButton } from '@/components/ui';
import { getReporteCuentasPorCobrar } from '@/services/facturacionService';
import { useTenant } from '@/hooks/useTenant';
import { construirLinkWhatsapp } from '@/utils/whatsapp';
import RegistrarCobroModal from './RegistrarCobroModal';
import type { FilaReporteCuentasPorCobrar, FilaFacturaAging } from '@/types/api';
import { useMonedaVista } from '@/context/MonedaVistaContext';

const BUCKETS: { key: keyof Pick<FilaReporteCuentasPorCobrar, '0_30' | '31_60' | '61_90' | 'mas_90'>; etiqueta: string; clase: string }[] = [
  { key: '0_30', etiqueta: '0-30 días', clase: 'text-slate-700' },
  { key: '31_60', etiqueta: '31-60 días', clase: 'text-amber-600' },
  { key: '61_90', etiqueta: '61-90 días', clase: 'text-orange-600' },
  { key: 'mas_90', etiqueta: '+90 días', clase: 'text-red-600' },
];

export default function CuentasPorCobrarPage(): ReactElement {
  const { formatear } = useMonedaVista();
  const { tenant } = useTenant();
  const [filas, setFilas] = useState<FilaReporteCuentasPorCobrar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [cobrando, setCobrando] = useState<{ clienteNombre: string; factura: FilaFacturaAging } | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      setFilas(await getReporteCuentasPorCobrar());
    } catch {
      toast.error('No se pudo cargar el reporte de cuentas por cobrar.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const totales = useMemo(() => {
    const acc = { total: 0, '0_30': 0, '31_60': 0, '61_90': 0, mas_90: 0 };
    for (const f of filas) {
      acc.total += parseFloat(f.total);
      acc['0_30'] += parseFloat(f['0_30']);
      acc['31_60'] += parseFloat(f['31_60']);
      acc['61_90'] += parseFloat(f['61_90']);
      acc.mas_90 += parseFloat(f.mas_90);
    }
    return acc;
  }, [filas]);

  // Una fila por FACTURA (no por cliente-grupo) -- lo útil para exportar es
  // el detalle real, no el agregado que ya se ve resumido en la tabla.
  const filasExport = useMemo(
    () => filas.flatMap((f) => f.facturas.map((fac) => ({ cliente: f.cliente_nombre, ...fac }))),
    [filas],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Landmark size={20} />}
        title="Cuentas por Cobrar"
        description="Facturas a crédito con saldo pendiente, agrupadas por cliente y por antigüedad -- cuánto te deben y desde hace cuánto."
        actions={
          <ExportButton
            data={filasExport}
            filename="cuentas_por_cobrar"
            columns={[
              { label: 'Cliente', value: 'cliente' },
              { label: 'Factura', value: (f) => f.correlativo || `#${f.id}` },
              { label: 'Fecha', value: (f) => new Date(f.fecha_operacion).toLocaleDateString('es-VE') },
              { label: 'Total', value: (f) => parseFloat(f.total_base).toFixed(2) },
              { label: 'Saldo Pendiente', value: (f) => parseFloat(f.saldo_pendiente_base).toFixed(2) },
              { label: 'Días', value: 'dias' },
            ]}
          />
        }
      />

      {!cargando && filas.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total por cobrar" value={formatear(totales.total)} />
          <StatCard label="0-30 días" value={formatear(totales['0_30'])} />
          <StatCard label="31-60 días" value={formatear(totales['31_60'])} />
          <StatCard label="61-90 días" value={formatear(totales['61_90'])} />
          <StatCard label="+90 días" value={formatear(totales.mas_90)} />
        </div>
      )}

      {cargando ? (
        <TableSkeleton rows={6} />
      ) : filas.length === 0 ? (
        <Card>
          <EmptyState icon={<Landmark size={28} />} title="No hay cuentas por cobrar" description="No tienes facturas a crédito con saldo pendiente en este momento." />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-4"></th>
                <th className="p-4">Cliente</th>
                {BUCKETS.map((b) => <th key={b.key} className="p-4 text-right">{b.etiqueta}</th>)}
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-center">Recordar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((f) => {
                const linkWhatsapp = f.cliente_telefono
                  ? construirLinkWhatsapp(
                      f.cliente_telefono,
                      `Hola ${f.cliente_nombre}, te recordamos que tienes un saldo pendiente de ${formatear(parseFloat(f.total))} con nosotros. Cualquier duda, contáctanos para coordinar el pago. ¡Gracias!`,
                      tenant?.pais_codigo,
                    )
                  : null;
                return (
                <React.Fragment key={f.cliente_id}>
                  <tr
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpandido((prev) => (prev === f.cliente_id ? null : f.cliente_id))}
                  >
                    <td className="p-4 text-slate-400">
                      {expandido === f.cliente_id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </td>
                    <td className="p-4 font-bold text-slate-800">{f.cliente_nombre}</td>
                    {BUCKETS.map((b) => (
                      <td key={b.key} className={`p-4 text-right font-mono ${b.clase}`}>
                        {parseFloat(f[b.key]) > 0 ? formatear(parseFloat(f[b.key])) : <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                    <td className="p-4 text-right font-black text-primary-700 font-mono">{formatear(parseFloat(f.total))}</td>
                    <td className="p-4 text-center">
                      {linkWhatsapp ? (
                        <a
                          href={linkWhatsapp}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Enviar recordatorio de pago por WhatsApp"
                          className="inline-flex text-emerald-500 hover:text-emerald-600"
                        >
                          <MessageCircle size={17} />
                        </a>
                      ) : (
                        <span className="text-slate-300" title="Este cliente no tiene teléfono registrado">—</span>
                      )}
                    </td>
                  </tr>
                  {expandido === f.cliente_id && (
                    <tr key={`${f.cliente_id}-detalle`}>
                      <td colSpan={8} className="p-0 bg-slate-50">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-400 font-bold uppercase text-[9px]">
                              <th className="px-8 py-2 text-left">Factura</th>
                              <th className="px-4 py-2 text-left">Fecha</th>
                              <th className="px-4 py-2 text-right">Total</th>
                              <th className="px-4 py-2 text-right">Saldo</th>
                              <th className="px-4 py-2 text-right">Días</th>
                              <th className="px-4 py-2 text-right">Cobro</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {f.facturas.map((fac) => (
                              <tr key={fac.id}>
                                <td className="px-8 py-2 font-mono font-bold text-slate-700">{fac.correlativo || `#${fac.id}`}</td>
                                <td className="px-4 py-2 text-slate-500">{new Date(fac.fecha_operacion).toLocaleDateString('es-VE', { timeZone: 'UTC' })}</td>
                                <td className="px-4 py-2 text-right font-mono text-slate-500">{formatear(parseFloat(fac.total_base))}</td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-slate-700">{formatear(parseFloat(fac.saldo_pendiente_base))}</td>
                                <td className="px-4 py-2 text-right text-slate-400">{fac.dias}</td>
                                <td className="px-4 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setCobrando({ clienteNombre: f.cliente_nombre, factura: fac }); }}
                                    className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 font-bold text-[11px]"
                                  >
                                    <HandCoins size={13} /> Cobrar
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {cobrando && (
        <RegistrarCobroModal
          clienteNombre={cobrando.clienteNombre}
          factura={cobrando.factura}
          onClose={() => setCobrando(null)}
          onCobrado={() => {
            setCobrando(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}
