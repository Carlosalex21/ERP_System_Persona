"use client";

import type { ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Smartphone, Mail, CreditCard, Loader2, CheckCircle2 } from 'lucide-react';
import type { PublicMetodoPago } from '@/services/publicCatalogService';

interface CheckoutModalProps {
  abierto: boolean;
  onClose: () => void;
  exito: boolean;
  onSeguirComprando: () => void;
  onSubmit: (e: React.FormEvent) => void;
  nombreCliente: string;
  onNombreChange: (valor: string) => void;
  telefonoCliente: string;
  onTelefonoChange: (valor: string) => void;
  direccionCliente: string;
  onDireccionChange: (valor: string) => void;
  metodosPago: PublicMetodoPago[];
  metodoPagoId: number | null;
  onMetodoPagoChange: (id: number | null) => void;
  referenciaPago: string;
  onReferenciaChange: (valor: string) => void;
  monedaBaseSimbolo: string;
  totalCarrito: number;
  formatearEquivalenteBase: (montoBase: number) => string | null;
  enviando: boolean;
}

/** Modal de checkout del catálogo público: datos del cliente, método de pago y confirmación. */
export default function CheckoutModal({
  abierto,
  onClose,
  exito,
  onSeguirComprando,
  onSubmit,
  nombreCliente,
  onNombreChange,
  telefonoCliente,
  onTelefonoChange,
  direccionCliente,
  onDireccionChange,
  metodosPago,
  metodoPagoId,
  onMetodoPagoChange,
  referenciaPago,
  onReferenciaChange,
  monedaBaseSimbolo,
  totalCarrito,
  formatearEquivalenteBase,
  enviando,
}: CheckoutModalProps): ReactElement {
  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="bg-primary-900 p-6 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg">Confirmar Pedido</h3>
              <button onClick={onClose} className="p-2 hover:bg-primary-800 rounded-full">
                <X size={20} />
              </button>
            </div>

            {exito ? (
              <div className="p-8 text-center space-y-4 overflow-y-auto">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                  className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto"
                >
                  <CheckCircle2 size={40} />
                </motion.div>
                <h4 className="text-xl font-black text-slate-900">¡Pedido enviado!</h4>
                <p className="text-sm text-slate-500">
                  Tu pedido fue registrado con éxito. El comercio te contactará para confirmar la entrega.
                </p>
                <button
                  onClick={onSeguirComprando}
                  className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700"
                >
                  Seguir comprando
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tu nombre</label>
                  <input
                    type="text"
                    value={nombreCliente}
                    onChange={e => onNombreChange(e.target.value)}
                    placeholder="Ej. María Pérez"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-600 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    value={telefonoCliente}
                    onChange={e => onTelefonoChange(e.target.value)}
                    placeholder="Ej. 0412 1234567"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-600 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección de entrega</label>
                  <textarea
                    value={direccionCliente}
                    onChange={e => onDireccionChange(e.target.value)}
                    placeholder="Dirección completa"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-600 focus:bg-white h-20 resize-none"
                    required
                  />
                </div>

                {metodosPago.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      ¿Cómo vas a pagar? (opcional)
                    </label>
                    <div className="space-y-2">
                      {metodosPago.map((metodo) => {
                        const seleccionado = metodoPagoId === metodo.id;
                        return (
                          <button
                            key={metodo.id}
                            type="button"
                            onClick={() => onMetodoPagoChange(seleccionado ? null : metodo.id)}
                            className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                              seleccionado ? 'border-primary-600 bg-primary-50' : 'border-slate-200 bg-slate-50'
                            }`}
                          >
                            <span className="flex items-center gap-2 font-bold text-sm text-slate-800">
                              {metodo.zelle_config ? <Mail size={14} /> : metodo.es_stripe ? <CreditCard size={14} /> : <Smartphone size={14} />}
                              {metodo.nombre}
                            </span>
                            {seleccionado && (
                              <div className="mt-2 text-xs text-slate-600 font-mono space-y-0.5">
                                {metodo.pago_movil_config && (
                                  <>
                                    <p>Banco: {metodo.pago_movil_config.banco}</p>
                                    <p>Cédula/RIF: {metodo.pago_movil_config.cedula}</p>
                                    <p>Teléfono: {metodo.pago_movil_config.telefono}</p>
                                  </>
                                )}
                                {metodo.zelle_config && (
                                  <>
                                    <p>Email: {metodo.zelle_config.email_zelle}</p>
                                    <p>Beneficiario: {metodo.zelle_config.nombre_beneficiario}</p>
                                  </>
                                )}
                                {metodo.es_stripe && (
                                  <p className="italic text-slate-500 font-sans">
                                    Pagarás con tarjeta de forma segura en la pantalla de Stripe, al confirmar tu pedido.
                                  </p>
                                )}
                                {metodo.instrucciones && (
                                  <p className="italic text-slate-500 font-sans mt-1">{metodo.instrucciones}</p>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {metodoPagoId && !metodosPago.find((m) => m.id === metodoPagoId)?.es_stripe && (
                      <input
                        type="text"
                        value={referenciaPago}
                        onChange={(e) => onReferenciaChange(e.target.value)}
                        placeholder="N° de referencia del pago (opcional, lo puedes enviar después)"
                        className="mt-2 w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-600 focus:bg-white"
                      />
                    )}
                  </div>
                )}

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-600">Total a pagar</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-slate-900">{monedaBaseSimbolo} {totalCarrito.toFixed(2)}</span>
                    {formatearEquivalenteBase(totalCarrito) && (
                      <p className="text-xs text-slate-400">≈ {formatearEquivalenteBase(totalCarrito)}</p>
                    )}
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={enviando}
                  className="w-full bg-accent-500 text-white py-3.5 rounded-xl font-black text-sm shadow-lg hover:bg-accent-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {enviando ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  Confirmar Pedido
                </motion.button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
