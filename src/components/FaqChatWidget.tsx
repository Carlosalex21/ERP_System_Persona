"use client";

import { useState, useMemo, type ReactElement } from 'react';
import { MessageCircleQuestion, X, Search, ChevronDown, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FaqItem {
  pregunta: string;
  respuesta: string;
}

interface FaqChatWidgetProps {
  titulo: string;
  faqs: FaqItem[];
  /** Link de WhatsApp (`https://wa.me/...`) para "no encontré mi respuesta". Opcional -- se omite el botón si no se pasa. */
  whatsapp?: string;
}

/**
 * Burbuja de FAQ flotante basada en reglas (sin IA, sin costo por token):
 * el visitante busca/filtra entre preguntas predefinidas y ve la respuesta
 * al instante. Pensado como primer nivel de automatización -- si más
 * adelante se justifica el costo de un chatbot con IA real, este mismo
 * botón puede escalar a esa vista sin cambiar dónde vive en la UI.
 */
export default function FaqChatWidget({ titulo, faqs, whatsapp }: FaqChatWidgetProps): ReactElement {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [expandida, setExpandida] = useState<number | null>(null);

  const filtradas = useMemo(() => {
    // Sin acentos al comparar -- "pais"/"país" o "cuanto"/"cuánto" deben
    // encontrar lo mismo (muy común escribir sin tildes desde el celular).
    const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const termino = normalizar(busqueda.trim());
    if (!termino) return faqs;
    return faqs.filter(
      (f) => normalizar(f.pregunta).includes(termino) || normalizar(f.respuesta).includes(termino),
    );
  }, [busqueda, faqs]);

  return (
    <div className="fixed bottom-5 right-5 z-[120]">
      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-16 right-0 w-[22rem] max-w-[calc(100vw-2.5rem)] max-h-[32rem] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          >
            <div className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 font-bold text-sm">
                <MessageCircleQuestion size={18} /> {titulo}
              </div>
              <button type="button" onClick={() => setAbierto(false)} className="text-white/80 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Escribe tu pregunta..."
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {filtradas.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8 px-4">
                  No encontramos nada con eso. Prueba con otra palabra{whatsapp ? ' o escríbenos por WhatsApp abajo.' : '.'}
                </p>
              ) : (
                filtradas.map((f, i) => (
                  <div key={i}>
                    <button
                      type="button"
                      onClick={() => setExpandida((prev) => (prev === i ? null : i))}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <span>{f.pregunta}</span>
                      <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform ${expandida === i ? 'rotate-180' : ''}`} />
                    </button>
                    {expandida === i && (
                      <p className="px-4 pb-3 text-sm text-slate-500 whitespace-pre-line">{f.respuesta}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            {whatsapp && (
              <div className="p-3 border-t border-slate-100 shrink-0">
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-lg py-2 text-xs font-bold hover:bg-green-100 transition-colors"
                >
                  <MessageCircle size={14} /> ¿No encontraste tu respuesta? Escríbenos
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.94 }}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? 'Cerrar ayuda' : 'Abrir ayuda'}
        className="w-14 h-14 rounded-full bg-primary-600 text-white shadow-xl flex items-center justify-center hover:bg-primary-700 transition-colors"
      >
        {abierto ? <X size={22} /> : <MessageCircleQuestion size={24} />}
      </motion.button>
    </div>
  );
}
