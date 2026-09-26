"use client";

/**
 * @file Tour de bienvenida para un tenant nuevo: se dispara solo una vez
 * (mientras `Client.onboarding_completado` sea false) y recorre lo mínimo
 * para que el dueño empiece a trabajar el mismo día que se registra.
 *
 * El recorrido depende del MÓDULO con el que se registró el negocio
 * (`tipo_negocio`): un restaurante empieza por Mesas y Cocina, una farmacia
 * por Lotes y Vencimientos, un distribuidor B2B por su Red de Clientes, un
 * contador por sus Empresas... Antes retail, B2B, farmacia y servicios
 * compartían exactamente el mismo tour genérico de "sube tus productos".
 */
import { useCallback, useMemo, useState } from 'react';

import { EVENTO_ABRIR_GRUPO_SIDEBAR } from '@/components/Sidebar';
import { useSession } from '@/context/SessionContext';
import { marcarOnboardingCompletado } from '@/services/tenantProfileService';
import { grupoDeModulo, gruposVisibles, type TipoNegocio } from '@/utils/modulosPanel';
import GuidedTour, { type TourStep } from './GuidedTour';

/** Paso que señala un módulo del menú: abre su sección antes de medirlo. */
interface PasoModulo {
  modulo: string;
  title: string;
  emoji: string;
  description: string;
}

/** Paso que señala un elemento fijo de la pantalla (no un módulo del menú). */
interface PasoElemento {
  target: string;
  title: string;
  emoji: string;
  description: string;
}

type PasoGuion = PasoModulo | PasoElemento;

interface GuionTour {
  bienvenida: string;
  pasos: PasoGuion[];
  cierre: string;
}

const PASO_TIENDA: PasoElemento = {
  target: 'tienda-publica',
  title: 'Tu catálogo público',
  emoji: '🔗',
  description: 'Este es el link de tu tienda online. Compártelo en Instagram, WhatsApp o TikTok para que tus clientes vean tus productos y te hagan pedidos.',
};

const PASO_TASAS: PasoModulo = {
  modulo: 'tasas_cambio',
  title: 'Tasa de cambio del día',
  emoji: '💱',
  description: 'Mantén la tasa actualizada: con ella el sistema convierte precios y reportes entre dólares y tu moneda local (puedes alternar la vista desde la barra superior).',
};

const PASO_EMPRESA: PasoModulo = {
  modulo: 'datos_empresa',
  title: 'Completa los datos de tu negocio',
  emoji: '🧾',
  description: 'Agrega tu RIF/NIT, dirección y logo para que tus facturas y tickets salgan profesionales desde la primera venta.',
};

const GUIONES: Record<TipoNegocio, GuionTour> = {
  retail: {
    bienvenida: 'Tu tienda ya está lista. En un minuto te mostramos cómo cargar productos, vender y cobrar.',
    pasos: [
      { modulo: 'dashboard', title: 'Tu panel principal', emoji: '📊', description: 'Ventas del día, productos más vendidos y alertas de stock, cada vez que entres.' },
      { modulo: 'inventario', title: 'Carga tus productos', emoji: '📦', description: 'Agrega productos con precio, foto y código de barras. Si ya tienes una lista en Excel, impórtala de una vez desde “Importar Productos”.' },
      { modulo: 'ajustes_inventario', title: 'Entradas y salidas de stock', emoji: '🔄', description: 'Cuando llegue mercancía o hagas un conteo físico, ajusta el stock aquí -- funciona con lector de código de barras.' },
      { modulo: 'pos', title: 'Vende desde el Punto de Venta', emoji: '🛒', description: 'Abre la caja, escanea o busca productos y cobra en efectivo, pago móvil, tarjeta o mixto. Funciona aunque se caiga el internet.' },
      PASO_TIENDA,
      PASO_TASAS,
      PASO_EMPRESA,
    ],
    cierre: 'Empieza cargando tus primeros productos y haz tu primera venta desde el POS. ¡Mucho éxito!',
  },
  b2b: {
    bienvenida: 'Tu distribuidora ya está en línea. Te mostramos cómo tus clientes mayoristas te piden directo desde su portal.',
    pasos: [
      { modulo: 'dashboard', title: 'Tu panel principal', emoji: '📊', description: 'Pedidos, cobranzas y rotación de inventario de un vistazo.' },
      { modulo: 'inventario', title: 'Tu catálogo mayorista', emoji: '📦', description: 'Carga tus productos con sus presentaciones (caja, bulto, unidad) y precios por volumen.' },
      { modulo: 'clientes_b2b', title: 'Tu red de clientes', emoji: '🤝', description: 'Invita a tus clientes al portal B2B: cada uno ve sus propios precios, su límite de crédito y puede pedirte sin llamarte.' },
      { modulo: 'pedidos', title: 'Pedidos entrantes', emoji: '📥', description: 'Aquí llegan los pedidos del portal y del catálogo. Confírmalos y se descuentan del inventario al facturar.' },
      { modulo: 'cuentas_por_cobrar', title: 'Crédito y cobranza', emoji: '💳', description: 'Controla lo que cada cliente te debe y sus vencimientos -- el sistema te avisa de los cobros atrasados.' },
      PASO_TASAS,
      PASO_EMPRESA,
    ],
    cierre: 'Carga tu catálogo e invita a tu primer cliente al portal. ¡A vender al mayor!',
  },
  restaurante: {
    bienvenida: 'Tu restaurante ya está abierto en el sistema. Te mostramos cómo atender mesas, mandar comandas a cocina y cobrar.',
    pasos: [
      { modulo: 'dashboard', title: 'Tu panel principal', emoji: '📊', description: 'Ventas del día, platos más pedidos y mesas activas.' },
      { modulo: 'inventario', title: 'Tu menú', emoji: '🍔', description: 'Carga tus platos y bebidas con precio y foto. Los insumos también se controlan aquí.' },
      { modulo: 'mesas', title: 'Mesas y pedidos', emoji: '🍽️', description: 'Abre una mesa, toma el pedido y cobra al cerrar la cuenta. Cada mesa tiene su QR para que el cliente pida desde su teléfono.' },
      { modulo: 'cocina', title: 'Pantalla de cocina', emoji: '👨‍🍳', description: 'Las comandas llegan aquí en tiempo real; la cocina las marca como listas y el mesero recibe el aviso.' },
      { modulo: 'pos', title: 'Ventas para llevar', emoji: '🥡', description: 'Para barra, delivery o para llevar, cobra rápido desde el Punto de Venta.' },
      { ...PASO_TIENDA, title: 'Tu menú digital', description: 'Este es el link de tu menú online. Compártelo en redes o imprímelo como QR en las mesas.' },
      PASO_EMPRESA,
    ],
    cierre: 'Carga tu menú, configura tus mesas y atiende tu primer pedido. ¡Buen provecho!',
  },
  farmacia: {
    bienvenida: 'Tu farmacia ya está lista. Te mostramos cómo controlar lotes, vencimientos y ventas en mostrador.',
    pasos: [
      { modulo: 'dashboard', title: 'Tu panel principal', emoji: '📊', description: 'Ventas, productos por agotarse y lotes por vencer en un solo lugar.' },
      { modulo: 'inventario', title: 'Tus medicamentos y productos', emoji: '💊', description: 'Carga tus productos con código de barras, precio y stock mínimo para recibir alertas antes de quedarte sin ellos.' },
      { modulo: 'lotes_vencimientos', title: 'Lotes y vencimientos', emoji: '🧪', description: 'Registra el lote y la fecha de vencimiento de cada entrada: el sistema te avisa con tiempo qué está por vencer.' },
      { modulo: 'proveedores', title: 'Droguerías y proveedores', emoji: '🚚', description: 'Registra tus proveedores, crea órdenes de compra y controla lo que les debes.' },
      { modulo: 'pos', title: 'Venta en mostrador', emoji: '🛒', description: 'Escanea y cobra en segundos desde el Punto de Venta, incluso sin internet.' },
      PASO_TASAS,
      PASO_EMPRESA,
    ],
    cierre: 'Carga tus productos con sus lotes y haz tu primera venta. ¡Mucho éxito!',
  },
  servicios: {
    bienvenida: 'Tu negocio de servicios ya está listo. Te mostramos cómo recibir trabajos, darles seguimiento y cobrarlos.',
    pasos: [
      { modulo: 'dashboard', title: 'Tu panel principal', emoji: '📊', description: 'Órdenes abiertas, ingresos y cobros pendientes de un vistazo.' },
      { modulo: 'ordenes_servicio', title: 'Órdenes de servicio', emoji: '🔧', description: 'Registra cada trabajo (equipo, falla, técnico). Tu cliente recibe un link para seguir el estado de su orden en tiempo real.' },
      { modulo: 'clientes', title: 'Tus clientes', emoji: '👥', description: 'El historial de trabajos y pagos de cada cliente queda en su ficha.' },
      { modulo: 'inventario', title: 'Repuestos y servicios', emoji: '📦', description: 'Carga los repuestos que vendes y los servicios con precio fijo para facturarlos rápido.' },
      { modulo: 'cobros', title: 'Cobros', emoji: '💵', description: 'Registra abonos y pagos totales de cada orden y controla lo pendiente.' },
      PASO_EMPRESA,
    ],
    cierre: 'Crea tu primera orden de servicio y compártele el seguimiento a tu cliente. ¡Mucho éxito!',
  },
  contador: {
    bienvenida: 'Tu despacho contable ya está listo. Te mostramos cómo llevar la contabilidad de cada empresa cliente por separado.',
    pasos: [
      { modulo: 'empresas_contables', title: 'Registra tus empresas (clientes)', emoji: '🏢', description: 'Cada empresa que contabilizas tiene su propio plan de cuentas y libros, totalmente separados. Empieza creando la primera.' },
      { modulo: 'asientos_contables', title: 'Asientos contables', emoji: '📖', description: 'Registra la partida doble de cada empresa; el sistema valida que cuadre el debe y el haber.' },
      { modulo: 'estados_financieros', title: 'Estados financieros', emoji: '📑', description: 'Balance general y estado de resultados listos para exportar a PDF o Excel.' },
      { modulo: 'servicios_facturables', title: 'Cobra tus honorarios', emoji: '💼', description: 'Define tus servicios y factúrale los honorarios a cada empresa cliente.' },
      PASO_EMPRESA,
    ],
    cierre: 'Crea tu primera empresa cliente y registra su primer asiento. ¡Mucho éxito!',
  },
};

function esPasoModulo(paso: PasoGuion): paso is PasoModulo {
  return 'modulo' in paso;
}

/** Abre la sección del menú que contiene `codigo` (y el menú móvil, si aplica). */
function revelarModulo(codigo: string): void {
  const grupo = grupoDeModulo(codigo);
  if (grupo && !grupo.fijo) {
    window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_GRUPO_SIDEBAR, { detail: grupo.id }));
  }
}

export default function OnboardingTour() {
  const { tenant, usuario, isLoading, refetchTenant } = useSession();
  // Una vez el usuario termina o salta el tour, no debe reaparecer en esta
  // pestaña aunque falle la persistencia en el backend (ej. sin conexión).
  const [descartadoLocalmente, setDescartadoLocalmente] = useState(false);

  const run = !isLoading && !!tenant && !tenant.onboarding_completado && !descartadoLocalmente;

  const pasos = useMemo<TourStep[]>(() => {
    const tipo = tenant?.tipo_negocio ?? 'retail';
    const guion = GUIONES[tipo] ?? GUIONES.retail;
    // Solo módulos que este tenant/rol realmente ve en el menú: un paso
    // hacia un ítem inexistente dejaba la tarjeta flotando sin señalar nada.
    const visibles = new Set(
      gruposVisibles(tipo, new Set(usuario?.modulos_ocultos ?? []), usuario?.rol_codigo === 'admin')
        .flatMap((g) => g.modulos.map((m) => m.codigo)),
    );

    const intermedios = guion.pasos.flatMap<TourStep>((paso) => {
      if (!esPasoModulo(paso)) {
        return [{ id: paso.target, target: `[data-tour="${paso.target}"]`, title: paso.title, emoji: paso.emoji, description: paso.description, placement: 'right' }];
      }
      if (!visibles.has(paso.modulo)) return [];
      return [{
        id: paso.modulo,
        target: `[data-tour="${paso.modulo}"]`,
        title: paso.title,
        emoji: paso.emoji,
        description: paso.description,
        placement: 'right',
        onBeforeShow: () => revelarModulo(paso.modulo),
      }];
    });

    return [
      { id: 'bienvenida', title: `¡Bienvenido, ${tenant?.nombre_empresa ?? ''}!`.replace(', !', '!'), emoji: '👋', description: guion.bienvenida },
      ...intermedios,
      { id: 'final', title: '¡Listo para empezar!', emoji: '🚀', description: guion.cierre },
    ];
  }, [tenant?.tipo_negocio, tenant?.nombre_empresa, usuario]);

  const completar = useCallback(() => {
    setDescartadoLocalmente(true);
    marcarOnboardingCompletado()
      .catch(() => undefined)
      .finally(() => { refetchTenant(); });
  }, [refetchTenant]);

  return <GuidedTour steps={pasos} run={run} onFinish={completar} onSkip={completar} />;
}
