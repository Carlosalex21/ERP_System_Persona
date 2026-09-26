"use client";

import { useEffect, useState, type ReactElement } from 'react';
import { Download } from 'lucide-react';

/**
 * Botón "Instalar App" -- Chrome/Edge/Android no muestran su propio prompt
 * de instalación solos; disparan el evento `beforeinstallprompt` y ESPERAN
 * a que la página lo dispare a mano (`.prompt()`) en respuesta a un click
 * real del usuario. Sin este componente, la única forma de instalar era el
 * menú "..." del navegador, que casi nadie conoce que existe.
 *
 * iOS Safari nunca dispara `beforeinstallprompt` (no lo soporta) -- ahí el
 * botón simplemente no aparece; instalar sigue siendo manual desde el menú
 * "Compartir → Agregar a inicio", que no se puede automatizar desde JS.
 */
export default function InstallPwaButton(): ReactElement | null {
  const [promptEvent, setPromptEvent] = useState<Event | null>(null);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    const alDisponible = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    const alInstalar = () => {
      setInstalado(true);
      setPromptEvent(null);
    };
    window.addEventListener('beforeinstallprompt', alDisponible);
    window.addEventListener('appinstalled', alInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', alDisponible);
      window.removeEventListener('appinstalled', alInstalar);
    };
  }, []);

  if (!promptEvent || instalado) return null;

  const instalar = async (): Promise<void> => {
    // `prompt` y `userChoice` son propios de `BeforeInstallPromptEvent`,
    // que TypeScript no tipa nativamente en `Event`.
    const evento = promptEvent as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> };
    evento.prompt();
    await evento.userChoice;
    setPromptEvent(null);
  };

  return (
    <button
      onClick={instalar}
      className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 border border-primary-100 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-primary-100 transition-colors"
      title="Instalar esta app en tu dispositivo"
    >
      <Download size={13} /> Instalar App
    </button>
  );
}
