"use client";

import { useState, useEffect, type ReactElement } from 'react';
import { Wrench } from 'lucide-react';
import { AppModal, ActionButton } from '@/components/ui';
import { createProducto, updateProducto } from '@/services/inventoryService';
import { getMonedas } from '@/services/configuracionService';
import { useNotify } from '@/hooks/useNotify';
import type { Producto, Moneda } from '@/types/api';

interface ServicioFacturableModalProps {
  servicio?: Producto | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Alta rápida de un concepto facturable (ej. "Honorarios Profesionales",
 * "Declaración de ISLR") para un contador -- reutiliza `Producto`
 * (tipo='servicio', ver ProductModal en Inventario) pero sin ninguno de los
 * campos de stock/almacén/categoría que no le sirven a un contador.
 */
export default function ServicioFacturableModal({ servicio, onClose, onSaved }: ServicioFacturableModalProps): ReactElement {
  const notify = useNotify();
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [nombre, setNombre] = useState(servicio?.nombre || '');
  const [descripcion, setDescripcion] = useState(servicio?.descripcion || '');
  const [precio, setPrecio] = useState(servicio?.precio || '');
  const [monedaId, setMonedaId] = useState(servicio?.moneda ? String(servicio.moneda) : '');
  const [guardando, setGuardando] = useState(false);
  const editando = !!servicio;

  useEffect(() => {
    getMonedas().then((lista) => {
      setMonedas(lista);
      if (!monedaId) {
        const base = lista.find((m) => m.es_predeterminada);
        if (base) setMonedaId(String(base.id));
      }
    }).catch(() => setMonedas([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardar = async (): Promise<void> => {
    if (!nombre.trim() || !precio) {
      notify.error('Ponle un nombre y un precio al concepto.');
      return;
    }
    setGuardando(true);
    try {
      const data = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        precio,
        cantidad: 0,
        stock_minimo: null,
        almacen: null,
        codigo_barras: null,
        sku: null,
        peso: null,
        dimensiones: null,
        categoria: null,
        configuracion_iva: null,
        moneda: monedaId ? Number(monedaId) : null,
        disponible_online: false,
        es_insumo: false,
        tipo: 'servicio' as const,
        activo: true,
      };
      if (editando) {
        await updateProducto(servicio.id, data);
        notify.success('Concepto actualizado.');
      } else {
        await createProducto(data);
        notify.success('Concepto creado.');
      }
      onSaved();
    } catch {
      notify.error('No se pudo guardar el concepto.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={editando ? 'Editar Concepto' : 'Nuevo Concepto Facturable'}
      icon={<Wrench size={20} />}
      size="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton loading={guardando} onClick={guardar}>{editando ? 'Guardar' : 'Crear'}</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Concepto</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Honorarios Profesionales, Declaración de ISLR..." className="w-full px-3 py-2 border rounded-lg text-sm" autoFocus />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción (opcional)</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Precio de referencia</label>
            <input type="number" step="0.01" min={0} value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <p className="mt-1 text-[11px] text-slate-400">Puedes cobrar un monto distinto en cada factura, esto es solo el valor por defecto.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Moneda</label>
            <select value={monedaId} onChange={(e) => setMonedaId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              {monedas.map((m) => (
                <option key={m.id} value={m.id}>{m.codigo} {m.es_predeterminada ? '(base)' : ''}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </AppModal>
  );
}
