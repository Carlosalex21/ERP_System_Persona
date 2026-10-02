"use client";

import { useState, useEffect, useMemo, useRef, type ReactElement, type KeyboardEvent } from 'react';
import { Search, Trash2, PackagePlus, PackageMinus } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppModal, ActionButton } from '@/components/ui';
import { getProductos, getAlmacenes, crearAjusteInventario } from '@/services/inventoryService';
import { getProveedores } from '@/services/proveedoresService';
import { toastApiError } from '@/utils/errors';
import { useSession } from '@/context/SessionContext';
import type {
  Producto, Almacen, Proveedor, TipoAjusteInventario, MotivoAjusteInventario,
  AjusteInventarioRequest, AjusteInventarioDetalleRequest,
} from '@/types/api';

const MOTIVOS: { value: MotivoAjusteInventario; label: string }[] = [
  { value: 'compra_con_factura', label: 'Compra con factura fiscal' },
  { value: 'compra_sin_factura', label: 'Compra con nota de entrega (sin factura)' },
  { value: 'conteo_fisico', label: 'Corrección por conteo físico' },
  { value: 'devolucion_proveedor', label: 'Devolución a proveedor' },
  { value: 'merma', label: 'Merma / producto dañado' },
  { value: 'otro', label: 'Otro' },
];

interface ItemBuscable {
  key: string;
  productoId: number;
  varianteId: number | null;
  nombre: string;
  sku: string | null;
  codigoBarras: string | null;
  cantidadActual: number;
}

interface Linea {
  key: string;
  item: ItemBuscable;
  cantidad: string;
  costoUnitario: string;
}

interface AjusteModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function buildItemsBuscables(productos: Producto[]): ItemBuscable[] {
  const items: ItemBuscable[] = [];
  productos.forEach((p) => {
    if (p.tipo === 'simple') {
      items.push({
        key: `p-${p.id}`, productoId: p.id, varianteId: null,
        nombre: p.nombre, sku: p.sku ?? null, codigoBarras: p.codigo_barras ?? null,
        cantidadActual: p.cantidad ?? 0,
      });
    } else {
      (p.variantes || []).forEach((v) => {
        items.push({
          key: `v-${v.id}`, productoId: p.id, varianteId: v.id,
          nombre: `${p.nombre} (${v.nombre})`, sku: v.sku ?? null, codigoBarras: v.codigo_barras ?? null,
          cantidadActual: v.cantidad ?? 0,
        });
      });
    }
  });
  return items;
}

export default function AjusteModal({ onClose, onSaved }: AjusteModalProps): ReactElement {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const [tipo, setTipo] = useState<TipoAjusteInventario>('entrada');
  const [motivo, setMotivo] = useState<MotivoAjusteInventario>('compra_sin_factura');
  const [almacenId, setAlmacenId] = useState<string>('');
  const [proveedorId, setProveedorId] = useState<string>('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [numeroControl, setNumeroControl] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const esFacturaFiscal = motivo === 'compra_con_factura';

  const [busqueda, setBusqueda] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [guardando, setGuardando] = useState(false);
  const busquedaInputRef = useRef<HTMLInputElement>(null);

  // El input arranca deshabilitado (`disabled={cargandoDatos}`), así que el
  // `autoFocus` nativo no sirve -- un elemento deshabilitado no puede recibir
  // foco. En cuanto termina de cargar, se enfoca a mano para poder empezar a
  // escanear/escribir de una vez, sin tener que hacer clic primero.
  useEffect(() => {
    if (!cargandoDatos) busquedaInputRef.current?.focus();
  }, [cargandoDatos]);

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

  // Almacén: un admin elige cualquiera; cualquier otro rol queda fijo en su
  // almacén operativo (el backend lo impone igual, ver
  // `AjusteInventarioViewSet.perform_create`). Con un solo almacén no hay nada que elegir.
  const { usuario } = useSession();
  const esAdmin = usuario?.rol_codigo === 'admin';
  const almacenPropioId = usuario?.almacen_asignado_id ?? null;
  const almacenBloqueado = !esAdmin && almacenPropioId !== null;
  useEffect(() => {
    if (almacenId || almacenes.length === 0) return;
    if (almacenPropioId !== null) setAlmacenId(String(almacenPropioId));
    else if (almacenes.length === 1) setAlmacenId(String(almacenes[0].id));
  }, [almacenes, almacenPropioId, almacenId]);

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
      return [...prev, { key: item.key, item, cantidad: '1', costoUnitario: '' }];
    });
    setBusqueda('');
  };

  /**
   * Hace que el buscador funcione con un lector de código de barras
   * (USB/Bluetooth, que "escribe" el código y luego dispara Enter solo):
   * al presionar Enter, si hay un match exacto por código de barras/SKU o
   * si el texto dejó un único resultado posible, agrega esa línea sin que
   * el usuario tenga que tocar el mouse -- así se puede recibir mercancía
   * escaneando producto tras producto, mucho más rápido que buscar y
   * hacer clic en cada uno.
   */
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
      toast.error(`No se encontró ningún producto para "${texto}".`);
    }
    // Si hay varios resultados ambiguos, no se agrega nada: el usuario
    // debe hacer clic en el que corresponde.
  };

  const quitarLinea = (key: string): void => {
    setLineas((prev) => prev.filter((l) => l.key !== key));
  };

  const actualizarLinea = (key: string, campo: 'cantidad' | 'costoUnitario', valor: string): void => {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)));
  };

  const guardar = async (): Promise<void> => {
    if (lineas.length === 0) {
      toast.error('Agrega al menos un producto al ajuste.');
      return;
    }
    if (!almacenId && almacenes.length > 1) {
      toast.error('Indica en qué almacén entra o sale esta mercancía.');
      return;
    }
    for (const l of lineas) {
      const cantidad = Number(l.cantidad);
      if (!cantidad || cantidad <= 0) {
        toast.error(`Ingresa una cantidad válida para "${l.item.nombre}".`);
        return;
      }
      // El backend ya lo exige (ver `AjusteInventarioSerializer.validate()`)
      // -- se repite acá para que el error salga antes de enviar, no
      // después de que el usuario llenó todo el formulario.
      if (tipo === 'entrada' && !(Number(l.costoUnitario) > 0)) {
        toast.error(`Ingresa el costo unitario de compra para "${l.item.nombre}".`);
        return;
      }
    }

    const detalles_para_crear: AjusteInventarioDetalleRequest[] = lineas.map((l) => ({
      producto: l.item.productoId,
      variante: l.item.varianteId,
      cantidad: Number(l.cantidad),
      costo_unitario: l.costoUnitario.trim() ? l.costoUnitario.trim() : null,
    }));

    const payload: AjusteInventarioRequest = {
      tipo,
      motivo,
      almacen: almacenId ? Number(almacenId) : null,
      proveedor: proveedorId ? Number(proveedorId) : null,
      numero_documento: numeroDocumento.trim(),
      numero_control: esFacturaFiscal ? numeroControl.trim() : '',
      observaciones: observaciones.trim(),
      detalles_para_crear,
    };

    setGuardando(true);
    try {
      await crearAjusteInventario(payload);
      toast.success(tipo === 'entrada' ? 'Entrada de inventario registrada.' : 'Salida de inventario registrada.');
      onSaved();
    } catch (error) {
      toastApiError(error, 'No se pudo registrar el ajuste. Revisa las cantidades y el stock disponible.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Nuevo Ajuste de Inventario"
      icon={tipo === 'entrada' ? <PackagePlus size={20} /> : <PackageMinus size={20} />}
      size="xl"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton onClick={guardar} loading={guardando} disabled={cargandoDatos}>
            Aplicar ajuste
          </ActionButton>
        </>
      }
    >
      <div className="space-y-5">
        {/* Tipo */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTipo('entrada')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 flex items-center justify-center gap-2 transition-colors ${
              tipo === 'entrada' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-500'
            }`}
          >
            <PackagePlus size={16} /> Entrada de mercancía
          </button>
          <button
            type="button"
            onClick={() => setTipo('salida')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 flex items-center justify-center gap-2 transition-colors ${
              tipo === 'salida' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500'
            }`}
          >
            <PackageMinus size={16} /> Salida de mercancía
          </button>
        </div>

        {/* Cabecera */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motivo</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as MotivoAjusteInventario)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              {MOTIVOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              {esFacturaFiscal ? 'Nº de factura' : 'Nº de nota de entrega / documento'}
            </label>
            <input
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder={esFacturaFiscal ? 'Ej: 00-012345' : 'Ej: NE-00123'}
            />
          </div>
          {esFacturaFiscal && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº de control (SENIAT)</label>
              <input
                value={numeroControl}
                onChange={(e) => setNumeroControl(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Ej: 00-1234567"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Almacén</label>
            <select
              value={almacenId}
              onChange={(e) => setAlmacenId(e.target.value)}
              disabled={almacenBloqueado}
              className={`w-full px-3 py-2 border rounded-lg text-sm ${almacenBloqueado ? 'bg-slate-50 text-slate-500' : ''}`}
            >
              {!almacenId && <option value="">Selecciona un almacén...</option>}
              {almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
            {almacenBloqueado && (
              <p className="text-[11px] text-slate-400 mt-1">Tu almacén asignado -- solo un administrador puede registrar en otro.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Proveedor (opcional)</label>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Sin especificar</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
        </div>

        {/* Buscador de productos */}
        <div className="relative">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Agregar producto</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={busquedaInputRef}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={manejarEnterBusqueda}
              placeholder="Busca por nombre, SKU o código de barras... (o escanea con un lector)"
              className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm"
              disabled={cargandoDatos}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Tip: con un lector de código de barras, cada escaneo agrega o suma una unidad automáticamente.
          </p>
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
                  <span className="text-[11px] text-slate-400 shrink-0">Stock actual: {item.cantidadActual}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Líneas agregadas */}
        {lineas.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
            Busca y agrega los productos que {tipo === 'entrada' ? 'entraron' : 'salieron'} del inventario.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase">
                  <th className="p-3 text-left">Producto</th>
                  <th className="p-3 text-center w-28">Cantidad</th>
                  <th className="p-3 text-center w-32">{tipo === 'entrada' ? 'Costo unit. de compra' : 'Costo unit. (opcional)'}</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineas.map((l) => (
                  <tr key={l.key}>
                    <td className="p-3">
                      <p className="font-semibold text-slate-800">{l.item.nombre}</p>
                      <p className="text-[11px] text-slate-400">Stock actual: {l.item.cantidadActual}</p>
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={1}
                        value={l.cantidad}
                        onChange={(e) => actualizarLinea(l.key, 'cantidad', e.target.value)}
                        className="w-full px-2 py-1.5 border rounded-lg text-sm text-center"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={0}
                        step="0.000001"
                        value={l.costoUnitario}
                        onChange={(e) => actualizarLinea(l.key, 'costoUnitario', e.target.value)}
                        className={`w-full px-2 py-1.5 border rounded-lg text-sm text-center ${
                          tipo === 'entrada' && !(Number(l.costoUnitario) > 0) ? 'border-amber-300 bg-amber-50' : ''
                        }`}
                        placeholder={tipo === 'entrada' ? '0.00 (obligatorio)' : '—'}
                        required={tipo === 'entrada'}
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
            placeholder="Cualquier detalle adicional sobre este ajuste..."
          />
        </div>
      </div>
    </AppModal>
  );
}
