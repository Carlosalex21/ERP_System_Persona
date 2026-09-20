"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { getIvaConfigs, deleteIvaConfig } from '@/services/configuracionService';
import { Iva } from '@/types/api';
import { getApiErrorMessages } from '@/utils/helpers';
import { Plus, ReceiptText, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import IvaModal from './IvaModal';
import { PageHeader, Card, EmptyState, CardGridSkeleton, Stagger, StaggerItem, ConfirmDialog } from '@/components/ui';

/**
 * Página para gestionar las configuraciones de IVA.
 */
export default function IvaPage(): ReactElement {
  const [ivas, setIvas] = useState<Iva[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getIvaConfigs();
      setIvas(data);
    } catch (error) {
      console.error("Error al cargar configuraciones de IVA:", error);
      toast.error('No se pudieron cargar los tipos de IVA.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const [ivaAEliminar, setIvaAEliminar] = useState<Iva | null>(null);
  const [eliminandoIva, setEliminandoIva] = useState(false);

  const confirmarEliminarIva = async (): Promise<void> => {
    if (!ivaAEliminar) return;
    setEliminandoIva(true);
    try {
      await deleteIvaConfig(ivaAEliminar.id);
      toast.success('Tipo de IVA eliminado.');
      setIvaAEliminar(null);
      await fetchData();
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('No se pudo eliminar. Puede que tenga productos asociados.');
      }
    } finally {
      setEliminandoIva(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<ReceiptText size={20} />}
        title="Impuestos (IVA)"
        description="Define las tasas de IVA que puedes aplicar a tus productos y facturas."
        actions={
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setModalAbierto(true)}
            className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
          >
            <Plus size={18} /> Nuevo Tipo de IVA
          </motion.button>
        }
      />

      {loading ? (
        <CardGridSkeleton count={3} />
      ) : ivas.length === 0 ? (
        <EmptyState
          icon={<ReceiptText size={28} />}
          title="Aún no tienes tipos de IVA"
          description="Crea al menos una tasa (por ejemplo, General 16%) para poder asignarla a tus productos."
          action={
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setModalAbierto(true)}
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 shadow-md"
            >
              <Plus size={18} /> Crear primer tipo de IVA
            </motion.button>
          }
        />
      ) : (
        <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ivas.map(iva => (
            <StaggerItem key={iva.id}>
            <Card className="flex flex-col justify-between hover:shadow-lg transition-shadow h-full">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <ReceiptText size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{iva.nombre || 'Sin nombre'}</h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border mt-1 ${
                        iva.activo
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      {iva.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIvaAEliminar(iva)}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                  aria-label={`Eliminar ${iva.nombre}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <p className="mt-4 text-3xl font-black text-primary-700">{iva.porcentaje_iva}%</p>
            </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {modalAbierto && (
        <IvaModal
          onClose={() => setModalAbierto(false)}
          onSaved={() => {
            setModalAbierto(false);
            fetchData();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!ivaAEliminar}
        title="Eliminar Tipo de IVA"
        message={`¿Eliminar el tipo de IVA "${ivaAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={eliminandoIva}
        onConfirm={confirmarEliminarIva}
        onCancel={() => setIvaAEliminar(null)}
      />
    </div>
  );
}
