"use client";

import type { ReactElement } from 'react';
import { Download } from 'lucide-react';
import { exportarCSV, type ColumnaExport } from '@/utils/exportarDatos';

interface ExportButtonProps<T> {
  data: T[];
  columns: ColumnaExport<T>[];
  /** Nombre del archivo sin extensión (ej. "ventas-septiembre-2026"). */
  filename: string;
  /** Texto del botón (por defecto "Exportar"). */
  label?: string;
}

/** Botón compacto "Exportar" -- deshabilitado cuando no hay filas que exportar. */
export function ExportButton<T>({ data, columns, filename, label = 'Exportar' }: ExportButtonProps<T>): ReactElement {
  return (
    <button
      type="button"
      onClick={() => exportarCSV(data, columns, filename)}
      disabled={data.length === 0}
      className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      title={data.length === 0 ? 'No hay datos para exportar' : `Exportar ${data.length} fila(s) a CSV`}
    >
      <Download size={14} /> {label}
    </button>
  );
}
