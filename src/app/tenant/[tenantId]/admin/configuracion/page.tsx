"use client";

import { useState, useEffect, use, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import {
  Store, Tag, Percent, Loader2, Building, Trash2
} from 'lucide-react';
import { apiPrivada } from '@/services/api';
import ConfigModal from './components/ConfigModal';
import { Almacen, AlmacenRequest, Categoria, CategoriaRequest, Iva, IvaRequest, Sucursal, SucursalRequest } from '@/types/api';
import { createAlmacen, createCategoria, createIva, getIvas } from '@/services/configService';
import { getAlmacenes, getCategorias } from '@/services/inventoryService';
import { createSucursal, deleteSucursal, getSucursales } from '@/services/rrhhService';

/**
 * @typedef {Object} ConfiguracionPageProps
 * @property {Object} params - Parámetros de la ruta.
 * @property {string} params.tenantId - El ID del tenant actual.
 */
export default function ConfiguracionPage({ params }: { params: Promise<{ tenantId: string }> }): ReactElement {
  const { tenantId } = use(params);
  const router = useRouter();

  const [cargando, setCargando] = useState(false);

  // Estados de Datos Reales (Desde Django)
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [ivas, setIvas] = useState<Iva[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);

  // Estados de Modales
  const [modalConfig, setModalConfig] = useState<{tipo: 'almacen' | 'iva' | 'categoria' | 'sucursal' | null}>({tipo: null});

  // Formularios
  const [formConfig, setFormConfig] = useState<any>({});

  /**
   * Carga los datos maestros (almacenes, IVAs, categorías) desde la API.
   * @returns {Promise<void>}
   */
  const cargarDatosMaestros = async (): Promise<void> => {
    setCargando(true);
    try {
      const [resAlm, resIva, resCat, resSuc] = await Promise.all([
        getAlmacenes(),
        getIvas(),
        getCategorias(),
        getSucursales()
      ]);
      setAlmacenes(resAlm);
      setIvas(resIva);
      setCategorias(resCat);
      setSucursales(resSuc);
    } catch (error) {
      console.error("Error cargando configuración:", error);
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
    cargarDatosMaestros();
  }, []);

  /**
   * Guarda una nueva configuración (almacén, IVA o categoría).
   * @param {React.FormEvent} e - Evento del formulario.
   * @returns {Promise<void>}
   */
  const guardarConfiguracion = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setCargando(true);
    try {
      if (modalConfig.tipo === 'almacen') {
        await createAlmacen({ ...formConfig, activo: true, estado: 'AND' } as AlmacenRequest);
      } else if (modalConfig.tipo === 'iva') {
        await createIva({ ...formConfig, activo: true } as IvaRequest);
      } else if (modalConfig.tipo === 'categoria') {
        await createCategoria({ ...formConfig, activo: true } as CategoriaRequest);
      } else if (modalConfig.tipo === 'sucursal') {
        await createSucursal({ ...formConfig } as SucursalRequest);
      }
      setModalConfig({tipo: null});
      setFormConfig({});
      cargarDatosMaestros();
    } catch (error) {
      alert("Error al guardar la configuración.");
      console.error("Error al guardar la configuración:", error);
    } finally { setCargando(false); }
  };

  /**
   * Elimina una sucursal por su ID y recarga los datos.
   * @param {number} id - El ID de la sucursal a eliminar.
   */
  const eliminarSucursal = async (id: number): Promise<void> => {
    if (!confirm("¿Está seguro de que desea eliminar esta sucursal? Los empleados asignados a ella quedarán sin sucursal.")) return;
    setCargando(true);
    try {
      await deleteSucursal(id);
      await cargarDatosMaestros();
    } catch (error) {
      alert("Error al eliminar la sucursal.");
      console.error("Error eliminando sucursal:", error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-black text-slate-900 tracking-tight">Configuración Base</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">

        {/* Almacenes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4"><Store size={24} /></div>
          <h3 className="font-bold text-slate-900 text-lg mb-1">Almacenes</h3>
          <div className="space-y-2 mb-4 flex-grow">
            {almacenes.map(a => <div key={a.id} className="text-xs font-semibold bg-slate-50 p-2 rounded border border-slate-100 flex justify-between items-center"><span>{a.nombre}</span> <span className="text-blue-600">ID: {a.id}</span></div>)}
          </div>
          <button onClick={() => { setFormConfig({nombre: '', direccion: '', telefono: ''}); setModalConfig({tipo: 'almacen'}); }} className="w-full py-2 bg-blue-50 text-blue-700 font-bold text-xs rounded-xl hover:bg-blue-100">Añadir Almacén</button>
        </div>

        {/* IVA */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4"><Percent size={24} /></div>
          <h3 className="font-bold text-slate-900 text-lg mb-1">Impuestos (IVA)</h3>
          <div className="space-y-2 mb-4 flex-grow">
            {ivas.map(i => <div key={i.id} className="text-xs font-semibold bg-slate-50 p-2 rounded border border-slate-100 flex justify-between items-center"><span>{i.nombre}</span> <span className="text-green-600">{i.porcentaje_iva}%</span></div>)}
          </div>
          <button onClick={() => { setFormConfig({nombre: '', porcentaje_iva: ''}); setModalConfig({tipo: 'iva'}); }} className="w-full py-2 bg-green-50 text-green-700 font-bold text-xs rounded-xl hover:bg-green-100">Añadir IVA</button>
        </div>

        {/* Categorías */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4"><Tag size={24} /></div>
          <h3 className="font-bold text-slate-900 text-lg mb-1">Categorías</h3>
          <div className="space-y-2 mb-4 flex-grow">
            {categorias.map(c => <div key={c.id} className="text-xs font-semibold bg-slate-50 p-2 rounded border border-slate-100 flex justify-between items-center"><span>{c.nombre}</span> <span className="text-purple-600">ID: {c.id}</span></div>)}
          </div>
          <button onClick={() => { setFormConfig({nombre: '', descripcion: ''}); setModalConfig({tipo: 'categoria'}); }} className="w-full py-2 bg-purple-50 text-purple-700 font-bold text-xs rounded-xl hover:bg-purple-100">Añadir Categoría</button>
        </div>

        {/* Sucursales */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center mb-4"><Building size={24} /></div>
          <h3 className="font-bold text-slate-900 text-lg mb-1">Sucursales</h3>
          <div className="space-y-2 mb-4 flex-grow">
            {sucursales.map(s => <div key={s.id} className="text-xs font-semibold bg-slate-50 p-2 rounded border border-slate-100 flex justify-between items-center"><span>{s.nombre}</span><button onClick={() => eliminarSucursal(s.id)} className="p-1 text-slate-400 hover:text-red-500 rounded-full"><Trash2 size={14} /></button></div>)}
          </div>
          <button onClick={() => { setFormConfig({ nombre: '', direccion: '' }); setModalConfig({ tipo: 'sucursal' }); }} className="w-full py-2 bg-cyan-50 text-cyan-700 font-bold text-xs rounded-xl hover:bg-cyan-100">Añadir Sucursal</button>
        </div>

      </div>

      {modalConfig.tipo && (
        <ConfigModal
          modalConfig={modalConfig}
          setModalConfig={setModalConfig}
          formConfig={formConfig}
          setFormConfig={setFormConfig}
          guardarConfiguracion={guardarConfiguracion}
          cargando={cargando}
        />
      )}
    </div>
  );
}
