"use client";

import { useState, type ReactElement } from 'react';
import { KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppModal, ActionButton } from '@/components/ui';
import { cambiarMiPassword } from '@/services/authService';
import { getApiErrorMessages } from '@/utils/helpers';

/** Botón + modal de autoservicio para que el usuario cambie su propia contraseña, sin depender de un admin ni del correo de recuperación. */
export default function CambiarPasswordModal(): ReactElement {
  const [abierto, setAbierto] = useState(false);
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cerrar = (): void => {
    setAbierto(false);
    setActual('');
    setNueva('');
    setConfirmacion('');
  };

  const guardar = async (): Promise<void> => {
    if (!actual || !nueva || !confirmacion) {
      toast.error('Completa todos los campos.');
      return;
    }
    if (nueva.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (nueva !== confirmacion) {
      toast.error('Las contraseñas nuevas no coinciden.');
      return;
    }
    setGuardando(true);
    try {
      await cambiarMiPassword(actual, nueva);
      toast.success('Contraseña actualizada.');
      cerrar();
    } catch (error) {
      const messages = getApiErrorMessages(error);
      messages.forEach((m) => toast.error(m));
      if (messages.length === 0) toast.error('No se pudo cambiar la contraseña.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200 font-bold py-2.5 rounded-xl transition-colors"
      >
        <KeyRound size={16} /> Cambiar contraseña
      </button>

      {abierto && (
        <AppModal
          isOpen
          onClose={cerrar}
          title="Cambiar contraseña"
          icon={<KeyRound size={20} />}
          size="sm"
          footer={
            <>
              <ActionButton variant="secondary" onClick={cerrar}>Cancelar</ActionButton>
              <ActionButton loading={guardando} onClick={guardar}>Guardar</ActionButton>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contraseña actual</label>
              <input
                type="password"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoComplete="new-password"
              />
            </div>
          </div>
        </AppModal>
      )}
    </>
  );
}
