"use client";

import { useState, type ReactElement } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bath, BedDouble, Car, CheckCircle2, Maximize, MapPin, MessageCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';

import { enviarConsultaPublica, type PropiedadPublica } from '@/services/inmueblesPublicService';
import type { PublicEmpresaInfo } from '@/services/publicCatalogService';
import { etiquetaOperacion, precioDe } from '../../inmobiliaria/CatalogoInmobiliaria';
import { toastApiError } from '@/utils/errors';
import { usd } from '@/components/inmuebles/formato';

const campo = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

export default function DetallePropiedad({ subdominio, propiedad: p, empresa }: { subdominio: string; propiedad: PropiedadPublica; empresa: PublicEmpresaInfo | null }): ReactElement {
  const fotos = p.fotos.length ? p.fotos : p.portada_url ? [{ id: 0, url: p.portada_url, orden: 0, es_portada: true }] : [];
  const [activa, setActiva] = useState(0);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState(`Hola, me interesa "${p.titulo_visible}". ¿Está disponible?`);
  const [trampa, setTrampa] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const whatsapp = empresa?.telefono ? `https://wa.me/${empresa.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, me interesa "${p.titulo_visible}" (${precioDe(p)}).`)}` : null;

  const enviar = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (nombre.trim().length < 2) return void toast.error('Escribe tu nombre.');
    if (telefono.replace(/\D/g, '').length < 7) return void toast.error('Escribe un teléfono válido para poder contactarte.');
    setEnviando(true);
    try {
      await enviarConsultaPublica(subdominio, { unidad: p.id, nombre: nombre.trim(), telefono: telefono.trim(), email: email.trim(), mensaje: mensaje.trim(), sitio_web: trampa });
      setEnviado(true);
    } catch (err) {
      toastApiError(err, 'No pudimos enviar tu consulta. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const datos: { icono: typeof BedDouble; texto: string }[] = [];
  if (p.habitaciones != null) datos.push({ icono: BedDouble, texto: `${p.habitaciones} ${p.habitaciones === 1 ? 'habitación' : 'habitaciones'}` });
  if (p.banos != null) datos.push({ icono: Bath, texto: `${p.banos} ${p.banos === 1 ? 'baño' : 'baños'}` });
  if (p.estacionamientos) datos.push({ icono: Car, texto: `${p.estacionamientos} ${p.estacionamientos === 1 ? 'puesto' : 'puestos'}` });
  if (p.area_construida_m2 || p.area_m2) datos.push({ icono: Maximize, texto: `${Number(p.area_construida_m2 ?? p.area_m2)} m²` });

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-primary-600"><ArrowLeft size={18} /> Ver todas las propiedades</Link>
          <p className="text-sm font-black uppercase text-slate-800 truncate hidden sm:block">{empresa?.nombre_comercial}</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-6 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl overflow-hidden border border-slate-200">
            <div className="aspect-[16/10] bg-slate-100">
              {fotos[activa] ? (
                // eslint-disable-next-line @next/next/no-img-element -- fotos dinámicas del tenant
                <img src={fotos[activa].url} alt={p.titulo_visible} className="w-full h-full object-cover" />
              ) : <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">Sin fotos</div>}
            </div>
            {fotos.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {fotos.map((f, i) => (
                  <button key={f.id} onClick={() => setActiva(i)} className={`shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 ${i === activa ? 'border-primary-600' : 'border-transparent opacity-70 hover:opacity-100'}`} aria-label={`Foto ${i + 1}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- fotos dinámicas del tenant */}
                    <img src={f.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
            <div>
              <span className="text-[11px] font-black uppercase text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg">{etiquetaOperacion(p.operacion)} · {p.tipo_display}</span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3 leading-tight">{p.titulo_visible}</h1>
              {(p.zona || p.ciudad) && <p className="text-slate-500 flex items-center gap-1 mt-1"><MapPin size={16} /> {[p.edificio_nombre, p.zona, p.ciudad].filter(Boolean).join(', ')}</p>}
            </div>
            {datos.length > 0 && <div className="flex flex-wrap gap-3">{datos.map((d) => <span key={d.texto} className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700"><d.icono size={18} className="text-primary-600" /> {d.texto}</span>)}</div>}
            {p.descripcion && <div><h2 className="font-bold text-slate-900 mb-1">Descripción</h2><p className="text-slate-600 whitespace-pre-line">{p.descripcion}</p></div>}
            {p.amenidades.length > 0 && (
              <div><h2 className="font-bold text-slate-900 mb-2">Comodidades</h2><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{p.amenidades.map((a) => <p key={a} className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 size={16} className="text-green-600 shrink-0" /> {a}</p>)}</div></div>
            )}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 self-start">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-1">
            <p className="text-3xl font-black text-slate-900 font-mono">{precioDe(p)}</p>
            {p.operacion === 'alquiler_venta' && p.precio_venta_usd && <p className="text-sm text-slate-500">o en venta por {usd(p.precio_venta_usd)}</p>}
          </div>

          {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-2xl py-3.5 shadow-md"><MessageCircle size={18} /> Consultar por WhatsApp</a>}

          <div className="bg-white rounded-3xl border border-slate-200 p-6">
            {enviado ? (
              <div className="text-center py-4 space-y-2"><CheckCircle2 size={36} className="mx-auto text-green-600" /><p className="font-bold text-slate-900">¡Recibimos tu consulta!</p><p className="text-sm text-slate-500">Te contactaremos muy pronto.</p></div>
            ) : (
              <form onSubmit={enviar} className="space-y-3">
                <p className="font-bold text-slate-900">Me interesa esta propiedad</p>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" className={campo} autoComplete="name" required />
                <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Tu teléfono / WhatsApp" className={campo} inputMode="tel" autoComplete="tel" required />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo (opcional)" className={campo} autoComplete="email" />
                <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={3} maxLength={1000} className={campo} />
                {/* Señuelo anti-bots: invisible para personas. */}
                <input value={trampa} onChange={(e) => setTrampa(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" name="sitio_web" />
                <button type="submit" disabled={enviando} className="w-full bg-primary-600 text-white py-3 rounded-2xl text-sm font-bold hover:bg-primary-700 disabled:opacity-60 flex items-center justify-center gap-2"><Send size={16} /> {enviando ? 'Enviando...' : 'Enviar consulta'}</button>
              </form>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
