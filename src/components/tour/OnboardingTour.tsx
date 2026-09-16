"use client";

/**
 * @file Tour de bienvenida para un tenant nuevo: se dispara solo una vez
 * (mientras `Client.onboarding_completado` sea false) y recorre lo mínimo
 * para que un dueño de negocio pueda empezar a vender el mismo día que se
 * registra, sin tener que adivinar dónde está cada cosa.
 */
import { useCallback, useState, useMemo } from 'react';
import { useSession } from '@/context/SessionContext';
import { marcarOnboardingCompletado } from '@/services/tenantProfileService';
import GuidedTour, { type TourStep } from './GuidedTour';

const PASOS: TourStep[] = [
  {
    id: 'bienvenida',
    title: '¡Bienvenido a tu ERP!',
    emoji: '👋',
    description: 'Te mostramos en menos de un minuto las 5 cosas más importantes para empezar a vender hoy mismo.',
  },
  {
    id: 'dashboard',
    target: '[data-tour="dashboard"]',
    title: 'Tu panel principal',
    emoji: '📊',
    description: 'Aquí verás un resumen de tus ventas, tu inventario y tus productos con bajo stock cada vez que entres.',
    placement: 'bottom',
  },
  {
    id: 'inventario',
    target: '[data-tour="inventario"]',
    title: 'Sube tus productos',
    emoji: '📦',
    description: 'Desde aquí agregas tus productos, precios y fotos -- es lo primero que necesitas antes de vender.',
    placement: 'bottom',
  },
  {
    id: 'ajustes',
    target: '[data-tour="ajustes-inventario"]',
    title: 'Entradas y salidas de stock',
    emoji: '🔄',
    description: 'Cuando un proveedor te entregue mercancía (con o sin factura) o hagas un conteo físico, ajusta tu stock rápido desde aquí -- hasta puedes escanear con un lector de código de barras.',
    placement: 'bottom',
  },
  {
    id: 'tienda',
    target: '[data-tour="tienda-publica"]',
    title: 'Tu catálogo público',
    emoji: '🔗',
    description: 'Este es el link de tu tienda online. Compártelo en Instagram, WhatsApp o TikTok para que tus clientes vean tus productos y hagan pedidos.',
    placement: 'right',
  },
  {
    id: 'empresa',
    target: '[data-tour="datos-empresa"]',
    title: 'Completa los datos de tu negocio',
    emoji: '🧾',
    description: 'Agrega tu RIF, dirección y logo para que tus facturas se vean profesionales desde la primera venta.',
    placement: 'bottom',
  },
  {
    id: 'final',
    title: '¡Listo para vender!',
    emoji: '🚀',
    description: 'Eso es todo por ahora. Puedes explorar el resto del sistema con calma -- mucho éxito con tu negocio.',
  },
];

export default function OnboardingTour() {
  const { tenant, isLoading, refetchTenant } = useSession();
  // Una vez el usuario termina o salta el tour, no debe reaparecer en esta
  // pestaña aunque falle la persistencia en el backend (ej. sin conexión) --
  // `refetchTenant` reintenta reflejar el estado real, pero no bloquea la UI.
  const [descartadoLocalmente, setDescartadoLocalmente] = useState(false);

  const run = useMemo(
    () => !isLoading && !!tenant && !tenant.onboarding_completado && !descartadoLocalmente,
    [isLoading, tenant, descartadoLocalmente],
  );

  const completar = useCallback(() => {
    setDescartadoLocalmente(true);
    marcarOnboardingCompletado()
      .catch(() => undefined)
      .finally(() => { refetchTenant(); });
  }, [refetchTenant]);

  return <GuidedTour steps={PASOS} run={run} onFinish={completar} onSkip={completar} />;
}
