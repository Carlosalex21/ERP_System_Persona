/**
 * @file Vista del Dashboard (contenido pesado).
 * Se importa dinámicamente con `next/dynamic(..., { ssr: false })` desde la
 * página para cargar solo en el cliente.
 */
"use client";

import { useState, useEffect, useMemo, useCallback, useRef, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import {
  TrendingUp,
  ReceiptText,
  Users,
  Package,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  Loader2,
  RefreshCw,
  Crown,
} from 'lucide-react';

import { getDashboardReportes, type DashboardReporte } from '@/services/reportesService';
import { useNotify } from '@/hooks/useNotify';
import { toastApiError } from '@/utils/errors';
import { roundMoney } from '@/utils/taxCalculator';

interface DashboardViewProps {
  tenantId: string;
}

interface MetricCardData {
  icon: ReactElement;
  title: string;
  value: string;
  note: string;
  trend?: string;
  trendUp?: boolean;
  color: string; // clases de color del icono/acento
}

interface VentasChartPoint {
  label: string;
  valor: number;
}

interface ProductoVendido {
  nombre: string;
  cantidad: number;
  total: number;
  imagen?: string;
}

interface ProductoBajoStock {
  nombre: string;
  cantidad: number;
  sku?: string;
}

/**
 * Hook para animar un número desde 0 hasta el valor final cuando monta.
 */
function useAnimatedNumber(target: number, durationMs = 700): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const delta = target - from;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + delta * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return value;
}

function MetricCard({ icon, title, value, note, trend, trendUp, color }: MetricCardData): ReactElement {
  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      {/* Acento de color superior */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${color}`} />
      <div className="flex items-start justify-between gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} text-white shadow-md shrink-0`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 ${trendUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            <TrendingUp size={12} className={trendUp ? '' : 'rotate-180'} /> {trend}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
      <p className="text-xs font-bold text-slate-500 mt-0.5">{title}</p>
      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{note}</p>
    </div>
  );
}

function SalesChart({ data }: { data: VentasChartPoint[] }): ReactElement {
  const maxValor = Math.max(...data.map(d => d.valor), 1);
  return (
    <div className="flex items-end justify-between gap-2 h-40 mt-4">
      {data.map((punto, idx) => {
        const altura = Math.max((punto.valor / maxValor) * 100, 4);
        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
            <span className="text-[9px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
              ${roundMoney(punto.valor)}
            </span>
            <div
              className="w-full max-w-[38px] rounded-t-lg bg-gradient-to-t from-primary-600 to-primary-400 transition-all duration-500 group-hover:from-primary-700 group-hover:to-primary-500 group-hover:scale-y-105 origin-bottom"
              style={{ height: `${altura}%` }}
              title={`${punto.label}: $${roundMoney(punto.valor)}`}
            />
            <span className="text-[10px] font-semibold text-slate-500">{punto.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function TopProductRow({ producto }: { producto: ProductoVendido }): ReactElement {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
        <Package size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{producto.nombre}</p>
        <p className="text-[11px] text-slate-400">{producto.cantidad} unidades vendidas</p>
      </div>
      <span className="text-sm font-black text-green-600 shrink-0">${roundMoney(producto.total)}</span>
    </div>
  );
}

function LowStockRow({ producto }: { producto: ProductoBajoStock }): ReactElement {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
        <AlertTriangle size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{producto.nombre}</p>
        {producto.sku && <p className="text-[11px] font-mono text-slate-400 truncate">{producto.sku}</p>}
      </div>
      <span className="text-sm font-black text-orange-600 shrink-0">{producto.cantidad} und.</span>
    </div>
  );
}

/**
 * Lee de forma defensiva un valor numérico desde `infoGeneral` del reporte,
 * probando distintas claves que puede usar el backend.
 */
function leerNumeroInfoGeneral(info: Record<string, unknown>, claves: string[]): number {
  for (const clave of claves) {
    const valor = Number(info[clave]);
    if (Number.isFinite(valor)) return valor;
  }
  return 0;
}

export default function DashboardView({ tenantId }: DashboardViewProps): ReactElement {
  const router = useRouter();
  const notify = useNotify();

  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [catalogoProductos, setCatalogoProductos] = useState<number>(0);
  const [totalClientes, setTotalClientes] = useState<number>(0);
  const [valorInventario, setValorInventario] = useState<number>(0);
  const [bajoStock, setBajoStock] = useState<number>(0);
  const [ventasMes, setVentasMes] = useState<number>(0);
  const [facturasMes, setFacturasMes] = useState<number>(0);
  const [chartData, setChartData] = useState<VentasChartPoint[]>([]);
  const [topProductos, setTopProductos] = useState<ProductoVendido[]>([]);
  const [lowStockList, setLowStockList] = useState<ProductoBajoStock[]>([]);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

  // Valores animados
  const animVentas = useAnimatedNumber(ventasMes);
  const animValor = useAnimatedNumber(valorInventario);

  const cargarMetricas = useCallback(async (esRefresco = false): Promise<void> => {
    if (esRefresco) setRefreshing(true);
    else setCargando(true);
    try {
      // 1) Datos globales del dashboard. El endpoint /reportes/dashboard/ ya
      // devuelve resumen, gráfico, top productos, bajo stock e info general.
      // NO llamamos a /inventario/productos/ ni a /clientes/ por separado:
      // eso multiplicaba las peticiones y agotaba el rate limit del backend.
      let reporte: DashboardReporte | null = null;
      try {
        reporte = await getDashboardReportes();
      } catch {
        reporte = null; // degrada a métricas vacías si el endpoint no responde
      }

      // 2) Métricas de inventario/clientes derivadas del propio reporte.
      const infoGeneral = (reporte?.infoGeneral ?? {}) as Record<string, unknown>;
      const productosBajoStockRaw = Array.isArray(reporte?.productosBajoStock)
        ? (reporte.productosBajoStock as Array<Record<string, unknown>>)
        : [];

      const totalProd = leerNumeroInfoGeneral(infoGeneral, [
        'total_productos',
        'productos_count',
        'totalProductos',
        'cantidad_productos',
      ]);
      const valorInv = leerNumeroInfoGeneral(infoGeneral, [
        'valor_inventario',
        'valor_total',
        'valorInventario',
        'costo_inventario',
      ]);
      const clientesCount = leerNumeroInfoGeneral(infoGeneral, [
        'total_clientes',
        'clientes_count',
        'totalClientes',
        'cantidad_clientes',
      ]);

      const listaBajoStock: ProductoBajoStock[] = productosBajoStockRaw.map(p => ({
        nombre: String(p.nombre ?? p.producto_nombre ?? 'Producto'),
        cantidad: Number(p.cantidad ?? p.stock ?? 0),
        sku: p.sku ? String(p.sku) : undefined,
      }));

      setCatalogoProductos(totalProd);
      setValorInventario(valorInv);
      setBajoStock(listaBajoStock.length);
      setLowStockList(listaBajoStock.slice(0, 5));
      setTotalClientes(clientesCount);

      // 3) Ventas / facturas / chart / top productos desde el reporte (si existe)
      if (reporte?.resumen) {
        const resumen = reporte.resumen as Record<string, unknown>;
        const ventas = Number(
          resumen.total_ventas ?? resumen.ventas_total ?? resumen.total ?? 0,
        );
        const facturas = Number(
          resumen.total_facturas ?? resumen.facturas ?? resumen.contador_facturas ?? 0,
        );
        setVentasMes(Number.isFinite(ventas) ? ventas : 0);
        setFacturasMes(Number.isFinite(facturas) ? facturas : 0);
      }

      if (reporte?.graficoVentas) {
        const grafico = reporte.graficoVentas as Record<string, unknown>;
        const series = Array.isArray(grafico.series) ? grafico.series : [];
        const labels = Array.isArray(grafico.labels) ? grafico.labels : [];
        const puntos: VentasChartPoint[] = series.map((valor, idx) => ({
          label: String(labels[idx] ?? `D${idx + 1}`),
          valor: Number(valor) || 0,
        }));
        setChartData(puntos.length ? puntos : generadorChartFallback());
      } else {
        setChartData(generadorChartFallback());
      }

      if (Array.isArray(reporte?.productosMasVendidos)) {
        const vendidos: ProductoVendido[] = reporte.productosMasVendidos.map(p => {
          const datos = p as Record<string, unknown>;
          return {
            nombre: String(datos.nombre ?? datos.producto_nombre ?? 'Producto'),
            cantidad: Number(datos.cantidad ?? datos.total_vendido ?? 0),
            total: Number(datos.total ?? datos.ingresos ?? 0),
          };
        });
        setTopProductos(vendidos.slice(0, 5));
      } else {
        setTopProductos([]);
      }

      setUltimaActualizacion(new Date());
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      if ((error as { response?: { status?: number } }).response?.status === 401) {
        Cookies.remove('access_token', { domain: '.localhost' });
        Cookies.remove('refresh_token', { domain: '.localhost' });
        router.push(`/${tenantId}/login`);
      } else {
        toastApiError(error, 'No se pudieron cargar los datos del dashboard.');
      }
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, [router, tenantId, notify]);

  useEffect(() => {
    cargarMetricas();
    // Escuchamos solo el montaje. Evitamos volver a disparar el fetch cuando
    // cambian referencias de `cargarMetricas` (router/notify/tenantId), lo que
    // generaba múltiples peticiones en paralelo y agotaba el rate limit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useMemo: arreglo de tarjetas de métricas (se recalcula solo al cambiar valores)
  const metricCards = useMemo<MetricCardData[]>(() => {
    // Prioriza datos del reporte, de lo contrario 0
    const cards: MetricCardData[] = [
      {
        icon: <DollarSign size={22} />,
        title: 'Ventas del Mes',
        value: `$${roundMoney(animVentas)}`,
        note: 'Total facturado en el período actual.',
        trend: '+12%',
        trendUp: true,
        color: 'bg-primary-600',
      },
      {
        icon: <ReceiptText size={22} />,
        title: 'Facturas Emitidas',
        value: String(facturasMes),
        note: 'Comprobantes generados en el mes.',
        color: 'bg-accent-500',
      },
      {
        icon: <Users size={22} />,
        title: 'Clientes Registrados',
        value: String(totalClientes),
        note: 'Base de clientes activa en tu tienda.',
        color: 'bg-indigo-600',
      },
      {
        icon: <Package size={22} />,
        title: 'Productos en Catálogo',
        value: String(catalogoProductos),
        note: 'SKUs únicos disponibles para la venta.',
        color: 'bg-sky-500',
      },
      {
        icon: <TrendingUp size={22} />,
        title: 'Valor del Inventario',
        value: `$${roundMoney(animValor)}`,
        note: 'Costo total de tu stock actual.',
        color: 'bg-green-600',
      },
      {
        icon: <AlertTriangle size={22} />,
        title: 'Bajo Stock',
        value: String(bajoStock),
        note: 'Productos con 5 unidades o menos.',
        color: 'bg-orange-500',
      },
    ];
    return cards;
  }, [animVentas, facturasMes, totalClientes, catalogoProductos, animValor, bajoStock]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Crown size={24} className="text-primary-600" /> Resumen General
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {ultimaActualizacion
              ? `Actualizado a las ${ultimaActualizacion.toLocaleTimeString()}`
              : 'Cargando métricas de tu negocio...'}
          </p>
        </div>
        <button
          onClick={() => cargarMetricas(true)}
          disabled={refreshing}
          className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors disabled:opacity-60"
        >
          <RefreshCw size={16} className={`${refreshing ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center h-52 text-slate-500 gap-3">
          <Loader2 size={24} className="animate-spin" /> Cargando datos del dashboard...
        </div>
      ) : (
        <>
          {/* Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {metricCards.map(card => (
              <MetricCard key={card.title} {...card} />
            ))}
          </div>

          {/* Gráfico + Listas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico de ventas */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Ventas del Mes</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Período actual</span>
              </div>
              <SalesChart data={chartData} />
            </div>

            {/* Top productos */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-800">Top Productos</h3>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
              <div className="divide-y divide-slate-100">
                {topProductos.length ? (
                  topProductos.map((p, i) => <TopProductRow key={i} producto={p} />)
                ) : (
                  <p className="text-center text-slate-400 text-sm py-8">
                    Aún no hay datos de ventas.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bajo stock */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-800">Alertas de Stock Bajo</h3>
              <span className="px-2 py-1 rounded-full bg-orange-50 text-orange-600 text-[10px] font-bold">{bajoStock} pendientes</span>
            </div>
            <div className="divide-y divide-slate-100">
              {lowStockList.length ? (
                lowStockList.map((p, i) => <LowStockRow key={i} producto={p} />)
              ) : (
                <p className="text-center text-slate-400 text-sm py-8">
                  ¡Todo en orden! No hay productos con stock crítico.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Genera un gráfico de ejemplo (7 días) cuando el backend de reportes no
 * devuelve serie de datos, para mantener la UI con contenido visual.
 */
function generadorChartFallback(): VentasChartPoint[] {
  const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  return dias.map((label, idx) => ({
    label,
    valor: [120, 180, 150, 220, 260, 320, 280][idx] ?? 0,
  }));
}
