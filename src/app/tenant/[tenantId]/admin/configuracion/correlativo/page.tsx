"use client";

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Hash, Save, AlertTriangle, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getConfiguracionCorrelativo, updateConfiguracionCorrelativo } from '@/services/configuracionService';
import { getApiErrorMessages } from '@/utils/helpers';
import { PageHeader, Card, FadeIn, FormSkeleton } from '@/components/ui';

function formatearCorrelativo(prefijo: string, numero: number, longitud: number): string {
  return `${prefijo}${String(Math.max(numero, 0)).padStart(longitud, '0')}`;
}

/**
 * Página para configurar la numeración de facturas (correlativo). No todas
 * las empresas empiezan desde 001 -- ej. migran desde otro sistema y
 * necesitan continuar desde donde se quedaron.
 */
export default function CorrelativoPage(): ReactElement {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [yaFacturo, setYaFacturo] = useState(false);

  const [prefijo, setPrefijo] = useState('F-');
  const [proximoNumero, setProximoNumero] = useState(1);
  const [longitud, setLongitud] = useState(3);
  const [password, setPassword] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await getConfiguracionCorrelativo();
      setPrefijo(data.prefijo);
      setProximoNumero(data.current_number + 1);
      setLongitud(data.number_length);
      setYaFacturo(data.current_number > 0);
    } catch {
      toast.error('No se pudo cargar la configuración de numeración.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardar = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setGuardando(true);
    try {
      const data = await updateConfiguracionCorrelativo({
        prefijo,
        current_number: proximoNumero - 1,
        number_length: longitud,
        password,
      });
      setPrefijo(data.prefijo);
      setProximoNumero(data.current_number + 1);
      setLongitud(data.number_length);
      setYaFacturo(data.current_number > 0);
      setPassword('');
      toast.success('Numeración de facturas actualizada.');
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('No se pudo actualizar la numeración.');
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-xl">
      <PageHeader
        icon={<Hash size={20} />}
        title="Numeración de Facturas"
        description="Define el prefijo y el próximo número a usar en tus facturas. Normalmente solo se ajusta una vez, al configurar el sistema."
      />

      {cargando ? (
        <FormSkeleton rows={3} />
      ) : (
        <FadeIn>
          <Card>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Próxima factura</p>
              <p className="text-2xl font-black text-primary-700 font-mono">
                {formatearCorrelativo(prefijo, proximoNumero, longitud)}
              </p>
            </div>

            {yaFacturo && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-xs text-amber-800">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>
                  Ya emitiste facturas con esta numeración: solo puedes avanzar el número (nunca bajarlo), para no repetir un correlativo ya usado.
                </span>
              </div>
            )}

            <form onSubmit={guardar} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="correlativo-prefijo">
                    Prefijo
                  </label>
                  <input
                    id="correlativo-prefijo"
                    value={prefijo}
                    onChange={(e) => setPrefijo(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="F-"
                    maxLength={10}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="correlativo-longitud">
                    Dígitos del número
                  </label>
                  <input
                    id="correlativo-longitud"
                    type="number"
                    min={1}
                    max={10}
                    value={longitud}
                    onChange={(e) => setLongitud(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="correlativo-proximo">
                  Próximo número a usar
                </label>
                <input
                  id="correlativo-proximo"
                  type="number"
                  min={1}
                  value={proximoNumero}
                  onChange={(e) => setProximoNumero(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Ej: si tu última factura en tu sistema anterior fue la 1500, coloca 1501 aquí.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="correlativo-password">
                  Confirma tu contraseña para guardar
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="correlativo-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="submit"
                  disabled={guardando}
                  className="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2 shadow-md disabled:opacity-70"
                >
                  <Save size={16} /> Guardar
                </motion.button>
              </div>
            </form>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
