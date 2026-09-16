"use client";

import { useState, type ReactElement } from 'react';
import Dropzone from '@/components/ui/Dropzone';
import BulkUploadResultPanel from '@/components/ui/BulkUploadResultPanel';
import { bulkUploadClientes, descargarPlantillaClientes } from '@/services/clientesService';
import { Users, Download } from 'lucide-react';
import { PageHeader, Card, FadeIn } from '@/components/ui';
import type { ClienteBulkUploadResult } from '@/types/api';

/**
 * Página para la carga masiva de clientes (retail).
 * @returns {ReactElement} El componente de la página de importación de clientes.
 */
export default function ImportarClientesPage(): ReactElement {
  const [resultado, setResultado] = useState<ClienteBulkUploadResult | null>(null);

  const subir = async (file: File) => {
    const res = await bulkUploadClientes(file);
    setResultado(res);
    return res;
  };

  const descargarPlantilla = async () => {
    const blob = await descargarPlantillaClientes();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_clientes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Users size={20} />}
        title="Importar Clientes Masivamente"
        description="Sube un archivo CSV o XLSX para añadir o actualizar clientes rápidamente."
        actions={
          <button
            onClick={descargarPlantilla}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
          >
            <Download size={16} /> Descargar plantilla
          </button>
        }
      />
      <FadeIn delay={0.05}>
        <Card>
          <div className="text-xs text-slate-500 mb-4 bg-slate-50 border rounded-lg p-3">
            <p className="font-bold text-slate-600 mb-1">Columnas del archivo:</p>
            <p><span className="font-mono">nombre</span> -- obligatoria.</p>
            <p><span className="font-mono">telefono</span>, <span className="font-mono">email</span>, <span className="font-mono">tipo_documento</span> (V/E/J/G/P), <span className="font-mono">documento</span>, <span className="font-mono">direccion</span> -- opcionales.</p>
            <p className="mt-1">Si una fila trae <span className="font-mono">telefono</span>, <span className="font-mono">email</span> o (<span className="font-mono">tipo_documento</span> + <span className="font-mono">documento</span>) de un cliente que ya existe, se actualiza en vez de duplicarse.</p>
          </div>
          <Dropzone onUpload={subir} uploadLabel="Procesar Archivo de Clientes" />
          {resultado && (
            <BulkUploadResultPanel
              totalFilas={resultado.total_filas}
              creados={resultado.clientes_creados}
              actualizados={resultado.clientes_actualizados}
              errores={resultado.errores}
            />
          )}
        </Card>
      </FadeIn>
    </div>
  );
}
