"use client";

import { useState, useEffect, useMemo, useRef, type ReactElement, type KeyboardEvent } from 'react';
import { Search, Trash2, FileText, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppModal, ActionButton } from '@/components/ui';
import { getProductos } from '@/services/inventoryService';
import { getClientes } from '@/services/clientesService';
import { crearCotizacion } from '@/services/crmService';
import { toastApiError } from '@/utils/errors';
import ClientModal from '../../pos/components/ClientModal';
import type { Producto, Cliente } from '@/types/api';

interface ItemBuscable {
  key: string;
  productoId: number;
  varianteId: number | null;
  nombre: string;
  sku: string | null;
  codigoBarras: string | null;
  precioSugerido: string;
}

interface Linea {
  key: string;
  item: ItemBuscable;
  cantidad: string;
  precio: string;
}

interface NuevaCotizacionModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function buildItemsBuscables(productos: Producto[]): ItemBuscable[] {
  const items: ItemBuscable[] = [];
  productos.forEach((p) => {
    if (p.tipo === 'variable') {
      (p.variantes || []).forEach((v) => {
        items.push({
          key: `v-${v.id}`, productoId: p.id, varianteId: v.id,
          nombre: `${p.nombre} (${v.nombre})`, sku: v.sku ?? null, codigoBarras: v.codigo_barras ?? null,
          precioSugerido: v.precio || '0',
        });
      });
    } else {
      items.push({
        key: `p-${p.id}`, productoId: p.id, varianteId: null,
        nombre: p.nombre, sku: p.sku ?? null, codigoBarras: p.codigo_barras ?? null,
        precioSugerido: p.precio || '0',
      });
    }
  });
  return items;
}

export default function NuevaCotizacionModal({ onClose, onCreated }: NuevaCotizacionModalProps): ReactElement {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false);

  const [clienteId, setClienteId] = useState('');
  const [nombreProspecto, setNombreProspecto] = useState('');
  const [telefonoProspecto, setTelefonoProspecto] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [guardando, setGuardando] = useState(false);
  const busquedaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [productosData, clientesData] = await Promise.all([getProductos(), getClientes()]);
        setProductos(productosData);
        setClientes(clientesData);
      } catch {
        toast.error('No se pudieron cargar productos/clientes.');
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
      .filter((it) => it.nombre.toLowerCase().includes(q) || it.sku?.toLowerCase().includes(q) || it.codigoBarras?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [busqueda, itemsBuscables]);

  const agregarLinea = (item: ItemBuscable): void => {
    setLineas((prev) => {
      const existente = prev.find((l) => l.key === item.key);
      if (existente) return prev.map((l) => (l.key === item.key ? { ...l, cantidad: String(Number(l.cantidad || '0') + 1) } : l));
      return [...prev, { key: item.key, item, cantidad: '1', precio: item.precioSugerido }];
    });
    setBusqueda('');
  };

  const manejarEnterBusqueda = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const texto = busqueda.trim();
    if (!texto) return;
    const matchExacto = itemsBuscables.find((it) => it.codigoBarras?.toLowerCase() === texto.toLowerCase() || it.sku?.toLowerCase() === texto.toLowerCase());
    if (matchExacto) { agregarLinea(matchExacto); return; }
    if (resultados.length === 1) { agregarLinea(resultados[0]); return; }
    if (resultados.length === 0) toast.error(`No se encontró ningún producto para "${texto}".`);
  };

  const quitarLinea = (key: string): void => setLineas((prev) => prev.filter((l) => l.key !== key));
  const actualizarLinea = (key: string, campo: 'cantidad' | 'precio', valor: string): void => {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)));
  };

  const total = useMemo(() => lineas.reduce((acc, l) => acc + Number(l.cantidad || 0) * Number(l.precio || 0), 0), [lineas]);

  const guardar = async (): Promise<void> => {
    if (!clienteId && !nombreProspecto.trim()) { toast.error('Selecciona un cliente o ingresa al menos el nombre del prospecto.'); return; }
    if (lineas.length === 0) { toast.error('Agrega al menos un producto a la cotización.'); return; }
    for (const l of lineas) {
      if (!Number(l.cantidad) || Number(l.cantidad) <= 0) { toast.error(`Ingresa una cantidad válida para "${l.item.nombre}".`); return; }
    }

    setGuardando(true);
    try {
      await crearCotizacion({
        cliente_id: clienteId ? Number(clienteId) : null,
        nombre_prospecto: nombreProspecto.trim(),
        telefono_prospecto: telefonoProspecto.trim(),
        fecha_vencimiento: fechaVencimiento || null,
        observaciones: observaciones.trim(),
        detalles: lineas.map((l) => ({
          producto_id: l.item.productoId, variante_id: l.item.varianteId,
          cantidad: Number(l.cantidad), precio_unitario: l.precio || '0',
        })),
      });
      toast.success('Cotización creada en borrador.');
      onCreated();
    } catch (error) {
      toastApiError(error, 'No se pudo crear la cotización.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Nueva Cotización"
      icon={<FileText size={20} />}
      size="xl"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton onClick={guardar} loading={guardando} disabled={cargandoDatos}>Crear Cotización</ActionButton>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente (opcional si es un prospecto nuevo)</label>
          <div className="flex gap-2">
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="flex-1 min-w-0 px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Es un prospecto sin registrar...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <button type="button" onClick={() => setModalNuevoCliente(true)} className="shrink-0 px-3 py-2 border rounded-lg text-sm font-bold text-primary-600 border-primary-200 bg-primary-50 hover:bg-primary-100 flex items-center gap-1.5">
              <UserPlus size={16} /> Nuevo
            </button>
          </div>
        </div>

        {modalNuevoCliente && (
          <ClientModal isOpen onClose={() => setModalNuevoCliente(false)} onClientCreated={(nuevo) => { setClientes((prev) => [...prev, nuevo]); setClienteId(String(nuevo.id)); setModalNuevoCliente(false); }} />
        )}

        {!clienteId && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del prospecto</label>
              <input value={nombreProspecto} onChange={(e) => setNombreProspecto(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
              <input value={telefonoProspecto} onChange={(e) => setTelefonoProspecto(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
        )}

        <div className="relative">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Agregar producto</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={busquedaInputRef} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} onKeyDown={manejarEnterBusqueda}
              placeholder="Busca por nombre, SKU o código de barras..." className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm" disabled={cargandoDatos}
            />
          </div>
          {resultados.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
              {resultados.map((item) => (
                <button key={item.key} type="button" onClick={() => agregarLinea(item)} className="w-full text-left px-4 py-2.5 hover:bg-primary-50 transition-colors border-b border-slate-50 last:border-0">
                  <span className="text-sm font-semibold text-slate-800">{item.nombre}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {lineas.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">Busca y agrega los productos a cotizar.</div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase">
                  <th className="p-3 text-left">Producto</th>
                  <th className="p-3 text-center w-24">Cantidad</th>
                  <th className="p-3 text-center w-32">Precio unit.</th>
                  <th className="p-3 text-right w-28">Subtotal</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineas.map((l) => (
                  <tr key={l.key}>
                    <td className="p-3 font-semibold text-slate-800">{l.item.nombre}</td>
                    <td className="p-3"><input type="number" min={1} value={l.cantidad} onChange={(e) => actualizarLinea(l.key, 'cantidad', e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-sm text-center" /></td>
                    <td className="p-3"><input type="number" min={0} step="0.01" value={l.precio} onChange={(e) => actualizarLinea(l.key, 'precio', e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-sm text-center" /></td>
                    <td className="p-3 text-right font-mono text-slate-600">${(Number(l.cantidad || 0) * Number(l.precio || 0)).toFixed(2)}</td>
                    <td className="p-3 text-center"><button type="button" onClick={() => quitarLinea(l.key)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50">
                  <td colSpan={3} className="p-3 text-right font-bold text-slate-500 text-xs uppercase">Total</td>
                  <td className="p-3 text-right font-black text-primary-700">${total.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Válida hasta (opcional)</label>
            <input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observaciones (opcional)</label>
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
      </div>
    </AppModal>
  );
}
