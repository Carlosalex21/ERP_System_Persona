"use client";

import { useEffect, useState, type ReactElement } from 'react';
import { Download, ReceiptText } from 'lucide-react';

import { ActionButton, AppModal } from '@/components/ui';
import { getEstadoCuenta, pdfEstadoCuenta, type EstadoCuenta } from '@/services/inmueblesService';
import { toastApiError } from '@/utils/errors';
import { fechaCorta, numero, usd } from '@/components/inmuebles/formato';

interface Props {
  unidadId: number;
  titulo: string;
  onClose: () => void;
}

export default function EstadoCuentaModal({ unidadId, titulo, onClose }: Props): ReactElement {
  const [datos, setDatos] = useState<EstadoCuenta | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    getEstadoCuenta(unidadId)
      .then(setDatos)
      .catch((e) => toastApiError(e, 'No se pudo cargar el estado de cuenta.'))
      .finally(() => setCargando(false));
  }, [unidadId]);

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={`Estado de cuenta · ${titulo}`}
      icon={<ReceiptText size={20} />}
      size="xl"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cerrar</ActionButton>
          <ActionButton onClick={() => pdfEstadoCuenta(unidadId).catch((e) => toastApiError(e, 'No se pudo generar el PDF.'))}><Download size={16} /> Ver PDF</ActionButton>
        </>
      }
    >
      {cargando || !datos ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-slate-200"><p className="text-[11px] font-bold uppercase text-slate-400">Saldo</p><p className="text-xl font-black font-mono tabular-nums text-slate-900">{usd(datos.saldo_usd)}</p></div>
            <div className="p-3 rounded-xl border border-red-200 bg-red-50/50"><p className="text-[11px] font-bold uppercase text-red-400">Vencido</p><p className="text-xl font-black font-mono tabular-nums text-red-600">{usd(datos.vencido_usd)}</p></div>
            <div className="p-3 rounded-xl border border-slate-200"><p className="text-[11px] font-bold uppercase text-slate-400">Saldo a favor</p><p className="text-xl font-black font-mono tabular-nums text-green-600">{usd(datos.saldo_a_favor_usd)}</p></div>
          </div>
          <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[50vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0"><tr className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold"><th className="px-3 py-2 text-left">Fecha</th><th className="px-3 py-2 text-left">Concepto</th><th className="px-3 py-2 text-right">Cargo</th><th className="px-3 py-2 text-right">Pago</th><th className="px-3 py-2 text-right">Saldo</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {datos.movimientos.map((m, i) => (
                  <tr key={`${m.referencia}-${i}`}>
                    <td className="px-3 py-2 text-slate-500 tabular-nums whitespace-nowrap">{fechaCorta(m.fecha)}</td>
                    <td className="px-3 py-2"><p className="text-slate-800">{m.concepto}</p>{m.vencimiento && <p className="text-[11px] text-slate-400">vence {fechaCorta(m.vencimiento)}</p>}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{m.tipo === 'cargo' ? numero(m.debe) : ''}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-green-600">{m.tipo === 'pago' ? numero(m.haber) : ''}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums font-bold">{numero(m.saldo)}</td>
                  </tr>
                ))}
                {datos.movimientos.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Esta unidad todavía no tiene movimientos.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400">Montos en USD. Un saldo positivo es lo que se debe.</p>
        </div>
      )}
    </AppModal>
  );
}
