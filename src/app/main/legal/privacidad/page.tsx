import type { ReactElement } from 'react';
import Link from 'next/link';

export const metadata = { title: 'Política de Privacidad | ERPSystem' };

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }): ReactElement {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-slate-900 mb-2">{titulo}</h2>
      <div className="text-sm text-slate-600 space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}

export default function PoliticaPrivacidadPage(): ReactElement {
  return (
    <div className="bg-slate-50 min-h-screen py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-black text-slate-900 mb-2">Política de Privacidad</h1>
        <p className="text-xs text-slate-400 mb-10">Última actualización: {new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <Seccion titulo="1. Quiénes somos">
          <p>
            ERPSystem es una plataforma SaaS multi-tenant que permite a negocios (&quot;tenants&quot;) gestionar inventario,
            facturación, punto de venta y un catálogo público de ventas. Cada negocio opera en su propio subdominio
            (ej. <code className="bg-slate-100 px-1 rounded">tunegocio.erpsystem.com</code>) con sus datos aislados del resto de los tenants.
          </p>
        </Seccion>

        <Seccion titulo="2. Qué datos recopilamos">
          <p><strong className="text-slate-800">a) Del dueño del negocio (tenant), al registrarse:</strong> nombre, apellido, correo, usuario, contraseña (almacenada con hash, nunca en texto plano), nombre comercial, país de operación y subdominio elegido.</p>
          <p><strong className="text-slate-800">b) De los empleados que el dueño invita a su panel:</strong> nombre, correo y rol dentro del sistema.</p>
          <p><strong className="text-slate-800">c) De los clientes finales que compran en el catálogo público de un tenant:</strong> nombre, teléfono y dirección de entrega, ingresados voluntariamente al hacer un pedido. Esta información es propiedad y responsabilidad del tenant correspondiente, no nuestra.</p>
          <p><strong className="text-slate-800">d) Datos de facturación de la suscripción:</strong> el método de pago elegido (Pago Móvil, Zelle o tarjeta vía Stripe) y la referencia o comprobante que el propio usuario reporta. No almacenamos números de tarjeta de crédito: los pagos con tarjeta los procesa Stripe directamente y nunca vemos ni guardamos esos datos.</p>
          <p><strong className="text-slate-800">e) Datos técnicos:</strong> dirección IP, tipo de navegador y registros de uso del sistema, usados solo para seguridad (ej. bloqueo por intentos fallidos de inicio de sesión) y diagnóstico de errores.</p>
        </Seccion>

        <Seccion titulo="3. Para qué usamos tus datos">
          <ul className="list-disc pl-5 space-y-1">
            <li>Crear y operar tu cuenta y tu espacio de trabajo (tenant) aislado.</li>
            <li>Procesar y confirmar el pago de tu suscripción.</li>
            <li>Enviarte comunicaciones operativas: confirmaciones, avisos de vencimiento de suscripción, recuperación de contraseña.</li>
            <li>Prevenir fraude y accesos no autorizados (bloqueo temporal tras varios intentos fallidos de inicio de sesión).</li>
            <li>Cumplir obligaciones legales y fiscales aplicables según el país de operación de cada tenant.</li>
          </ul>
          <p>No vendemos tus datos ni los de tus clientes a terceros.</p>
        </Seccion>

        <Seccion titulo="4. Con quién compartimos datos">
          <p>Solo con proveedores estrictamente necesarios para operar el servicio:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-slate-800">Stripe</strong>, para procesar pagos con tarjeta (aplica su propia política de privacidad).</li>
            <li>El proveedor de infraestructura donde corre el sistema (servidores y base de datos).</li>
          </ul>
          <p>No compartimos tus datos con fines publicitarios de terceros.</p>
        </Seccion>

        <Seccion titulo="5. Aislamiento entre negocios (multi-tenant)">
          <p>
            Cada tenant tiene su propio esquema de base de datos, separado técnicamente del resto. El dueño de un negocio
            no puede ver los datos de otro negocio registrado en la plataforma, y nosotros solo accedemos a esos datos
            para brindar soporte técnico o cuando la ley lo exige.
          </p>
        </Seccion>

        <Seccion titulo="6. Cuánto tiempo guardamos tus datos">
          <p>
            Mientras tu cuenta esté activa. Si cancelas tu suscripción y no la renuevas, conservamos tus datos por un
            período razonable por si decides reactivar tu negocio, y luego procedemos a eliminarlos, salvo que la ley
            exija conservar ciertos registros (ej. documentos fiscales) por más tiempo.
          </p>
        </Seccion>

        <Seccion titulo="7. Tus derechos">
          <p>
            Puedes solicitar acceso, corrección o eliminación de tus datos personales escribiéndonos a
            <a href="mailto:soporte@erpsystem.com" className="text-primary-600 font-semibold"> soporte@erpsystem.com</a>.
            Si eres cliente final de uno de nuestros tenants (compraste en su catálogo), debes contactar directamente
            a ese negocio, ya que sus datos de clientes les pertenecen a ellos.
          </p>
        </Seccion>

        <Seccion titulo="8. Cookies">
          <p>
            Usamos cookies esenciales para mantener tu sesión iniciada. Ver el detalle en nuestra{' '}
            <Link href="/legal/cookies" className="text-primary-600 font-semibold">Política de Cookies</Link>.
          </p>
        </Seccion>

        <Seccion titulo="9. Cambios a esta política">
          <p>Si actualizamos esta política de forma significativa, lo notificaremos en el panel administrativo o por correo.</p>
        </Seccion>

        <Seccion titulo="10. Contacto">
          <p>¿Preguntas sobre esta política? Escríbenos a <a href="mailto:soporte@erpsystem.com" className="text-primary-600 font-semibold">soporte@erpsystem.com</a>.</p>
        </Seccion>
      </div>
    </div>
  );
}
