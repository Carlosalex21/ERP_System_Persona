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

import { useState, useEffect, useMemo, useCallback, useRef, type ReactElement } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  ReceiptText,
  Users,
  Package,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Crown,
  Building2,
  BookOpen,
  Lock,
} from 'lucide-react';

import { getDashboardReportes, type DashboardReporte } from '@/services/reportesService';
import { toastApiError } from '@/utils/errors';
import { roundMoney } from '@/utils/taxCalculator';
import { StatCard, AnimatedNumber, Stagger, StaggerItem } from '@/components/ui';
import { useTenant } from '@/hooks/useTenant';
import { useMonedaVista } from '@/context/MonedaVistaContext';
import { useSucursalFiltro } from '@/context/SucursalFiltroContext';
import SelectorSucursales from '@/components/SelectorSucursales';
import { TIPOS_CON_INVENTARIO } from '@/utils/modulosPanel';

import SalesChart from './SalesChart';
import TopProductsPanel from './TopProductsPanel';
import LowStockPanel from './LowStockPanel';
import StockoutPredictionPanel from './StockoutPredictionPanel';
import DashboardSkeleton from './DashboardSkeleton';
import type { VentasChartPoint, ProductoVendido, ProductoBajoStock, PrediccionQuiebreStock } from './types';

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
  void tenantId;
  const { tenant } = useTenant();
  // Los montos llegan del backend YA en la moneda de vista (`?moneda=`),
  // convertidos con la tasa del día de cada factura -- aquí solo se formatean.
  const { paramMoneda, moneda, listo: monedaLista, formatearEnVista } = useMonedaVista();
  const { paramAlmacenes, todasSeleccionadas: todasLasSucursales } = useSucursalFiltro();

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
  const [prediccionQuiebre, setPrediccionQuiebre] = useState<PrediccionQuiebreStock[]>([]);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
  const [metricasContabilidad, setMetricasContabilidad] = useState<DashboardReporte['contabilidad'] | null>(null);

  // Las tarjetas de inventario/stock (Productos, Valor de Inventario, Bajo
  // Stock) y los paneles de Top Productos/Predicción de Quiebre no le dicen
  // nada a un vertical que no vende bienes físicos (ej. contador) -- se
  // reemplazan por las métricas de `metricasContabilidad` en su lugar.
  const tieneInventario = tenant?.tipo_negocio
    ? (TIPOS_CON_INVENTARIO as string[]).includes(tenant.tipo_negocio)
    : true;

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
        reporte = await getDashboardReportes(paramMoneda, paramAlmacenes);
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

      const prediccionRaw = Array.isArray(reporte?.prediccionQuiebreStock) ? reporte.prediccionQuiebreStock : [];
      setPrediccionQuiebre(
        prediccionRaw.map((p) => ({
          nombre: String(p.nombre ?? 'Producto'),
          sku: p.sku ?? null,
          cantidad: Number(p.cantidad ?? 0),
          venta_diaria_promedio: Number(p.venta_diaria_promedio ?? 0),
          dias_restantes: Number(p.dias_restantes ?? 0),
        })),
      );

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

      setMetricasContabilidad(reporte?.contabilidad ?? null);
      setUltimaActualizacion(new Date());
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      // El 401 lo resuelve el interceptor de `apiPrivada` (refresh o login).
      if ((error as { response?: { status?: number } }).response?.status !== 401) {
        toastApiError(error, 'No se pudieron cargar los datos del dashboard.');
      }
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, [paramMoneda, paramAlmacenes]);

  // Carga inicial (cuando ya se sabe en qué moneda mostrar) y recarga
  // silenciosa -- sin volver al esqueleto -- al cambiar la moneda de vista.
  const monedaCargada = useRef<string | null>(null);
  useEffect(() => {
    if (!monedaLista || monedaCargada.current === paramMoneda) return;
    const esCambio = monedaCargada.current !== null;
    monedaCargada.current = paramMoneda;
    cargarMetricas(esCambio);
  }, [monedaLista, paramMoneda, cargarMetricas]);

  // Recarga silenciosa al cambiar la sucursal seleccionada (ver
  // `SucursalFiltroContext`) -- separado del efecto de moneda de arriba
  // porque son dos preferencias independientes que no deben pisarse ni
  // disparar una recarga doble cuando cambia solo una de las dos.
  const almacenesCargados = useRef<string>('');
  useEffect(() => {
    const clave = paramAlmacenes ? [...paramAlmacenes].sort((a, b) => a - b).join(',') : '';
    if (!monedaLista || almacenesCargados.current === clave) return;
    almacenesCargados.current = clave;
    cargarMetricas(true);
  }, [monedaLista, paramAlmacenes, cargarMetricas]);

  // useMemo: arreglo de tarjetas de métricas (se recalcula solo al cambiar valores)
  const metricCards = useMemo<MetricCardData[]>(
    () => [
      {
        id: 'ventas',
        icon: <DollarSign size={22} />,
        label: 'Ventas del Mes',
        value: <AnimatedNumber value={ventasMes} prefix={`${moneda.simbolo} `} decimals={2} thousands />,
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
      ...(tieneInventario
        ? [
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
              value: <AnimatedNumber value={valorInventario} prefix={`${moneda.simbolo} `} decimals={2} thousands />,
              note: 'Costo total de tu stock actual.',
              color: 'bg-green-600',
            },
            {
              id: 'bajostock',
              icon: <AlertTriangle size={22} />,
              label: 'Bajo Stock',
              value: <AnimatedNumber value={bajoStock} />,
              note: 'Productos por debajo de su stock mínimo.',
              color: 'bg-orange-500',
            },
          ]
        : metricasContabilidad
        ? [
            {
              id: 'empresas_activas',
              icon: <Building2 size={22} />,
              label: 'Empresas Activas',
              value: <AnimatedNumber value={metricasContabilidad.empresas_activas} />,
              note: 'Clientes contables que llevas actualmente.',
              color: 'bg-sky-500',
            },
            {
              id: 'asientos_mes',
              icon: <BookOpen size={22} />,
              label: 'Asientos del Mes',
              value: <AnimatedNumber value={metricasContabilidad.asientos_contabilizados_mes} />,
              note: 'Asientos contabilizados en el período actual.',
              color: 'bg-green-600',
            },
            {
              id: 'cierres',
              icon: <Lock size={22} />,
              label: 'Cierres Realizados',
              value: <AnimatedNumber value={metricasContabilidad.cierres_realizados} />,
              note: 'Ejercicios cerrados hasta la fecha.',
              color: 'bg-orange-500',
            },
          ]
        : []),
    ],
    [ventasMes, facturasMes, totalClientes, catalogoProductos, valorInventario, bajoStock, variacionVentasPct, tieneInventario, metricasContabilidad, moneda.simbolo],
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
                Montos en {moneda.codigo}
              </span>
              <p className="text-xs text-slate-400">
                {ultimaActualizacion
                  ? `Actualizado a las ${ultimaActualizacion.toLocaleTimeString()}`
                  : 'Cargando métricas de tu negocio...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SelectorSucursales />
            <motion.button
              onClick={() => cargarMetricas(true)}
              disabled={refreshing}
              whileTap={{ scale: 0.95 }}
              className="bg-white/10 border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/15 flex items-center gap-2 transition-colors disabled:opacity-60 backdrop-blur-sm shrink-0"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Actualizar
            </motion.button>
          </div>
        </div>
      </div>

      {cargando ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Si se filtró a una sucursal puntual y no hay nada que mostrar,
              lo más probable es que esa sucursal es nueva y todavía no tiene
              productos/ventas asignados -- un aviso explícito evita que un
              dashboard "en cero" se lea como si el filtro estuviera roto. */}
          {!todasLasSucursales && catalogoProductos === 0 && ventasMes === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3 bg-amber-50 ring-1 ring-amber-200/70 text-amber-800 rounded-2xl px-4 py-3 text-sm"
            >
              <Building2 size={18} className="text-amber-600 shrink-0" />
              <p>
                Esta sucursal todavía no tiene productos ni ventas asignados -- asigna el <strong>almacén</strong> de tus
                productos y la <strong>sucursal operativa</strong> de tus empleados en Inventario/RRHH para que sus datos aparezcan aquí.
              </p>
            </motion.div>
          )}

          {/* Métricas -- entran en cascada, no todas de golpe */}
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {metricCards.map(({ id, ...card }) => (
              <StaggerItem key={id}>
                <StatCard {...card} />
              </StaggerItem>
            ))}
          </Stagger>

          {/* Gráfico + Listas -- Top Productos/Bajo Stock/Predicción de Quiebre
              solo aplican a verticales que venden bienes físicos. */}
          {tieneInventario ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SalesChart data={chartData} formatear={formatearEnVista} />
                <TopProductsPanel productos={topProductos} formatear={formatearEnVista} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LowStockPanel productos={lowStockList} total={bajoStock} />
                <StockoutPredictionPanel productos={prediccionQuiebre} />
              </div>
            </>
          ) : (
            <SalesChart data={chartData} formatear={formatearEnVista} />
          )}
        </>
      )}
    </div>
  );
}
