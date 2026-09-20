"use client";

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Lock, User, ArrowRight, Loader2, Store } from 'lucide-react';
import { apiPublica } from '@/services/api';
import { getB2BPerfil } from '@/services/b2bPortalService';
import { getSharedCookieDomain, cookieSecureFlag } from '@/utils/cookieDomain';

export default function TenantLogin({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();

  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorLogin, setErrorLogin] = useState('');

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLogin('');
    setCargando(true);

    try {
      const domain = getSharedCookieDomain();

      // 1. Limpiamos cualquier sesión anterior antes de pedir una nueva.
      Cookies.remove('access_token', { domain });
      Cookies.remove('refresh_token', { domain });

      const res = await apiPublica.post('/auth/token/', {
        username: usuario,
        password: password
      });

      const { access, refresh } = res.data;

      // 2. Guardamos la cookie en el dominio compartido (`.localhost` en dev,
      // `.erpsystem.com` en producción) -- así viaja también al dominio raíz,
      // necesario para flujos como "Prueba gratis: Nd" -> `/pago` que viven
      // fuera del subdominio del tenant.
      Cookies.set('access_token', access, { expires: 1, domain, secure: cookieSecureFlag(), sameSite: 'Lax' });
      Cookies.set('refresh_token', refresh, { expires: 7, domain, secure: cookieSecureFlag(), sameSite: 'Lax' });

      // 4. Este mismo login lo usan tanto el personal del tenant como sus
      // clientes B2B autenticados -- se distingue por si existe un perfil
      // ClienteB2B asociado (403 si no lo hay) y se manda a cada quien a su
      // panel correspondiente.
      try {
        await getB2BPerfil();
        router.push('b2b/portal');
      } catch {
        router.push('admin');
      }

    } catch (error: any) {
      console.error("Detalle del error:", error.response || error.message);
  if (error.response?.status === 401) {
    setErrorLogin('Usuario o contraseña incorrectos.');
  } else {
    setErrorLogin(`Error: ${error.message || 'Desconocido'}`);
  }
  setCargando(false);
}
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        
        <div className="bg-primary-900 p-8 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-800 rounded-full blur-2xl opacity-50"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent-500 rounded-full blur-2xl opacity-20"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20">
              <Store className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-black text-white capitalize tracking-tight">
              {tenantId.replace('-', ' ')}
            </h1>
            <p className="text-primary-200 text-sm mt-1">Acceso al Panel Administrativo</p>
          </div>
        </div>

        <div className="p-8">
          <form onSubmit={manejarSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={usuario} 
                  onChange={e => setUsuario(e.target.value)} 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-600 transition-colors" 
                  placeholder="admin_tienda"
                  required 
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">Contraseña</label>
                <a href="forgot-password" className="text-[11px] font-bold text-primary-600 hover:text-primary-700">¿Olvidaste tu contraseña?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-600 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {errorLogin && (
              <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl text-center border border-red-100">
                {errorLogin}
              </div>
            )}

            <button 
              type="submit" 
              disabled={cargando} 
              className="w-full bg-primary-600 text-white py-3.5 rounded-xl font-bold hover:bg-primary-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-70 mt-2"
            >
              {cargando ? <Loader2 className="animate-spin" size={18} /> : 'Iniciar Sesión'}
              {!cargando && <ArrowRight size={18} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}