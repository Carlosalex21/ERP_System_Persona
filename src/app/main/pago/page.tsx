"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CreditCard, ShieldCheck, CheckCircle, ArrowRight, Loader2, Landmark, Smartphone } from 'lucide-react';

function ContenidoPago() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Leer parámetros de la URL enviados desde el registro
  const planUrl = searchParams.get('plan') || 'emprendedor';
  const subdominioUrl = searchParams.get('subdominio') || 'mi-negocio';

  // Estados interactivos
  const [metodoPago, setMetodoPago] = useState('tarjeta'); // tarjeta, pagomovil, transferencia
  const [estaProcesando, setEstaProcesando] = useState(false);
  const [pagoExitoso, setPagoExitoso] = useState(false);
  const [progresoCreacion, setProgresoCreacion] = useState('');

  // Detalles del plan seleccionado
  const infoPlan = planUrl === 'pro' 
    ? { nombre: 'Plan ERP Pro', precio: 29, limite: 'Productos Ilimitados' }
    : { nombre: 'Plan Emprendedor', precio: 15, limite: 'Hasta 100 productos' };

  // Simulación del procesamiento asíncrono y aprovisionamiento del Tenant
  const manejarPago = (e: React.FormEvent) => {
    e.preventDefault();
    setEstaProcesando(true);
    
    // Simular los pasos que haría tu backend en Django (Crear esquema, correr migraciones, mapear dominio)
    const pasos = [
      'Validando credenciales de pago...',
      'Procesando transacción segura...',
      'Creando base de datos aislada para tu negocio...',
      'Configurando subdominio dinámico...',
      '¡Todo listo! Activando credenciales...'
    ];

    pasos.forEach((paso, indice) => {
      setTimeout(() => {
        setProgresoCreacion(paso);
        if (indice === pasos.length - 1) {
          setEstaProcesando(false);
          setPagoExitoso(true);
        }
      }, (indice + 1) * 1500);
    });
  };

  if (pagoExitoso) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl shadow-xl border border-slate-100 text-center animate-fade-in">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 mb-2">¡Suscripción Activada!</h2>
        <p className="text-slate-600 mb-6">
          Hemos recibido tu simulación de pago correctamente. Tu entorno multi-tenant ha sido aislado e inicializado con éxito.
        </p>

        {/* Tarjeta con accesos directos */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-left mb-8">
          <h4 className="font-bold text-slate-800 mb-3">Detalles de tu entorno:</h4>
          <div className="space-y-2 text-sm text-slate-600">
            <p><strong>Plan actual:</strong> {infoPlan.nombre} (${infoPlan.precio}/mes)</p>
            <p className="truncate">
              <strong>Catálogo Público:</strong>{' '}
              <a href={`http://${subdominioUrl}.localhost:3000`} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline font-semibold">
                {subdominioUrl}.erpsystem.com
              </a>
            </p>
            <p className="truncate">
              <strong>Panel de Control (Privado):</strong>{' '}
              <span className="text-slate-800 font-mono font-semibold bg-slate-200 px-1.5 py-0.5 rounded text-xs">
                {subdominioUrl}.erpsystem.com/admin
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push(`http://${subdominioUrl}.localhost:3000/admin`)}
          className="w-full bg-primary-600 text-white py-3.5 rounded-xl font-bold hover:bg-primary-700 shadow-md flex items-center justify-center gap-2 text-sm transition-all"
        >
          Ir al Panel de Administración <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto my-12 px-4 grid md:grid-cols-3 gap-8 relative">
      
      {/* COLUMNA: Resumen del Pedido (1 de 3 secciones) */}
      <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
        <h3 className="font-bold text-slate-800 text-lg mb-4">Resumen de Suscripción</h3>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-slate-900 text-sm">{infoPlan.nombre}</span>
            <span className="font-extrabold text-primary-700">${infoPlan.precio}.00</span>
          </div>
          <span className="text-xs text-slate-500 block">{infoPlan.limite}</span>
          <span className="text-xs text-green-600 font-medium block mt-1">Subdominio e infraestructura incluidos</span>
        </div>

        <div className="space-y-2 text-xs text-slate-500 border-t border-slate-100 pt-4">
          <div className="flex justify-between"><span>Subtotal:</span><span>${infoPlan.precio}.00</span></div>
          <div className="flex justify-between font-bold text-slate-800 text-sm pt-2 border-t border-dashed border-slate-200">
            <span>Total a pagar:</span><span>${infoPlan.precio}.00</span>
          </div>
        </div>

        {/* Indicador de subdominio pre-reservado */}
        <div className="mt-6 p-3 bg-primary-50 rounded-lg border border-primary-100 text-xs text-primary-800">
          Enlace web reservado: <strong className="underline">{subdominioUrl}.erpsystem.com</strong>
        </div>
      </div>

      {/* COLUMNA: Pasarela de Pago Simulada (2 de 3 secciones) */}
      <div className="md:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative">
        {estaProcesando && (
          <div className="absolute inset-0 bg-white/95 z-50 rounded-2xl flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <Loader2 className="text-primary-600 animate-spin mb-4" size={48} />
            <h3 className="text-xl font-bold text-slate-900 mb-1">Procesando Aprovisionamiento</h3>
            <p className="text-sm text-slate-500 max-w-xs">{progresoCreacion || 'Iniciando protocolo seguro...'}</p>
          </div>
        )}

        <h2 className="text-2xl font-bold text-slate-900 mb-2">Método de Pago Seguro</h2>
        <p className="text-sm text-slate-500 mb-6">Selecciona una opción de simulación para completar el flujo de activación del tenant.</p>

        {/* Selectores de Métodos de Pago */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setMetodoPago('tarjeta')}
            className={`p-3 rounded-xl border text-center flex flex-col items-center gap-2 font-semibold text-xs transition-all ${metodoPago === 'tarjeta' ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
          >
            <CreditCard size={20} /> Tarjeta
          </button>
          <button
            type="button"
            onClick={() => setMetodoPago('pagomovil')}
            className={`p-3 rounded-xl border text-center flex flex-col items-center gap-2 font-semibold text-xs transition-all ${metodoPago === 'pagomovil' ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
          >
            <Smartphone size={20} /> Pago Móvil
          </button>
          <button
            type="button"
            onClick={() => setMetodoPago('transferencia')}
            className={`p-3 rounded-xl border text-center flex flex-col items-center gap-2 font-semibold text-xs transition-all ${metodoPago === 'transferencia' ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
          >
            <Landmark size={20} /> Transferencia
          </button>
        </div>

        {/* FORMULARIO DINÁMICO SEGÚN MÉTODO SELECCIONADO */}
        <form onSubmit={manejarPago} className="space-y-4">
          {metodoPago === 'tarjeta' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Número de Tarjeta</label>
                <input type="text" placeholder="4242 •••• •••• 4242" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-600 focus:bg-white" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Vencimiento</label>
                  <input type="text" placeholder="MM / AA" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-600 focus:bg-white" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CVC / CVV</label>
                  <input type="text" placeholder="123" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-600 focus:bg-white" required />
                </div>
              </div>
            </div>
          )}

          {(metodoPago === 'pagomovil' || metodoPago === 'transferencia') && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-3 animate-fade-in">
              <p className="font-bold text-slate-800 text-xs uppercase tracking-wider">Datos para Simulación Bancaria:</p>
              <ul className="space-y-1 text-xs">
                <li><strong>Banco Destino:</strong> Banco Universal Corporativo</li>
                <li><strong>Identificación / RIF:</strong> J-12345678-0</li>
                <li><strong>Teléfono (Pago Móvil):</strong> +58 412-5551234</li>
                <li><strong>Número de Cuenta:</strong> 0105-xxxx-xxxx-xxxx-xxxx</li>
              </ul>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 mt-3">Número de Referencia de Transacción</label>
                <input type="text" placeholder="Ej. 12345678" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-600" required />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full mt-6 bg-accent-500 text-white py-3.5 rounded-xl font-bold hover:bg-accent-600 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
          >
            Simular Pago de ${infoPlan.precio}.00 y Activar Sistema
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 border-t border-slate-100 pt-4">
          <ShieldCheck size={16} className="text-green-500" />
          Conexión encriptada SSL de 256 bits y aislamiento de datos garantizado.
        </div>
      </div>
    </div>
  );
}

// En Next.js 15, toda página que use useSearchParams debe estar envuelta en un Suspense Boundary
export default function PagoPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="text-primary-600 animate-spin" size={40} />
      </div>
    }>
      <ContenidoPago />
    </Suspense>
  );
}