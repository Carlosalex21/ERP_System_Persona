"use client";

import { useState, useEffect, useMemo, useRef, useCallback, type ReactElement, type KeyboardEvent } from 'react';
import { Search, Trash2, Shuffle } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppModal, ActionButton } from '@/components/ui';
import { getProductos, getAlmacenes, getInventarioPorAlmacen, crearTraslado } from '@/services/inventoryService';
import { toastApiError } from '@/utils/errors';
import type { Producto, Almacen, Inventario, TrasladoInventarioRequest, TrasladoInventarioDetalleRequest } from '@/types/api';

interface ItemBuscable {
  key: string;
  productoId: number;
  nombre: string;
  sku: string | null;
  codigoBarras: string | null;
  disponible: number;
}

interface Linea {
  key: string;
  item: ItemBuscable;
  cantidad: string;
}

interface TrasladoModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function buildItemsBuscables(inventario: Inventario[], productos: Producto[]): ItemBuscable[] {
  const productosPorId = new Map(productos.map((p) => [p.id, p]));
  return inventario
    .filter((inv) => inv.cantidad > 0)
    .map((inv) => {
      const p = productosPorId.get(inv.producto);
      return {
        key: `p-${inv.producto}`,
        productoId: inv.producto,
        nombre: inv.producto_nombre || p?.nombre || `Producto #${inv.producto}`,
        sku: p?.sku ?? null,
        codigoBarras: p?.codigo_barras ?? null,
        disponible: inv.cantidad,
      };
    });
}

export default function TrasladoModal({ onClose, onSaved }: TrasladoModalProps): ReactElement {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [cargandoStock, setCargandoStock] = useState(false);

  const [almacenOrigenId, setAlmacenOrigenId] = useState<string>('');
  const [almacenDestinoId, setAlmacenDestinoId] = useState<string>('');
  const [observaciones, setObservaciones] = useState('');

  const [inventarioOrigen, setInventarioOrigen] = useState<Inventario[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [guardando, setGuardando] = useState(false);
  const busquedaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [productosData, almacenesData] = await Promise.all([getProductos(), getAlmacenes()]);
        setProductos(productosData);
        setAlmacenes(almacenesData);
      } catch {
        toast.error('No se pudieron cargar productos/almacenes.');
      } finally {
        setCargandoDatos(false);
      }
    })();
  }, []);

  // Al cambiar el almacén de origen, se recarga el stock disponible ahí y
  // se limpian las líneas ya agregadas (pertenecían al stock del origen
  // anterior, que puede no coincidir con el nuevo).
  useEffect(() => {
    if (!almacenOrigenId) {
      setInventarioOrigen([]);
      setLineas([]);
      return;
    }
    setLineas([]);
    setCargandoStock(true);
    getInventarioPorAlmacen(Number(almacenOrigenId))
      .then(setInventarioOrigen)
      .catch(() => toast.error('No se pudo cargar el stock del almacén de origen.'))
      .finally(() => setCargandoStock(false));
  }, [almacenOrigenId]);

  useEffect(() => {
    if (!cargandoDatos && !cargandoStock && almacenOrigenId) busquedaInputRef.current?.focus();
  }, [cargandoDatos, cargandoStock, almacenOrigenId]);

  const itemsBuscables = useMemo(
    () => buildItemsBuscables(inventarioOrigen, productos),
    [inventarioOrigen, productos],
  );

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

  const agregarLinea = useCallback((item: ItemBuscable): void => {
    setLineas((prev) => {
      const existente = prev.find((l) => l.key === item.key);
      if (existente) {
        const nuevaCantidad = Math.min(Number(existente.cantidad || '0') + 1, item.disponible);
        return prev.map((l) => (l.key === item.key ? { ...l, cantidad: String(nuevaCantidad) } : l));
      }
      return [...prev, { key: item.key, item, cantidad: '1' }];
    });
    setBusqueda('');
  }, []);

  /** Igual que en Ajustes: permite escanear un código de barras y agregar la línea sin usar el mouse. */
  const manejarEnterBusqueda = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const texto = busqueda.trim();
    if (!texto) return;

    const matchExacto = itemsBuscables.find(
      (it) => it.codigoBarras?.toLowerCase() === texto.toLowerCase() || it.sku?.toLowerCase() === texto.toLowerCase(),
    );
    if (matchExacto) {
      agregarLinea(matchExacto);
      return;
    }
    if (resultados.length === 1) {
      agregarLinea(resultados[0]);
      return;
    }
    if (resultados.length === 0) {
      toast.error(`No se encontró ningún producto con stock disponible para "${texto}" en este almacén.`);
    }
  };

  const quitarLinea = (key: string): void => {
    setLineas((prev) => prev.filter((l) => l.key !== key));
  };

  const actualizarCantidad = (key: string, valor: string): void => {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, cantidad: valor } : l)));
  };

  const guardar = async (): Promise<void> => {
    if (!almacenOrigenId || !almacenDestinoId) {
      toast.error('Selecciona el almacén de origen y el de destino.');
      return;
    }
    if (almacenOrigenId === almacenDestinoId) {
      toast.error('El almacén de destino debe ser distinto al de origen.');
      return;
    }
    if (lineas.length === 0) {
      toast.error('Agrega al menos un producto al traslado.');
      return;
    }
    for (const l of lineas) {
      const cantidad = Number(l.cantidad);
      if (!cantidad || cantidad <= 0) {
        toast.error(`Ingresa una cantidad válida para "${l.item.nombre}".`);
        return;
      }
      if (cantidad > l.item.disponible) {
        toast.error(`Solo hay ${l.item.disponible} unidades disponibles de "${l.item.nombre}" en el almacén de origen.`);
        return;
      }
    }

    const detalles_para_crear: TrasladoInventarioDetalleRequest[] = lineas.map((l) => ({
      producto: l.item.productoId,
      cantidad: Number(l.cantidad),
    }));

    const payload: TrasladoInventarioRequest = {
      almacen_origen: Number(almacenOrigenId),
      almacen_destino: Number(almacenDestinoId),
      observaciones: observaciones.trim(),
      detalles_para_crear,
    };

    setGuardando(true);
    try {
      await crearTraslado(payload);
      toast.success('Traslado registrado: el stock ya se movió entre almacenes.');
      onSaved();
    } catch (error) {
      toastApiError(error, 'No se pudo registrar el traslado. Revisa el stock disponible en el origen.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Nuevo Traslado entre Almacenes"
      icon={<Shuffle size={20} />}
      size="xl"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton onClick={guardar} loading={guardando} disabled={cargandoDatos}>
            Trasladar ahora
          </ActionButton>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          El traslado es inmediato: al guardar, el stock se descuenta del origen y se suma al destino en la misma operación. No queda pendiente de confirmación.
        </p>

        {/* Cabecera */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Almacén de origen</label>
            <select
              value={almacenOrigenId}
              onChange={(e) => setAlmacenOrigenId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              disabled={cargandoDatos}
            >
              <option value="">Selecciona...</option>
              {almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Almacén de destino</label>
            <select
              value={almacenDestinoId}
              onChange={(e) => setAlmacenDestinoId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              disabled={cargandoDatos}
            >
              <option value="">Selecciona...</option>
              {almacenes.filter((a) => String(a.id) !== almacenOrigenId).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
        </div>

        {/* Buscador de productos, constrained al stock del origen */}
        <div className="relative">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Agregar producto</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={busquedaInputRef}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={manejarEnterBusqueda}
              placeholder={almacenOrigenId ? 'Busca por nombre, SKU o código de barras... (o escanea con un lector)' : 'Primero selecciona el almacén de origen'}
              className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm disabled:bg-slate-50"
              disabled={cargandoDatos || !almacenOrigenId || cargandoStock}
            />
          </div>
          {almacenOrigenId && !cargandoStock && itemsBuscables.length === 0 && (
            <p className="text-[11px] text-amber-500 mt-1">Este almacén no tiene stock disponible para trasladar.</p>
          )}
          {resultados.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
              {resultados.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => agregarLinea(item)}
                  className="w-full text-left px-4 py-2.5 hover:bg-primary-50 transition-colors flex items-center justify-between gap-3 border-b border-slate-50 last:border-0"
                >
                  <span className="text-sm font-semibold text-slate-800 truncate">{item.nombre}</span>
                  <span className="text-[11px] text-slate-400 shrink-0">Disponible: {item.disponible}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Líneas agregadas */}
        {lineas.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
            Busca y agrega los productos que quieres trasladar.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase">
                  <th className="p-3 text-left">Producto</th>
                  <th className="p-3 text-center w-28">Cantidad</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineas.map((l) => (
                  <tr key={l.key}>
                    <td className="p-3">
                      <p className="font-semibold text-slate-800">{l.item.nombre}</p>
                      <p className="text-[11px] text-slate-400">Disponible en origen: {l.item.disponible}</p>
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={1}
                        max={l.item.disponible}
                        value={l.cantidad}
                        onChange={(e) => actualizarCantidad(l.key, e.target.value)}
                        className="w-full px-2 py-1.5 border rounded-lg text-sm text-center"
                      />
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
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="Cualquier detalle adicional sobre este traslado..."
          />
        </div>
      </div>
    </AppModal>
  );
}
