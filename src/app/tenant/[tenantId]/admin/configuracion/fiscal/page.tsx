"use client";

import { useState, useCallback, useEffect, useMemo, type ReactElement } from 'react';
import { Landmark, Scale, Globe, BadgeCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { TaxStrategyInfo } from '@/types/api';
import { getTaxStrategy } from '@/services/configuracionService';
import { getApiErrorMessages, parseDecimal } from '@/utils/helpers';
import { useTenant } from '@/hooks/useTenant';
import { PageHeader, Card, Skeleton } from '@/components/ui';

const PAISES = [
  { code: 'VE', label: 'Venezuela (SENIAT)' },
  { code: 'CO', label: 'Colombia (DIAN)' },
  { code: 'PE', label: 'Perú (SUNAT)' },
];

export default function FiscalPage(): ReactElement {
  const { tenant } = useTenant();
  // El país por defecto es el configurado en el registro del tenant (Fase 1
  // multi-país); el selector permite previsualizar la estrategia de otro
  // país sin cambiar la configuración real.
  const [pais, setPais] = useState<string>('VE');
  const [estrategia, setEstrategia] = useState<TaxStrategyInfo | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (tenant?.pais_codigo) setPais(tenant.pais_codigo);
  }, [tenant?.pais_codigo]);

  const loadData = useCallback(async (country: string) => {
    setCargando(true);
    try {
      const data = await getTaxStrategy(country);
      setEstrategia(data);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('Error al cargar la estrategia fiscal.');
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    loadData(pais);
  }, [pais, loadData]);

  const countryName = useMemo(() => {
    if (estrategia?.country_name) return estrategia.country_name;
    return PAISES.find((p) => p.code === pais)?.label ?? pais;
  }, [estrategia, pais]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Landmark size={20} />}
        title="Estrategia Fiscal"
        description="Consulta los impuestos y retenciones aplicables según el país de operación."
        actions={
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-slate-400" />
            <select
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm font-semibold bg-white"
              aria-label="Seleccionar país"
            >
              {PAISES.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {cargando ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="space-y-3">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </Card>
          <Card className="lg:col-span-2 space-y-3">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-32 w-full" />
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información del país */}
          <Card className="flex flex-col">
            <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center mb-4">
              <Landmark size={24} />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">País</h3>
            <p className="text-sm text-slate-600">{countryName}</p>
            <p className="text-xs text-slate-400 mt-1 font-mono uppercase">{estrategia?.country_code}</p>
            {tenant?.pais_codigo && pais === tenant.pais_codigo && (
              <span className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full w-fit">
                <BadgeCheck size={12} /> Tu país configurado
              </span>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-3">Países disponibles</h4>
              <div className="flex flex-wrap gap-2">
                {(estrategia?.available_countries ?? []).map((c) => (
                  <span
                    key={c.code}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      c.code === estrategia?.country_code
                        ? 'bg-primary-50 text-primary-700 border-primary-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    {c.country} ({c.code})
                  </span>
                ))}
              </div>
            </div>
          </Card>

          {/* Tasas de impuestos */}
          <Card className="lg:col-span-2">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4">
              <Scale size={24} />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1 flex items-center gap-2">
              Tasas de Impuestos
              <span className="text-xs font-semibold text-slate-400">({countryName})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              Estas son las tasas autoritativas que el backend aplica al calcular IVA y retenciones.
            </p>

            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-4 pl-6">Código</th>
                    <th className="p-4">Nombre</th>
                    <th className="p-4 text-right">Tasa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(estrategia?.tax_rates ?? []).map((tasa) => (
                    <tr key={tasa.code} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 pl-6 font-mono font-bold text-slate-900">{tasa.code}</td>
                      <td className="p-4 text-slate-700">{tasa.name}</td>
                      <td className="p-4 text-right font-black text-primary-700">
                        {parseDecimal(tasa.rate).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                  {(estrategia?.tax_rates ?? []).length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-400 text-sm">
                        No hay tasas registradas para este país.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
