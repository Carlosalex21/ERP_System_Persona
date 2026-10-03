"use client";

import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Paperclip, ReceiptText } from 'lucide-react';
import toast from 'react-hot-toast';

import { ActionButton, AppModal } from '@/components/ui';
import { actualizarGastoComun, crearGastoComun, type CategoriaGasto, type Edificio, type GastoComun } from '@/services/inmueblesService';
import { getProveedores } from '@/services/proveedoresService';
import { toastApiError } from '@/utils/errors';
import { hoyISO, periodoLabel } from '@/components/inmuebles/formato';
import type { Proveedor } from '@/types/api';

interface Props {
  edificio: Edificio;
  periodo: string;
  gasto: GastoComun | null;
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIAS: { valor: CategoriaGasto; etiqueta: string }[] = [
  { valor: 'vigilancia', etiqueta: 'Vigilancia' }, { valor: 'aseo', etiqueta: 'Aseo y limpieza' }, { valor: 'electricidad', etiqueta: 'Electricidad áreas comunes' },
  { valor: 'agua', etiqueta: 'Agua' }, { valor: 'ascensor', etiqueta: 'Ascensor' }, { valor: 'mantenimiento', etiqueta: 'Mantenimiento y reparaciones' },
  { valor: 'jardineria', etiqueta: 'Jardinería' }, { valor: 'administracion', etiqueta: 'Administración' }, { valor: 'seguros', etiqueta: 'Seguros' },
  { valor: 'legales', etiqueta: 'Honorarios legales' }, { valor: 'otros', etiqueta: 'Otros' },
];

const campo = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const etiqueta = 'block text-xs font-bold text-slate-500 uppercase mb-1';

export default function GastoModal({ edificio, periodo, gasto, onClose, onSaved }: Props): ReactElement {
  const [categoria, setCategoria] = useState<CategoriaGasto>(gasto?.categoria ?? 'vigilancia');
  const [descripcion, setDescripcion] = useState(gasto?.descripcion ?? '');
  const [monto, setMonto] = useState(gasto?.monto_usd ?? '');
  const [fecha, setFecha] = useState(gasto?.fecha ?? hoyISO());
  const [proveedor, setProveedor] = useState(String(gasto?.proveedor ?? ''));
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { getProveedores().then(setProveedores).catch(() => setProveedores([])); }, []);

  const guardar = async (): Promise<void> => {
    if (!descripcion.trim()) return void toast.error('Describe el gasto.');
    if (!(Number(monto) > 0)) return void toast.error('Indica el monto en USD.');
    setGuardando(true);
    try {
      const datos = {
        edificio: edificio.id, periodo, categoria, descripcion: descripcion.trim(), monto_usd: String(monto), fecha,
        proveedor: proveedor ? Number(proveedor) : null, comprobante: archivo,
      };
      if (gasto) await actualizarGastoComun(gasto.id, datos);
      else await crearGastoComun(datos);
      toast.success(gasto ? 'Gasto actualizado.' : 'Gasto agregado.');
      onSaved();
    } catch (e) {
      toastApiError(e, 'No se pudo guardar el gasto.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={gasto ? 'Editar gasto' : `Nuevo gasto · ${periodoLabel(periodo)}`}
      icon={<ReceiptText size={20} />}
      size="md"
      footer={<><ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton><ActionButton onClick={guardar} loading={guardando}>Guardar</ActionButton></>}
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-400 -mt-1">{edificio.nombre}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={etiqueta}>Categoría</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaGasto)} className={campo}>
              {CATEGORIAS.map((c) => <option key={c.valor} value={c.valor}>{c.etiqueta}</option>)}
            </select>
          </div>
          <div>
            <label className={etiqueta}>Monto (USD) *</label>
            <input type="number" min={0} step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className={campo} placeholder="0.00" autoFocus />
          </div>
          <div className="sm:col-span-2">
            <label className={etiqueta}>Descripción *</label>
            <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={campo} placeholder="Ej: Vigilancia, quincena 1" />
          </div>
          <div>
            <label className={etiqueta}>Fecha del gasto</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
          </div>
          <div>
            <label className={etiqueta}>Proveedor</label>
            <select value={proveedor} onChange={(e) => setProveedor(e.target.value)} className={campo}>
              <option value="">Sin especificar</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
        </div>
        <button type="button" onClick={() => input.current?.click()} className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl py-3 text-sm text-slate-500 hover:border-primary-400 hover:bg-primary-50/40">
          <Paperclip size={16} /> {archivo ? archivo.name : gasto?.comprobante_url ? 'Reemplazar comprobante (factura o recibo)' : 'Adjuntar comprobante (opcional)'}
        </button>
        <input ref={input} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
      </div>
    </AppModal>
  );
}
