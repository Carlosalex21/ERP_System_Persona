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

const PASO_BIENVENIDA: TourStep = {
  id: 'bienvenida',
  title: '¡Bienvenido a tu ERP!',
  emoji: '👋',
  description: 'Te mostramos en menos de un minuto las cosas más importantes para empezar hoy mismo.',
};

const PASO_DASHBOARD: TourStep = {
  id: 'dashboard',
  target: '[data-tour="dashboard"]',
  title: 'Tu panel principal',
  emoji: '📊',
  description: 'Aquí verás un resumen de tu actividad cada vez que entres.',
  placement: 'bottom',
};

const PASO_EMPRESA: TourStep = {
  id: 'empresa',
  target: '[data-tour="datos-empresa"]',
  title: 'Completa los datos de tu negocio',
  emoji: '🧾',
  description: 'Agrega tu RIF, dirección y logo para que tus facturas se vean profesionales desde la primera venta.',
  placement: 'bottom',
};

const PASO_FINAL: TourStep = {
  id: 'final',
  title: '¡Listo para empezar!',
  emoji: '🚀',
  description: 'Eso es todo por ahora. Puedes explorar el resto del sistema con calma -- mucho éxito con tu negocio.',
};

/**
 * Pasos intermedios del tour (entre "dashboard" y "datos de la empresa") --
 * varían por vertical porque el flujo de trabajo del día a día es distinto:
 * un contador no "sube productos" ni tiene tienda pública, un restaurante
 * vive en Mesas más que en el inventario crudo, etc.
 */
function pasosIntermedios(tipoNegocio: string | undefined): TourStep[] {
  if (tipoNegocio === 'contador') {
    return [
      {
        id: 'empresas-contables',
        target: '[data-tour="empresas-contables"]',
        title: 'Registra tus empresas (clientes)',
        emoji: '🏢',
        description: 'Cada empresa/cliente que contabilizas tiene su propio plan de cuentas y libros, separados entre sí -- empieza por crear la primera aquí.',
        placement: 'bottom',
      },
      {
        id: 'asientos-contables',
        target: '[data-tour="asientos-contables"]',
        title: 'Registra tus asientos contables',
        emoji: '📖',
        description: 'Aquí llevas la partida doble de cada empresa -- también puedes facturarle honorarios profesionales desde "Empresas".',
        placement: 'bottom',
      },
    ];
  }
  if (tipoNegocio === 'restaurante') {
    return [
      {
        id: 'mesas',
        target: '[data-tour="mesas"]',
        title: 'Gestiona tus mesas y pedidos',
        emoji: '🍽️',
        description: 'Aquí llevas el pedido de cada mesa en tiempo real, generas el QR para que tus clientes pidan desde su teléfono, y cobras al cerrar la cuenta.',
        placement: 'bottom',
      },
      {
        id: 'inventario',
        target: '[data-tour="inventario"]',
        title: 'Tu menú y tus insumos',
        emoji: '📦',
        description: 'Carga los platos y bebidas de tu menú con sus precios y fotos desde aquí.',
        placement: 'bottom',
      },
      {
        id: 'tienda',
        target: '[data-tour="tienda-publica"]',
        title: 'Tu catálogo público',
        emoji: '🔗',
        description: 'Este es el link de tu menú online. Compártelo en Instagram, WhatsApp o TikTok.',
        placement: 'right',
      },
    ];
  }
  return [
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
  ];
}

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

  const pasos = useMemo(
    () => [PASO_BIENVENIDA, PASO_DASHBOARD, ...pasosIntermedios(tenant?.tipo_negocio), PASO_EMPRESA, PASO_FINAL],
    [tenant?.tipo_negocio],
  );

  const completar = useCallback(() => {
    setDescartadoLocalmente(true);
    marcarOnboardingCompletado()
      .catch(() => undefined)
      .finally(() => { refetchTenant(); });
  }, [refetchTenant]);

  return <GuidedTour steps={pasos} run={run} onFinish={completar} onSkip={completar} />;
}
