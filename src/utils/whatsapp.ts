/**
 * @file Enlaces `wa.me` con mensaje prellenado -- sin costo ni cuenta de
 * WhatsApp Business API, el mismo truco que ya usa `apps.restaurantes`
 * (avisos de mesa) y que la investigación de mercado del módulo
 * inmobiliario señaló como el camino correcto para un MVP: abre WhatsApp
 * con el texto listo, el empleado solo confirma el envío.
 */
import type { PaisCodigo } from './paises';

const CODIGO_PAIS: Record<PaisCodigo, string> = { VE: '58', CO: '57', PE: '51' };

/**
 * Normaliza un teléfono local (ej. "0412-1234567") a formato E.164 sin el
 * "+" (lo que espera `wa.me`) -- si ya viene con "+", se respeta tal cual.
 * Devuelve `null` si no queda ningún dígito utilizable.
 */
export function normalizarTelefono(telefono: string, paisCodigo?: PaisCodigo | null): string | null {
  const limpio = telefono.trim();
  if (!limpio) return null;
  if (limpio.startsWith('+')) {
    const soloDigitos = limpio.slice(1).replace(/\D/g, '');
    return soloDigitos || null;
  }
  const soloDigitos = limpio.replace(/\D/g, '');
  if (!soloDigitos) return null;
  const codigo = CODIGO_PAIS[paisCodigo ?? 'VE'] ?? CODIGO_PAIS.VE;
  // Los números locales suelen anotarse con un "0" inicial (ej. "0412...")
  // que no es parte del número real una vez antepuesto el código de país.
  const sinCeroInicial = soloDigitos.replace(/^0+/, '');
  return `${codigo}${sinCeroInicial}`;
}

/** Arma el link `https://wa.me/<telefono>?text=<mensaje>` -- `null` si el teléfono no es utilizable. */
export function construirLinkWhatsapp(telefono: string, mensaje: string, paisCodigo?: PaisCodigo | null): string | null {
  const normalizado = normalizarTelefono(telefono, paisCodigo);
  if (!normalizado) return null;
  return `https://wa.me/${normalizado}?text=${encodeURIComponent(mensaje)}`;
}
