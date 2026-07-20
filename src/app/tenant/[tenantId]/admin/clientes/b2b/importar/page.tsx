"use client";

import type { ReactElement } from 'react';
import Dropzone from '@/components/ui/Dropzone';
import { bulkUploadClientesB2B } from '@/services/clientesService';
import { Users } from 'lucide-react';

/**
 * Página para la carga masiva de clientes B2B.
 * @returns {ReactElement} El componente de la página de importación de clientes B2B.
 */
export default function ImportarClientesB2BPage(): ReactElement {
  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <Users size={32} className="text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Importar Clientes B2B</h1>
          <p className="text-slate-500">Sube un archivo CSV o XLSX para crear tu red de clientes mayoristas.</p>
        </div>
      </div>
      
      <Dropzone onUpload={bulkUploadClientesB2B} uploadLabel="Procesar Archivo de Clientes" />
    </div>
  );
}