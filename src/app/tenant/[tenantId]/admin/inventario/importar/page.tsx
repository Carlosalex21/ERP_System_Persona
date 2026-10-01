"use client";

import { useState, type ReactElement } from 'react';
import Dropzone from '@/components/ui/Dropzone';
import BulkUploadResultPanel from '@/components/ui/BulkUploadResultPanel';
import { bulkUploadProductos, descargarPlantillaProductos } from '@/services/inventoryService';
import { FileText, Download } from 'lucide-react';
import { PageHeader, Card, FadeIn } from '@/components/ui';
import type { ProductoBulkUploadResult } from '@/types/api';

/**
 * Página para la carga masiva de productos en el inventario.
 * @returns {ReactElement} El componente de la página de importación de productos.
 */
export default function ImportarProductosPage(): ReactElement {
  const [resultado, setResultado] = useState<ProductoBulkUploadResult | null>(null);

  const subir = async (file: File) => {
    const res = await bulkUploadProductos(file);
    setResultado(res);
    return res;
  };

  const descargarPlantilla = async () => {
    const blob = await descargarPlantillaProductos();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_productos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<FileText size={20} />}
        title="Importar Productos Masivamente"
        description="Sube un archivo CSV o XLSX para añadir o actualizar productos rápidamente."
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
            <p><span className="font-mono">nombre</span>, <span className="font-mono">precio</span> -- obligatorias.</p>
            <p><span className="font-mono">codigo_barras</span>, <span className="font-mono">sku</span>, <span className="font-mono">stock_inicial</span>, <span className="font-mono">costo</span>, <span className="font-mono">categoria</span>, <span className="font-mono">iva</span>, <span className="font-mono">descripcion</span> -- opcionales.</p>
            <p className="mt-1">Si una fila trae <span className="font-mono">codigo_barras</span> o <span className="font-mono">sku</span> de un producto que ya existe, se actualiza en vez de duplicarse -- pero <span className="font-mono">stock_inicial</span>/<span className="font-mono">costo</span> solo se aplican al crearlo; para corregirle el stock o el costo después, usa Ajustes de Inventario.</p>
          </div>
          <Dropzone onUpload={subir} uploadLabel="Procesar Archivo de Productos" />
          {resultado && (
            <BulkUploadResultPanel
              totalFilas={resultado.total_filas}
              creados={resultado.productos_creados}
              actualizados={resultado.productos_actualizados}
              errores={resultado.errores}
            />
          )}
        </Card>
      </FadeIn>
    </div>
  );
}
