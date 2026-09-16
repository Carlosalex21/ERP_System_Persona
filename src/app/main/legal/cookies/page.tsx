import type { ReactElement } from 'react';

export const metadata = { title: 'Política de Cookies | ERPSystem' };

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }): ReactElement {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-slate-900 mb-2">{titulo}</h2>
      <div className="text-sm text-slate-600 space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}

export default function CookiesPage(): ReactElement {
  return (
    <div className="bg-slate-50 min-h-screen py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-black text-slate-900 mb-2">Política de Cookies</h1>
        <p className="text-xs text-slate-400 mb-10">Última actualización: {new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <Seccion titulo="1. Qué son las cookies">
          <p>
            Las cookies son pequeños archivos que un sitio web guarda en tu navegador para recordar información entre
            visitas. Nosotros usamos un mecanismo equivalente (cookies del navegador) principalmente para mantener tu
            sesión iniciada.
          </p>
        </Seccion>

        <Seccion titulo="2. Qué cookies usamos">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-slate-800">access_token / refresh_token</strong> (estrictamente necesarias): guardan tu sesión de
              inicio de sesión para que no tengas que volver a autenticarte en cada página. Sin ellas, el sistema no
              puede funcionar.
            </li>
          </ul>
          <p>
            No usamos cookies de publicidad ni de rastreo de terceros. No compartimos esta información con redes
            publicitarias.
          </p>
        </Seccion>

        <Seccion titulo="3. Cookies de terceros">
          <p>
            Si pagas tu suscripción con tarjeta, Stripe (nuestro procesador de pagos) puede establecer sus propias
            cookies durante el proceso de pago, según su propia política de privacidad.
          </p>
        </Seccion>

        <Seccion titulo="4. Cómo desactivar las cookies">
          <p>
            Puedes bloquear o eliminar las cookies desde la configuración de tu navegador. Ten en cuenta que, al ser
            cookies esenciales para el inicio de sesión, bloquearlas impedirá que puedas usar el panel administrativo
            o el portal de clientes B2B.
          </p>
        </Seccion>

        <Seccion titulo="5. Cambios a esta política">
          <p>Si cambia qué cookies usamos, actualizaremos esta página.</p>
        </Seccion>

        <Seccion titulo="6. Contacto">
          <p>Dudas sobre esta política: <a href="mailto:soporte@erpsystem.com" className="text-primary-600 font-semibold">soporte@erpsystem.com</a>.</p>
        </Seccion>
      </div>
    </div>
  );
}
