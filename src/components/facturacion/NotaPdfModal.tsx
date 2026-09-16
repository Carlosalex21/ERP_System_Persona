/**
 * @file Modal para previsualizar en PDF una Nota de Crédito o de Débito --
 * antes no existía forma de imprimir/ver una nota como documento (solo se
 * veía como fila en la tabla). Mismo patrón que `FacturaPdfModal`.
 */
"use client";

import { useEffect, useState, type ReactElement } from 'react';
import { Download, ExternalLink, FileText, Loader2 } from 'lucide-react';

import { useNotify } from '@/hooks/useNotify';
import { obtenerNotaCreditoPdfBlobUrl, obtenerNotaDebitoPdfBlobUrl } from '@/services/facturacionService';
import { AppModal, ActionButton } from '@/components/ui';

interface NotaPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  notaId: number | null;
  tipo: 'credito' | 'debito';
}

export default function NotaPdfModal({ isOpen, onClose, notaId, tipo }: NotaPdfModalProps): ReactElement | null {
  const notify = useNotify();
  const [cargando, setCargando] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !notaId) return;
    let cancelado = false;
    setCargando(true);
    setBlobUrl(null);

    const fetcher = tipo === 'credito' ? obtenerNotaCreditoPdfBlobUrl : obtenerNotaDebitoPdfBlobUrl;
    fetcher(notaId)
      .then(url => {
        if (cancelado) {
          window.URL.revokeObjectURL(url);
          return;
        }
        setBlobUrl(url);
      })
      .catch(() => {
        if (!cancelado) notify.error('No se pudo cargar la nota.');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, notaId, tipo]);

  useEffect(() => {
    if (!blobUrl) return;
    return () => window.URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  if (!isOpen || !notaId) return null;

  const titulo = tipo === 'credito' ? 'Nota de Crédito' : 'Nota de Débito';

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={titulo}
      icon={<FileText size={20} />}
      size="full"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cerrar</ActionButton>
          {blobUrl && (
            <>
              <ActionButton variant="secondary" onClick={() => window.open(blobUrl, '_blank')}>
                <ExternalLink size={16} className="mr-1.5" /> Abrir en pestaña
              </ActionButton>
              <ActionButton
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = blobUrl;
                  link.download = `${tipo === 'credito' ? 'nota_credito' : 'nota_debito'}_${notaId}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                }}
              >
                <Download size={16} className="mr-1.5" /> Descargar
              </ActionButton>
            </>
          )}
        </>
      }
    >
      <div className="h-[75vh] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
        {cargando ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-sm font-semibold">Generando documento...</p>
          </div>
        ) : blobUrl ? (
          <iframe src={blobUrl} title={titulo} className="w-full h-full" />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
            <FileText size={32} />
            <p className="text-sm font-semibold">No se pudo cargar el documento.</p>
          </div>
        )}
      </div>
    </AppModal>
  );
}
