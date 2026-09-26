"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ShoppingBag, Loader2, CheckCircle2, XCircle, Package, Globe2, Smartphone, Mail, Eye, HandCoins, PackageCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFacturas, actualizarEstadoFactura, anularFactura, getMetodosDePago, getTransaccionesPago, marcarPedidoPreparado } from '@/services/facturacionService';
import { getClientes } from '@/services/clientesService';
import { getTransaccionesPasarela, confirmarTransaccionPasarela } from '@/services/pagosOnlineService';
import { getMonedas } from '@/services/configuracionService';
import { getApiErrorMessages, parseDecimal, getNombreById } from '@/utils/helpers';
import { Factura, Cliente, TransaccionPasarela, MetodoPago, Transaccionpago, Moneda } from '@/types/api';
import { DataTable, PageHeader, Card, TableSkeleton, ConfirmDialog } from '@/components/ui';
import PedidoDetalleModal from './PedidoDetalleModal';
import AbonoModal from './AbonoModal';

function EstadoBadge({ estado }: { estado?: string | null }): ReactElement {
  const normalizado = (estado || '').toLowerCase();
  const estilos = normalizado.includes('pagad')
    ? 'bg-green-50 text-green-700 border-green-200'
    : normalizado.includes('pendient')
      ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
      : normalizado.includes('anulad')
        ? 'bg-red-50 text-red-600 border-red-200'
        : 'bg-slate-100 text-slate-500 border-slate-200';
  return (
    <span className={`px-2.5 py-1 rounded-lg font-bold text-xs border capitalize ${estilos}`}>
      {estado || '—'}
    </span>
  );
}

export default function PedidosPage(): ReactElement {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [transacciones, setTransacciones] = useState<TransaccionPasarela[]>([]);
  const [transaccionesPago, setTransaccionesPago] = useState<Transaccionpago[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<'pendientes' | 'todos'>('pendientes');
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Factura | null>(null);
  const [pedidoAAbonar, setPedidoAAbonar] = useState<Factura | null>(null);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  // Moneda en la que se MUESTRA la columna Total -- por defecto la base del
  // tenant. Nunca se mezclan los totales crudos de cada factura (unas en $,
  // otras en Bs) en una sola columna: se elige una moneda para ver TODO,
  // convirtiendo con la tasa que quedó congelada en cada factura al
  // emitirse (nunca la tasa de hoy).
  const [vistaMoneda, setVistaMoneda] = useState<string>('');

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    const [facturasRes, clientesRes, transaccionesRes, transaccionesPagoRes, metodosRes, monedasRes] = await Promise.allSettled([
      getFacturas(),
      getClientes(),
      getTransaccionesPasarela(),
      getTransaccionesPago(),
      getMetodosDePago(),
      getMonedas(),
    ]);
    if (facturasRes.status === 'fulfilled') {
      // Pedidos del catálogo público primero: son los que requieren acción.
      const ordenadas = [...facturasRes.value].sort(
        (a, b) => new Date(b.fecha_operacion).getTime() - new Date(a.fecha_operacion).getTime(),
      );
      setFacturas(ordenadas);
    }
    if (clientesRes.status === 'fulfilled') setClientes(clientesRes.value);
    if (transaccionesRes.status === 'fulfilled') setTransacciones(transaccionesRes.value);
    if (transaccionesPagoRes.status === 'fulfilled') setTransaccionesPago(transaccionesPagoRes.value);
    if (metodosRes.status === 'fulfilled') setMetodosPago(metodosRes.value);
    if (monedasRes.status === 'fulfilled') {
      setMonedas(monedasRes.value);
      setVistaMoneda((actual) => actual || monedasRes.value.find((m) => m.es_predeterminada)?.codigo || monedasRes.value[0]?.codigo || '');
    }
    if (facturasRes.status === 'rejected') {
      toast.error('No se pudieron cargar los pedidos.');
    }
    if (!silencioso) setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
    // Refresco silencioso cada 20s: nuevos pedidos del catálogo público
    // aparecen sin que el admin tenga que recargar la página a mano.
    const interval = setInterval(() => cargar(true), 20000);
    return () => clearInterval(interval);
  }, [cargar]);

  const facturasFiltradas = useMemo(
    () => (filtro === 'pendientes' ? facturas.filter((f) => (f.estado || '').toLowerCase().includes('pendient')) : facturas),
    [facturas, filtro],
  );

  const pendientesCount = useMemo(
    () => facturas.filter((f) => (f.estado || '').toLowerCase().includes('pendient')).length,
    [facturas],
  );

  const confirmarPago = async (factura: Factura) => {
    setProcesandoId(factura.id);
    try {
      const transaccion = transacciones.find((t) => t.factura === factura.id);
      await Promise.all([
        actualizarEstadoFactura(factura.id, 'pagado'),
        transaccion && transaccion.estado !== 'completado'
          ? confirmarTransaccionPasarela(transaccion.id)
          : Promise.resolve(),
      ]);
      toast.success(`Pedido #${factura.correlativo || factura.id} confirmado.`);
      await cargar(true);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('No se pudo confirmar el pedido.');
      }
    } finally {
      setProcesandoId(null);
    }
  };

  const marcarPreparado = async (factura: Factura) => {
    setProcesandoId(factura.id);
    try {
      await marcarPedidoPreparado(factura.id);
      toast.success(`Pedido #${factura.correlativo || factura.id} marcado como preparado.`);
      await cargar(true);
    } catch {
      toast.error('No se pudo marcar el pedido como preparado.');
    } finally {
      setProcesandoId(null);
    }
  };

  const [pedidoARechazar, setPedidoARechazar] = useState<Factura | null>(null);

  const rechazarPedido = (factura: Factura) => setPedidoARechazar(factura);

  const confirmarRechazoPedido = async () => {
    if (!pedidoARechazar) return;
    const factura = pedidoARechazar;
    setProcesandoId(factura.id);
    try {
      await anularFactura(factura.id);
      toast.success('Pedido anulado y stock restaurado.');
      setPedidoARechazar(null);
      await cargar(true);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('No se pudo anular el pedido.');
      }
    } finally {
      setProcesandoId(null);
    }
  };

  const monedaBaseCodigo = useMemo(() => monedas.find((m) => m.es_predeterminada)?.codigo, [monedas]);

  /** Saldo que le falta pagar a una factura (total - suma de pagos exitosos ya registrados), en su propia moneda. */
  const saldoPendiente = useCallback((factura: Factura): number => {
    const pagado = transaccionesPago
      .filter((t) => t.factura === factura.id && t.activo && t.estado === 'exitoso')
      .reduce((acc, t) => acc + parseDecimal(t.monto), 0);
    return Math.max(parseDecimal(factura.total) - pagado, 0);
  }, [transaccionesPago]);

  /**
   * Monto a mostrar para una factura en la moneda elegida arriba.
   * `exacto=false` significa que esta factura no tiene un monto real en la
   * moneda seleccionada (ej. viendo en USD una factura emitida en VES que
   * no es la base) -- en ese caso se devuelve su propia moneda y monto tal
   * cual, NUNCA el número etiquetado con la moneda que se está viendo (eso
   * sería inventar una cifra en una moneda que esa factura nunca usó).
   */
  const montoEnVista = useCallback((f: Factura): { monto: string; codigo: string; exacto: boolean } => {
    if (f.moneda_codigo === vistaMoneda) return { monto: f.total, codigo: vistaMoneda, exacto: true };
    if (vistaMoneda === monedaBaseCodigo) return { monto: f.total_base, codigo: vistaMoneda, exacto: true };
    return { monto: f.total, codigo: f.moneda_codigo || '', exacto: false };
  }, [vistaMoneda, monedaBaseCodigo]);

  const columns = useMemo<ColumnDef<Factura>[]>(() => [
    {
      accessorKey: 'fecha_operacion',
      header: 'Fecha',
      cell: ({ row }) => (
        <span className="text-slate-600 text-xs">
          {new Date(row.original.fecha_operacion).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      ),
    },
    {
      accessorKey: 'correlativo',
      header: 'N° Pedido',
      cell: ({ row }) => <span className="font-mono font-bold text-slate-900">{row.original.correlativo || `#${row.original.id}`}</span>,
    },
    {
      id: 'cliente',
      header: 'Cliente',
      cell: ({ row }) => {
        // El ícono de globo solo tiene sentido para pedidos que en verdad
        // vinieron del catálogo público -- antes se mostraba igual para
        // pedidos cerrados desde una Mesa, con un tooltip que decía "Pedido
        // del catálogo público" aunque no lo fuera.
        const esDelCatalogoPublico = !transaccionesPago.some((t) => t.factura === row.original.id);
        return (
          <span className="text-slate-700 flex items-center gap-1.5" title={esDelCatalogoPublico ? 'Pedido del catálogo público' : 'Cobrado desde el panel'}>
            {esDelCatalogoPublico && <Globe2 size={12} className="text-primary-400 shrink-0" />}
            {getNombreById(clientes, row.original.cliente) || 'Cliente sin registrar'}
          </span>
        );
      },
    },
    {
      id: 'items',
      header: () => <div className="text-center">Items</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-center text-xs font-medium text-slate-500">
          {row.original.detalles?.length ?? 0}
        </div>
      ),
    },
    {
      id: 'pago_reportado',
      header: 'Pago Reportado',
      enableSorting: false,
      cell: ({ row }) => {
        const transaccion = transacciones.find((t) => t.factura === row.original.id);
        if (transaccion) {
          return (
            <div className="text-xs">
              <span className="flex items-center gap-1 font-bold text-slate-700">
                {transaccion.metodo_pago_nombre?.toLowerCase().includes('zelle') ? <Mail size={11} /> : <Smartphone size={11} />}
                {transaccion.metodo_pago_nombre}
              </span>
              {transaccion.referencia_externa && (
                <span className="font-mono text-slate-500">Ref: {transaccion.referencia_externa}</span>
              )}
            </div>
          );
        }
        // Pago cobrado desde el panel (POS, Mesa, honorarios, etc.) -- vive
        // en `Transaccionpago`, no en `TransaccionPasarela` (esa es solo para
        // pagos auto-reportados desde el catálogo público). Antes esta
        // columna solo miraba `transacciones` y por eso siempre mostraba "—"
        // para un pedido cerrado desde una Mesa, aunque el método de pago sí
        // había quedado registrado.
        const pago = transaccionesPago.find((t) => t.factura === row.original.id);
        if (!pago) return <span className="text-xs text-slate-300">—</span>;
        return (
          <div className="text-xs">
            <span className="flex items-center gap-1 font-bold text-slate-700">
              <HandCoins size={11} /> {pago.metodo_pago_nombre || 'Pago registrado'}
            </span>
            {pago.referencia && <span className="font-mono text-slate-500">Ref: {pago.referencia}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'estado',
      header: () => <div className="text-center">Estado</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <EstadoBadge estado={row.original.estado} />
        </div>
      ),
    },
    {
      id: 'preparacion',
      header: () => <div className="text-center">Preparación</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.estado_preparacion === 'listo' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold text-[11px] border bg-emerald-50 text-emerald-700 border-emerald-200">
              <PackageCheck size={11} /> Listo
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-lg font-bold text-[11px] border bg-slate-100 text-slate-500 border-slate-200">
              Pendiente
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'total',
      header: () => <div className="text-right">Total ({vistaMoneda})</div>,
      sortingFn: (a, b) => parseDecimal(montoEnVista(a.original).monto) - parseDecimal(montoEnVista(b.original).monto),
      cell: ({ row }) => {
        const { monto, codigo, exacto } = montoEnVista(row.original);
        return (
          <div className="text-right">
            <div className="font-black text-primary-700 font-mono">{codigo} {parseDecimal(monto).toFixed(2)}</div>
            {!exacto && (
              <div className="text-[10px] text-slate-400">no disponible en {vistaMoneda}</div>
            )}
          </div>
        );
      },
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => {
        const esPendiente = (row.original.estado || '').toLowerCase().includes('pendient');
        const esCredito = row.original.condicion_pago === 'credito';
        const procesando = procesandoId === row.original.id;
        return (
          <div className="flex justify-end gap-1">
            <button
              onClick={() => setPedidoSeleccionado(row.original)}
              className="p-2 text-slate-400 hover:text-primary-600 transition-colors"
              aria-label="Ver detalle del pedido"
              title="Ver detalle"
            >
              <Eye size={16} />
            </button>
            {row.original.estado_preparacion !== 'listo' && (
              <button
                onClick={() => marcarPreparado(row.original)}
                disabled={procesando}
                className="p-2 text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-40"
                aria-label="Marcar como preparado"
                title="Marcar como preparado (almacén)"
              >
                <PackageCheck size={16} />
              </button>
            )}
            {esPendiente && esCredito && (
              <button
                onClick={() => setPedidoAAbonar(row.original)}
                disabled={procesando}
                className="p-2 text-slate-400 hover:text-amber-600 transition-colors disabled:opacity-40"
                aria-label="Abonar"
                title="Registrar abono"
              >
                <HandCoins size={16} />
              </button>
            )}
            {esPendiente && (
              <>
                <button
                  onClick={() => confirmarPago(row.original)}
                  disabled={procesando}
                  className="p-2 text-slate-400 hover:text-green-600 transition-colors disabled:opacity-40"
                  aria-label="Confirmar pago"
                  title="Confirmar pago completo"
                >
                  {procesando ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                </button>
                <button
                  onClick={() => rechazarPedido(row.original)}
                  disabled={procesando}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
                  aria-label="Anular pedido"
                  title="Anular pedido"
                >
                  <XCircle size={16} />
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ], [clientes, procesandoId, transacciones, vistaMoneda, montoEnVista]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<ShoppingBag size={20} />}
        title="Pedidos"
        description="Pedidos recibidos desde tu catálogo público. Confirma el pago para cerrarlos o anúlalos para restaurar el stock."
      />

      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-200">
        <div className="flex gap-2">
          <button
            onClick={() => setFiltro('pendientes')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              filtro === 'pendientes' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Pendientes {pendientesCount > 0 && (
              <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">{pendientesCount}</span>
            )}
          </button>
          <button
            onClick={() => setFiltro('todos')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              filtro === 'todos' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Todos
          </button>
        </div>

        {/* Ver el Total en una sola moneda a la vez -- nunca mezclado.
            El monto en $ de una factura en $ nunca cambia; el equivalente
            en Bs siempre usa la tasa que quedó congelada en esa factura al
            momento de guardarse, no la tasa de hoy. */}
        {monedas.length > 1 && (
          <div className="flex items-center gap-1.5 pb-2 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Ver en</span>
            {monedas.map((m) => (
              <button
                key={m.id}
                onClick={() => setVistaMoneda(m.codigo)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  vistaMoneda === m.codigo
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {m.codigo}
              </button>
            ))}
          </div>
        )}
      </div>

      {cargando ? (
        <TableSkeleton rows={6} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable
            columns={columns}
            data={facturasFiltradas}
            resultLabel="pedidos"
            emptyState={
              <div className="p-12 text-center text-slate-400">
                <Package size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">
                  {filtro === 'pendientes' ? 'No tienes pedidos pendientes por confirmar.' : 'Aún no has recibido pedidos.'}
                </p>
              </div>
            }
          />
        </Card>
      )}

      {pedidoSeleccionado && (
        <PedidoDetalleModal
          factura={pedidoSeleccionado}
          clientes={clientes}
          metodosPago={metodosPago}
          transaccionPasarela={transacciones.find((t) => t.factura === pedidoSeleccionado.id) || null}
          transaccionPago={transaccionesPago.find((t) => t.factura === pedidoSeleccionado.id) || null}
          onClose={() => setPedidoSeleccionado(null)}
        />
      )}

      {pedidoAAbonar && (
        <AbonoModal
          factura={pedidoAAbonar}
          metodosPago={metodosPago}
          saldoPendiente={saldoPendiente(pedidoAAbonar)}
          onClose={() => setPedidoAAbonar(null)}
          onSaved={() => {
            setPedidoAAbonar(null);
            cargar(true);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!pedidoARechazar}
        title="Anular Pedido"
        message={`¿Anular el pedido #${pedidoARechazar?.correlativo || pedidoARechazar?.id}? El stock reservado se restaurará.`}
        confirmLabel="Anular"
        loading={procesandoId === pedidoARechazar?.id}
        onConfirm={confirmarRechazoPedido}
        onCancel={() => setPedidoARechazar(null)}
      />
    </div>
  );
}
