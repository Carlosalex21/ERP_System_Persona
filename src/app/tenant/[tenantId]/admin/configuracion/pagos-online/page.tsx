"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Plus, Smartphone, Mail, CreditCard, Pencil, Trash2, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getMetodosPagoConfig, deleteMetodoPagoConfig } from '@/services/pagosOnlineService';
import { getApiErrorMessages } from '@/utils/helpers';
import { MetodoPagoConfig } from '@/types/api';
import MetodoPagoConfigModal from './MetodoPagoConfigModal';
import { PageHeader, Card, EmptyState, CardGridSkeleton, Stagger, StaggerItem } from '@/components/ui';

export default function PagosOnlinePage(): ReactElement {
  const [metodos, setMetodos] = useState<MetodoPagoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<MetodoPagoConfig | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getMetodosPagoConfig();
      setMetodos(data);
    } catch (error) {
      console.error('Error cargando métodos de pago en línea:', error);
      toast.error('No se pudieron cargar los métodos de pago en línea.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirNuevo = (): void => {
    setEditando(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (metodo: MetodoPagoConfig): void => {
    setEditando(metodo);
    setModalAbierto(true);
  };

  const eliminar = async (metodo: MetodoPagoConfig): Promise<void> => {
    if (!confirm(`¿Eliminar "${metodo.nombre}"? Dejará de mostrarse en tu catálogo público.`)) return;
    try {
      await deleteMetodoPagoConfig(metodo.id);
      toast.success('Método de pago eliminado.');
      await cargar();
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('No se pudo eliminar el método de pago.');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Wallet size={20} />}
        title="Pagos en Línea"
        description="Configura Pago Móvil y Zelle para que tus clientes sepan a dónde pagar al hacer un pedido desde tu catálogo público. El cliente reporta su referencia y tú la confirmas desde Pedidos."
        actions={
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={abrirNuevo}
            className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md shrink-0"
          >
            <Plus size={18} /> Nuevo Método
          </motion.button>
        }
      />

      {loading ? (
        <CardGridSkeleton count={2} />
      ) : metodos.length === 0 ? (
        <EmptyState
          icon={<Wallet size={28} />}
          title="Aún no tienes métodos de pago en línea"
          description="Sin esto, tus clientes no sabrán cómo pagar al hacer un pedido desde tu catálogo público."
          action={
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={abrirNuevo}
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 shadow-md"
            >
              <Plus size={18} /> Configurar el primero
            </motion.button>
          }
        />
      ) : (
        <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {metodos.map((metodo) => (
            <StaggerItem key={metodo.id}>
            <Card className="flex flex-col justify-between hover:shadow-lg transition-shadow h-full">

              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                      {metodo.zelle_config ? <Mail size={18} /> : metodo.stripe_config ? <CreditCard size={18} /> : <Smartphone size={18} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{metodo.nombre}</h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border mt-1 ${
                          metodo.activo
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}
                      >
                        {metodo.activo ? 'Visible al público' : 'Oculto'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => abrirEdicion(metodo)}
                      className="p-1.5 text-slate-400 hover:text-primary-600 transition-colors"
                      aria-label="Editar método"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => eliminar(metodo)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                      aria-label="Eliminar método"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600 font-mono bg-slate-50 rounded-xl p-3">
                  {metodo.pago_movil_config && (
                    <>
                      <p><span className="text-slate-400">Banco:</span> {metodo.pago_movil_config.banco}</p>
                      <p><span className="text-slate-400">Cédula/RIF:</span> {metodo.pago_movil_config.cedula}</p>
                      <p><span className="text-slate-400">Teléfono:</span> {metodo.pago_movil_config.telefono}</p>
                    </>
                  )}
                  {metodo.zelle_config && (
                    <>
                      <p><span className="text-slate-400">Email:</span> {metodo.zelle_config.email_zelle}</p>
                      <p><span className="text-slate-400">Beneficiario:</span> {metodo.zelle_config.nombre_beneficiario}</p>
                    </>
                  )}
                  {metodo.stripe_config && (
                    <>
                      <p>
                        <span className="text-slate-400">Modo:</span>{' '}
                        {metodo.stripe_config.modo_test ? (
                          <span className="text-amber-600">Prueba (test)</span>
                        ) : (
                          <span className="text-green-600">En vivo</span>
                        )}
                      </p>
                      <p><span className="text-slate-400">Moneda:</span> {metodo.stripe_config.moneda.toUpperCase()}</p>
                      <p>
                        <span className="text-slate-400">Secret Key:</span>{' '}
                        {metodo.stripe_config.tiene_secret_key ? '•••• configurada' : <span className="text-red-500">sin configurar</span>}
                      </p>
                    </>
                  )}
                </div>
                {metodo.instrucciones && (
                  <p className="mt-2 text-xs text-slate-500 italic">&ldquo;{metodo.instrucciones}&rdquo;</p>
                )}
              </div>
            </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {modalAbierto && (
        <MetodoPagoConfigModal
          metodo={editando}
          onClose={() => setModalAbierto(false)}
          onSaved={() => {
            setModalAbierto(false);
            cargar();
          }}
        />
      )}
    </div>
  );
}
