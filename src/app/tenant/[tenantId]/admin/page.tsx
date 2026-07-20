"use client";

import { useState, useEffect, use, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { 
  Package, PackageX, DollarSign, Loader2
} from 'lucide-react';
import MetricCard from './components/MetricCard';
import { getProductos } from '@/services/inventoryService';

export default function AdminDashboardPage({ params }: { params: Promise<{ tenantId: string }> }): ReactElement {
  const { tenantId } = use(params);
  const router = useRouter();

  // Estados de interfaz
  const [cargando, setCargando] = useState(false);

  // Estado del Dashboard
  const [dashboardData, setDashboardData] = useState({
    totalProductos: 0,
    valorInventario: 0,
    productosBajoStock: 0,
  });

  /**
   * Carga los datos necesarios para el dashboard.
   * @returns {Promise<void>}
   */
  const loadDashboardMetrics = async (): Promise<void> => {
    setCargando(true);
    try {
      const productos = await getProductos();
      const totalProductos = productos.length;
      const valorInventario = productos.reduce((acc, p) => acc + (parseFloat(p.precio || '0') * (p.cantidad || 0)), 0);
      const productosBajoStock = productos.filter(p => (p.cantidad || 0) <= 5).length;
      setDashboardData({ totalProductos, valorInventario, productosBajoStock });
    } catch (error) {
      console.error("Error cargando datos del dashboard:", error);
      if ((error as any).response?.status === 401) {
        Cookies.remove('access_token', { domain: '.localhost' });
        Cookies.remove('refresh_token', { domain: '.localhost' });
        router.push(`/${tenantId}/login`);
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    loadDashboardMetrics();
  }, [tenantId]);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-black text-slate-900 tracking-tight">Resumen General</h1>
      {cargando ? (
        <div className="flex items-center justify-center h-48 text-slate-500">
          <Loader2 size={24} className="animate-spin mr-2" /> Cargando datos del dashboard...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard 
            icon={<Package size={22} />}
            title="Total de Productos" 
            value={dashboardData.totalProductos}
            note="Cantidad de SKUs únicos en tu inventario." />
          <MetricCard 
            icon={<DollarSign size={22} />}
            title="Valor del Inventario" 
            value={`$${dashboardData.valorInventario.toFixed(2)}`}
            note="Costo total de tu stock actual." />
          <MetricCard 
            icon={<PackageX size={22} />}
            title="Productos con Bajo Stock" 
            value={dashboardData.productosBajoStock}
            note="Items con 5 o menos unidades." />
        </div>
      )}
    </div>
  );
}
