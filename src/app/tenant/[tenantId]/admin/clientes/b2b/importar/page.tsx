"use client";

import type { ReactElement } from 'react';
import Dropzone from '@/components/ui/Dropzone';
import { bulkUploadClientesB2B } from '@/services/clientesService';
import { Users } from 'lucide-react';
import { PageHeader, Card, FadeIn } from '@/components/ui';

/**
 * Página para la carga masiva de clientes B2B.
 * @returns {ReactElement} El componente de la página de importación de clientes B2B.
 */
export default function ImportarClientesB2BPage(): ReactElement {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Users size={20} />}
        title="Importar Clientes B2B"
        description="Sube un archivo CSV o XLSX para crear tu red de clientes mayoristas."
      />
      <FadeIn delay={0.05}>
        <Card>
          <Dropzone onUpload={bulkUploadClientesB2B} uploadLabel="Procesar Archivo de Clientes" />
        </Card>
      </FadeIn>
    </div>
  );
}
