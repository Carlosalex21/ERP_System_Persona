"use client";

import { useState, useEffect, useCallback, use, type ReactElement } from 'react';
import { UtensilsCrossed, Bell, Receipt, Minus, Plus, Loader2 } from 'lucide-react';
import {
  getPedidoMesaPublico,
  actualizarDivisionPublico,
  llamarMeseroPublico,
  pedirCuentaPublico,
  type PublicPedidoMesa,
} from '@/services/publicMesaService';
import { getTasasPublico, type PublicTasaMoneda } from '@/services/publicCatalogService';
import { referenciaEnMonedaBase } from '@/utils/currencyReference';

const PROPINAS_SUGERIDAS = [0, 10, 15, 20];

export default function CuentaPublica({ params }: { params: Promise<{ tenantId: string; token: string }> }): ReactElement {
  const { tenantId, token } = use(params);
  const subdominio = tenantId;

  const [pedido, setPedido] = useState<PublicPedidoMesa | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avisoEnviado, setAvisoEnviado] = useState<'mesero' | 'cuenta' | null>(null);
  const [tasas, setTasas] = useState<Record<string, PublicTasaMoneda>>({});

  const cargar = useCallback(async () => {
    try {
      setPedido(await getPedidoMesaPublico(subdominio, token));
      setError(null);
    } catch {
      setError('Esta cuenta no está disponible (puede que ya se haya cerrado).');
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdominio, token]);

  useEffect(() => {
    cargar();
    getTasasPublico(subdominio).then(setTasas).catch(() => setTasas({}));
    // Refresco periódico: si el mesero agrega un plato o alguien más del
    // grupo cambia la división, todos los que tienen el QR abierto lo ven.
    const intervalo = window.setInterval(cargar, 6000);
    return () => window.clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargar]);

  const cambiarPersonas = async (delta: number): Promise<void> => {
    if (!pedido) return;
    const nuevo = Math.max(1, pedido.division_personas + delta);
    setPedido({ ...pedido, division_personas: nuevo });
    try {
      await actualizarDivisionPublico(subdominio, token, { division_personas: nuevo });
    } catch {
      cargar();
    }
  };

  const cambiarPropina = async (pct: number): Promise<void> => {
    if (!pedido) return;
    setPedido({ ...pedido, propina_pct: String(pct) });
    try {
      await actualizarDivisionPublico(subdominio, token, { propina_pct: pct });
    } catch {
      cargar();
    }
  };

  const avisarMesero = async (): Promise<void> => {
    try {
      await llamarMeseroPublico(subdominio, token);
      setAvisoEnviado('mesero');
    } catch {
      // silencioso -- no hay mucho que el comensal pueda hacer si falla.
    }
  };

  const pedirCuenta = async (): Promise<void> => {
    try {
      await pedirCuentaPublico(subdominio, token);
      setAvisoEnviado('cuenta');
    } catch {
      // silencioso.
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  if (error || !pedido) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <UtensilsCrossed size={40} className="text-slate-300 mb-4" />
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }

  const total = parseFloat(pedido.total);
  const propinaPct = parseFloat(pedido.propina_pct);
  const propinaMonto = total * (propinaPct / 100);
  const totalConPropina = total + propinaMonto;
  const porPersona = totalConPropina / pedido.division_personas;
  const referenciaSubtotal = referenciaEnMonedaBase(total, tasas);
  const referenciaPorPersona = referenciaEnMonedaBase(porPersona, tasas);
  const referenciaTotalConPropina = referenciaEnMonedaBase(totalConPropina, tasas);

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-slate-900 text-white px-5 py-5 text-center">
        <UtensilsCrossed className="mx-auto mb-2" size={24} />
        <h1 className="font-bold text-lg">Mesa {pedido.mesa_numero}</h1>
        {pedido.estado === 'cerrado' && <p className="text-xs text-accent-400 mt-1">Esta cuenta ya fue cobrada.</p>}
      </header>

      <div className="max-w-md mx-auto px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase mb-3">Pedido</p>
          <div className="space-y-2">
            {pedido.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-600">{item.cantidad}x {item.nombre}</span>
                <span className="font-semibold text-slate-800">${parseFloat(item.subtotal).toFixed(2)}</span>
              </div>
            ))}
            {pedido.items.length === 0 && <p className="text-xs text-slate-400">Todavía no hay ítems en esta cuenta.</p>}
          </div>
          <div className="border-t border-dashed border-slate-200 mt-3 pt-3 flex justify-between items-start text-sm font-bold text-slate-900">
            <span>Subtotal</span>
            <div className="text-right">
              <span>${total.toFixed(2)}</span>
              {referenciaSubtotal && <p className="text-[11px] font-semibold text-slate-400">≈ {referenciaSubtotal}</p>}
            </div>
          </div>
        </div>

        {pedido.estado === 'abierto' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase mb-3">Propina</p>
              <div className="grid grid-cols-4 gap-2">
                {PROPINAS_SUGERIDAS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => cambiarPropina(pct)}
                    className={`py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
                      propinaPct === pct ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase mb-3">¿Entre cuántos dividen?</p>
              <div className="flex items-center justify-center gap-6">
                <button type="button" onClick={() => cambiarPersonas(-1)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                  <Minus size={18} />
                </button>
                <span className="text-3xl font-black text-slate-900 w-12 text-center">{pedido.division_personas}</span>
                <button type="button" onClick={() => cambiarPersonas(1)} className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center">
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="bg-primary-600 text-white rounded-2xl p-5 mb-4 text-center">
              <p className="text-xs font-bold uppercase opacity-80 mb-1">Cada quien paga</p>
              <p className="text-4xl font-black">${porPersona.toFixed(2)}</p>
              {referenciaPorPersona && <p className="text-xs font-semibold opacity-80">≈ {referenciaPorPersona}</p>}
              {propinaPct > 0 && <p className="text-xs opacity-80 mt-1">Incluye {propinaPct}% de propina (${propinaMonto.toFixed(2)} en total)</p>}
              <p className="text-xs opacity-80 mt-2">
                Total de la mesa: ${totalConPropina.toFixed(2)}{referenciaTotalConPropina ? ` (≈ ${referenciaTotalConPropina})` : ''}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={avisarMesero}
                disabled={avisoEnviado === 'mesero'}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm disabled:opacity-50"
              >
                <Bell size={16} /> {avisoEnviado === 'mesero' ? 'Avisado' : 'Llamar mesero'}
              </button>
              <button
                type="button"
                onClick={pedirCuenta}
                disabled={avisoEnviado === 'cuenta'}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm disabled:opacity-50"
              >
                <Receipt size={16} /> {avisoEnviado === 'cuenta' ? 'Cuenta pedida' : 'Pedir la cuenta'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
