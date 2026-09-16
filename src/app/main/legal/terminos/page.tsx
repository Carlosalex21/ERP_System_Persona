import type { ReactElement } from 'react';

export const metadata = { title: 'Términos y Condiciones | ERPSystem' };

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }): ReactElement {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-slate-900 mb-2">{titulo}</h2>
      <div className="text-sm text-slate-600 space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}

export default function TerminosPage(): ReactElement {
  return (
    <div className="bg-slate-50 min-h-screen py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-black text-slate-900 mb-2">Términos y Condiciones de Servicio</h1>
        <p className="text-xs text-slate-400 mb-10">Última actualización: {new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <Seccion titulo="1. Aceptación de los términos">
          <p>
            Al registrarte y crear un negocio (&quot;tenant&quot;) en ERPSystem, aceptas estos Términos y Condiciones y
            nuestra Política de Privacidad. Si no estás de acuerdo, no debes usar la plataforma.
          </p>
        </Seccion>

        <Seccion titulo="2. Descripción del servicio">
          <p>
            ERPSystem es un software como servicio (SaaS) que provee, entre otros: gestión de inventario, facturación,
            punto de venta, catálogo público de productos y gestión de clientes mayoristas (B2B). Cada negocio registrado
            opera de forma aislada en su propio subdominio.
          </p>
        </Seccion>

        <Seccion titulo="3. Registro y plan de prueba gratuito">
          <p>
            Todo registro nuevo comienza con un plan de prueba gratuito. La plataforma puede limitar la cantidad de
            registros gratuitos disponibles como parte de una promoción, en cuyo caso el formulario de registro lo
            indicará. Vencido el período de prueba, debes contratar un plan pago para seguir usando el panel
            administrativo; el catálogo público de tu negocio puede dejar de estar disponible si tu suscripción no se
            renueva.
          </p>
        </Seccion>

        <Seccion titulo="4. Suscripción y pagos">
          <p>
            El costo de la suscripción depende del plan elegido. Según el país de operación registrado, el pago se
            realiza mediante Pago Móvil/Zelle (con confirmación manual por nuestro equipo) o mediante tarjeta a través
            de Stripe. Eres responsable de mantener tu suscripción al día; si vence y no se renueva dentro del período
            de gracia indicado en el panel, el acceso al sistema se suspende hasta que regularices el pago.
          </p>
        </Seccion>

        <Seccion titulo="5. Tus responsabilidades como usuario">
          <ul className="list-disc pl-5 space-y-1">
            <li>Proporcionar información veraz al registrarte y mantenerla actualizada.</li>
            <li>Mantener la confidencialidad de tu contraseña y las de los empleados que invites.</li>
            <li>Ser el único responsable de los productos, precios, contenido y atención al cliente de tu propio catálogo público.</li>
            <li>Cumplir con las leyes fiscales y de protección al consumidor de tu país al usar el sistema de facturación.</li>
            <li>No usar la plataforma para actividades ilegales, fraudulentas o que infrinjan derechos de terceros.</li>
          </ul>
        </Seccion>

        <Seccion titulo="6. Datos de tus propios clientes">
          <p>
            Los datos que tus clientes finales ingresan al comprar en tu catálogo público (nombre, teléfono, dirección)
            son tu responsabilidad como dueño del negocio. Debes usarlos únicamente para atender esos pedidos y cumplir
            con la normativa de protección de datos que te aplique.
          </p>
        </Seccion>

        <Seccion titulo="7. Disponibilidad del servicio">
          <p>
            Hacemos nuestro mejor esfuerzo para mantener la plataforma disponible, pero no garantizamos un tiempo de
            actividad del 100%. Podemos realizar mantenimientos programados avisando con antelación razonable cuando sea posible.
          </p>
        </Seccion>

        <Seccion titulo="8. Suspensión y cancelación de cuentas">
          <p>
            Podemos suspender o cancelar una cuenta que incumpla estos términos, use el sistema para fines ilegales, o
            cuya suscripción permanezca vencida más allá del período de gracia. Puedes cancelar tu cuenta en cualquier
            momento contactando a soporte.
          </p>
        </Seccion>

        <Seccion titulo="9. Limitación de responsabilidad">
          <p>
            ERPSystem se provee &quot;tal cual&quot;. No somos responsables por pérdidas de ventas, datos o ganancias
            derivadas del uso del sistema, salvo negligencia grave comprobada de nuestra parte. Te recomendamos exportar
            respaldos de tu información periódicamente.
          </p>
        </Seccion>

        <Seccion titulo="10. Cambios a estos términos">
          <p>Podemos actualizar estos términos. Los cambios importantes se notificarán en el panel administrativo.</p>
        </Seccion>

        <Seccion titulo="11. Contacto">
          <p>Para dudas sobre estos términos, escríbenos a <a href="mailto:soporte@erpsystem.com" className="text-primary-600 font-semibold">soporte@erpsystem.com</a>.</p>
        </Seccion>
      </div>
    </div>
  );
}
