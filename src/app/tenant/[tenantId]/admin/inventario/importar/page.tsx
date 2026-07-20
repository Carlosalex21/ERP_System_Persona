"use client";

import type { ReactElement } from 'react';
import Dropzone from '@/components/ui/Dropzone';
import { bulkUploadProductos } from '@/services/inventoryService';
import { FileText } from 'lucide-react';

/**
 * Página para la carga masiva de productos en el inventario.
 * @returns {ReactElement} El componente de la página de importación de productos.
 */
export default function ImportarProductosPage(): ReactElement {
  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <FileText size={32} className="text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Importar Productos Masivamente</h1>
          <p className="text-slate-500">Sube un archivo CSV o XLSX para añadir o actualizar productos rápidamente.</p>
        </div>
      </div>
      
      <Dropzone onUpload={bulkUploadProductos} uploadLabel="Procesar Archivo de Productos" />
    </div>
  );
}