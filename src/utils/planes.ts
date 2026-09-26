/**
 * @file Lo que se le muestra al cliente sobre cada plan (tarjetas de /planes,
 * /pago y Mi Suscripción). Antes `beneficiosDePlan` estaba copiado en dos
 * pantallas con textos fijos por slug; ahora sale de lo que el superadmin
 * configuró en el plan: sus características, límites y módulos incluidos.
 */
import type { Plan } from '@/types/api';
import { GRUPOS_MODULOS_VENDIBLES, type TipoNegocio } from '@/utils/modulosPanel';

/** Textos de respaldo para planes sin características escritas en el superadmin. */
const BENEFICIOS_POR_SLUG: Record<string, string[]> = {
  emprendedor: [
    'Subdominio personalizado',
    'Catálogo web público optimizado para móviles',
    'Pedidos ilimitados enviados por WhatsApp',
  ],
  pro: [
    'Todo lo incluido en el Plan Emprendedor',
    'Soporte prioritario por WhatsApp y correo',
  ],
};

const MAX_NOMBRES_POR_GRUPO = 3;

/**
 * Una línea por área del sistema que el plan incluye, considerando solo los
 * módulos que aplican al tipo de negocio (ej. "Contabilidad: Asientos
 * Contables, Plan de Cuentas" o "Inventario completo").
 */
export function resumenModulosPlan(plan: Pick<Plan, 'modulos'>, tipoNegocio?: TipoNegocio | string | null): string[] {
  if (!plan.modulos || plan.modulos.length === 0) return ['Todos los módulos del sistema'];
  const incluidos = new Set(plan.modulos);
  const aplica = (tipos?: TipoNegocio[]): boolean => !tipos || !tipoNegocio || tipos.includes(tipoNegocio as TipoNegocio);

  return GRUPOS_MODULOS_VENDIBLES.flatMap((grupo) => {
    const disponibles = grupo.modulos.filter((m) => aplica(m.tiposNegocio));
    const enPlan = disponibles.filter((m) => incluidos.has(m.codigo));
    if (enPlan.length === 0) return [];
    if (enPlan.length === disponibles.length) return [`${grupo.etiqueta} completo`];
    if (enPlan.length <= MAX_NOMBRES_POR_GRUPO) return [`${grupo.etiqueta}: ${enPlan.map((m) => m.etiqueta).join(', ')}`];
    return [`${grupo.etiqueta} (${enPlan.length} de ${disponibles.length} módulos)`];
  });
}

/** Características + módulos + límites de un plan, listos para una tarjeta. */
export function beneficiosDePlan(plan: Plan, tipoNegocio?: TipoNegocio | string | null): string[] {
  const escritas = (plan.descripcion || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const caracteristicas = escritas.length > 0 ? escritas : (plan.slug ? BENEFICIOS_POR_SLUG[plan.slug] ?? [] : []);
  const limites = [
    plan.limite_productos ? `Hasta ${plan.limite_productos} productos` : 'Productos ilimitados',
    `Hasta ${plan.limite_usuarios} usuario${plan.limite_usuarios === 1 ? '' : 's'}`,
    `Hasta ${plan.limite_sucursales} sucursal${plan.limite_sucursales === 1 ? '' : 'es'}`,
  ];
  return [...caracteristicas, ...resumenModulosPlan(plan, tipoNegocio), ...limites];
}
