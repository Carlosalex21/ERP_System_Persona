import type { ReactElement } from 'react';
import { Building, FileText, HandCoins, Link2, MessageCircle } from 'lucide-react';

import type { PublicEmpresaInfo } from '@/services/publicCatalogService';

/** Portada pública de una administradora de condominios: explica cómo entrar al portal con el enlace personal. */
export default function LandingCondominio({ empresa }: { empresa: PublicEmpresaInfo | null }): ReactElement {
  const nombre = empresa?.nombre_comercial ?? 'Tu administración';
  const whatsapp = empresa?.telefono ? `https://wa.me/${empresa.telefono.replace(/\D/g, '')}` : null;
  const pasos = [
    { icono: Link2, titulo: 'Usa tu enlace personal', texto: 'Tu administración te envía por WhatsApp un enlace único. Con él entras sin contraseñas.' },
    { icono: FileText, titulo: 'Mira tu estado de cuenta', texto: 'Consulta tus recibos de condominio, lo que debes y tu historial de pagos.' },
    { icono: HandCoins, titulo: 'Reporta tu pago', texto: 'Paga por pago móvil o transferencia, sube el comprobante y recibe tu recibo cuando se verifique.' },
  ];
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-2">
          {empresa?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo dinámico del tenant
            <img src={empresa.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
          ) : <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white"><Building size={20} /></div>}
          <h1 className="text-lg font-black uppercase tracking-tight text-slate-800 truncate">{nombre}</h1>
        </div>
      </header>
      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Portal de propietarios y residentes</h2>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto">Consulta tus cuotas, descarga tus recibos y reporta tus pagos desde tu teléfono, cuando quieras.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {pasos.map((p, i) => (
            <div key={p.titulo} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="w-11 h-11 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mb-4"><p.icono size={22} /></div>
              <p className="text-xs font-black text-primary-600 mb-1">PASO {i + 1}</p>
              <h3 className="font-bold text-slate-900">{p.titulo}</h3>
              <p className="text-sm text-slate-500 mt-1">{p.texto}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 bg-white rounded-3xl border border-slate-200 p-6 text-center">
          <p className="font-bold text-slate-800">¿Aún no tienes tu enlace?</p>
          <p className="text-sm text-slate-500 mt-1">Pídelo a tu administración y te lo enviamos al momento.</p>
          {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl px-5 py-2.5"><MessageCircle size={16} /> Pedir mi enlace por WhatsApp</a>}
        </div>
      </main>
    </div>
  );
}
