"use client";

import { useState, useCallback, useEffect, useMemo, type ReactElement } from 'react';
import { Landmark, Loader2, Scale, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { TaxStrategyInfo } from '@/types/api';
import { getTaxStrategy } from '@/services/configuracionService';
import { getApiErrorMessages, parseDecimal } from '@/utils/helpers';

const PAISES = [
  { code: 'VE', label: 'Venezuela (SENIAT)' },
  { code: 'CO', label: 'Colombia (DIAN)' },
  { code: 'PE', label: 'Perú (SUNAT)' },
];

export default function FiscalPage(): ReactElement {
  const [pais, setPais] = useState<string>('VE');
  const [estrategia, setEstrategia] = useState<TaxStrategyInfo | null>(null);
  const [cargando, setCargando] = useState(true);

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
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Estrategia Fiscal</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consulta los impuestos y retenciones aplicables según el país de operación.
          </p>
        </div>

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
      </div>

      {cargando ? (
        <div className="flex items-center justify-center h-48 text-slate-500">
          <Loader2 size={24} className="animate-spin mr-2" /> Cargando estrategia fiscal...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información del país */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center mb-4">
              <Landmark size={24} />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">País</h3>
            <p className="text-sm text-slate-600">{countryName}</p>
            <p className="text-xs text-slate-400 mt-1 font-mono uppercase">{estrategia?.country_code}</p>

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
          </div>

          {/* Tasas de impuestos */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
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

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
          </div>
        </div>
      )}
    </div>
  );
}
