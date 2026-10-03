"use client";

import { useRef, useState, type ReactElement } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

import { ActionButton, AppModal } from '@/components/ui';
import { descargarPlantillaUnidades, importarUnidades, type Edificio, type ResumenImportacion } from '@/services/inmueblesService';
import { toastApiError } from '@/utils/errors';

interface Props {
  edificios: Edificio[];
  edificioInicial: number | null;
  onClose: () => void;
  onDone: () => void;
}

export default function ImportarUnidadesModal({ edificios, edificioInicial, onClose, onDone }: Props): ReactElement {
  const [edificio, setEdificio] = useState(String(edificioInicial ?? (edificios.length === 1 ? edificios[0].id : '')));
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resumen, setResumen] = useState<ResumenImportacion | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const importar = async (): Promise<void> => {
    if (!edificio) return void toast.error('Selecciona el edificio al que pertenecen las unidades.');
    if (!archivo) return void toast.error('Elige el archivo CSV.');
    setEnviando(true);
    try {
      const r = await importarUnidades(archivo, Number(edificio));
      setResumen(r);
      if (r.creadas > 0) {
        toast.success(`${r.creadas} unidad(es) creadas.`);
        onDone();
      }
    } catch (e) {
      toastApiError(e, 'No se pudo importar el archivo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Importar unidades desde CSV"
      icon={<FileSpreadsheet size={20} />}
      size="lg"
      footer={
        resumen
          ? <ActionButton onClick={onClose}>Listo</ActionButton>
          : <><ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton><ActionButton onClick={importar} loading={enviando}><Upload size={16} /> Importar</ActionButton></>
      }
    >
      {resumen ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-green-50 border border-green-200"><p className="text-2xl font-black text-green-700 flex items-center gap-2"><CheckCircle2 size={22} /> {resumen.creadas}</p><p className="text-xs font-bold text-green-700/80">unidades creadas</p></div>
            <div className={`p-4 rounded-xl border ${resumen.con_error ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}><p className={`text-2xl font-black flex items-center gap-2 ${resumen.con_error ? 'text-amber-700' : 'text-slate-400'}`}><AlertTriangle size={22} /> {resumen.con_error}</p><p className="text-xs font-bold text-slate-500">filas con problemas</p></div>
          </div>
          {resumen.errores.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold"><th className="px-3 py-2 text-left w-16">Fila</th><th className="px-3 py-2 text-left">Unidad</th><th className="px-3 py-2 text-left">Problema</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {resumen.errores.map((e) => <tr key={`${e.fila}-${e.codigo}`}><td className="px-3 py-2 tabular-nums text-slate-500">{e.fila}</td><td className="px-3 py-2 font-semibold">{e.codigo || '—'}</td><td className="px-3 py-2 text-slate-600">{e.error}</td></tr>)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600 space-y-2">
            <p>Prepara un archivo CSV con una fila por unidad. Las columnas son: <code className="text-xs bg-white px-1.5 py-0.5 rounded border">codigo</code>, <code className="text-xs bg-white px-1.5 py-0.5 rounded border">tipo</code>, <code className="text-xs bg-white px-1.5 py-0.5 rounded border">alicuota</code>, <code className="text-xs bg-white px-1.5 py-0.5 rounded border">area_m2</code> y los datos del propietario (nombre, documento, teléfono, correo).</p>
            <p className="text-xs text-slate-400">Si el propietario ya existe (misma cédula) se reutiliza; si no, se crea. Las unidades repetidas se omiten.</p>
            <button type="button" onClick={() => descargarPlantillaUnidades().catch((e) => toastApiError(e, 'No se pudo descargar la plantilla.'))} className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:underline"><Download size={14} /> Descargar plantilla de ejemplo</button>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Edificio *</label>
            <select value={edificio} onChange={(e) => setEdificio(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="">Selecciona...</option>
              {edificios.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => input.current?.click()} className="w-full border-2 border-dashed border-slate-300 rounded-xl py-8 text-center hover:border-primary-400 hover:bg-primary-50/40 transition-colors">
            <Upload size={22} className="mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-bold text-slate-600">{archivo ? archivo.name : 'Elegir archivo CSV'}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Máximo 1000 filas · 2 MB</p>
          </button>
          <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
        </div>
      )}
    </AppModal>
  );
}
