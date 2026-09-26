/**
 * @file Alerta sonora/vibración para cuando una mesa llama al mesero o pide
 * la cuenta (ver `admin/restaurante/mesas/page.tsx`). Se genera el tono con
 * Web Audio en vez de cargar un archivo de audio -- no hace falta ningún
 * asset ni licencia, y funciona igual de bien para un "beep" corto.
 */

let audioCtx: AudioContext | null = null;

function obtenerContexto(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!audioCtx) audioCtx = new AudioContextCtor();
  return audioCtx;
}

/** Dos "beeps" cortos ascendentes -- distinguible de una notificación genérica sin ser molesto. */
export function reproducirAlertaLlamado(): void {
  try {
    const ctx = obtenerContexto();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();

    const tono = (frecuencia: number, inicio: number, duracion: number): void => {
      const oscilador = ctx.createOscillator();
      const ganancia = ctx.createGain();
      oscilador.type = 'sine';
      oscilador.frequency.value = frecuencia;
      ganancia.gain.setValueAtTime(0.001, ctx.currentTime + inicio);
      ganancia.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + inicio + 0.02);
      ganancia.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracion);
      oscilador.connect(ganancia);
      ganancia.connect(ctx.destination);
      oscilador.start(ctx.currentTime + inicio);
      oscilador.stop(ctx.currentTime + inicio + duracion + 0.02);
    };
    tono(880, 0, 0.15);
    tono(1108, 0.18, 0.18);
  } catch {
    // Autoplay bloqueado (el navegador exige una interacción previa) u otro
    // error de audio -- la alerta visual (badge pulsante) sigue funcionando.
  }

  // No todos los navegadores/dispositivos lo soportan (ej. iOS Safari) --
  // falla en silencio donde no aplica.
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate([200, 100, 200]); } catch { /* no-op */ }
  }
}
