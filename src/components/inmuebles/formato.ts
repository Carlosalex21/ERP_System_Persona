/** Formato y utilidades de fechas/dinero compartidas por las pantallas de inmuebles. */

export const usd = (valor: string | number | null | undefined): string =>
  `$ ${Number(valor ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const numero = (valor: string | number | null | undefined, decimales = 2): string =>
  Number(valor ?? 0).toLocaleString('es-VE', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

const dosDigitos = (n: number): string => String(n).padStart(2, '0');

/** Fecha local de hoy como AAAA-MM-DD (sin saltos por zona horaria). */
export const hoyISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
};

export const sumarDias = (iso: string, dias: number): string => {
  const [a, m, d] = iso.split('-').map(Number);
  const f = new Date(a, m - 1, d + dias);
  return `${f.getFullYear()}-${dosDigitos(f.getMonth() + 1)}-${dosDigitos(f.getDate())}`;
};

export const fechaCorta = (iso?: string | null): string => {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const periodoActual = (): string => hoyISO().slice(0, 7);

/** "2026-10" -> "Octubre 2026". */
export const periodoLabel = (periodo: string): string => {
  const [a, m] = periodo.split('-').map(Number);
  return m >= 1 && m <= 12 ? `${MESES[m - 1]} ${a}` : periodo;
};

export const sumarMeses = (periodo: string, meses: number): string => {
  const [a, m] = periodo.split('-').map(Number);
  const total = a * 12 + (m - 1) + meses;
  return `${Math.floor(total / 12)}-${dosDigitos((total % 12) + 1)}`;
};

/** Meses para un selector: desde `atras` meses antes hasta `adelante` después de hoy (el más reciente primero). */
export const opcionesPeriodos = (atras = 12, adelante = 1): { valor: string; etiqueta: string }[] => {
  const actual = periodoActual();
  const salida: { valor: string; etiqueta: string }[] = [];
  for (let i = adelante; i >= -atras; i--) {
    const valor = sumarMeses(actual, i);
    salida.push({ valor, etiqueta: periodoLabel(valor) });
  }
  return salida;
};

export const ETIQUETA_TIPO_UNIDAD: Record<string, string> = {
  apartamento: 'Apartamento', casa: 'Casa', townhouse: 'Townhouse', local: 'Local comercial', oficina: 'Oficina',
  galpon: 'Galpón', terreno: 'Terreno', estacionamiento: 'Estacionamiento', deposito: 'Depósito', otro: 'Otro',
};

export const ETIQUETA_METODO: Record<string, string> = {
  transferencia: 'Transferencia', pago_movil: 'Pago móvil', zelle: 'Zelle', efectivo: 'Efectivo', deposito: 'Depósito', otro: 'Otro',
};

/** Texto de WhatsApp de cobro (el panel lo abre con `wa.me`). */
export const mensajeCobro = (nombre: string, unidad: string, deudaUsd: string, meses: number, enlace?: string): string => {
  const primero = nombre.split(' ')[0];
  const base = `Hola ${primero}, te escribimos de la administración. Tu unidad ${unidad} tiene una deuda vencida de ${usd(deudaUsd)}` +
    (meses > 1 ? ` (${meses} meses).` : '.');
  return enlace ? `${base} Puedes ver el detalle y reportar tu pago aquí: ${enlace}` : `${base} ¿Podemos ayudarte a regularizarla?`;
};
