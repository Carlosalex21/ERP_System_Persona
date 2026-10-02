"use client";

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { FileInput, Trash2, Package, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppModal, ActionButton } from '@/components/ui';
import BuscadorProductos, { type ItemBuscable } from '@/components/inventario/BuscadorProductos';
import { getAlmacenes, getProductos } from '@/services/inventoryService';
import { crearFacturaCompra, getProveedores } from '@/services/proveedoresService';
import { useSession } from '@/context/SessionContext';
import { toastApiError } from '@/utils/errors';
import type {
  Almacen, CrearFacturaCompraRequest, FacturaCompra, OrdenCompra, Producto, Proveedor, TipoDocumentoCompra,
} from '@/types/api';

interface Linea {
  key: string;
  productoId: number;
  varianteId: number | null;
  ordenDetalleId: number | null;
  nombre: string;
  cantidad: string;
  costo: string;
  /** Tope de lo que se puede recibir (lo pendiente de la orden de compra). */
  maximo: number | null;
}

interface FacturaCompraModalProps {
  /** Si viene, se reciben líneas de esta orden con la factura. */
  orden?: OrdenCompra | null;
  onClose: () => void;
  onSaved: (factura: FacturaCompra) => void;
}

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const num = (v: string): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export default function FacturaCompraModal({ orden = null, onClose, onSaved }: FacturaCompraModalProps): ReactElement {
  const { usuario } = useSession();
  const esAdmin = usuario?.rol_codigo === 'admin';
  const almacenPropioId = usuario?.almacen_asignado_id ?? null;
  const almacenBloqueado = !esAdmin && almacenPropioId !== null;

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoCompra>('factura');
  const [proveedorId, setProveedorId] = useState(orden ? String(orden.proveedor) : '');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [numeroControl, setNumeroControl] = useState('');
  const [fechaEmision, setFechaEmision] = useState(hoy());
  const [almacenElegido, setAlmacenElegido] = useState(orden?.almacen ? String(orden.almacen) : '');
  const [esGasto, setEsGasto] = useState(false);
  const [baseManual, setBaseManual] = useState('');
  const [exento, setExento] = useState('');
  const [porcentajeIva, setPorcentajeIva] = useState('16');
  const [retencionIva, setRetencionIva] = useState('0');
  const [observaciones, setObservaciones] = useState('');
  const [lineas, setLineas] = useState<Linea[]>(() =>
    (orden?.detalles ?? [])
      .filter((d) => d.cantidad_pendiente > 0)
      .map((d) => ({
        key: `oc-${d.id}`,
        productoId: d.producto,
        varianteId: null,
        ordenDetalleId: d.id,
        nombre: d.producto_nombre,
        cantidad: String(d.cantidad_pendiente),
        costo: d.costo_unitario_esperado ? String(Number(d.costo_unitario_esperado)) : '',
        maximo: d.cantidad_pendiente,
      })),
  );

  const esFactura = tipoDocumento === 'factura';

  useEffect(() => {
    (async () => {
      try {
        const [prov, alm, prod] = await Promise.all([getProveedores(), getAlmacenes(), getProductos()]);
        setProveedores(prov);
        setAlmacenes(alm);
        setProductos(prod);
      } catch {
        toast.error('No se pudieron cargar proveedores, almacenes o productos.');
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  // Almacén por defecto (derivado, sin efecto): el del empleado, o el único que existe.
  const almacenPorDefecto = almacenPropioId !== null
    ? String(almacenPropioId)
    : almacenes.length === 1 ? String(almacenes[0].id) : '';
  const almacenId = almacenElegido || almacenPorDefecto;
  const setAlmacenId = setAlmacenElegido;

  const agregarLinea = (item: ItemBuscable): void => {
    setLineas((prev) => {
      if (prev.some((l) => l.key === item.key)) {
        return prev.map((l) => (l.key === item.key ? { ...l, cantidad: String(num(l.cantidad) + 1) } : l));
      }
      return [...prev, {
        key: item.key, productoId: item.productoId, varianteId: item.varianteId, ordenDetalleId: null,
        nombre: item.nombre, cantidad: '1', costo: '', maximo: null,
      }];
    });
  };

  const actualizarLinea = (key: string, campo: 'cantidad' | 'costo', valor: string): void => {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)));
  };

  // Mismo cálculo que el backend (`facturas_compra_service.calcular_montos`).
  const montos = useMemo(() => {
    const subtotal = esGasto ? 0 : r2(lineas.reduce((acc, l) => acc + num(l.cantidad) * num(l.costo), 0));
    const montoExento = r2(num(exento));
    const base = esGasto ? r2(num(baseManual)) : r2(Math.max(subtotal - montoExento, 0));
    const pct = esFactura ? num(porcentajeIva) : 0;
    const iva = r2((base * pct) / 100);
    const total = r2(base + montoExento + iva);
    const retenido = esFactura ? r2((iva * num(retencionIva)) / 100) : 0;
    return { subtotal, montoExento, base, iva, total, retenido, neto: r2(total - retenido) };
  }, [lineas, exento, baseManual, esGasto, porcentajeIva, retencionIva, esFactura]);

  const guardar = async (): Promise<void> => {
    if (!proveedorId) return void toast.error('Selecciona el proveedor.');
    if (!numeroFactura.trim()) return void toast.error(`Indica el número de la ${esFactura ? 'factura' : 'nota de entrega'}.`);
    if (esFactura && !numeroControl.trim()) return void toast.error('Indica el número de control impreso en la factura.');
    if (!esGasto) {
      if (lineas.length === 0) return void toast.error('Agrega los productos que llegaron con este documento.');
      if (!almacenId && almacenes.length > 1) return void toast.error('Indica en qué almacén entra la mercancía.');
      for (const l of lineas) {
        if (!(num(l.cantidad) > 0)) return void toast.error(`Cantidad inválida en "${l.nombre}".`);
        if (l.maximo !== null && num(l.cantidad) > l.maximo) return void toast.error(`"${l.nombre}": la orden solo tiene ${l.maximo} pendientes.`);
        if (!(num(l.costo) > 0)) return void toast.error(`Indica el costo unitario (sin IVA) de "${l.nombre}".`);
      }
      if (montos.montoExento > montos.subtotal) return void toast.error('El exento no puede superar el subtotal.');
    }
    if (montos.total <= 0) return void toast.error('El total del documento debe ser mayor a cero.');

    const payload: CrearFacturaCompraRequest = {
      proveedor_id: Number(proveedorId),
      tipo_documento: tipoDocumento,
      numero_factura: numeroFactura.trim(),
      numero_control: esFactura ? numeroControl.trim() : '',
      fecha_emision: fechaEmision,
      almacen_id: !esGasto && almacenId ? Number(almacenId) : null,
      orden_compra_id: orden?.id ?? null,
      monto_exento: String(montos.montoExento),
      base_imponible: esGasto ? String(montos.base) : '0',
      porcentaje_iva: esFactura ? porcentajeIva : '0',
      porcentaje_retencion_iva: esFactura ? retencionIva : '0',
      observaciones: observaciones.trim(),
      detalles: esGasto ? [] : lineas.map((l) => ({
        producto_id: l.productoId,
        variante_id: l.varianteId,
        orden_detalle_id: l.ordenDetalleId,
        cantidad: num(l.cantidad),
        costo_unitario: l.costo.trim(),
      })),
    };

    setGuardando(true);
    try {
      const factura = await crearFacturaCompra(payload);
      toast.success(
        esGasto
          ? 'Compra registrada en cuentas por pagar.'
          : 'Compra registrada: el inventario, la cuenta por pagar y el libro de compras ya se actualizaron.',
      );
      onSaved(factura);
    } catch (error) {
      toastApiError(error, 'No se pudo registrar la compra.');
    } finally {
      setGuardando(false);
    }
  };

  const campo = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
  const etiqueta = 'block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1';

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={orden ? `Recibir OC-${orden.numero} con su factura` : 'Registrar compra'}
      icon={<FileInput size={20} />}
      size="xl"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton>
          <ActionButton onClick={guardar} loading={guardando} disabled={cargando}>Registrar compra</ActionButton>
        </>
      }
    >
      <div className="space-y-5">
        {/* Tipo de documento */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          {([
            { v: 'factura', t: 'Factura fiscal', d: 'Va al Libro de Compras, con IVA y retención' },
            { v: 'nota_entrega', t: 'Nota de entrega', d: 'Sin factura: no lleva IVA ni va al libro' },
          ] as const).map((op) => (
            <button
              key={op.v}
              type="button"
              onClick={() => setTipoDocumento(op.v)}
              className={`text-left px-3 py-2 rounded-lg transition-all duration-200 ${
                tipoDocumento === op.v ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-white/60'
              }`}
            >
              <p className={`text-sm font-bold ${tipoDocumento === op.v ? 'text-slate-900' : 'text-slate-500'}`}>{op.t}</p>
              <p className="text-[11px] text-slate-400 leading-tight">{op.d}</p>
            </button>
          ))}
        </div>

        {/* Cabecera */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className={etiqueta}>Proveedor</label>
            <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} disabled={!!orden} className={`${campo} ${orden ? 'bg-slate-50 text-slate-500' : ''}`}>
              <option value="">Selecciona...</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre} — {p.identificador_fiscal}</option>)}
            </select>
          </div>
          <div>
            <label className={etiqueta}>{esFactura ? 'N° de factura' : 'N° de nota'}</label>
            <input value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} className={campo} placeholder={esFactura ? '000123' : 'NE-0045'} />
          </div>
          {esFactura ? (
            <div>
              <label className={etiqueta}>N° de control</label>
              <input value={numeroControl} onChange={(e) => setNumeroControl(e.target.value)} className={campo} placeholder="00-000456" />
            </div>
          ) : <div className="hidden lg:block" />}
          <div>
            <label className={etiqueta}>Fecha de emisión</label>
            <input type="date" value={fechaEmision} max={hoy()} onChange={(e) => setFechaEmision(e.target.value)} className={campo} />
          </div>
          {!esGasto && (
            <div>
              <label className={etiqueta}>Almacén de entrada</label>
              <select value={almacenId} onChange={(e) => setAlmacenId(e.target.value)} disabled={almacenBloqueado} className={`${campo} ${almacenBloqueado ? 'bg-slate-50 text-slate-500' : ''}`}>
                {!almacenId && <option value="">Selecciona...</option>}
                {almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
          )}
          {!orden && (
            <div className="sm:col-span-2 flex items-end">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none py-2">
                <input type="checkbox" checked={esGasto} onChange={(e) => setEsGasto(e.target.checked)} className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                Es un gasto o servicio (no trae mercancía)
              </label>
            </div>
          )}
        </div>

        {/* Líneas */}
        {!esGasto && (
          <div className="space-y-3">
            {!orden && <BuscadorProductos productos={productos} onSelect={agregarLinea} disabled={cargando} label="Productos recibidos" />}
            {lineas.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                <Package size={22} className="text-slate-300" />
                Busca o escanea los productos de la factura.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wide">
                      <th className="px-3 py-2 text-left">Producto</th>
                      <th className="px-3 py-2 text-center w-24">Cant.</th>
                      <th className="px-3 py-2 text-center w-36">Costo unit. sin IVA</th>
                      <th className="px-3 py-2 text-right w-28">Subtotal</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lineas.map((l) => (
                      <tr key={l.key}>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-slate-800">{l.nombre}</p>
                          {l.maximo !== null && <p className="text-[11px] text-slate-400">Pendiente en la orden: {l.maximo}</p>}
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min={0} max={l.maximo ?? undefined} value={l.cantidad} onChange={(e) => actualizarLinea(l.key, 'cantidad', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min={0} step="0.000001" value={l.costo} onChange={(e) => actualizarLinea(l.key, 'costo', e.target.value)} className={`w-full px-2 py-1.5 border rounded-lg text-sm text-center ${num(l.costo) > 0 ? 'border-slate-200' : 'border-amber-300 bg-amber-50'}`} placeholder="0.00" />
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">{(num(l.cantidad) * num(l.costo)).toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          <button type="button" onClick={() => setLineas((prev) => prev.filter((x) => x.key !== l.key))} className="text-slate-400 hover:text-red-500 transition-colors" aria-label={`Quitar ${l.nombre}`}>
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Totales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {esGasto && (
              <div>
                <label className={etiqueta}>{esFactura ? 'Base imponible' : 'Monto'}</label>
                <input type="number" min={0} step="0.01" value={baseManual} onChange={(e) => setBaseManual(e.target.value)} className={campo} placeholder="0.00" />
              </div>
            )}
            {esFactura && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={etiqueta}>Monto exento</label>
                    <input type="number" min={0} step="0.01" value={exento} onChange={(e) => setExento(e.target.value)} className={campo} placeholder="0.00" />
                  </div>
                  <div>
                    <label className={etiqueta}>Alícuota IVA</label>
                    <select value={porcentajeIva} onChange={(e) => setPorcentajeIva(e.target.value)} className={campo}>
                      <option value="16">16% (general)</option>
                      <option value="8">8% (reducida)</option>
                      <option value="31">31% (lujo)</option>
                      <option value="0">0% (todo exento)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={etiqueta}>Retención de IVA</label>
                  <select value={retencionIva} onChange={(e) => setRetencionIva(e.target.value)} className={campo}>
                    <option value="0">No retengo (no soy agente de retención)</option>
                    <option value="75">75% del IVA</option>
                    <option value="100">100% del IVA (proveedor sin RIF válido / no inscrito)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">Si eres contribuyente especial, se emite el comprobante con su número SENIAT automáticamente.</p>
                </div>
              </>
            )}
            <div>
              <label className={etiqueta}>Observaciones</label>
              <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className={campo} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-1.5 text-sm self-start">
            {!esGasto && <Fila etiqueta="Subtotal productos" valor={montos.subtotal} />}
            {esFactura && montos.montoExento > 0 && <Fila etiqueta="Exento" valor={montos.montoExento} />}
            {esFactura && <Fila etiqueta="Base imponible" valor={montos.base} />}
            {esFactura && <Fila etiqueta={`IVA ${porcentajeIva}%`} valor={montos.iva} />}
            <div className="border-t border-slate-200 my-2" />
            <Fila etiqueta="Total del documento" valor={montos.total} fuerte />
            {montos.retenido > 0 && (
              <>
                <Fila etiqueta={`Retención IVA ${retencionIva}%`} valor={-montos.retenido} tono="text-amber-700" />
                <div className="border-t border-slate-200 my-2" />
                <Fila etiqueta="Neto a pagar al proveedor" valor={montos.neto} fuerte />
              </>
            )}
            <p className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-2">
              <Receipt size={12} /> Montos en la moneda base del negocio.
            </p>
          </div>
        </div>
      </div>
    </AppModal>
  );
}

function Fila({ etiqueta, valor, fuerte = false, tono = '' }: { etiqueta: string; valor: number; fuerte?: boolean; tono?: string }): ReactElement {
  return (
    <div className={`flex items-center justify-between ${fuerte ? 'font-bold text-slate-900' : 'text-slate-600'} ${tono}`}>
      <span>{etiqueta}</span>
      <span className="font-mono tabular-nums">{valor.toFixed(2)}</span>
    </div>
  );
}
