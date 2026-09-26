"use client";

/**
 * @file Autorización por PIN para acciones sensibles (ej. eliminar un
 * renglón del POS o de una mesa) -- opcional, el admin la activa desde
 * "Datos de la Empresa" (ver `getRequierePinEliminar`/`ConfiguracionEmpresa.
 * requiere_pin_eliminar`). Si está apagada, `solicitar` ejecuta la acción
 * directo, sin pedir nada -- ningún flujo existente cambia para un tenant
 * que nunca activó esto.
 */
import { useState, useEffect, useCallback } from 'react';
import { getRequierePinEliminar, verificarPinAutorizacion } from '@/services/configuracionService';

export interface PinAutorizacionModalProps {
  isOpen: boolean;
  pin: string;
  onPinChange: (pin: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  verificando: boolean;
  error: string;
}

export function usePinAutorizacion(): { solicitar: (accion: () => void) => void; modalProps: PinAutorizacionModalProps } {
  const [requierePin, setRequierePin] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState<(() => void) | null>(null);
  const [pin, setPin] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getRequierePinEliminar().then(setRequierePin).catch(() => setRequierePin(false));
  }, []);

  // Si el tenant no activó el PIN, la acción corre directo -- sin esto,
  // cada eliminación de este tenant tendría que esperar un round-trip
  // extra al backend solo para enterarse de que no hace falta nada.
  const solicitar = useCallback((accion: () => void) => {
    if (!requierePin) {
      accion();
      return;
    }
    setPin('');
    setError('');
    setAccionPendiente(() => accion);
  }, [requierePin]);

  const onConfirm = useCallback(async () => {
    if (!accionPendiente) return;
    setVerificando(true);
    setError('');
    try {
      const valido = await verificarPinAutorizacion(pin);
      if (valido) {
        accionPendiente();
        setAccionPendiente(null);
        setPin('');
      } else {
        setError('PIN incorrecto.');
      }
    } catch {
      setError('No se pudo verificar el PIN. Intenta de nuevo.');
    } finally {
      setVerificando(false);
    }
  }, [pin, accionPendiente]);

  const onCancel = useCallback(() => {
    setAccionPendiente(null);
    setPin('');
    setError('');
  }, []);

  return {
    solicitar,
    modalProps: { isOpen: !!accionPendiente, pin, onPinChange: setPin, onConfirm, onCancel, verificando, error },
  };
}
