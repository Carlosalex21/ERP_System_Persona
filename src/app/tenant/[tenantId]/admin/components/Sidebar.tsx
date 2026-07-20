"use client";

import React from 'react';
import {
  LayoutDashboard, Package, Settings, Menu, X,
  HardHat, BarChart3, Users, CreditCard,
} from 'lucide-react';
import Link from 'next/link';

/**
 * @typedef {Object} SidebarProps
 * @property {string} tenantId - El ID del tenant actual.
 * @property {string} vistaActiva - La vista activa actualmente en el panel de administración.
 * @property {(vista: string) => void} setVistaActiva - Función para cambiar la vista activa.
 * @property {boolean} menuMovilAbierto - Indica si el menú móvil está abierto.
 * @property {(abierto: boolean) => void} setMenuMovilAbierto - Función para controlar el estado del menú móvil.
 * @property {() => void} ejecutarLogout - Función para cerrar la sesión del usuario.
 */
interface SidebarProps {
  tenantId: string;
  vistaActiva: string;
  setVistaActiva: (vista: string) => void;
  menuMovilAbierto: boolean;
  setMenuMovilAbierto: (abierto: boolean) => void;
  ejecutarLogout: () => void;
}

/**
 * Componente de barra lateral para el panel de administración del tenant.
 * Permite la navegación entre los diferentes módulos del ERP.
 * @param {SidebarProps} props - Las propiedades del componente.
 * @returns {JSX.Element} El componente de barra lateral.
 */
export default function Sidebar({ tenantId, vistaActiva, setVistaActiva, menuMovilAbierto, setMenuMovilAbierto, ejecutarLogout }: SidebarProps): React.ReactElement {
  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary-900 text-white p-5 flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${menuMovilAbierto ? 'translate-x-0' : '-translate-x-full'}`}>
      <div>
        <div className="flex justify-between items-center pb-6 border-b border-primary-800">
          <div>
            <h2 className="text-xl font-black tracking-tight uppercase">{tenantId.replace('-',' ')}</h2>
            <span className="text-xs text-primary-300 font-medium">Panel Administrativo</span>
          </div>
          <button onClick={() => setMenuMovilAbierto(false)} className="md:hidden text-primary-200"><X size={24} /></button>
        </div>
        <nav className="mt-8 space-y-2">
          <Link href="/admin" onClick={() => setMenuMovilAbierto(false)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${vistaActiva === 'dashboard' ? 'bg-primary-700 text-white' : 'text-primary-200 hover:bg-primary-800'}`}>
            <LayoutDashboard size={18} /> Resumen General
          </Link>
          <Link href="/admin/inventario" onClick={() => setMenuMovilAbierto(false)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${vistaActiva === 'inventario' ? 'bg-primary-700 text-white' : 'text-primary-200 hover:bg-primary-800'}`}>
            <Package size={18} /> Inventario / Stock
          </Link>
          <Link href="/admin/pos" onClick={() => setMenuMovilAbierto(false)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${vistaActiva === 'pos' ? 'bg-primary-700 text-white' : 'text-primary-200 hover:bg-primary-800'}`}>
            <HardHat size={18} /> Punto de Venta (POS)
          </Link>
          <Link href="/admin/reportes" onClick={() => setMenuMovilAbierto(false)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${vistaActiva === 'reportes' ? 'bg-primary-700 text-white' : 'text-primary-200 hover:bg-primary-800'}`}>
            <BarChart3 size={18} /> Reportes
          </Link>
          <Link href="/admin/configuracion" onClick={() => setMenuMovilAbierto(false)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${vistaActiva === 'configuracion' ? 'bg-primary-700 text-white' : 'text-primary-200 hover:bg-primary-800'}`}>
            <Settings size={18} /> Ajustes de Tienda
          </Link>
          <div className="pt-2 mt-2 border-t border-primary-800/50">
            <Link href="/admin/rrhh" onClick={() => setMenuMovilAbierto(false)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${vistaActiva === 'rrhh' ? 'bg-primary-700 text-white' : 'text-primary-200 hover:bg-primary-800'}`}>
              <Users size={18} /> RRHH
            </Link>
            <Link href="/admin/pagos" onClick={() => setMenuMovilAbierto(false)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${vistaActiva === 'pagos' ? 'bg-primary-700 text-white' : 'text-primary-200 hover:bg-primary-800'}`}>
              <CreditCard size={18} /> Pagos
            </Link>
          </div>
        </nav>
      </div>
      <div className="pt-4 border-t border-primary-800">
        <button onClick={ejecutarLogout} className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm text-primary-300 hover:bg-primary-800 hover:text-white transition-colors">
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}