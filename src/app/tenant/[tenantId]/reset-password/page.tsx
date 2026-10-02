"use client";

import { useState, use, Suspense, type ReactElement } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Loader2, Store, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { confirmarResetPassword } from '@/services/authService';

import { mensajeDeErrorUnico } from '@/utils/mensajesError';
function ResetPasswordContent({ tenantId }: { tenantId: string }): ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');

  const enlaceInvalido = !uid || !token;

  const manejarSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmacion) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setEnviando(true);
    try {
      await confirmarResetPassword(uid, token, password);
      setExito(true);
    } catch (err: any) {
      setError(mensajeDeErrorUnico(err, 'El enlace expiró o ya fue usado. Solicita uno nuevo.'));
    } finally {
      setEnviando(false);
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
            <p className="text-primary-200 text-sm mt-1">Elige tu Nueva Contraseña</p>
          </div>
        </div>

        <div className="p-8">
          {enlaceInvalido ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-red-600 font-bold">Este enlace no es válido.</p>
              <Link href="forgot-password" className="inline-flex items-center gap-2 text-sm font-bold text-primary-600 hover:text-primary-700">
                <ArrowLeft size={16} /> Solicitar uno nuevo
              </Link>
            </div>
          ) : exito ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-200">
                <CheckCircle2 size={28} />
              </div>
              <p className="text-sm text-slate-600">Tu contraseña fue actualizada correctamente.</p>
              <button
                onClick={() => router.push('login')}
                className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-all"
              >
                Iniciar Sesión
              </button>
            </div>
          ) : (
            <form onSubmit={manejarSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nueva Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={verPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-600 transition-colors"
                    placeholder="••••••••" required
                  />
                  <button type="button" onClick={() => setVerPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {verPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={verPassword ? 'text' : 'password'} value={confirmacion} onChange={e => setConfirmacion(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-600 transition-colors"
                    placeholder="••••••••" required
                  />
                </div>
              </div>
              {error && <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl text-center border border-red-100">{error}</div>}
              <button
                type="submit" disabled={enviando}
                className="w-full bg-primary-600 text-white py-3.5 rounded-xl font-bold hover:bg-primary-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-70"
              >
                {enviando ? <Loader2 className="animate-spin" size={18} /> : 'Actualizar Contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage({ params }: { params: Promise<{ tenantId: string }> }): ReactElement {
  const { tenantId } = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary-600" size={32} /></div>}>
      <ResetPasswordContent tenantId={tenantId} />
    </Suspense>
  );
}
