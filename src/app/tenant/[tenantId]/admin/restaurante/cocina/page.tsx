"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { ChefHat, Check, Clock } from 'lucide-react';
import { PageHeader, Card, EmptyState, Skeleton } from '@/components/ui';
import { getPedidosAbiertos, marcarItemPreparado, type PedidoMesa, type Mesa } from '@/services/restaurantesService';
import { getDepartamentos } from '@/services/rrhhService';
import type { Departamento } from '@/types/api';
import { useNotify } from '@/hooks/useNotify';
import { useLiveSocket } from '@/hooks/useLiveSocket';

/**
 * Vista de cocina: un plato/bebida por tarjeta con lo mínimo que el cocinero
 * necesita (mesa, cantidad, nombre, notas) -- separado del panel de mesero
 * a propósito, porque en cocina no importa el total ni el pago, solo qué
 * falta por preparar.
 */
export default function CocinaPage(): ReactElement {
  const notify = useNotify();
  const [pedidos, setPedidos] = useState<PedidoMesa[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [departamentoFiltro, setDepartamentoFiltro] = useState<number | 'todos'>('todos');
  const [cargando, setCargando] = useState(true);
  const [marcando, setMarcando] = useState<number | null>(null);
  const [mostrarPreparados, setMostrarPreparados] = useState(false);

  const cargar = useCallback(async (): Promise<void> => {
    try {
      setPedidos(await getPedidosAbiertos());
    } catch {
      notify.error('No se pudieron cargar los pedidos.');
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cargar();
    const intervalo = window.setInterval(cargar, 6000);
    return () => window.clearInterval(intervalo);
  }, [cargar]);

  // Las estaciones (Cocina, Barra...) se cargan una sola vez -- no cambian
  // mientras la pantalla está abierta, a diferencia de los pedidos.
  useEffect(() => {
    getDepartamentos().then(setDepartamentos).catch(() => {});
  }, []);

  // Reutiliza el mismo canal de la grilla de mesas (avisa "algo cambió" en
  // cualquier pedido) solo como disparador para refrescar la lista completa
  // -- no hace falta un consumer nuevo, el payload en sí (la lista de Mesa)
  // no se usa aquí.
  useLiveSocket<Mesa[]>({ path: '/ws/restaurantes/mesas/', onMessage: () => cargar() });

  const marcar = async (pedidoId: number, itemId: number): Promise<void> => {
    setMarcando(itemId);
    try {
      await marcarItemPreparado(pedidoId, itemId);
      cargar();
    } catch {
      notify.error('No se pudo actualizar la comanda.');
    } finally {
      setMarcando(null);
    }
  };

  const tarjetas = pedidos.flatMap((pedido) =>
    pedido.items
      .filter((item) => mostrarPreparados || !item.preparado)
      .filter((item) => departamentoFiltro === 'todos' || item.departamento === departamentoFiltro)
      .map((item) => ({ pedido, item })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ChefHat size={20} />}
        title="Cocina"
        description="Marca cada plato/bebida como listo apenas salga."
        actions={
          <button
            type="button"
            onClick={() => setMostrarPreparados((v) => !v)}
            className={`px-3 py-2 rounded-lg text-xs font-bold border-2 transition-colors ${
              mostrarPreparados ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500'
            }`}
          >
            {mostrarPreparados ? 'Ocultar preparados' : 'Mostrar preparados'}
          </button>
        }
      />

      {departamentos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setDepartamentoFiltro('todos')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors ${
              departamentoFiltro === 'todos' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500'
            }`}
          >
            Todas las estaciones
          </button>
          {departamentos.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDepartamentoFiltro(d.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors ${
                departamentoFiltro === d.id ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500'
              }`}
            >
              {d.nombre}
            </button>
          ))}
        </div>
      )}

      {cargando ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : tarjetas.length === 0 ? (
        <Card>
          <EmptyState icon={<ChefHat size={28} />} title="Sin pendientes" description="No hay platos ni bebidas esperando por preparar." />
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {tarjetas.map(({ pedido, item }) => (
            <button
              key={item.id}
              type="button"
              onClick={() => marcar(pedido.id, item.id)}
              disabled={marcando === item.id}
              className={`text-left rounded-2xl border-2 p-4 transition-all disabled:opacity-50 ${
                item.preparado ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white hover:border-primary-400 hover:bg-primary-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase text-slate-400">Mesa {pedido.mesa_numero}</span>
                {item.preparado ? <Check size={16} className="text-green-600" /> : <Clock size={14} className="text-slate-300" />}
              </div>
              <p className="font-bold text-slate-800 text-sm leading-tight">{item.cantidad}x {item.producto_nombre}</p>
              {item.notas && <p className="text-xs text-slate-500 mt-1 italic">&quot;{item.notas}&quot;</p>}
              {item.departamento_nombre && (
                <span className="inline-block mt-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">{item.departamento_nombre}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
