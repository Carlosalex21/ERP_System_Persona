"use client";

import { useState, use, type ReactElement } from 'react';
import Link from 'next/link';
import { Mail, Loader2, Store, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { solicitarResetPassword } from '@/services/authService';

export default function ForgotPasswordPage({ params }: { params: Promise<{ tenantId: string }> }): ReactElement {
  const { tenantId } = use(params);
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const manejarSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setEnviando(true);
    try {
      await solicitarResetPassword(email);
    } catch {
      // El backend nunca revela si el correo existe; si la petición falla
      // por otra razón (red, etc.) igual mostramos el mismo mensaje neutro.
    } finally {
      setEnviando(false);
      setEnviado(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-primary-900 p-8 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-800 rounded-full blur-2xl opacity-50" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent-500 rounded-full blur-2xl opacity-20" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20">
              <Store className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-black text-white capitalize tracking-tight">{tenantId.replace('-', ' ')}</h1>
            <p className="text-primary-200 text-sm mt-1">Recuperar Contraseña</p>
          </div>
        </div>

        <div className="p-8">
          {enviado ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-200">
                <CheckCircle2 size={28} />
              </div>
              <p className="text-sm text-slate-600">
                Si <strong className="text-slate-800">{email}</strong> pertenece a una cuenta de este negocio, te enviamos un correo con instrucciones para elegir una nueva contraseña.
              </p>
              <Link href="login" className="inline-flex items-center gap-2 text-sm font-bold text-primary-600 hover:text-primary-700">
                <ArrowLeft size={16} /> Volver a iniciar sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={manejarSubmit} className="space-y-5">
              <p className="text-sm text-slate-500">Ingresa el correo asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.</p>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Correo</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-600 transition-colors"
                    placeholder="tu@correo.com" required
                  />
                </div>
              </div>
              <button
                type="submit" disabled={enviando}
                className="w-full bg-primary-600 text-white py-3.5 rounded-xl font-bold hover:bg-primary-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-70"
              >
                {enviando ? <Loader2 className="animate-spin" size={18} /> : 'Enviar Enlace de Recuperación'}
              </button>
              <Link href="login" className="flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-primary-600">
                <ArrowLeft size={16} /> Volver a iniciar sesión
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
