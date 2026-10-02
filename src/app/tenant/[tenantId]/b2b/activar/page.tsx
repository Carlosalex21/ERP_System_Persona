"use client";

import { useState, type ReactElement, Suspense } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { activateB2bAccount } from '@/services/authService';
import { Loader2, KeyRound, ShieldCheck } from 'lucide-react';
import { useNotify } from '@/hooks/useNotify';
import { tenantUrl } from '@/utils/tenantUrl';

import { mensajeDeErrorUnico } from '@/utils/mensajesError';
function ActivationForm(): ReactElement {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const notify = useNotify();

  const token = searchParams.get('token');
  const tenantId = params.tenantId as string;

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Token de activación no encontrado. Por favor, usa el enlace de tu correo.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setCargando(true);
    setError('');

    try {
      const response = await activateB2bAccount(tenantId, token, password, passwordConfirm);
      notify.success(response.message);
      // Redirigir al login del tenant
      const loginUrl = tenantUrl(tenantId, '/login');
      router.push(loginUrl);
    } catch (err: any) {
      setError(mensajeDeErrorUnico(err, 'No se pudo activar la cuenta. El enlace puede ser inválido o haber expirado.'));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center">
            <KeyRound size={40} className="mx-auto text-primary-600 mb-4" />
            <h1 className="text-2xl font-bold text-slate-800">Activa tu Cuenta B2B</h1>
            <p className="text-slate-500">Establece una contraseña segura para acceder a tu portal de cliente.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Nueva Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Confirmar Contraseña</label>
              <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg" required />
            </div>

            {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}

            <button type="submit" disabled={cargando} className="w-full bg-primary-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-700 disabled:bg-primary-300">
              {cargando ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={18} /> Activar y Acceder</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ActivarB2BPage(): ReactElement {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary-600" size={40} /></div>}>
            <ActivationForm />
        </Suspense>
    )
}