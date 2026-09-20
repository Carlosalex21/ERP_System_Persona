import { ArrowRight, Store, Smartphone, BarChart3, ShieldCheck, Package, Globe, TrendingUp, AlertTriangle, Clock, FileWarning, ShoppingCart, DollarSign, CreditCard, Wallet, Banknote, Check, MapPin, Search, Zap, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Reveal from '@/components/marketing/Reveal';
import FloatingChip from '@/components/marketing/FloatingChip';
import MarqueeBar from '@/components/marketing/MarqueeBar';
import ProductDemo from '@/components/marketing/ProductDemo';
import CursorGlow from '@/components/marketing/CursorGlow';
import MagneticButton from '@/components/marketing/MagneticButton';
import StatsStrip from '@/components/marketing/StatsStrip';
import LiveDemoButton from '@/components/marketing/LiveDemoButton';
import LiveCatalogWindow from '@/components/marketing/LiveCatalogWindow';
import RealDemoMedia from '@/components/marketing/RealDemoMedia';

const GRID_BG =
  'bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:44px_44px]';

export default function LandingPage() {
  return (
    <div className="bg-white text-slate-900 overflow-x-clip">
      {/* 1. HERO */}
      <CursorGlow className={`bg-ink-950 pt-20 pb-24 overflow-hidden ${GRID_BG}`} color="rgba(45,86,234,0.4)">
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary-600 rounded-full blur-[110px] opacity-30 pointer-events-none" />
        <div className="absolute -top-32 -right-16 w-96 h-96 bg-accent-500 rounded-full blur-[130px] opacity-20 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <Reveal from="down">
            <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-slate-200 text-xs font-bold px-4 py-1.5 rounded-full backdrop-blur-sm mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Tu tienda online lista en minutos
            </span>
          </Reveal>

          {/* Titular escultural: Unbounded muy grueso y muy compacto. */}
          <div className="relative">
            <Reveal delay={0.05}>
              <h1 className="font-display font-black text-[13vw] leading-[0.86] sm:text-7xl md:text-8xl lg:text-[7rem] tracking-tight text-white text-balance uppercase">
                Vende <span className="text-accent-400">sin</span><br />el caos
              </h1>
            </Reveal>

            <FloatingChip icon={<DollarSign size={13} />} label="Multi-moneda" color="accent" className="left-[6%] top-[8%]" rotate={-8} />
            <FloatingChip icon={<Zap size={13} />} label="Fiscal automático" color="primary" className="right-[2%] top-[18%]" rotate={7} delayed />
            <FloatingChip icon={<Sparkles size={13} />} label="Catálogo online" color="emerald" className="left-[2%] bottom-[4%]" rotate={5} />
          </div>

          <Reveal delay={0.15}>
            <p className="mt-8 text-lg text-slate-400 max-w-2xl mx-auto mb-10">
              Inventario, ventas, facturación e impuestos configurados automáticamente según
              dónde operas. Un solo panel, tu propia tienda pública, cero hojas de cálculo.
            </p>
          </Reveal>

          <Reveal delay={0.22}>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <MagneticButton>
                <Link
                  href="/planes"
                  className="group bg-accent-400 text-ink-950 px-8 py-4 rounded-full font-bold text-base shadow-lg shadow-accent-900/20 hover:bg-accent-300 transition-colors flex items-center justify-center gap-2"
                >
                  Ver Planes y Precios <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </MagneticButton>
              <MagneticButton>
                <Link
                  href="/#demo"
                  className="bg-white/5 text-white border border-white/15 px-8 py-4 rounded-full font-bold text-base hover:bg-white/10 transition-colors flex items-center justify-center backdrop-blur-sm"
                >
                  Ver el sistema en acción
                </Link>
              </MagneticButton>
            </div>
          </Reveal>
        </div>

        {/* Mockup animado del producto -- simula a alguien navegando el sistema. */}
        <Reveal delay={0.3} from="scale">
          <div id="demo" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 mt-16 scroll-mt-24">
            <ProductDemo />
            <div className="mt-8 flex flex-col items-center gap-2">
              <MagneticButton>
                <LiveDemoButton className="group bg-white text-ink-950 px-8 py-4 rounded-full font-bold text-base shadow-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
                  Probar demo en vivo <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </LiveDemoButton>
              </MagneticButton>
              <p className="text-xs text-slate-500">El panel real, con datos de ejemplo -- sin registrarte.</p>
            </div>
          </div>
        </Reveal>
      </CursorGlow>

      {/* 2. BARRA DE CONFIANZA -- marquesina infinita */}
      <section className="bg-accent-400 text-ink-950 py-5 border-y-2 border-ink-950/5 overflow-hidden">
        <MarqueeBar items={['Retail', 'Ferretería', 'Restaurante', 'Mayorista', 'Boutique', 'Farmacia', 'Panadería', 'Distribuidora']} />
      </section>

      {/* 2.5 PRUEBA SOCIAL -- números reales/verificables, sin testimonios inventados */}
      <StatsStrip />

      {/* 3. ¿TE SUENA FAMILIAR? */}
      <section className="bg-ink-950 py-24 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-14">
              <span className="inline-block bg-white/5 border border-white/10 text-slate-300 text-[11px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
                ¿Te suena familiar?
              </span>
              <h2 className="font-display font-extrabold text-4xl md:text-5xl leading-[0.95] text-white text-balance uppercase">
                No estás solo
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <FileWarning size={20} />, quote: 'Tengo inventario que no sé si existe', desc: 'Anotas en cuadernos, en el celular, en la cabeza. Y al final, nada cuadra.' },
              { icon: <AlertTriangle size={20} />, quote: 'El Excel se me volvió imposible', desc: 'Fórmulas que se rompen, columnas que se borran, versiones que nadie entiende.' },
              { icon: <TrendingUp size={20} />, quote: 'No sé si estoy ganando o perdiendo', desc: 'Vendes todo el día pero a fin de mes no sabes dónde quedó la ganancia.' },
              { icon: <Clock size={20} />, quote: 'Se me va el día en cuentas', desc: 'En vez de vender y crecer, terminas cuadrando pagos y facturas a mano.' },
            ].map((p, i) => (
              <Reveal key={p.quote} delay={i * 0.08}>
                <PainCard icon={p.icon} quote={p.quote} desc={p.desc} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4. MÓDULO: POS */}
      <ModuleSection
        id="pos"
        eyebrow="Punto de venta"
        title="Cobra en segundos, en la moneda que sea"
        desc="El POS calcula base imponible, impuesto y total mientras escribes -- no al guardar. Acepta múltiples métodos de pago y muestra el vuelto en moneda base al instante."
        bullets={['Cálculo fiscal en tiempo real, no solo al confirmar', 'Cobros en efectivo, tarjeta o transferencia', 'Corte de caja y correlativo de factura automáticos']}
        align="left"
        band="white"
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5 rotate-1 hover:rotate-0 transition-transform duration-300">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Resumen del pedido</p>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm"><span className="text-slate-600">2x Camisa talla M</span><span className="font-bold text-slate-800">$24.00</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-600">1x Pantalón</span><span className="font-bold text-slate-800">$18.50</span></div>
          </div>
          <div className="border-t border-dashed border-slate-200 pt-3 space-y-1 mb-4">
            <div className="flex justify-between text-xs text-slate-400"><span>Base imponible</span><span>$35.72</span></div>
            <div className="flex justify-between text-xs text-slate-400"><span>IVA (16%)</span><span>$6.78</span></div>
            <div className="flex justify-between text-base font-black text-slate-900"><span>Total</span><span>$42.50</span></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <PayBtn icon={<Banknote size={16} />} label="Efectivo" active />
            <PayBtn icon={<CreditCard size={16} />} label="Tarjeta" />
            <PayBtn icon={<Wallet size={16} />} label="Transfer." />
          </div>
        </div>
      </ModuleSection>

      {/* 5. MÓDULO: INVENTARIO */}
      <ModuleSection
        id="inventario"
        eyebrow="Inventario"
        title="Stock que refleja la realidad, no un cuaderno"
        desc="Productos simples y con variantes (talla, color), alertas de bajo stock automáticas, y el mismo número que ves en el panel es el que ve tu catálogo público."
        bullets={['Variantes ilimitadas por producto', 'Alertas de stock bajo y agotado en tiempo real', 'Un solo número de stock: panel y tienda pública sincronizados']}
        align="right"
        band="tint"
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden -rotate-1 hover:rotate-0 transition-transform duration-300">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 text-slate-400">
            <Search size={14} /><span className="text-xs">Buscar producto...</span>
          </div>
          <div className="divide-y divide-slate-100">
            <InvRow nombre="Camisa Oxford" sku="CAM-001" stock={42} estado="ok" />
            <InvRow nombre="Pantalón Chino" sku="PAN-014" stock={4} estado="bajo" />
            <InvRow nombre="Zapatos Cuero" sku="ZAP-022" stock={0} estado="agotado" />
          </div>
        </div>
      </ModuleSection>

      {/* 6. MÓDULO: FISCAL MULTI-PAÍS */}
      <ModuleSection
        id="fiscal"
        eyebrow="Fiscal multi-país"
        title="Tus impuestos, resueltos desde el primer clic"
        desc="Elige tu país al registrarte y el sistema configura la moneda base y el motor de impuestos correcto -- sin plantillas genéricas ni configuración manual."
        bullets={['Motor de impuestos por país (IVA/IGV) ya resuelto', 'Moneda base y tasa de cambio configuradas al alta', 'Arquitectura lista para sumar más países sin tocar el core']}
        align="left"
        band="white"
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5 rotate-1 hover:rotate-0 transition-transform duration-300">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">País de operación</p>
          <div className="grid grid-cols-3 gap-2 mb-5">
            <CountryPill nombre="Venezuela" activo />
            <CountryPill nombre="Colombia" />
            <CountryPill nombre="Perú" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary-50 border border-primary-100">
              <span className="text-sm font-bold text-primary-800">Moneda base</span>
              <span className="text-sm font-mono font-black text-primary-700">Bs. (VES)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-sm font-bold text-slate-700">IVA General</span>
              <span className="text-sm font-mono font-black text-slate-700">16%</span>
            </div>
          </div>
        </div>
      </ModuleSection>

      {/* 7. MÓDULO: CATÁLOGO PÚBLICO -- el diferenciador */}
      <ModuleSection
        id="catalogo"
        eyebrow="El diferenciador"
        title="Tu propia tienda online, sincronizada en tiempo real"
        desc="Cada plan incluye un subdominio público donde tus clientes ven el catálogo alimentado directo desde tu inventario -- el mismo stock, el mismo precio, sin doble carga de datos."
        bullets={['tunegocio.erpsystem.com listo desde el primer día', 'Stock disponible real (descuenta reservas automáticamente)', 'Pedidos del catálogo público llegan directo a tu panel']}
        align="right"
        band="tint"
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden -rotate-1 hover:rotate-0 transition-transform duration-300">
          <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 border-b border-slate-200">
            <MapPin size={12} className="text-slate-400" />
            <span className="text-[10px] font-mono text-slate-500">tunegocio.erpsystem.com</span>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4">
            <CatalogCard nombre="Camisa Oxford" precio="$18.00" />
            <CatalogCard nombre="Pantalón Chino" precio="$22.50" agotado />
          </div>
        </div>
      </ModuleSection>

      {/* 7.5 MÍRALO EN ACCIÓN -- una grabación real del panel administrativo
          (no un mockup dibujado, ver `RealDemoMedia`) y el catálogo público
          incrustado en vivo (`LiveCatalogWindow`, mismo tenant demo que usa
          el botón "Probar demo en vivo" del hero). */}
      <section className={`relative bg-ink-950 py-24 overflow-hidden ${GRID_BG}`}>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-primary-700 rounded-full blur-[150px] opacity-20 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <Reveal>
            <div className="text-center mb-14">
              <span className="inline-block bg-white/5 border border-white/10 text-slate-300 text-[11px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
                Míralo en acción
              </span>
              <h2 className="font-display font-extrabold text-4xl md:text-5xl leading-[0.95] text-white text-balance uppercase">
                Así se ve <span className="text-accent-400">por dentro</span>
              </h2>
              <p className="mt-4 text-slate-400 max-w-xl mx-auto">
                Dos demos que se recorren solas -- o dale play/pausa y las flechas para explorarlas a tu ritmo.
              </p>
            </div>
          </Reveal>

          {/* Apiladas a ancho completo (no lado a lado): la grabación real
              tiene una relación de aspecto bien ancha (todo el escritorio,
              sidebar + contenido + carrito en una sola toma) -- forzarla a
              un recuadro más cuadrado como el del catálogo la recortaba y
              se perdían justo el sidebar y el carrito. A ancho completo
              cabe sin recortar (ver `aspect-[1536/639]` en `RealDemoMedia`). */}
          <div className="space-y-14">
            <Reveal from="left">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center shrink-0">
                    <BarChart3 size={16} />
                  </span>
                  <div>
                    <p className="font-bold text-white text-sm">Panel administrativo</p>
                    <p className="text-xs text-slate-400">Dashboard, POS, inventario y pedidos</p>
                  </div>
                </div>
                <RealDemoMedia />
              </div>
            </Reveal>

            <Reveal from="right" delay={0.1}>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-8 h-8 rounded-lg bg-accent-500 text-ink-950 flex items-center justify-center shrink-0">
                    <Store size={16} />
                  </span>
                  <div>
                    <p className="font-bold text-white text-sm">Catálogo público</p>
                    <p className="text-xs text-slate-400">Lo que ve y compra tu cliente final</p>
                  </div>
                </div>
                <LiveCatalogWindow />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 8. CARACTERÍSTICAS */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="font-display font-extrabold text-4xl md:text-5xl leading-[0.95] text-slate-900 uppercase">Todo para vender más</h2>
              <p className="mt-4 text-lg text-slate-500">Diseñado para ser fácil de usar, tanto para ti como para tus clientes.</p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: <Store size={28} />, color: 'bg-primary-100 text-primary-600', title: 'Subdominio Propio', desc: 'Tu tienda vivirá en tumarca.erpsystem.com, dándote presencia profesional al instante.' },
              { icon: <Smartphone size={28} />, color: 'bg-emerald-100 text-emerald-600', title: 'Pedidos por WhatsApp', desc: 'Tus clientes arman su carrito y te envían la orden formateada directo a tu WhatsApp.' },
              { icon: <BarChart3 size={28} />, color: 'bg-accent-100 text-accent-700', title: 'Reportes en tiempo real', desc: 'Panel privado para ver tus ventas, inventario y facturación al instante.' },
              { icon: <Package size={28} />, color: 'bg-sky-100 text-sky-600', title: 'Catálogo autogestionable', desc: 'Carga productos, variantes y categorías sin límites y publica al instante.' },
              { icon: <Globe size={28} />, color: 'bg-primary-100 text-primary-600', title: 'Fiscalidad multi-país', desc: 'Moneda base e impuestos (IVA/IGV) configurados automáticamente según tu país.' },
              { icon: <ShieldCheck size={28} />, color: 'bg-slate-100 text-slate-600', title: '100% Seguro', desc: 'Tus datos están aislados y seguros. Nadie más tiene acceso a tu información.' },
            ].map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.08}>
                <FeatureCard icon={f.icon} color={f.color} title={f.title} desc={f.desc} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 9. CÓMO FUNCIONA */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="font-display font-extrabold text-4xl md:text-5xl leading-[0.95] text-slate-900 uppercase">3 simples pasos</h2>
              <p className="mt-4 text-lg text-slate-500">Sin conocimientos técnicos.</p>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { numero: '1', icon: <Globe size={22} />, titulo: 'Elige tu país y plan', desc: 'Tu moneda base e impuestos se configuran automáticamente.' },
              { numero: '2', icon: <Store size={22} />, titulo: 'Elige tu modelo', desc: 'Detallista (retail) o mayorista/fabricante (B2B).' },
              { numero: '3', icon: <ShoppingCart size={22} />, titulo: 'Sube tu catálogo', desc: 'Carga productos y publica tu tienda con tu subdominio.' },
            ].map((s, i) => (
              <Reveal key={s.numero} delay={i * 0.1}>
                <StepCard {...s} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 10. CTA FINAL */}
      <section className={`relative bg-ink-950 py-24 overflow-hidden ${GRID_BG}`}>
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-primary-700 blur-[100px] opacity-40" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-accent-500 blur-[100px] opacity-20" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <Reveal>
            <h2 className="font-display font-black text-4xl sm:text-6xl md:text-7xl leading-[0.9] text-white mb-8 text-balance uppercase">
              Digitaliza <span className="text-accent-400">ya</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-xl text-slate-400 mb-10">
              Únete a los negocios que ya están ahorrando tiempo y aumentando sus ventas.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <MagneticButton strength={18}>
              <Link
                href="/planes"
                className="inline-flex items-center gap-2 bg-accent-400 text-ink-950 px-10 py-4 rounded-full font-bold text-lg shadow-xl shadow-accent-900/20 hover:bg-accent-300 transition-colors"
              >
                Crear mi tienda ahora <ArrowRight size={20} />
              </Link>
            </MagneticButton>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

function PainCard({ icon, quote, desc }: { icon: React.ReactNode; quote: string; desc: string }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.06] hover:-translate-y-1 transition-all">
      <div className="w-10 h-10 rounded-full bg-primary-500/20 text-primary-300 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-bold text-white text-sm mb-2">&ldquo;{quote}&rdquo;</h3>
      <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
    </div>
  );
}

function FeatureCard({ icon, color, title, desc }: { icon: React.ReactNode; color: string; title: string; desc: string }) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-100 hover:shadow-xl transition-all hover:-translate-y-1">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${color}`}>{icon}</div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600">{desc}</p>
    </div>
  );
}

function StepCard({ numero, icon, titulo, desc }: { numero: string; icon: React.ReactNode; titulo: string; desc: string }) {
  return (
    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 text-center relative overflow-hidden">
      <span className="font-display absolute top-2 right-4 text-6xl font-black text-slate-200 select-none">{numero}</span>
      <div className="w-14 h-14 bg-primary-600 text-white rounded-xl flex items-center justify-center mx-auto mb-6 relative z-10">{icon}</div>
      <h3 className="text-lg font-bold text-slate-900 mb-2 relative z-10">{titulo}</h3>
      <p className="text-sm text-slate-500 relative z-10">{desc}</p>
    </div>
  );
}

function ModuleSection({
  id,
  eyebrow,
  title,
  desc,
  bullets,
  align,
  band,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  desc: string;
  bullets: string[];
  align: 'left' | 'right';
  band: 'white' | 'tint';
  children: React.ReactNode;
}) {
  const textFirst = align === 'left';
  return (
    <section id={id} className={`py-20 border-t border-slate-100 scroll-mt-16 ${band === 'tint' ? 'bg-primary-50/40' : 'bg-white'}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <Reveal from={textFirst ? 'left' : 'right'} className={textFirst ? 'lg:order-1' : 'lg:order-2'}>
          <span className="inline-block text-primary-600 text-xs font-bold uppercase tracking-widest mb-3">{eyebrow}</span>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl leading-[0.98] text-slate-900 mb-4 text-balance">{title}</h2>
          <p className="text-slate-600 mb-6">{desc}</p>
          <ul className="space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={12} strokeWidth={3} />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal from="scale" delay={0.1} className={textFirst ? 'lg:order-2' : 'lg:order-1'}>
          {children}
        </Reveal>
      </div>
    </section>
  );
}

function PayBtn({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[10px] font-bold ${active ? 'bg-primary-600 border-primary-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
      {icon}
      {label}
    </div>
  );
}

function InvRow({ nombre, sku, stock, estado }: { nombre: string; sku: string; stock: number; estado: 'ok' | 'bajo' | 'agotado' }) {
  const badge = {
    ok: { text: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: `${stock} und.` },
    bajo: { text: 'bg-accent-50 text-accent-700 border-accent-200', label: `${stock} und.` },
    agotado: { text: 'bg-red-50 text-red-600 border-red-200', label: 'Agotado' },
  }[estado];
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <p className="text-sm font-bold text-slate-800">{nombre}</p>
        <p className="text-[10px] font-mono text-slate-400">{sku}</p>
      </div>
      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${badge.text}`}>{badge.label}</span>
    </div>
  );
}

function CountryPill({ nombre, activo }: { nombre: string; activo?: boolean }) {
  return (
    <div className={`text-center py-2.5 rounded-xl border text-xs font-bold ${activo ? 'bg-primary-600 border-primary-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
      {nombre}
    </div>
  );
}

function CatalogCard({ nombre, precio, agotado }: { nombre: string; precio: string; agotado?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className={`h-16 flex items-center justify-center ${agotado ? 'bg-slate-100' : 'bg-primary-50'}`}>
        <Package size={22} className={agotado ? 'text-slate-300' : 'text-primary-300'} />
      </div>
      <div className="p-2.5">
        <p className="text-[11px] font-bold text-slate-800 truncate">{nombre}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs font-black text-slate-900">{precio}</span>
          {agotado && <span className="text-[8px] font-bold text-red-500 uppercase">Agotado</span>}
        </div>
      </div>
    </div>
  );
}
