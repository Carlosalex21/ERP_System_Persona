/**
 * @file Traduce los errores de la API a mensajes comprensibles para el cliente.
 *
 * El backend responde siempre `{ data, meta, errors: [{ code, detail, field }] }`.
 * Mostrar eso tal cual da textos como "Este campo es requerido. (numero_control)"
 * o, peor, un traceback/"IntegrityError". Aquí se centraliza:
 *
 * - qué decir cuando NO hubo respuesta (sin internet, tiempo agotado),
 * - qué decir según el código HTTP (401, 403, 404, 413, 429, 5xx...),
 * - cómo llamar a cada campo ("numero_control" -> "Número de control"),
 * - cómo reescribir los mensajes genéricos de DRF y esconder los técnicos.
 *
 * Todo el panel pasa por `mensajesDeError`/`toastApiError`, así que un cambio
 * de redacción se hace en un único lugar.
 */
import type { ApiError } from '@/types/api';

/** Etiqueta legible de los campos que más viajan entre formularios y API. */
const ETIQUETAS_CAMPO: Record<string, string> = {
  // generales
  nombre: 'Nombre', descripcion: 'Descripción', observaciones: 'Observaciones', email: 'Correo electrónico',
  telefono: 'Teléfono', direccion: 'Dirección', activo: 'Activo', fecha: 'Fecha', estado: 'Estado',
  password: 'Contraseña', password_confirm: 'Confirmación de contraseña', new_password: 'Nueva contraseña',
  password_actual: 'Contraseña actual', password_nueva: 'Nueva contraseña', username: 'Usuario',
  first_name: 'Nombre', last_name: 'Apellido', documento: 'Documento', rif: 'RIF',
  identificador_fiscal: 'RIF / identificador fiscal', razon_social: 'Razón social',
  // inventario
  sku: 'SKU', codigo_barras: 'Código de barras', precio: 'Precio', costo: 'Costo', costo_promedio: 'Costo de compra',
  costo_unitario: 'Costo unitario', cantidad: 'Cantidad', stock_minimo: 'Stock mínimo', categoria: 'Categoría',
  almacen: 'Almacén', almacen_id: 'Almacén', almacen_destino: 'Almacén de destino', producto: 'Producto',
  producto_id: 'Producto', variante: 'Variante', variantes: 'Variantes', atributos: 'Atributos', imagen: 'Imagen',
  tipo: 'Tipo', motivo: 'Motivo', detalles: 'Productos', detalles_para_crear: 'Productos', lineas: 'Líneas',
  // compras / fiscal
  proveedor: 'Proveedor', proveedor_id: 'Proveedor', numero_factura: 'Número de factura',
  numero_control: 'Número de control', numero_documento: 'Número de documento',
  numero_comprobante: 'Número de comprobante', fecha_emision: 'Fecha de emisión',
  fecha_vencimiento: 'Fecha de vencimiento', monto: 'Monto', monto_exento: 'Monto exento',
  base: 'Base', base_imponible: 'Base imponible', iva: 'IVA', porcentaje: 'Porcentaje',
  porcentaje_iva: 'Alícuota de IVA', porcentaje_retencion_iva: 'Retención de IVA',
  tipo_retencion: 'Tipo de retención', periodo_imposicion: 'Periodo de imposición', factura: 'Factura',
  factura_compra: 'Factura de compra', orden_compra_id: 'Orden de compra', metodo_pago: 'Método de pago',
  metodo_pago_id: 'Método de pago', referencia: 'Referencia', moneda: 'Moneda', tasa: 'Tasa de cambio',
  // personas
  cliente: 'Cliente', rol: 'Rol', sucursal: 'Sucursal', departamento: 'Departamento',
  fecha_contratacion: 'Fecha de contratación', salario: 'Salario', almacen_asignado: 'Almacén asignado',
  // contabilidad
  codigo: 'Código', cuenta: 'Cuenta', debe: 'Debe', haber: 'Haber', empresa: 'Empresa',
  comprobante: 'Comprobante', comprobante_pago: 'Comprobante de pago',
  // plan / suscripción
  plan: 'Plan', subdominio: 'Subdominio', nombre_empresa: 'Nombre de la empresa',
};

const CAMPOS_GENERICOS = new Set(['detail', 'error', 'errors', 'mensaje', 'message', 'non_field_errors', 'code']);

const sinAcentos = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** "numero_control" -> "Número de control"; rutas anidadas -> "Productos › Línea 2 › Cantidad". */
export function etiquetaCampo(campo: string): string {
  return campo
    .split('.')
    .map((segmento) => {
      if (/^\d+$/.test(segmento)) return `Línea ${Number(segmento) + 1}`;
      if (ETIQUETAS_CAMPO[segmento]) return ETIQUETAS_CAMPO[segmento];
      const limpio = segmento.replace(/_id$/, '').replace(/_/g, ' ').trim();
      return limpio.charAt(0).toUpperCase() + limpio.slice(1);
    })
    .join(' › ');
}

/** Mensaje según el código HTTP, para cuando el servidor no dio uno útil. */
export function mensajePorEstado(status: number | undefined): string {
  switch (status) {
    case 400: return 'Revisa los datos ingresados e inténtalo de nuevo.';
    case 401: return 'Tu sesión expiró. Inicia sesión nuevamente.';
    case 402: return 'Tu suscripción venció. Renueva tu plan para continuar.';
    case 403: return 'No tienes permiso para realizar esta acción.';
    case 404: return 'No encontramos lo que buscas. Puede que ya no exista.';
    case 405: return 'Esta acción no está disponible.';
    case 409: return 'Esta información cambió mientras la editabas. Recarga e inténtalo de nuevo.';
    case 413: return 'El archivo es demasiado pesado. Sube uno más liviano.';
    case 415: return 'Ese tipo de archivo no está permitido.';
    case 422: return 'Revisa los datos ingresados e inténtalo de nuevo.';
    case 429: return 'Hiciste demasiadas solicitudes seguidas. Espera un momento e inténtalo de nuevo.';
    case 502:
    case 503:
    case 504: return 'El servicio no está disponible en este momento. Inténtalo de nuevo en unos minutos.';
    default:
      if (status !== undefined && status >= 500) {
        return 'Algo salió mal de nuestro lado. Ya quedó registrado; inténtalo de nuevo en unos minutos.';
      }
      return 'No se pudo completar la operación. Inténtalo de nuevo.';
  }
}

/** Textos genéricos de DRF/Django/SimpleJWT que no le dicen nada útil al cliente. */
const GENERICOS_DEL_FRAMEWORK = [
  /^no encontrado\.?$/i, /^not found\.?$/i,
  /^las credenciales de autenticaci/i, /^authentication credentials/i,
  /^usted no tiene permiso/i, /^you do not have permission/i,
  /^m[eé]todo .* no permitido/i, /^method .* not allowed/i,
  /^solicitud fue regulada/i, /^request was throttled/i, /^se esperaba disponibilidad/i,
  /^se produjo un error/i, /^a server error occurred/i,
  /^given token not valid/i, /^token is invalid/i, /^token is expired/i,
];

/** Reescrituras de mensajes concretos conocidos (en español o inglés). */
const REESCRITURAS: Array<[RegExp, string]> = [
  [/no active account|no se encontr.* cuenta activa|unable to log in/i, 'Correo o contraseña incorrectos.'],
  [/user is inactive/i, 'Esta cuenta está desactivada. Contacta al administrador.'],
  [/clave primaria .* inv[aá]lida|invalid pk|object does not exist|objeto no existe/i, 'La opción seleccionada ya no existe. Actualiza la página e inténtalo de nuevo.'],
  [/^esta lista no puede estar vac[ií]a|this list may not be empty/i, 'Agrega al menos un elemento.'],
  [/se requiere un n[uú]mero entero v[aá]lido|a valid integer is required/i, 'Ingresa un número entero válido.'],
  [/se requiere un n[uú]mero v[aá]lido|a valid number is required/i, 'Ingresa un número válido.'],
  [/introduzca una direcci[oó]n de correo|enter a valid email/i, 'Ingresa un correo electrónico válido.'],
  [/no file was submitted|no se envi[oó] ning[uú]n archivo/i, 'No se recibió ningún archivo.'],
];

/** Mensajes de "campo obligatorio" de DRF (en cualquiera de sus variantes). */
const ES_CAMPO_OBLIGATORIO = /^(este campo es requerido|este campo no puede (ser nulo|estar en blanco)|this field (is required|may not be (blank|null)))\.?$/i;

/** Señales de que el mensaje es un error interno que el cliente no debe leer. */
const PARECE_TECNICO = /traceback|exception|errno|integrityerror|operationalerror|programmingerror|psycopg|duplicate key|violates|doesnotexist|nonetype|keyerror|typeerror|attributeerror|object of type|<!doctype|<html|errordetail|syntax error|\bat 0x[0-9a-f]+/i;

interface OpcionesMensajes {
  /** Si el servidor no dio nada útil (y no hay un estado HTTP concluyente), se devuelve este texto. */
  fallback?: string;
}

interface ErrorConRespuesta {
  code?: string;
  message?: string;
  response?: { status?: number; data?: { errors?: ApiError[] | null } };
  apiErrors?: ApiError[];
}

function limpiarDetalle(detalle: string, status: number | undefined): string | null {
  const texto = detalle.trim();
  if (!texto) return null;
  if (PARECE_TECNICO.test(texto)) return mensajePorEstado(status && status >= 500 ? status : 500);
  if (GENERICOS_DEL_FRAMEWORK.some((re) => re.test(texto))) return mensajePorEstado(status);
  for (const [re, reemplazo] of REESCRITURAS) {
    if (re.test(texto)) return reemplazo;
  }
  return texto;
}

function mensajeDeUnError(e: ApiError, status: number | undefined): string | null {
  const detalle = limpiarDetalle(e.detail ?? '', status);
  if (!detalle) return null;

  const campo = e.field && !CAMPOS_GENERICOS.has(e.field) ? e.field : null;
  if (!campo) return detalle;

  const etiqueta = etiquetaCampo(campo);
  if (ES_CAMPO_OBLIGATORIO.test((e.detail ?? '').trim())) return `Falta completar: ${etiqueta}.`;
  // Si el mensaje ya nombra el campo ("El campo X..."), no se repite.
  if (sinAcentos(detalle).includes(sinAcentos(etiqueta))) return detalle;
  return `${etiqueta}: ${detalle}`;
}

/**
 * Lista de mensajes listos para mostrar al cliente a partir de cualquier error
 * (de axios, de `enviarMultipart` o lanzado a mano).
 *
 * Devuelve `[]` solo cuando el servidor respondió un 400/422 de validación sin
 * ningún detalle aprovechable y no se pasó `fallback`: ahí el llamador conoce
 * mejor el contexto ("No se pudo guardar el producto") y usa su propio texto.
 */
export function mensajesDeError(error: unknown, opciones: OpcionesMensajes = {}): string[] {
  if (typeof error !== 'object' || error === null) return opciones.fallback ? [opciones.fallback] : [];
  const err = error as ErrorConRespuesta;
  const status = err.response?.status;

  // Sin respuesta del servidor: red caída, tiempo agotado, bloqueo del navegador.
  if (status === undefined && !err.apiErrors) {
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return ['La solicitud tardó demasiado. Revisa tu conexión e inténtalo de nuevo.'];
    }
    if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
      const sinInternet = typeof navigator !== 'undefined' && navigator.onLine === false;
      return [sinInternet
        ? 'Sin conexión a internet. Revisa tu red e inténtalo de nuevo.'
        : 'No pudimos comunicarnos con el servidor. Revisa tu conexión e inténtalo de nuevo.'];
    }
  }

  const crudos = (err.response?.data?.errors?.length ? err.response.data.errors : err.apiErrors) ?? [];
  const mensajes: string[] = [];
  for (const e of crudos) {
    const m = mensajeDeUnError(e, status);
    if (m && !mensajes.includes(m)) mensajes.push(m);
  }

  if (mensajes.length > 0) {
    const MAXIMO = 4;
    if (mensajes.length > MAXIMO) {
      const resto = mensajes.length - MAXIMO;
      return [...mensajes.slice(0, MAXIMO), `…y ${resto} ${resto === 1 ? 'problema más' : 'problemas más'}.`];
    }
    return mensajes;
  }

  // Sin detalle del servidor: el código HTTP dice lo suficiente salvo en los 400/422 genéricos.
  if (status !== undefined && status !== 400 && status !== 422) return [mensajePorEstado(status)];
  return opciones.fallback ? [opciones.fallback] : [];
}

/** Primer mensaje (o el de respaldo), para un `<p>` de error en un formulario. */
export function mensajeDeErrorUnico(error: unknown, fallback: string): string {
  return mensajesDeError(error, { fallback })[0] ?? fallback;
}
