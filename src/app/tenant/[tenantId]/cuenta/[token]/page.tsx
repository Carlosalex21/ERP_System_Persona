"use client";

import { useState, useEffect, useCallback, use, type ReactElement } from 'react';
import { UtensilsCrossed, Bell, Receipt, Minus, Plus, Loader2, Landmark, Copy, Check, Pencil, Camera, User } from 'lucide-react';
import {
  getPedidoMesaPublico,
  actualizarDivisionPublico,
  llamarMeseroPublico,
  pedirCuentaPublico,
  asignarPersonaPublico,
  subirComprobantePagoPublico,
  type PublicPedidoMesa,
} from '@/services/publicMesaService';
import { getTasasPublico, type PublicTasaMoneda } from '@/services/publicCatalogService';
import { referenciaEnMonedaBase } from '@/utils/currencyReference';
import { useLiveSocket } from '@/hooks/useLiveSocket';

const PROPINAS_SUGERIDAS = [0, 10, 15, 20];
/** Cada cuánto se refresca la cuenta pública -- balance entre "se siente en vivo" y no saturar el backend con un poll agresivo. */
const INTERVALO_REFRESCO_MS = 3000;

export default function CuentaPublica({ params }: { params: Promise<{ tenantId: string; token: string }> }): ReactElement {
  const { tenantId, token } = use(params);
  const subdominio = tenantId;

  const [pedido, setPedido] = useState<PublicPedidoMesa | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avisoEnviado, setAvisoEnviado] = useState<'mesero' | 'cuenta' | null>(null);
  const [tasas, setTasas] = useState<Record<string, PublicTasaMoneda>>({});
  const [propinaPersonalizada, setPropinaPersonalizada] = useState('');
  const [editandoDatosPago, setEditandoDatosPago] = useState(false);
  const [datosPagoInput, setDatosPagoInput] = useState('');
  const [guardandoDatosPago, setGuardandoDatosPago] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinNuevo, setPinNuevo] = useState<string | null>(null);
  const [errorPin, setErrorPin] = useState<string | null>(null);
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);

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
    const intervalo = window.setInterval(cargar, INTERVALO_REFRESCO_MS);
    return () => window.clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargar]);

  // Push en vivo (ver `apps.restaurantes.consumers.PedidoMesaPublicoConsumer`)
  // -- el polling de arriba queda como respaldo de baja frecuencia.
  useLiveSocket<PublicPedidoMesa>({
    path: `/ws/restaurantes/publico/${token}/`,
    onMessage: (datos) => { setPedido(datos); setError(null); },
  });

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
    if (!pedido || !Number.isFinite(pct) || pct < 0) return;
    setPedido({ ...pedido, propina_pct: String(pct) });
    try {
      await actualizarDivisionPublico(subdominio, token, { propina_pct: pct });
    } catch {
      cargar();
    }
  };

  const aplicarPropinaPersonalizada = (): void => {
    if (!propinaPersonalizada.trim()) return;
    cambiarPropina(Number(propinaPersonalizada));
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

  const empezarEdicionDatosPago = (): void => {
    setDatosPagoInput(pedido?.datos_pago_anfitrion || '');
    setPinInput('');
    setErrorPin(null);
    setEditandoDatosPago(true);
  };

  const guardarDatosPago = async (): Promise<void> => {
    if (!pedido) return;
    // Ya hay datos guardados con PIN -- hace falta el PIN correcto para tocarlos.
    if (pedido.datos_pago_anfitrion && pedido.tiene_pin_anfitrion && !/^\d{4}$/.test(pinInput)) {
      setErrorPin('Ingresa el PIN de 4 dígitos que anotaste cuando se guardaron estos datos.');
      return;
    }
    setGuardandoDatosPago(true);
    setErrorPin(null);
    try {
      const actualizado = await actualizarDivisionPublico(subdominio, token, {
        datos_pago_anfitrion: datosPagoInput.trim(),
        ...(pinInput ? { pin_anfitrion: pinInput } : {}),
      });
      setPedido(actualizado);
      if (actualizado.pin_anfitrion_nuevo) setPinNuevo(actualizado.pin_anfitrion_nuevo);
      setEditandoDatosPago(false);
    } catch (err: unknown) {
      const mensaje = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErrorPin(mensaje || 'PIN incorrecto o no se pudo guardar -- intenta de nuevo.');
    } finally {
      setGuardandoDatosPago(false);
    }
  };

  const cambiarPersonaItem = async (itemId: number, persona: number | null): Promise<void> => {
    if (!pedido) return;
    setPedido({
      ...pedido,
      items: pedido.items.map((i) => (i.id === itemId ? { ...i, persona_asignada: persona } : i)),
    });
    try {
      const actualizado = await asignarPersonaPublico(subdominio, token, itemId, persona);
      setPedido(actualizado);
    } catch {
      cargar();
    }
  };

  const subirComprobante = async (archivo: File): Promise<void> => {
    setSubiendoComprobante(true);
    try {
      setPedido(await subirComprobantePagoPublico(subdominio, token, archivo));
    } catch {
      // silencioso -- quien subió puede volver a intentarlo.
    } finally {
      setSubiendoComprobante(false);
    }
  };

  const copiarDatosPago = async (): Promise<void> => {
    if (!pedido?.datos_pago_anfitrion) return;
    const monto = referenciaPorPersona || `$${porPersona.toFixed(2)}`;
    const texto = `${pedido.datos_pago_anfitrion}\n\nMonto a transferir: ${monto}`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles (poco común en un navegador móvil) -- el
      // texto sigue visible en pantalla para copiarlo a mano.
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
          <div className="space-y-3">
            {pedido.items.map((item) => (
              <div key={item.id} className="text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">{item.cantidad}x {item.nombre}</span>
                  <span className="font-semibold text-slate-800">${parseFloat(item.subtotal).toFixed(2)}</span>
                </div>
                {pedido.estado === 'abierto' && pedido.division_personas > 1 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => cambiarPersonaItem(item.id, null)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.persona_asignada === null ? 'border-slate-400 bg-slate-100 text-slate-600' : 'border-slate-200 text-slate-400'
                      }`}
                    >
                      Compartido
                    </button>
                    {Array.from({ length: pedido.division_personas }, (_, i) => i + 1).map((persona) => (
                      <button
                        key={persona}
                        type="button"
                        onClick={() => cambiarPersonaItem(item.id, persona)}
                        className={`w-6 h-5 rounded-full text-[10px] font-bold border flex items-center justify-center ${
                          item.persona_asignada === persona ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-400'
                        }`}
                      >
                        {persona}
                      </button>
                    ))}
                  </div>
                )}
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
                    onClick={() => { setPropinaPersonalizada(''); cambiarPropina(pct); }}
                    className={`py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
                      propinaPct === pct && !propinaPersonalizada ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2.5">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    inputMode="decimal"
                    value={propinaPersonalizada}
                    onChange={(e) => setPropinaPersonalizada(e.target.value)}
                    onBlur={aplicarPropinaPersonalizada}
                    placeholder="Otro %"
                    className="w-full pl-3 pr-7 py-2 rounded-lg border-2 border-slate-200 text-sm font-bold text-slate-700 focus:border-primary-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                </div>
                <button
                  type="button"
                  onClick={aplicarPropinaPersonalizada}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold shrink-0"
                >
                  Aplicar
                </button>
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

            <div className="bg-primary-600 text-white rounded-2xl p-5 mb-4">
              <p className="text-xs font-bold uppercase opacity-80 mb-3 text-center">Cada quien paga</p>
              {pedido.division_personas === 1 ? (
                <div className="text-center">
                  <p className="text-4xl font-black">${porPersona.toFixed(2)}</p>
                  {referenciaPorPersona && <p className="text-xs font-semibold opacity-80">≈ {referenciaPorPersona}</p>}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {pedido.desglose_por_persona.map((p) => {
                    const referenciaP = referenciaEnMonedaBase(parseFloat(p.total_con_propina), tasas);
                    return (
                      <div key={p.persona} className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-1.5">
                        <span className="flex items-center gap-1.5 text-sm font-bold"><User size={13} /> Persona {p.persona}</span>
                        <div className="text-right">
                          <span className="text-sm font-black">${parseFloat(p.total_con_propina).toFixed(2)}</span>
                          {referenciaP && <p className="text-[10px] opacity-80">≈ {referenciaP}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {propinaPct > 0 && <p className="text-xs opacity-80 mt-2 text-center">Incluye {propinaPct}% de propina (${propinaMonto.toFixed(2)} en total)</p>}
              <p className="text-xs opacity-80 mt-1 text-center">
                Total de la mesa: ${totalConPropina.toFixed(2)}{referenciaTotalConPropina ? ` (≈ ${referenciaTotalConPropina})` : ''}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5"><Landmark size={13} /> Datos para transferir</p>
                {pedido.datos_pago_anfitrion && !editandoDatosPago && (
                  <button type="button" onClick={empezarEdicionDatosPago} className="text-slate-400 hover:text-primary-600">
                    <Pencil size={14} />
                  </button>
                )}
              </div>

              {pinNuevo && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-lg p-2.5 mb-3">
                  Anota este PIN: <span className="font-mono text-sm font-black">{pinNuevo}</span> -- lo necesitarás para editar estos datos después.
                  <button type="button" onClick={() => setPinNuevo(null)} className="block mt-1 underline">Entendido</button>
                </div>
              )}

              {editandoDatosPago ? (
                <div className="space-y-2">
                  <textarea
                    value={datosPagoInput}
                    onChange={(e) => setDatosPagoInput(e.target.value)}
                    placeholder={'Ej: Pago Móvil\nBanco Mercantil\nJ-12345678\n0412-1234567'}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 text-sm focus:border-primary-500 focus:outline-none resize-none"
                  />
                  {pedido.datos_pago_anfitrion && pedido.tiene_pin_anfitrion && (
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="PIN de 4 dígitos"
                      className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 text-sm font-mono focus:border-primary-500 focus:outline-none"
                    />
                  )}
                  {errorPin && <p className="text-xs text-red-600 font-semibold">{errorPin}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditandoDatosPago(false)} className="flex-1 py-2 rounded-lg border-2 border-slate-200 text-slate-600 text-xs font-bold">
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={guardarDatosPago}
                      disabled={guardandoDatosPago}
                      className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-xs font-bold disabled:opacity-60"
                    >
                      {guardandoDatosPago ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : pedido.datos_pago_anfitrion ? (
                <div className="space-y-3">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    {pedido.datos_pago_anfitrion}
                  </pre>
                  <button
                    type="button"
                    onClick={copiarDatosPago}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                      copiado ? 'bg-green-600 text-white' : 'bg-slate-900 text-white'
                    }`}
                  >
                    {copiado ? <Check size={16} /> : <Copy size={16} />}
                    {copiado ? '¡Copiado!' : `Copiar datos y monto (${referenciaPorPersona || `$${porPersona.toFixed(2)}`})`}
                  </button>

                  <div className="border-t border-dashed border-slate-200 pt-3">
                    {pedido.comprobante_pago ? (
                      // eslint-disable-next-line @next/next/no-img-element -- imagen dinámica servida por el backend del tenant.
                      <a href={pedido.comprobante_pago} target="_blank" rel="noopener noreferrer">
                        <img src={pedido.comprobante_pago} alt="Comprobante de pago" className="w-full rounded-lg border border-slate-200 max-h-48 object-contain" />
                      </a>
                    ) : (
                      <label className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 text-xs font-bold hover:border-primary-400 hover:text-primary-600 transition-colors cursor-pointer">
                        {subiendoComprobante ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                        {subiendoComprobante ? 'Subiendo...' : 'Ya transferí -- subir comprobante'}
                        <input
                          type="file" accept="image/*" className="hidden" disabled={subiendoComprobante}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) subirComprobante(f); e.target.value = ''; }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={empezarEdicionDatosPago}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 text-sm font-bold hover:border-primary-400 hover:text-primary-600 transition-colors"
                >
                  ¿Vas a cobrarle al grupo? Comparte aquí tus datos de pago
                </button>
              )}
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
