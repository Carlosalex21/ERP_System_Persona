/**
 * @file Modal grande para previsualizar la factura en PDF justo después de
 * facturar (POS/catálogo) o desde el detalle de un pedido -- antes "ver
 * factura" solo abría una pestaña nueva desde un botón chiquito en el aviso
 * de venta exitosa, lo que en varios navegadores/flujos pasaba desapercibido
 * o quedaba bloqueado como pop-up. Aquí se ve embebida, en grande, con
 * opciones explícitas de abrir en pestaña o descargar.
 */
"use client";

import { useEffect, useState, type ReactElement } from 'react';
import { Download, ExternalLink, FileText, Loader2 } from 'lucide-react';

import { useNotify } from '@/hooks/useNotify';
import { obtenerFacturaPdfBlobUrl } from '@/services/facturacionService';
import { AppModal, ActionButton } from '@/components/ui';

interface FacturaPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  facturaId: number | null;
}

export default function FacturaPdfModal({ isOpen, onClose, facturaId }: FacturaPdfModalProps): ReactElement | null {
  const notify = useNotify();
  const [cargando, setCargando] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !facturaId) return;
    let cancelado = false;
    setCargando(true);
    setBlobUrl(null);

    obtenerFacturaPdfBlobUrl(facturaId)
      .then(url => {
        if (cancelado) {
          window.URL.revokeObjectURL(url);
          return;
        }
        setBlobUrl(url);
      })
      .catch(() => {
        if (!cancelado) notify.error('No se pudo cargar la factura.');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
    // `notify` (de `useNotify()`) es un objeto nuevo en cada render -- si
    // entrara en las dependencias, el efecto se re-disparaba en bucle
    // infinito (cada fetch exitoso causaba un re-render, que volvía a
    // disparar el efecto), lo que de hecho pasó: docenas de peticiones
    // duplicadas al mismo PDF. Solo debe correr cuando cambia qué factura
    // se está mostrando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, facturaId]);

  // Libera el object URL al cerrar/desmontar para no acumular memoria.
  useEffect(() => {
    if (!blobUrl) return;
    return () => window.URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  if (!isOpen || !facturaId) return null;

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Factura"
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
                  link.download = `factura_${facturaId}.pdf`;
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
            <p className="text-sm font-semibold">Generando factura...</p>
          </div>
        ) : blobUrl ? (
          <iframe src={blobUrl} title="Factura" className="w-full h-full" />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
            <FileText size={32} />
            <p className="text-sm font-semibold">No se pudo cargar la factura.</p>
          </div>
        )}
      </div>
    </AppModal>
  );
}
