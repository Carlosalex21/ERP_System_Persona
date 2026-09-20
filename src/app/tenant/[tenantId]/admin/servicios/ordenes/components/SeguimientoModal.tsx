"use client";

import type { ReactElement } from 'react';
import { Share2 } from 'lucide-react';
import { AppModal, ActionButton } from '@/components/ui';
import QrCode from '@/components/QrCode';
import { getTenantSubdomain, tenantUrl } from '@/utils/tenantUrl';
import type { OrdenServicio } from '@/services/serviciosService';

interface SeguimientoModalProps {
  orden: OrdenServicio;
  onClose: () => void;
}

/** Muestra el QR/link de seguimiento para que el cliente vea el estado de su orden sin login. */
export default function SeguimientoModal({ orden, onClose }: SeguimientoModalProps): ReactElement {
  const subdominio = getTenantSubdomain();
  const url = subdominio ? tenantUrl(subdominio, `/seguimiento/${orden.token_publico}`) : '';

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={`Seguimiento OS-${orden.numero}`}
      icon={<Share2 size={20} />}
      size="sm"
      footer={<ActionButton variant="secondary" onClick={onClose}>Cerrar</ActionButton>}
    >
      <div className="flex flex-col items-center gap-4 py-2">
        <QrCode value={url} size={200} />
        <p className="text-xs text-slate-500 text-center max-w-xs">
          Comparte este código o el link con el cliente para que vea en vivo el estado de su equipo, sin necesidad de llamarte.
        </p>
        <p className="text-[11px] font-mono text-slate-400 break-all text-center">{url}</p>
      </div>
    </AppModal>
  );
}
