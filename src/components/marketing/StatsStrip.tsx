"use client";

import { useEffect, useState, type ReactElement } from 'react';
import { Globe2, Zap, RefreshCw, Users } from 'lucide-react';
import { apiPublica } from '@/services/api';
import { AnimatedNumber } from './demoPrimitives';
import Reveal from './Reveal';

/**
 * Franja de "prueba social" del home. A propósito NO inventa testimonios ni
 * reseñas de clientes falsos -- la plataforma es nueva y no tiene clientes
 * reales todavía, y presentar citas atribuidas a gente que no existe sería
 * engañoso en un sitio de producción real. En su lugar combina:
 *   1. El conteo REAL de negocios ya registrados (mismo dato que usa
 *      `/login` para el cupo de la promo de lanzamiento -- no es un número
 *      inventado).
 *   2. Afirmaciones sobre capacidades del producto, verificables en el
 *      propio código (países soportados, sincronización de stock, etc.),
 *      no sobre volumen de uso.
 */
export default function StatsStrip(): ReactElement {
  const [registrados, setRegistrados] = useState<number | null>(null);

  useEffect(() => {
    apiPublica
      .get('/tenants/registration-quota/')
      .then((res) => {
        const { cupo_total, cupos_restantes } = res.data ?? {};
        if (typeof cupo_total === 'number' && typeof cupos_restantes === 'number') {
          setRegistrados(Math.max(cupo_total - cupos_restantes, 0));
        }
      })
      .catch(() => setRegistrados(null));
  }, []);

  const stats: { icon: ReactElement; value: number; suffix?: string; label: string }[] = [
    ...(registrados !== null && registrados > 0
      ? [{ icon: <Users size={18} />, value: registrados, label: 'negocios ya registrados' }]
      : []),
    { icon: <Globe2 size={18} />, value: 3, label: 'países soportados (VE · CO · PE)' },
    { icon: <RefreshCw size={18} />, value: 100, suffix: '%', label: 'stock sincronizado en tiempo real' },
    { icon: <Zap size={18} />, value: 5, suffix: ' min', label: 'para publicar tu catálogo' },
  ];

  return (
    <section className="bg-white py-16 border-t border-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className={`grid grid-cols-2 ${stats.length >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6 sm:gap-8`}>
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.06} from="scale">
                <div className="text-center">
                  <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-3">
                    {s.icon}
                  </div>
                  <p className="font-display font-black text-3xl sm:text-4xl text-slate-900">
                    <AnimatedNumber value={s.value} decimals={0} />
                    {s.suffix}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-[10rem] mx-auto">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
