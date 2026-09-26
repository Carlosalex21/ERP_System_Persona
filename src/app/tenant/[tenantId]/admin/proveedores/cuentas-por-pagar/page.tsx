"use client";

import React, { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import { Truck, ChevronDown, ChevronRight, HandCoins } from 'lucide-react';
import toast from 'react-hot-toast';

import { PageHeader, Card, EmptyState, TableSkeleton, StatCard, ExportButton } from '@/components/ui';
import { getReporteCuentasPorPagar, getCuentasPorPagar } from '@/services/proveedoresService';
import { getMetodosDePago } from '@/services/facturacionService';
import type { FilaReporteCuentasPorPagar, CuentaPorPagar, MetodoPago } from '@/types/api';
import RegistrarPagoModal from './RegistrarPagoModal';

const BUCKETS: { key: keyof Pick<FilaReporteCuentasPorPagar, '0_30' | '31_60' | '61_90' | 'mas_90'>; etiqueta: string; clase: string }[] = [
  { key: '0_30', etiqueta: '0-30 días', clase: 'text-slate-700' },
  { key: '31_60', etiqueta: '31-60 días', clase: 'text-amber-600' },
  { key: '61_90', etiqueta: '61-90 días', clase: 'text-orange-600' },
  { key: 'mas_90', etiqueta: '+90 días', clase: 'text-red-600' },
];

export default function CuentasPorPagarPage(): ReactElement {
  const [filas, setFilas] = useState<FilaReporteCuentasPorPagar[]>([]);
  const [cuentasPendientes, setCuentasPendientes] = useState<CuentaPorPagar[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [cargando, setCargando] = useState(true);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [cuentaAPagar, setCuentaAPagar] = useState<CuentaPorPagar | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      const [reporte, cuentas] = await Promise.all([getReporteCuentasPorPagar(), getCuentasPorPagar('pendiente')]);
      setFilas(reporte);
      setCuentasPendientes(cuentas);
    } catch {
      toast.error('No se pudo cargar el reporte de cuentas por pagar.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    getMetodosDePago().then(setMetodosPago).catch(() => {});
  }, [cargar]);

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

  const cuentaPorId = useMemo(() => new Map(cuentasPendientes.map((c) => [c.id, c])), [cuentasPendientes]);

  const filasExport = useMemo(
    () => filas.flatMap((f) => f.cuentas.map((c) => ({ proveedor: f.proveedor_nombre, ...c }))),
    [filas],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Truck size={20} />}
        title="Cuentas por Pagar"
        description="Compras con proveedor pendientes de pagar -- se crean solas al registrar una compra con proveedor en Ajustes de Inventario."
        actions={
          <ExportButton
            data={filasExport}
            filename="cuentas_por_pagar"
            columns={[
              { label: 'Proveedor', value: 'proveedor' },
              { label: 'Documento', value: (c) => c.numero_documento || 's/n' },
              { label: 'Emisión', value: (c) => new Date(c.fecha_emision).toLocaleDateString('es-VE') },
              { label: 'Vencimiento', value: (c) => (c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString('es-VE') : '') },
              { label: 'Monto', value: (c) => parseFloat(c.monto).toFixed(2) },
              { label: 'Saldo Pendiente', value: (c) => parseFloat(c.saldo_pendiente).toFixed(2) },
              { label: 'Días', value: 'dias' },
            ]}
          />
        }
      />

      {!cargando && filas.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total por pagar" value={`$${totales.total.toFixed(2)}`} color="bg-orange-600" />
          <StatCard label="0-30 días" value={`$${totales['0_30'].toFixed(2)}`} color="bg-orange-600" />
          <StatCard label="31-60 días" value={`$${totales['31_60'].toFixed(2)}`} color="bg-orange-600" />
          <StatCard label="61-90 días" value={`$${totales['61_90'].toFixed(2)}`} color="bg-orange-600" />
          <StatCard label="+90 días" value={`$${totales.mas_90.toFixed(2)}`} color="bg-red-600" />
        </div>
      )}

      {cargando ? (
        <TableSkeleton rows={6} />
      ) : filas.length === 0 ? (
        <Card>
          <EmptyState icon={<Truck size={28} />} title="No hay cuentas por pagar" description="No tienes compras con proveedor pendientes de pagar en este momento." />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-4"></th>
                <th className="p-4">Proveedor</th>
                {BUCKETS.map((b) => <th key={b.key} className="p-4 text-right">{b.etiqueta}</th>)}
                <th className="p-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((f) => (
                <React.Fragment key={f.proveedor_id}>
                  <tr
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpandido((prev) => (prev === f.proveedor_id ? null : f.proveedor_id))}
                  >
                    <td className="p-4 text-slate-400">
                      {expandido === f.proveedor_id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </td>
                    <td className="p-4 font-bold text-slate-800">{f.proveedor_nombre}</td>
                    {BUCKETS.map((b) => (
                      <td key={b.key} className={`p-4 text-right font-mono ${b.clase}`}>
                        {parseFloat(f[b.key]) > 0 ? `$${parseFloat(f[b.key]).toFixed(2)}` : <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                    <td className="p-4 text-right font-black text-orange-700 font-mono">${parseFloat(f.total).toFixed(2)}</td>
                  </tr>
                  {expandido === f.proveedor_id && (
                    <tr key={`${f.proveedor_id}-detalle`}>
                      <td colSpan={7} className="p-0 bg-slate-50">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-400 font-bold uppercase text-[9px]">
                              <th className="px-8 py-2 text-left">Documento</th>
                              <th className="px-4 py-2 text-left">Emisión</th>
                              <th className="px-4 py-2 text-left">Vencimiento</th>
                              <th className="px-4 py-2 text-right">Monto</th>
                              <th className="px-4 py-2 text-right">Saldo</th>
                              <th className="px-4 py-2 text-right">Días</th>
                              <th className="px-4 py-2 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {f.cuentas.map((c) => (
                              <tr key={c.id}>
                                <td className="px-8 py-2 font-mono font-bold text-slate-700">{c.numero_documento || 's/n'}</td>
                                <td className="px-4 py-2 text-slate-500">{new Date(c.fecha_emision).toLocaleDateString('es-VE', { timeZone: 'UTC' })}</td>
                                <td className="px-4 py-2 text-slate-500">{c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString('es-VE', { timeZone: 'UTC' }) : '—'}</td>
                                <td className="px-4 py-2 text-right font-mono text-slate-500">${parseFloat(c.monto).toFixed(2)}</td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-slate-700">${parseFloat(c.saldo_pendiente).toFixed(2)}</td>
                                <td className="px-4 py-2 text-right text-slate-400">{c.dias}</td>
                                <td className="px-4 py-2 text-right">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); const cuenta = cuentaPorId.get(c.id); if (cuenta) setCuentaAPagar(cuenta); }}
                                    className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-bold"
                                  >
                                    <HandCoins size={13} /> Pagar
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
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {cuentaAPagar && (
        <RegistrarPagoModal
          cuenta={cuentaAPagar}
          metodosPago={metodosPago}
          onClose={() => setCuentaAPagar(null)}
          onSaved={() => { setCuentaAPagar(null); cargar(); }}
        />
      )}
    </div>
  );
}
