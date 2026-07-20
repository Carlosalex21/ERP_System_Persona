"use client";

import { useState, useCallback, type ReactElement } from 'react';
import { useDropzone, type FileRejection, type DropzoneOptions, type FileError } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X, Loader2 } from 'lucide-react';
import { useNotify } from '@/hooks/useNotify';

interface DropzoneProps {
  onUpload: (file: File) => Promise<any>;
  uploadLabel?: string;
  acceptedFileTypes?: DropzoneOptions['accept'];
  maxFileSizeMB?: number;
}

/**
 * Componente de UI para arrastrar y soltar archivos, con manejo de subida y feedback.
 * @param {DropzoneProps} props - Propiedades para configurar el Dropzone.
 * @returns {ReactElement} El componente Dropzone.
 */
export default function Dropzone({
  onUpload,
  uploadLabel = "Subir Archivo",
  acceptedFileTypes = { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
  maxFileSizeMB = 5,
}: DropzoneProps): ReactElement {
  const notify = useNotify();
  const [file, setFile] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      fileRejections.forEach(({ errors }: FileRejection) => {
        errors.forEach((err: FileError) => notify.error(err.message));
      });
      return;
    }
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, [notify]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxSize: maxFileSizeMB * 1024 * 1024,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;
    setCargando(true);
    try {
      const response = await onUpload(file);
      notify.success(response.message || "Archivo recibido. El procesamiento ha comenzado en segundo plano.");
      setFile(null); // Limpiar al subir con éxito
    } catch (error: unknown) {
      const err = error as any;
      const apiError = err.response?.data?.detail || "Error al subir el archivo.";
      notify.error(apiError);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`p-10 border-2 border-dashed rounded-2xl cursor-pointer transition-colors text-center
          ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
            <UploadCloud className="text-slate-500" size={32} />
          </div>
          {isDragActive ? (
            <p className="font-bold text-primary-600">Suelta el archivo aquí...</p>
          ) : (
            <p className="text-slate-600">
              Arrastra y suelta un archivo <code className="font-mono">.csv</code> o <code className="font-mono">.xlsx</code>, o haz clic para seleccionar.
            </p>
          )}
          <p className="text-xs text-slate-400">Tamaño máximo: {maxFileSizeMB}MB</p>
        </div>
      </div>

      {file && (
        <div className="mt-6 p-4 bg-white border rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <FileIcon className="text-slate-500" size={20} />
            <span className="text-sm font-medium text-slate-700">{file.name}</span>
          </div>
          <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500"><X size={18} /></button>
        </div>
      )}

      <button onClick={handleUpload} disabled={!file || cargando} className="w-full mt-6 bg-primary-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 disabled:bg-primary-300 disabled:cursor-not-allowed">
        {cargando ? <Loader2 className="animate-spin" /> : <>{uploadLabel}</>}
      </button>
    </div>
  );
}