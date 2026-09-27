import type { FaqItem } from '@/components/FaqChatWidget';

/**
 * Preguntas frecuentes DENTRO del panel administrativo (ya siendo cliente)
 * -- "cómo hago X" del día a día. Ver `faqLanding.ts` para las de la landing
 * pública. Deliberadamente cortas y accionables (dónde hacer clic), no
 * explicaciones largas.
 */
export const FAQ_PANEL: FaqItem[] = [
  {
    pregunta: '¿Cómo genero la nómina de mis empleados?',
    respuesta: 'Ve a RRHH → Nómina → pestaña "Períodos" → botón "Generar Nómina", elige el rango de fechas. Se calcula solo descontando ausencias y sumando horas extra reales.',
  },
  {
    pregunta: '¿Cómo registro las vacaciones de un empleado?',
    respuesta: 'RRHH → Nómina → pestaña "Vacaciones y Liquidación", busca al empleado y toca "Vacación" para registrar el período tomado. Ahí mismo ves cuántos días tiene acumulados y disponibles.',
  },
  {
    pregunta: '¿Cómo agrego una comisión o bono solo para un empleado?',
    respuesta: 'En RRHH → Nómina → "Períodos", genera o abre un período y en la fila del empleado toca el botón "Concepto" para agregar un monto puntual (bono o deducción) solo para él.',
  },
  {
    pregunta: '¿Cómo hago un ajuste de inventario?',
    respuesta: 'Ve a Inventario → Ajustes → "Nuevo Ajuste". Si te equivocaste en la fecha o el proveedor de un ajuste ya guardado, puedes corregirlo con el lápiz de la lista (el tipo de movimiento y las cantidades no se pueden editar después, por control de kardex).',
  },
  {
    pregunta: '¿Por qué el valor de mi inventario no cuadra con lo que veo en el catálogo?',
    respuesta: 'El valor de inventario se calcula con el COSTO de cada producto, no con el precio de venta al público -- son números distintos a propósito.',
  },
  {
    pregunta: '¿Cómo registro un cobro parcial de un cliente a crédito?',
    respuesta: 'Ve a Facturación → Cuentas por Cobrar, busca la factura y toca "Cobrar" -- puedes registrar el monto exacto que te pagó, aunque no sea el total.',
  },
  {
    pregunta: '¿Cómo veo cuánto me falta de mi plan o hago un upgrade?',
    respuesta: 'En el menú lateral, sección "Suscripción" (o el aviso de días restantes arriba). Ahí ves tu plan actual, cuánto falta para vencer, y puedes cambiar de plan.',
  },
  {
    pregunta: '¿Cómo organizo el menú del restaurante por categorías en el POS?',
    respuesta: 'Las categorías se crean en Inventario → Categorías y se asignan a cada producto -- luego aparecen como filtros al agregar platos a una mesa.',
  },
  {
    pregunta: '¿Cómo sabe la cocina qué preparar?',
    respuesta: 'Restaurante → Cocina muestra cada comanda pendiente en tiempo real; el cocinero la marca como lista apenas la termina.',
  },
  {
    pregunta: '¿Cómo agrego o edito un cliente?',
    respuesta: 'Ve al módulo Clientes -- ahí puedes crear, editar, marcar contribuyente especial, y definir sus días de crédito. También puedes crear uno rápido desde el POS.',
  },
  {
    pregunta: '¿Cómo cambio mi contraseña?',
    respuesta: 'Toca tu nombre/avatar en la esquina del panel y busca "Cambiar contraseña".',
  },
  {
    pregunta: '¿Puedo ver quién ha iniciado sesión en mi cuenta?',
    respuesta: 'Sí, en Auditoría → pestaña "Accesos" ves el historial de inicios de sesión con fecha, usuario y resultado.',
  },
];
