"use client";

import React from 'react';
import { X, Loader2 } from 'lucide-react';

/**
 * @typedef {Object} ConfigModalState
 * @property {'almacen' | 'iva' | 'categoria' | null} tipo - Tipo de configuración que se está editando.
 */
interface ConfigModalState {
  tipo: 'almacen' | 'iva' | 'categoria' | 'sucursal' | null;
}

/**
 * @typedef {Object} ConfigModalProps
 * @property {ConfigModalState} modalConfig - Estado del modal de configuración.
 * @property {React.Dispatch<React.SetStateAction<ConfigModalState>>} setModalConfig - Setter para el estado del modal de configuración.
 * @property {any} formConfig - Estado del formulario de configuración.
 * @property {React.Dispatch<React.SetStateAction<any>>} setFormConfig - Setter para el estado del formulario de configuración.
 * @property {(e: React.FormEvent) => Promise<void>} guardarConfiguracion - Función para guardar la configuración.
 * @property {boolean} cargando - Indica si la operación de guardado está en curso.
 */
interface ConfigModalProps {
  modalConfig: ConfigModalState;
  setModalConfig: React.Dispatch<React.SetStateAction<ConfigModalState>>;
  formConfig: any;
  setFormConfig: React.Dispatch<React.SetStateAction<any>>;
  guardarConfiguracion: (e: React.FormEvent) => Promise<void>;
  cargando: boolean;
}

/**
 * Modal genérico para la creación o edición de elementos de configuración (almacenes, IVAs, categorías).
 * @param {ConfigModalProps} props - Las propiedades del componente.
 * @returns {JSX.Element} El modal de configuración.
 */
export default function ConfigModal({
  modalConfig, setModalConfig,
  formConfig, setFormConfig,
  guardarConfiguracion, cargando
}: ConfigModalProps): React.ReactElement {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
          <h3 className="font-bold capitalize">Crear {modalConfig.tipo === 'iva' ? 'Impuesto (IVA)' : modalConfig.tipo}</h3>
          <button onClick={() => setModalConfig({tipo: null})} className="hover:text-slate-300"><X size={20}/></button>
        </div>
        <form onSubmit={guardarConfiguracion} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
            <input type="text" value={formConfig.nombre || ''} onChange={e => setFormConfig({...formConfig, nombre: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required />
          </div>
          {modalConfig.tipo === 'almacen' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección</label>
                <input type="text" value={formConfig.direccion || ''} onChange={e => setFormConfig({...formConfig, direccion: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
                <input type="text" value={formConfig.telefono || ''} onChange={e => setFormConfig({...formConfig, telefono: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required />
              </div>
            </>
          )}
          {modalConfig.tipo === 'iva' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Porcentaje (%)</label>
              <input type="number" step="0.01" value={formConfig.porcentaje_iva || ''} onChange={e => setFormConfig({...formConfig, porcentaje_iva: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
          )}
          {modalConfig.tipo === 'categoria' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
              <input type="text" value={formConfig.descripcion || ''} onChange={e => setFormConfig({...formConfig, descripcion: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          )}
          {modalConfig.tipo === 'sucursal' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección</label>
              <input type="text" value={formConfig.direccion || ''} onChange={e => setFormConfig({...formConfig, direccion: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          )}
          <button type="submit" disabled={cargando} className="w-full mt-4 py-2.5 bg-slate-800 text-white font-bold rounded-lg flex items-center justify-center gap-2">
            {cargando ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Datos'}
          </button>
        </form>
      </div>
    </div>
  );
}