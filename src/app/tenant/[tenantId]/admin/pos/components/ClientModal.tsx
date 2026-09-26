"use client";

import type { ReactElement } from 'react';
import { Cliente } from '@/types/api';
import ClienteFormModal from '@/components/clientes/ClienteFormModal';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: (newClient: Cliente) => void;
}

/**
 * Alta rápida de cliente reutilizada desde varias pantallas (POS, CRM,
 * Postventa, Mesas, Servicios, Contabilidad) -- envuelve el formulario
 * compartido `ClienteFormModal` (mismo que usa el módulo de Clientes) para
 * que todas se beneficien por igual del tipo de documento por país y los
 * campos de contribuyente especial / días de crédito, sin mantener un
 * formulario de cliente distinto en cada lugar.
 */
export default function ClientModal({ isOpen, onClose, onClientCreated }: ClientModalProps): ReactElement | null {
  if (!isOpen) return null;
  return <ClienteFormModal onClose={onClose} onSaved={onClientCreated} />;
}
