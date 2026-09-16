/**
 * @file Vista del Dashboard (contenido pesado).
 * Se importa dinámicamente con `next/dynamic(..., { ssr: false })` desde la
 * página para cargar solo en el cliente.
 *
 * Este archivo se dedica a ORQUESTAR: pedir los datos, guardarlos en
 * estado, y decidir qué pieza pintar. El dibujo de cada pieza (gráfico,
 * tarjetas, listas) vive en sus propios archivos en esta misma carpeta --
 * así este archivo no crece sin límite cada vez que una pieza necesita más
 * lógica propia, y cada pieza se puede tocar sin releer todo el dashboard.
 */
"use client";

import { useState, useEffect, useMemo, useCallback, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { motion } from 'framer-motion';
import { getSharedCookieDomain } from '@/utils/cookieDomain';
import {
  TrendingUp,
  ReceiptText,
  Users,
  Package,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Crown,
} from 'lucide-react';

import { getDashboardReportes, type DashboardReporte } from '@/services/reportesService';
import { useNotify } from '@/hooks/useNotify';
import { toastApiError } from '@/utils/errors';
import { roundMoney } from '@/utils/taxCalculator';
import { StatCard, AnimatedNumber, Stagger, StaggerItem } from '@/components/ui';
import { useTenant } from '@/hooks/useTenant';
import { getPaisInfo } from '@/utils/paises';

import SalesChart from './SalesChart';
import TopProductsPanel from './TopProductsPanel';
import LowStockPanel from './LowStockPanel';
import DashboardSkeleton from './DashboardSkeleton';
import type { VentasChartPoint, ProductoVendido, ProductoBajoStock } from './types';

interface DashboardViewProps {
  tenantId: string;
}

interface MetricCardData {
  id: string;
  icon: ReactElement;
  label: string;
  value: ReactElement;
  note: string;
  trend?: string;
  trendUp?: boolean;
  color: string;
}

export default function DashboardView({ tenantId }: DashboardViewProps): ReactElement {
  const router = useRouter();
  const notify = useNotify();
  const { tenant } = useTenant();
  const pais = getPaisInfo(tenant?.pais_codigo);

  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [catalogoProductos, setCatalogoProductos] = useState<number>(0);
  const [totalClientes, setTotalClientes] = useState<number>(0);
  const [valorInventario, setValorInventario] = useState<number>(0);
  const [bajoStock, setBajoStock] = useState<number>(0);
  const [ventasMes, setVentasMes] = useState<number>(0);
  const [facturasMes, setFacturasMes] = useState<number>(0);
  const [variacionVentasPct, setVariacionVentasPct] = useState<number | null>(null);
  const [chartData, setChartData] = useState<VentasChartPoint[]>([]);
  const [topProductos, setTopProductos] = useState<ProductoVendido[]>([]);
  const [lowStockList, setLowStockList] = useState<ProductoBajoStock[]>([]);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

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

      // 2) Métricas de inventario/clientes: nombres exactos que devuelve
      // `dashboard_service.obtener_metricas_dashboard` (antes se adivinaban
      // varias claves posibles y ninguna coincidía con la real, así que
      // estas tarjetas siempre quedaban en 0).
      const infoGeneral = reporte?.infoGeneral;
      const productosBajoStockRaw = Array.isArray(reporte?.productosBajoStock) ? reporte.productosBajoStock : [];

      const listaBajoStock: ProductoBajoStock[] = productosBajoStockRaw.map((p) => ({
        nombre: String(p.nombre ?? 'Producto'),
        cantidad: Number(p.cantidad ?? 0),
      }));

      setCatalogoProductos(infoGeneral?.productos ?? 0);
      setValorInventario(Number(infoGeneral?.valor_inventario ?? 0));
      setBajoStock(infoGeneral?.productos_bajo_stock_count ?? listaBajoStock.length);
      setLowStockList(listaBajoStock.slice(0, 5));
      setTotalClientes(infoGeneral?.clientes ?? 0);

      // 3) Ventas / facturas / chart / top productos desde el reporte (si existe)
      if (reporte?.resumen) {
        setVentasMes(Number(reporte.resumen.total_vendido ?? 0));
        setFacturasMes(reporte.resumen.num_transacciones ?? 0);
        const variacion = reporte.resumen.variacion_ventas_pct;
        setVariacionVentasPct(variacion === null || variacion === undefined ? null : Number(variacion));
      } else {
        setVariacionVentasPct(null);
      }

      if (reporte?.graficoVentas) {
        const { labels, data } = reporte.graficoVentas;
        const puntos: VentasChartPoint[] = (data ?? []).map((valor, idx) => ({
          label: String(labels?.[idx] ?? `D${idx + 1}`),
          valor: Number(valor) || 0,
        }));
        setChartData(puntos);
      } else {
        setChartData([]);
      }

      if (Array.isArray(reporte?.productosMasVendidos)) {
        const vendidos: ProductoVendido[] = reporte.productosMasVendidos.map((p) => ({
          nombre: p.producto__nombre ?? p.variante__nombre ?? 'Producto',
          cantidad: Number(p.cantidad_total ?? 0),
          total: Number(p.ingresos_total ?? 0),
        }));
        setTopProductos(vendidos);
      } else {
        setTopProductos([]);
      }

      setUltimaActualizacion(new Date());
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      if ((error as { response?: { status?: number } }).response?.status === 401) {
        const domain = getSharedCookieDomain();
        Cookies.remove('access_token', { domain });
        Cookies.remove('refresh_token', { domain });
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
  const metricCards = useMemo<MetricCardData[]>(
    () => [
      {
        id: 'ventas',
        icon: <DollarSign size={22} />,
        label: 'Ventas del Mes',
        value: <AnimatedNumber value={ventasMes} prefix="$" decimals={2} />,
        note: 'Total facturado en el período actual.',
        // Antes esto era un "+12%" fijo que no salía de ningún cálculo real.
        // Ahora es la variación real vs. el período anterior de igual
        // duración -- se omite el badge (en vez de inventar un número)
        // cuando no hay base de comparación (`null`, ej. sin ventas antes).
        ...(variacionVentasPct !== null
          ? {
              trend: `${variacionVentasPct >= 0 ? '+' : ''}${roundMoney(variacionVentasPct)}%`,
              trendUp: variacionVentasPct >= 0,
            }
          : {}),
        color: 'bg-primary-600',
      },
      {
        id: 'facturas',
        icon: <ReceiptText size={22} />,
        label: 'Facturas Emitidas',
        value: <AnimatedNumber value={facturasMes} />,
        note: 'Comprobantes generados en el mes.',
        color: 'bg-accent-500',
      },
      {
        id: 'clientes',
        icon: <Users size={22} />,
        label: 'Clientes Registrados',
        value: <AnimatedNumber value={totalClientes} />,
        note: 'Base de clientes activa en tu tienda.',
        color: 'bg-indigo-600',
      },
      {
        id: 'productos',
        icon: <Package size={22} />,
        label: 'Productos en Catálogo',
        value: <AnimatedNumber value={catalogoProductos} />,
        note: 'SKUs únicos disponibles para la venta.',
        color: 'bg-sky-500',
      },
      {
        id: 'inventario',
        icon: <TrendingUp size={22} />,
        label: 'Valor del Inventario',
        value: <AnimatedNumber value={valorInventario} prefix="$" decimals={2} />,
        note: 'Costo total de tu stock actual.',
        color: 'bg-green-600',
      },
      {
        id: 'bajostock',
        icon: <AlertTriangle size={22} />,
        label: 'Bajo Stock',
        value: <AnimatedNumber value={bajoStock} />,
        note: 'Productos con 5 unidades o menos.',
        color: 'bg-orange-500',
      },
    ],
    [ventasMes, facturasMes, totalClientes, catalogoProductos, valorInventario, bajoStock, variacionVentasPct],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-ink-950 px-6 py-6 sm:px-8 sm:py-7">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary-700 rounded-full blur-[70px] opacity-40" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Crown size={22} className="text-accent-400" /> Bienvenido{tenant?.nombre_empresa ? `, ${tenant.nombre_empresa}` : ''}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-200 bg-white/10 px-2.5 py-1 rounded-full">
                {pais.nombre} · {pais.moneda}
              </span>
              <p className="text-xs text-slate-400">
                {ultimaActualizacion
                  ? `Actualizado a las ${ultimaActualizacion.toLocaleTimeString()}`
                  : 'Cargando métricas de tu negocio...'}
              </p>
            </div>
          </div>
          <motion.button
            onClick={() => cargarMetricas(true)}
            disabled={refreshing}
            whileTap={{ scale: 0.95 }}
            className="bg-white/10 border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/15 flex items-center gap-2 transition-colors disabled:opacity-60 backdrop-blur-sm"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Actualizar
          </motion.button>
        </div>
      </div>

      {cargando ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Métricas -- entran en cascada, no todas de golpe */}
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {metricCards.map(({ id, ...card }) => (
              <StaggerItem key={id}>
                <StatCard {...card} />
              </StaggerItem>
            ))}
          </Stagger>

          {/* Gráfico + Listas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SalesChart data={chartData} />
            <TopProductsPanel productos={topProductos} />
          </div>

          <LowStockPanel productos={lowStockList} total={bajoStock} />
        </>
      )}
    </div>
  );
}
