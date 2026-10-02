"use client";

import { useState, useEffect, type ReactElement } from 'react';
import Link from 'next/link';
import { Trash2, PackagePlus, PackageMinus, Info } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppModal, ActionButton } from '@/components/ui';
import BuscadorProductos, { type ItemBuscable } from '@/components/inventario/BuscadorProductos';
import { getProductos, getAlmacenes, crearAjusteInventario } from '@/services/inventoryService';
import { getProveedores } from '@/services/proveedoresService';
import { toastApiError } from '@/utils/errors';
import { useSession } from '@/context/SessionContext';
import type {
  Producto, Almacen, Proveedor, TipoAjusteInventario, MotivoAjusteInventario,
  AjusteInventarioRequest, AjusteInventarioDetalleRequest,
} from '@/types/api';

/**
 * Solo movimientos INTERNOS -- las compras a proveedores se registran en
 * Compras > Facturas de compra (el backend rechaza aquí los motivos de
 * compra, ver `error_motivo_ajuste`).
 */
const MOTIVOS_POR_TIPO: Record<TipoAjusteInventario, { value: MotivoAjusteInventario; label: string }[]> = {
  entrada: [
    { value: 'conteo_fisico', label: 'Corrección por conteo físico (sobrante)' },
    { value: 'inventario_inicial', label: 'Inventario inicial' },
    { value: 'otro', label: 'Otro' },
  ],
  salida: [
    { value: 'conteo_fisico', label: 'Corrección por conteo físico (faltante)' },
    { value: 'merma', label: 'Merma / producto dañado o vencido' },
    { value: 'consumo_interno', label: 'Consumo interno / uso propio' },
    { value: 'devolucion_proveedor', label: 'Devolución a proveedor' },
    { value: 'otro', label: 'Otro' },
  ],
};

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

export default function AjusteModal({ onClose, onSaved }: AjusteModalProps): ReactElement {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const [tipo, setTipo] = useState<TipoAjusteInventario>('entrada');
  const [motivo, setMotivo] = useState<MotivoAjusteInventario>('conteo_fisico');
  const [almacenElegido, setAlmacenElegido] = useState<string>('');
  const [proveedorId, setProveedorId] = useState<string>('');
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [guardando, setGuardando] = useState(false);

  const esDevolucion = motivo === 'devolucion_proveedor';
  const costoObligatorio = tipo === 'entrada' && motivo === 'inventario_inicial';

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
  // `resolver_almacen_operativo`). Con un solo almacén no hay nada que elegir.
  const { usuario } = useSession();
  const esAdmin = usuario?.rol_codigo === 'admin';
  const almacenPropioId = usuario?.almacen_asignado_id ?? null;
  const almacenBloqueado = !esAdmin && almacenPropioId !== null;
  // Almacén por defecto (derivado, sin efecto): el del empleado, o el único que existe.
  const almacenPorDefecto = almacenPropioId !== null
    ? String(almacenPropioId)
    : almacenes.length === 1 ? String(almacenes[0].id) : '';
  const almacenId = almacenElegido || almacenPorDefecto;
  const setAlmacenId = setAlmacenElegido;

  const cambiarTipo = (nuevo: TipoAjusteInventario): void => {
    setTipo(nuevo);
    if (!MOTIVOS_POR_TIPO[nuevo].some((m) => m.value === motivo)) setMotivo(MOTIVOS_POR_TIPO[nuevo][0].value);
  };

  const agregarLinea = (item: ItemBuscable): void => {
    setLineas((prev) => {
      if (prev.some((l) => l.key === item.key)) {
        return prev.map((l) => (l.key === item.key ? { ...l, cantidad: String(Number(l.cantidad || '0') + 1) } : l));
      }
      return [...prev, { key: item.key, item, cantidad: '1', costoUnitario: '' }];
    });
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
      if (!(Number(l.cantidad) > 0)) {
        toast.error(`Ingresa una cantidad válida para "${l.item.nombre}".`);
        return;
      }
      // Sin costo, el backend valora la entrada al costo promedio actual
      // del producto -- solo hace falta si todavía no tiene uno (o si es el
      // inventario inicial, que justamente lo establece).
      const sinCosto = !(Number(l.costoUnitario) > 0);
      if (tipo === 'entrada' && sinCosto && (costoObligatorio || l.item.costoPromedio <= 0)) {
        toast.error(`Ingresa el costo unitario de "${l.item.nombre}" -- todavía no tiene un costo registrado.`);
        return;
      }
    }

    const detalles_para_crear: AjusteInventarioDetalleRequest[] = lineas.map((l) => ({
      producto: l.item.productoId,
      variante: l.item.varianteId,
      cantidad: Number(l.cantidad),
      costo_unitario: Number(l.costoUnitario) > 0 ? l.costoUnitario.trim() : null,
    }));

    const payload: AjusteInventarioRequest = {
      tipo,
      motivo,
      almacen: almacenId ? Number(almacenId) : null,
      proveedor: esDevolucion && proveedorId ? Number(proveedorId) : null,
      numero_documento: referencia.trim(),
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
        <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <Info size={14} className="shrink-0 mt-0.5 text-slate-400" />
          <p>
            Los ajustes son para movimientos internos. ¿Te llegó mercancía de un proveedor? Regístrala en{' '}
            <Link href="/admin/proveedores/facturas-compra" className="font-bold text-primary-600 hover:underline">
              Facturas de compra
            </Link>{' '}
            para que quede en el Libro de Compras y en Cuentas por Pagar.
          </p>
        </div>

        <div className="flex gap-2">
          {(['entrada', 'salida'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => cambiarTipo(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 flex items-center justify-center gap-2 transition-colors ${
                tipo === t
                  ? t === 'entrada' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700'
                  : 'border-slate-200 text-slate-500'
              }`}
            >
              {t === 'entrada' ? <><PackagePlus size={16} /> Entrada</> : <><PackageMinus size={16} /> Salida</>}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motivo</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as MotivoAjusteInventario)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              {MOTIVOS_POR_TIPO[tipo].map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
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
          {esDevolucion && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Proveedor</label>
              <select
                value={proveedorId}
                onChange={(e) => setProveedorId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Sin especificar</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Referencia (opcional)</label>
            <input
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Ej: Conteo de septiembre, acta de merma..."
            />
          </div>
        </div>

        <BuscadorProductos productos={productos} onSelect={agregarLinea} disabled={cargandoDatos} />

        {lineas.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
            Busca y agrega los productos que {tipo === 'entrada' ? 'entraron' : 'salieron'} del inventario.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase">
                  <th className="p-3 text-left">Producto</th>
                  <th className="p-3 text-center w-28">Cantidad</th>
                  {tipo === 'entrada' && <th className="p-3 text-center w-36">Costo unitario</th>}
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineas.map((l) => {
                  const faltaCosto = tipo === 'entrada' && !(Number(l.costoUnitario) > 0)
                    && (costoObligatorio || l.item.costoPromedio <= 0);
                  return (
                    <tr key={l.key}>
                      <td className="p-3">
                        <p className="font-semibold text-slate-800">{l.item.nombre}</p>
                        <p className="text-[11px] text-slate-400">Stock actual: {l.item.cantidadActual}</p>
                      </td>
                      <td className="p-3">
                        <input
                          type="number" min={1} value={l.cantidad}
                          onChange={(e) => actualizarLinea(l.key, 'cantidad', e.target.value)}
                          className="w-full px-2 py-1.5 border rounded-lg text-sm text-center"
                        />
                      </td>
                      {tipo === 'entrada' && (
                        <td className="p-3">
                          <input
                            type="number" min={0} step="0.000001" value={l.costoUnitario}
                            onChange={(e) => actualizarLinea(l.key, 'costoUnitario', e.target.value)}
                            className={`w-full px-2 py-1.5 border rounded-lg text-sm text-center ${faltaCosto ? 'border-amber-300 bg-amber-50' : ''}`}
                            placeholder={l.item.costoPromedio > 0 && !costoObligatorio ? `Actual: ${l.item.costoPromedio.toFixed(2)}` : 'Obligatorio'}
                          />
                        </td>
                      )}
                      <td className="p-3 text-center">
                        <button type="button" onClick={() => setLineas((prev) => prev.filter((x) => x.key !== l.key))} className="text-slate-400 hover:text-red-500" aria-label={`Quitar ${l.item.nombre}`}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
