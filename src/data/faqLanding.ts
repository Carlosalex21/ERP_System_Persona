import type { FaqItem } from '@/components/FaqChatWidget';

/**
 * Preguntas frecuentes de la LANDING pública (visitantes que todavía no son
 * clientes) -- sobre el producto, precios y cómo empezar. Ver `faqPanel.ts`
 * para las del panel administrativo (uso del sistema ya siendo cliente).
 */
export const FAQ_LANDING: FaqItem[] = [
  {
    pregunta: '¿Qué es ERP System?',
    respuesta: 'Una plataforma todo-en-uno para gestionar tu negocio: inventario, facturación, punto de venta, clientes, proveedores, contabilidad y nómina, con tu propio subdominio y catálogo público para vender por WhatsApp.',
  },
  {
    pregunta: '¿Cuánto cuesta?',
    respuesta: 'Los planes van desde $25 hasta $35 al mes, según el tipo de negocio (tienda, restaurante, farmacia, servicios o contador). Puedes ver el detalle completo en la sección de Precios y Planes.',
  },
  {
    pregunta: '¿Tienen período de prueba gratis?',
    respuesta: 'Sí, puedes registrarte y usar el sistema gratis por un tiempo antes de pagar -- no se pide tarjeta para empezar.',
  },
  {
    pregunta: '¿En qué países funciona?',
    respuesta: 'Actualmente Venezuela, Colombia y Perú, cada uno con su moneda e impuesto local (IVA/IGV) configurados automáticamente.',
  },
  {
    pregunta: '¿Cómo pago mi suscripción?',
    respuesta: 'En Venezuela se paga por Pago Móvil o Zelle (confirmación manual). En Colombia y Perú se paga con tarjeta a través de Stripe.',
  },
  {
    pregunta: '¿Puedo cambiar de plan más adelante?',
    respuesta: 'Sí, en cualquier momento desde tu panel. Si ya tienes un plan pagado activo y subes a uno mejor, solo pagas la diferencia proporcional a lo que te queda -- no el precio completo otra vez.',
  },
  {
    pregunta: '¿Qué tipos de negocio soporta?',
    respuesta: 'Tiendas/comercio en general, restaurantes (con mesas, cocina y comandas), farmacias (con control de lotes), negocios de servicios y contadores/despachos contables.',
  },
  {
    pregunta: '¿Necesito instalar algo?',
    respuesta: 'No, funciona 100% desde el navegador. También se puede instalar como una app (PWA) en tu celular o computadora para acceso más rápido.',
  },
  {
    pregunta: '¿Cómo empiezo?',
    respuesta: 'Toca "Registrarme" para crear tu cuenta gratis, o "Probar demo en vivo" si quieres ver el sistema funcionando antes de registrarte.',
  },
  {
    pregunta: '¿Cómo los contacto si tengo dudas?',
    respuesta: 'Escríbenos a soporte@erpsystem.com o usa el botón de WhatsApp aquí abajo.',
  },
];
