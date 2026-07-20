"use client";

import type { ReactElement } from 'react';
import { BarChart3 } from 'lucide-react';

/**
 * Página de Reportes.
 * Actualmente es un placeholder.
 * @returns {ReactElement} El componente de la página de Reportes.
 */
export default function ReportesPage(): ReactElement {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
      <div className="text-center">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 size={32} />
        </div>
        <h3 className="font-bold text-lg text-slate-600 capitalize">Módulo de Reportes</h3>
        <p className="text-sm text-slate-500">Esta funcionalidad se encuentra en desarrollo.</p>
      </div>
    </div>
  );
}

