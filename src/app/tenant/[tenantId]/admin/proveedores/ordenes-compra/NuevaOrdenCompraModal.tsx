"use client";

import { useState, useEffect, useMemo, useRef, type ReactElement, type KeyboardEvent } from 'react';
import { Search, Trash2, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppModal, ActionButton } from '@/components/ui';
import { getProductos } from '@/services/inventoryService';
import { getAlmacenes } from '@/services/inventoryService';
import { getProveedores } from '@/services/proveedoresService';
import { crearOrdenCompra } from '@/services/proveedoresService';
import { toastApiError } from '@/utils/errors';
import type { Producto, Almacen, Proveedor, OrdenCompraDetalleRequest } from '@/types/api';

interface ItemBuscable {
  key: string;
  productoId: number;
  nombre: string;
  sku: string | null;
  codigoBarras: string | null;
}

interface Linea {
  key: string;
  item: ItemBuscable;
  cantidad: string;
  costo: string;
}

interface NuevaOrdenCompraModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function buildItemsBuscables(productos: Producto[]): ItemBuscable[] {
  return productos
    .filter((p) => p.tipo !== 'servicio')
    .map((p) => ({
      key: `p-${p.id}`, productoId: p.id, nombre: p.nombre,
      sku: p.sku ?? null, codigoBarras: p.codigo_barras ?? null,
    }));
}

export default function NuevaOrdenCompraModal({ onClose, onCreated }: NuevaOrdenCompraModalProps): ReactElement {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const [proveedorId, setProveedorId] = useState('');
  const [almacenId, setAlmacenId] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [guardando, setGuardando] = useState(false);
  const busquedaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [productosData, almacenesData, proveedoresData] = await Promise.all([
          getProductos(), getAlmacenes(), getProveedores(),
        ]);
        setProductos(productosData);
        setAlmacenes(almacenesData);
        setProveedores(proveedoresData);
      } catch {
        toast.error('No se pudieron cargar productos/almacenes/proveedores.');
      } finally {
        setCargandoDatos(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!cargandoDatos) busquedaInputRef.current?.focus();
  }, [cargandoDatos]);

  const itemsBuscables = useMemo(() => buildItemsBuscables(productos), [productos]);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    return itemsBuscables
      .filter((it) =>
        it.nombre.toLowerCase().includes(q) ||
        it.sku?.toLowerCase().includes(q) ||
        it.codigoBarras?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [busqueda, itemsBuscables]);

  const agregarLinea = (item: ItemBuscable): void => {
    setLineas((prev) => {
      const existente = prev.find((l) => l.key === item.key);
      if (existente) {
        return prev.map((l) => (l.key === item.key ? { ...l, cantidad: String(Number(l.cantidad || '0') + 1) } : l));
      }
      return [...prev, { key: item.key, item, cantidad: '1', costo: '' }];
    });
    setBusqueda('');
  };

  const manejarEnterBusqueda = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const texto = busqueda.trim();
    if (!texto) return;
    const matchExacto = itemsBuscables.find(
      (it) => it.codigoBarras?.toLowerCase() === texto.toLowerCase() || it.sku?.toLowerCase() === texto.toLowerCase(),
    );
    if (matchExacto) { agregarLinea(matchExacto); return; }
    if (resultados.length === 1) { agregarLinea(resultados[0]); return; }
    if (resultados.length === 0) toast.error(`No se encontró ningún producto para "${texto}".`);
  };

  const quitarLinea = (key: string): void => setLineas((prev) => prev.filter((l) => l.key !== key));
  const actualizarLinea = (key: string, campo: 'cantidad' | 'costo', valor: string): void => {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)));
  };

  const guardar = async (): Promise<void> => {
    if (!proveedorId) { toast.error('Selecciona el proveedor.'); return; }
    if (lineas.length === 0) { toast.error('Agrega al menos un producto a la orden.'); return; }
    for (const l of lineas) {
      const cantidad = Number(l.cantidad);
      if (!cantidad || cantidad <= 0) { toast.error(`Ingresa una cantidad válida para "${l.item.nombre}".`); return; }
    }

    const detalles: OrdenCompraDetalleRequest[] = lineas.map((l) => ({
      producto_id: l.item.productoId,
      cantidad: Number(l.cantidad),
      costo_unitario_esperado: l.costo.trim() ? l.costo.trim() : null,
    }));

    setGuardando(true);
    try {
      await crearOrdenCompra({
        proveedor_id: Number(proveedorId),
        almacen_id: almacenId ? Number(almacenId) : null,
        observaciones: observaciones.trim(),
        detalles,
      });
      toast.success('Orden de compra creada en borrador.');
      onCreated();
    } catch (error) {
      toastApiError(error, 'No se pudo crear la orden de compra.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Nueva Orden de Compra"
      icon={<ClipboardList size={20} />}
      size="xl"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton onClick={guardar} loading={guardando} disabled={cargandoDatos}>
            Crear Orden
          </ActionButton>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Proveedor</label>
            <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Selecciona...</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Almacén de destino (opcional)</label>
            <select value={almacenId} onChange={(e) => setAlmacenId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Sin especificar</option>
              {almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
        </div>

        <div className="relative">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Agregar producto</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={busquedaInputRef}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={manejarEnterBusqueda}
              placeholder="Busca por nombre, SKU o código de barras..."
              className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm"
              disabled={cargandoDatos}
            />
          </div>
          {resultados.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
              {resultados.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => agregarLinea(item)}
                  className="w-full text-left px-4 py-2.5 hover:bg-primary-50 transition-colors border-b border-slate-50 last:border-0"
                >
                  <span className="text-sm font-semibold text-slate-800">{item.nombre}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {lineas.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
            Busca y agrega los productos que quieres pedir.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase">
                  <th className="p-3 text-left">Producto</th>
                  <th className="p-3 text-center w-24">Cantidad</th>
                  <th className="p-3 text-center w-32">Costo esperado</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineas.map((l) => (
                  <tr key={l.key}>
                    <td className="p-3 font-semibold text-slate-800">{l.item.nombre}</td>
                    <td className="p-3">
                      <input type="number" min={1} value={l.cantidad} onChange={(e) => actualizarLinea(l.key, 'cantidad', e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-sm text-center" />
                    </td>
                    <td className="p-3">
                      <input type="number" min={0} step="0.000001" value={l.costo} onChange={(e) => actualizarLinea(l.key, 'costo', e.target.value)} placeholder="—" className="w-full px-2 py-1.5 border rounded-lg text-sm text-center" />
                    </td>
                    <td className="p-3 text-center">
                      <button type="button" onClick={() => quitarLinea(l.key)} className="text-slate-400 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observaciones (opcional)</label>
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
      </div>
    </AppModal>
  );
}
