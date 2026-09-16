"use client";

import type { ReactElement } from 'react';
import { History } from 'lucide-react';
import { AppModal, ActionButton, Badge } from '@/components/ui';
import type { RegistroAuditoria } from '@/types/api';

interface CambiosModalProps {
  registro: RegistroAuditoria;
  onClose: () => void;
}

function formatearValor(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  return String(valor);
}

/** Muestra el detalle campo por campo (antes/después) de un registro de auditoría. */
export default function CambiosModal({ registro, onClose }: CambiosModalProps): ReactElement {
  const cambios = registro.cambios ? Object.entries(registro.cambios) : [];

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={registro.objeto_repr || registro.modelo}
      icon={<History size={20} />}
      size="md"
      footer={<ActionButton variant="secondary" onClick={onClose}>Cerrar</ActionButton>}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Badge tone="slate">{registro.modelo}</Badge>
          <span>{new Date(registro.fecha).toLocaleString('es-VE', { dateStyle: 'long', timeStyle: 'medium' })}</span>
          <span>· {registro.usuario_nombre || 'Sistema'}</span>
          {registro.ip_address && <span className="font-mono">· {registro.ip_address}</span>}
        </div>

        {cambios.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Sin detalle de cambios para este registro.</p>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase">
                  <th className="p-3 text-left">Campo</th>
                  <th className="p-3 text-left">Antes</th>
                  <th className="p-3 text-left">Después</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cambios.map(([campo, valor]) => (
                  <tr key={campo}>
                    <td className="p-3 font-semibold text-slate-700">{campo}</td>
                    <td className="p-3 text-red-600 font-mono text-xs break-all">{formatearValor(valor.antes)}</td>
                    <td className="p-3 text-green-700 font-mono text-xs break-all">{formatearValor(valor.despues)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppModal>
  );
}
