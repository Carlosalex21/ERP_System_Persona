"use client";

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Mail, MessageCircle, Phone, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';

import { Badge, Card, EmptyState, PageHeader, TableSkeleton } from '@/components/ui';
import { useSession } from '@/context/SessionContext';
import { actualizarConsulta, getConsultas, type ConsultaPropiedad } from '@/services/inmueblesService';
import { construirLinkWhatsapp } from '@/utils/whatsapp';
import { fechaCorta } from '@/components/inmuebles/formato';
import { toastApiError } from '@/utils/errors';

type Estado = ConsultaPropiedad['estado'];
const TONO: Record<Estado, 'red' | 'amber' | 'slate'> = { nueva: 'red', contactada: 'amber', cerrada: 'slate' };
const TEXTO: Record<Estado, string> = { nueva: 'Nueva', contactada: 'Contactada', cerrada: 'Cerrada' };
const FILTROS: { valor: '' | Estado; texto: string }[] = [{ valor: 'nueva', texto: 'Nuevas' }, { valor: 'contactada', texto: 'Contactadas' }, { valor: 'cerrada', texto: 'Cerradas' }, { valor: '', texto: 'Todas' }];

export default function ConsultasPage(): ReactElement {
  const { tenant } = useSession();
  const [filtro, setFiltro] = useState<'' | Estado>('nueva');
  const [consultas, setConsultas] = useState<ConsultaPropiedad[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async (): Promise<void> => {
    try {
      setConsultas(await getConsultas({ estado: filtro || undefined, ordering: '-fecha_creacion' }));
    } catch (e) {
      toastApiError(e, 'No se pudieron cargar los interesados.');
    } finally {
      setCargando(false);
    }
  }, [filtro]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos externos
  useEffect(() => { void cargar(); }, [cargar]);

  const cambiar = async (c: ConsultaPropiedad, estado: Estado): Promise<void> => {
    try {
      await actualizarConsulta(c.id, { estado });
      void cargar();
    } catch (e) {
      toastApiError(e, 'No se pudo actualizar la consulta.');
    }
  };

  const escribir = (c: ConsultaPropiedad): void => {
    const mensaje = `Hola ${c.nombre.split(' ')[0]}, te escribimos por tu interés en ${c.unidad_titulo || c.unidad_codigo || 'una de nuestras propiedades'}. ¿Cuándo te viene bien para coordinar una visita?`;
    const link = construirLinkWhatsapp(c.telefono, mensaje, tenant?.pais_codigo);
    if (!link) return void toast.error('El teléfono de esta persona no parece válido.');
    window.open(link, '_blank', 'noopener');
    if (c.estado === 'nueva') void cambiar(c, 'contactada');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader icon={<UserRound size={20} />} title="Interesados" description="Personas que preguntaron por tus propiedades desde el catálogo web. Responde rápido: el primero en contestar suele cerrar." />
      <div className="flex gap-2">
        {FILTROS.map((f) => <button key={f.texto} onClick={() => { setCargando(true); setFiltro(f.valor); }} className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${filtro === f.valor ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{f.texto}</button>)}
      </div>

      {cargando ? <TableSkeleton rows={4} /> : consultas.length === 0 ? (
        <EmptyState icon={<UserRound size={28} />} title={filtro === 'nueva' ? 'No tienes consultas nuevas' : 'Sin consultas'} description="Cuando alguien te escriba desde tu catálogo público, aparecerá aquí." />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {consultas.map((c) => (
            <Card key={c.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-bold text-slate-900">{c.nombre}</p><p className="text-xs text-slate-500">{fechaCorta(c.fecha_creacion)} · {c.unidad_titulo || c.unidad_codigo || 'Consulta general'}</p></div>
                <Badge tone={TONO[c.estado]}>{TEXTO[c.estado]}</Badge>
              </div>
              {c.mensaje && <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2">{c.mensaje}</p>}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                {c.telefono && <span className="flex items-center gap-1"><Phone size={13} /> {c.telefono}</span>}
                {c.email && <span className="flex items-center gap-1"><Mail size={13} /> {c.email}</span>}
              </div>
              <div className="flex justify-end gap-2">
                {c.telefono && <button onClick={() => escribir(c)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-700 flex items-center gap-1"><MessageCircle size={14} /> WhatsApp</button>}
                {c.estado === 'nueva' && <button onClick={() => cambiar(c, 'contactada')} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">Marcar contactada</button>}
                {c.estado !== 'cerrada' && <button onClick={() => cambiar(c, 'cerrada')} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">Cerrar</button>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
