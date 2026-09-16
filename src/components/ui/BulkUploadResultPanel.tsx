/**
 * @file Muestra el resultado de una carga masiva (productos, clientes...):
 * cuántas filas se crearon/actualizaron y el detalle de las que fallaron.
 * Antes la carga masiva solo mostraba un toast genérico ("procesando en
 * segundo plano") sin ninguna forma de saber si de verdad funcionó -- este
 * panel muestra el resumen real que ya viene en la respuesta síncrona.
 */
"use client";

import type { ReactElement } from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { BulkUploadErrorRow } from '@/types/api';

interface BulkUploadResultPanelProps {
  totalFilas: number;
  creados: number;
  actualizados: number;
  errores: BulkUploadErrorRow[];
}

export default function BulkUploadResultPanel({ totalFilas, creados, actualizados, errores }: BulkUploadResultPanelProps): ReactElement {
  return (
    <div className="mt-6 space-y-4 animate-fade-in">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 border rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-slate-800">{totalFilas}</p>
          <p className="text-[11px] text-slate-500 font-bold uppercase">Filas leídas</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-green-700 flex items-center justify-center gap-1">
            <CheckCircle2 size={18} /> {creados}
          </p>
          <p className="text-[11px] text-green-700 font-bold uppercase">Creados</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-blue-700">{actualizados}</p>
          <p className="text-[11px] text-blue-700 font-bold uppercase">Actualizados</p>
        </div>
      </div>

      {errores.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="font-bold text-red-800 text-sm flex items-center gap-1.5 mb-2">
            <AlertTriangle size={16} /> {errores.length} fila(s) con error -- no se importaron
          </p>
          <div className="max-h-64 overflow-y-auto space-y-1.5">
            {errores.map((e, i) => (
              <div key={i} className="text-xs bg-white border border-red-100 rounded-lg px-3 py-2 flex items-start gap-2">
                <XCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-700">Fila {e.fila}:</span>{' '}
                  <span className="text-slate-600">{e.error}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
