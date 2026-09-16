"use client";

import { useEffect, useState, type ReactElement } from 'react';
import Link from 'next/link';

/**
 * Nav del sitio de marketing con dos estados:
 *  - Arriba del todo: barra sólida a todo lo ancho, sin margen ni radio --
 *    se "integra" directamente con el borde superior de la página (el hero
 *    es del mismo tono oscuro, así que no hay costura visible).
 *  - Al hacer scroll: se encoge a la píldora flotante con blur/sombra.
 * Antes el padding de la píldora flotante estaba siempre activo, así que
 * quedaba un hueco transparente arriba del todo que dejaba ver el fondo
 * pálido de <body> -- una franja blanca fea entre el borde del navegador y
 * el nav, tanto en reposo como ya scrolleado.
 */
export default function MarketingNav(): ReactElement {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 transition-[padding] duration-300 ${scrolled ? 'px-3 pt-3 sm:px-4' : 'px-0 pt-0'}`}>
      <div className={`mx-auto transition-[max-width] duration-300 ${scrolled ? 'max-w-7xl' : 'max-w-none'}`}>
        <div
          className={`bg-ink-950 transition-all duration-300 ${
            scrolled
              ? 'md:bg-ink-950/90 backdrop-blur-md border border-white/10 rounded-full shadow-lg shadow-black/10'
              : 'border-b border-white/5 rounded-none shadow-none'
          }`}
        >
          <div className="flex justify-between items-center h-16 px-3 sm:px-5 max-w-7xl mx-auto">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-accent-400 rounded-full flex items-center justify-center">
                <span className="text-ink-950 font-black text-lg font-display">P</span>
              </div>
              <span className="text-xl font-extrabold text-white tracking-tight hidden sm:inline">
                ERP<span className="text-accent-400">System</span>
              </span>
            </Link>

            {/* Enlaces al centro (Ocultos en móvil) */}
            <nav className="hidden md:flex items-center gap-1">
              <div className="relative group py-2">
                <button className="text-slate-300 hover:text-white hover:bg-white/5 font-bold text-sm px-4 py-2 rounded-full transition flex items-center gap-1">
                  Funcionalidades
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="mt-0.5 opacity-60">
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-2 w-64 grid gap-1">
                    <Link href="/#pos" className="flex items-start gap-3 p-3 rounded-xl hover:bg-primary-50 transition">
                      <span className="text-lg">🛒</span>
                      <span>
                        <span className="block text-sm font-bold text-slate-800">Punto de Venta</span>
                        <span className="block text-xs text-slate-500">Vende en segundos, multi-moneda</span>
                      </span>
                    </Link>
                    <Link href="/#inventario" className="flex items-start gap-3 p-3 rounded-xl hover:bg-primary-50 transition">
                      <span className="text-lg">📦</span>
                      <span>
                        <span className="block text-sm font-bold text-slate-800">Inventario</span>
                        <span className="block text-xs text-slate-500">Stock, variantes y almacenes</span>
                      </span>
                    </Link>
                    <Link href="/#fiscal" className="flex items-start gap-3 p-3 rounded-xl hover:bg-primary-50 transition">
                      <span className="text-lg">🌎</span>
                      <span>
                        <span className="block text-sm font-bold text-slate-800">Fiscal Multi-país</span>
                        <span className="block text-xs text-slate-500">IVA/IGV automático por país</span>
                      </span>
                    </Link>
                    <Link href="/#catalogo" className="flex items-start gap-3 p-3 rounded-xl hover:bg-primary-50 transition">
                      <span className="text-lg">🌐</span>
                      <span>
                        <span className="block text-sm font-bold text-slate-800">Catálogo Público</span>
                        <span className="block text-xs text-slate-500">Tu tienda online, sin costo extra</span>
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
              <Link href="/planes" className="text-slate-300 hover:text-white hover:bg-white/5 font-bold text-sm px-4 py-2 rounded-full transition">Planes</Link>
              <Link href="/planes#faq" className="text-slate-300 hover:text-white hover:bg-white/5 font-bold text-sm px-4 py-2 rounded-full transition">Preguntas Frecuentes</Link>
            </nav>

            {/* Botones de Acción */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/login" className="hidden sm:block text-slate-300 hover:text-white font-bold text-sm px-3 transition">
                Iniciar Sesión
              </Link>
              <Link href="/planes" className="bg-accent-400 text-ink-950 px-4 sm:px-5 py-2.5 rounded-full font-bold text-sm hover:bg-accent-300 shadow-md transition-all transform hover:-translate-y-0.5">
                Comenzar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
