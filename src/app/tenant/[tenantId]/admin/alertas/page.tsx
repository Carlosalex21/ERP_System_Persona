"use client";

import { useMemo, type ReactElement } from 'react';
import Link from 'next/link';
import { TriangleAlert, Landmark, Truck, PackageX, FlaskConical, PhoneCall, LifeBuoy, ShieldCheck } from 'lucide-react';

import { PageHeader, Card, EmptyState, TableSkeleton, StatCard, ExportButton } from '@/components/ui';
import { useAlertas } from '@/hooks/useAlertas';
import SelectorSucursales from '@/components/SelectorSucursales';
import type { AlertaItem, TipoAlerta } from '@/services/reportesService';

const ICONO: Record<TipoAlerta, ReactElement> = {
  cxc: <Landmark size={18} />,
  cxp: <Truck size={18} />,
  stock: <PackageX size={18} />,
  lote: <FlaskConical size={18} />,
  seguimiento: <PhoneCall size={18} />,
  reclamo: <LifeBuoy size={18} />,
  garantia: <ShieldCheck size={18} />,
};

const ETIQUETA_TIPO: Record<TipoAlerta, string> = {
  cxc: 'Cuenta por Cobrar',
  cxp: 'Cuenta por Pagar',
  stock: 'Inventario',
  lote: 'Lotes por Vencer',
  seguimiento: 'Seguimiento Comercial',
  reclamo: 'Reclamo Postventa',
  garantia: 'Garantías por Vencer',
};

export default function AlertasPage(): ReactElement {
  const { alertas, total, urgentes, cargando } = useAlertas();

  const porTipo = useMemo(() => {
    const grupos: Record<TipoAlerta, AlertaItem[]> = { cxc: [], cxp: [], stock: [], lote: [], seguimiento: [], reclamo: [], garantia: [] };
    for (const a of alertas) grupos[a.tipo].push(a);
    return grupos;
  }, [alertas]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<TriangleAlert size={20} />}
        title="Centro de Alertas"
        description="Todo lo que necesita atención en un solo lugar: cuentas por cobrar/pagar, stock, lotes, seguimientos, reclamos y garantías por vencer."
        actions={
          <div className="flex items-center gap-2">
            <SelectorSucursales />
            <ExportButton
              data={alertas}
              filename="centro-de-alertas"
              columns={[
                { label: 'Tipo', value: (a) => ETIQUETA_TIPO[a.tipo] },
                { label: 'Nivel', value: (a) => (a.nivel === 'urgente' ? 'Urgente' : 'Atención') },
                { label: 'Título', value: 'titulo' },
                { label: 'Descripción', value: 'descripcion' },
              ]}
            />
          </div>
        }
      />

      {!cargando && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Total de alertas" value={total} icon={<TriangleAlert size={18} />} color="bg-slate-700" />
          <StatCard label="Urgentes" value={urgentes} icon={<TriangleAlert size={18} />} color="bg-red-600" />
          <StatCard label="Requieren atención" value={total - urgentes} icon={<TriangleAlert size={18} />} color="bg-amber-600" />
        </div>
      )}

      {cargando ? (
        <TableSkeleton rows={6} />
      ) : total === 0 ? (
        <Card>
          <EmptyState icon={<TriangleAlert size={28} />} title="Todo al día" description="No hay nada que necesite tu atención en este momento." />
        </Card>
      ) : (
        (['cxc', 'cxp', 'stock', 'lote', 'seguimiento', 'reclamo', 'garantia'] as TipoAlerta[]).map((tipo) => {
          const items = porTipo[tipo];
          if (items.length === 0) return null;
          return (
            <Card key={tipo} padding="none" className="overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50">
                <span className="text-slate-500">{ICONO[tipo]}</span>
                <h3 className="font-bold text-slate-800 text-sm">{ETIQUETA_TIPO[tipo]}</h3>
                <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{items.length}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {items.map((a, i) => (
                  <Link
                    key={`${tipo}-${i}`}
                    href={a.link}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{a.titulo}</p>
                      <p className="text-xs text-slate-400 truncate">{a.descripcion}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                      a.nivel === 'urgente'
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {a.nivel === 'urgente' ? 'Urgente' : 'Atención'}
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
