"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Plus, UtensilsCrossed, Users, Pencil } from 'lucide-react';
import { PageHeader, Card, EmptyState, Skeleton, ActionButton } from '@/components/ui';
import { getMesas, abrirPedidoMesa, type Mesa } from '@/services/restaurantesService';
import { useNotify } from '@/hooks/useNotify';
import NuevaMesaModal from './components/NuevaMesaModal';
import PedidoMesaModal from './components/PedidoMesaModal';

export default function MesasPage(): ReactElement {
  const notify = useNotify();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalNuevaMesa, setModalNuevaMesa] = useState(false);
  const [mesaAEditar, setMesaAEditar] = useState<Mesa | null>(null);
  const [pedidoAbiertoId, setPedidoAbiertoId] = useState<number | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    try {
      setMesas(await getMesas());
    } catch {
      notify.error('No se pudieron cargar las mesas.');
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cargar();
    // Refresco periódico -- para ver en la grilla cuando otra mesa cambia
    // de estado (otro mesero la abrió/cerró) sin tener que recargar la página.
    const intervalo = window.setInterval(cargar, 8000);
    return () => window.clearInterval(intervalo);
  }, [cargar]);

  const tocarMesa = async (mesa: Mesa): Promise<void> => {
    if (mesa.estado === 'ocupada' && mesa.pedido_abierto_id) {
      setPedidoAbiertoId(mesa.pedido_abierto_id);
      return;
    }
    try {
      const pedido = await abrirPedidoMesa(mesa.id);
      setPedidoAbiertoId(pedido.id);
      cargar();
    } catch {
      notify.error('No se pudo abrir la mesa.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<UtensilsCrossed size={20} />}
        title="Mesas y Pedidos"
        description="Toca una mesa libre para abrirla, o una ocupada para ver/editar su pedido."
        actions={
          <ActionButton onClick={() => setModalNuevaMesa(true)}>
            <Plus size={16} /> Nueva Mesa
          </ActionButton>
        }
      />

      {cargando ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      ) : mesas.length === 0 ? (
        <Card>
          <EmptyState
            icon={<UtensilsCrossed size={28} />}
            title="Aún no tienes mesas"
            description="Crea tu primera mesa para empezar a tomar pedidos."
            action={
              <ActionButton onClick={() => setModalNuevaMesa(true)}>
                <Plus size={16} /> Crear primera mesa
              </ActionButton>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {mesas.map((mesa) => (
            <div key={mesa.id} className="relative group">
              <button
                type="button"
                onClick={() => tocarMesa(mesa)}
                className={`w-full aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-2 p-3 transition-all ${
                  mesa.estado === 'ocupada'
                    ? 'border-accent-400 bg-accent-50 hover:shadow-md'
                    : 'border-slate-200 bg-white hover:border-primary-400 hover:bg-primary-50'
                }`}
              >
                <UtensilsCrossed size={24} className={mesa.estado === 'ocupada' ? 'text-accent-600' : 'text-slate-300'} />
                <span className="font-bold text-sm text-slate-800 text-center leading-tight">{mesa.numero}</span>
                {mesa.capacidad && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Users size={10} /> {mesa.capacidad}
                  </span>
                )}
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  mesa.estado === 'ocupada' ? 'bg-accent-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {mesa.estado === 'ocupada' ? 'Ocupada' : 'Libre'}
                </span>
              </button>
              {mesa.estado === 'libre' && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setMesaAEditar(mesa); }}
                  aria-label={`Editar ${mesa.numero}`}
                  title="Editar nombre/capacidad"
                  className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-white/90 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-primary-600 hover:bg-white shadow-sm transition-all"
                >
                  <Pencil size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {modalNuevaMesa && (
        <NuevaMesaModal onClose={() => setModalNuevaMesa(false)} onCreated={() => { setModalNuevaMesa(false); cargar(); }} />
      )}
      {mesaAEditar && (
        <NuevaMesaModal
          mesa={mesaAEditar}
          onClose={() => setMesaAEditar(null)}
          onCreated={() => { setMesaAEditar(null); cargar(); }}
        />
      )}
      {pedidoAbiertoId !== null && (
        <PedidoMesaModal
          pedidoId={pedidoAbiertoId}
          onClose={() => setPedidoAbiertoId(null)}
          onPedidoCerrado={cargar}
        />
      )}
    </div>
  );
}
