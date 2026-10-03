"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { CalendarClock, FilePlus2, FileSignature, Play, RefreshCw, Search, Trash2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { ActionButton, AppModal, Badge, Card, ConfirmDialog, DataTable, EmptyState, PageHeader, TableSkeleton } from '@/components/ui';
import { useListaPaginada } from '@/hooks/useListaPaginada';
import { activarContrato, eliminarContrato, getPaginaContratos, renovarContrato, rescindirContrato, type Contrato, type EstadoContrato } from '@/services/inmueblesService';
import { fechaCorta, hoyISO, usd } from '@/components/inmuebles/formato';
import { toastApiError } from '@/utils/errors';
import ContratoModal from './ContratoModal';

type Filtro = '' | EstadoContrato | 'por_vencer';
const TONO: Record<EstadoContrato, 'slate' | 'green' | 'amber' | 'red'> = { borrador: 'slate', vigente: 'green', vencido: 'amber', rescindido: 'red' };
const TEXTO: Record<EstadoContrato, string> = { borrador: 'Borrador', vigente: 'Vigente', vencido: 'Vencido', rescindido: 'Rescindido' };
const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: '', texto: 'Todos' }, { valor: 'vigente', texto: 'Vigentes' }, { valor: 'por_vencer', texto: 'Por vencer (60 días)' }, { valor: 'borrador', texto: 'Borradores' }, { valor: 'vencido', texto: 'Vencidos' }, { valor: 'rescindido', texto: 'Rescindidos' },
];
const campo = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const etiqueta = 'block text-xs font-bold text-slate-500 uppercase mb-1';

type Accion = { tipo: 'activar' | 'rescindir' | 'renovar' | 'eliminar'; contrato: Contrato };

export default function ContratosPage(): ReactElement {
  const [filtro, setFiltro] = useState<Filtro>('');
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [creando, setCreando] = useState(false);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [cobrarDeposito, setCobrarDeposito] = useState(true);
  const [fecha, setFecha] = useState(hoyISO());
  const [motivo, setMotivo] = useState('');
  const [nuevoCanon, setNuevoCanon] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setBusqueda(textoBusqueda.trim()), 350);
    return () => clearTimeout(t);
  }, [textoBusqueda]);

  const filtros = useMemo(() => ({
    search: busqueda || undefined,
    estado: filtro && filtro !== 'por_vencer' ? filtro : undefined,
    por_vencer: filtro === 'por_vencer' ? '60' : undefined,
    ordering: '-fecha_inicio',
  }), [busqueda, filtro]);
  const cargarPagina = useCallback((p: number) => getPaginaContratos(filtros, p), [filtros]);
  const lista = useListaPaginada<Contrato>(cargarPagina);
  useEffect(() => { if (lista.error) toastApiError(lista.error, 'No se pudieron cargar los contratos.'); }, [lista.error]);

  const abrirAccion = (tipo: Accion['tipo'], contrato: Contrato): void => {
    setAccion({ tipo, contrato });
    setCobrarDeposito(true);
    setMotivo('');
    setFecha(tipo === 'renovar' ? (() => { const [a, m, d] = contrato.fecha_fin.split('-').map(Number); const f = new Date(a + 1, m - 1, d); return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`; })() : hoyISO());
    setNuevoCanon('');
  };

  const ejecutar = async (): Promise<void> => {
    if (!accion) return;
    const { tipo, contrato } = accion;
    setProcesando(true);
    try {
      if (tipo === 'activar') { await activarContrato(contrato.id, cobrarDeposito); toast.success('Contrato activado: ya se generaron los cobros mensuales.'); }
      if (tipo === 'rescindir') { await rescindirContrato(contrato.id, { fecha, motivo: motivo.trim() }); toast.success('Contrato rescindido; se cancelaron los cobros futuros.'); }
      if (tipo === 'renovar') { await renovarContrato(contrato.id, { nueva_fecha_fin: fecha, nuevo_canon: nuevoCanon ? String(nuevoCanon) : null }); toast.success('Contrato renovado.'); }
      if (tipo === 'eliminar') { await eliminarContrato(contrato.id); toast.success('Borrador eliminado.'); }
      setAccion(null);
      void lista.recargar();
    } catch (e) {
      toastApiError(e, 'No se pudo completar la acción.');
    } finally {
      setProcesando(false);
    }
  };

  const columnas = useMemo<ColumnDef<Contrato>[]>(() => [
    { header: 'Propiedad', cell: ({ row }) => <div><p className="font-bold text-slate-800">{row.original.unidad_codigo}</p><p className="text-[11px] text-slate-400">{row.original.edificio_nombre ?? row.original.propietario_nombre ?? ''}</p></div> },
    { header: 'Inquilino', cell: ({ row }) => <span className="text-slate-700">{row.original.inquilino_nombre}</span> },
    { header: 'Vigencia', cell: ({ row }) => <div><p className="text-slate-700">{fechaCorta(row.original.fecha_inicio)} → {fechaCorta(row.original.fecha_fin)}</p>{row.original.estado === 'vigente' && row.original.dias_para_vencer != null && row.original.dias_para_vencer <= 60 && <p className="text-[11px] font-bold text-amber-600">Vence en {row.original.dias_para_vencer} días</p>}</div> },
    { header: 'Canon', cell: ({ row }) => <span className="font-mono tabular-nums font-bold text-slate-900">{usd(row.original.canon_usd)}</span> },
    { header: 'Estado', cell: ({ row }) => <Badge tone={TONO[row.original.estado]}>{TEXTO[row.original.estado]}</Badge> },
    {
      id: 'acciones', header: '',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex justify-end gap-1">
            {c.estado === 'borrador' && <button onClick={() => abrirAccion('activar', c)} className="px-2.5 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-1"><Play size={12} /> Activar</button>}
            {(c.estado === 'vigente' || c.estado === 'vencido') && <button onClick={() => abrirAccion('renovar', c)} className="p-2 text-slate-400 hover:text-primary-600" title="Renovar" aria-label="Renovar"><RefreshCw size={16} /></button>}
            {c.estado === 'vigente' && <button onClick={() => abrirAccion('rescindir', c)} className="p-2 text-slate-400 hover:text-red-500" title="Rescindir" aria-label="Rescindir"><XCircle size={16} /></button>}
            {c.estado === 'borrador' && <button onClick={() => abrirAccion('eliminar', c)} className="p-2 text-slate-400 hover:text-red-500" title="Eliminar borrador" aria-label="Eliminar"><Trash2 size={16} /></button>}
          </div>
        );
      },
    },
  ], []);

  const titulo = accion ? { activar: 'Activar contrato', rescindir: 'Rescindir contrato', renovar: 'Renovar contrato', eliminar: 'Eliminar borrador' }[accion.tipo] : '';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<FileSignature size={20} />}
        title="Contratos de alquiler"
        description="Cada contrato vigente genera su canon todos los meses y te avisa cuando está por vencer."
        actions={<motion.button whileTap={{ scale: 0.96 }} onClick={() => setCreando(true)} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2 shadow-md"><FilePlus2 size={18} /> Nuevo contrato</motion.button>}
      />

      <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => <button key={f.valor} onClick={() => setFiltro(f.valor)} className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${filtro === f.valor ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{f.valor === 'por_vencer' && <CalendarClock size={12} className="inline mr-1 -mt-0.5" />}{f.texto}</button>)}
        </div>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={textoBusqueda} onChange={(e) => setTextoBusqueda(e.target.value)} placeholder="Buscar por propiedad, inquilino o propietario..." className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white" />
        </div>
      </div>

      {lista.cargando && lista.items.length === 0 ? (
        <TableSkeleton rows={5} />
      ) : lista.total === 0 && !busqueda && !filtro ? (
        <EmptyState icon={<FileSignature size={28} />} title="Aún no hay contratos" description="Crea el primer contrato de alquiler: eliges la propiedad y el inquilino, y el sistema genera los cobros de cada mes." action={<button onClick={() => setCreando(true)} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2"><FilePlus2 size={16} /> Nuevo contrato</button>} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable columns={columnas} data={lista.items} resultLabel="contratos"
            paginacionServidor={{ pagina: lista.pagina, totalPaginas: lista.totalPaginas, total: lista.total, onCambiarPagina: lista.irAPagina, cargando: lista.cargando }}
            emptyState={<div className="p-10 text-center text-sm text-slate-400">Ningún contrato coincide con el filtro.</div>} />
        </Card>
      )}

      {creando && <ContratoModal onClose={() => setCreando(false)} onSaved={() => { setCreando(false); void lista.recargar(); }} />}

      {accion && accion.tipo === 'eliminar' ? (
        <ConfirmDialog isOpen title={titulo} message={`¿Eliminar el borrador de ${accion.contrato.unidad_codigo}?`} confirmLabel="Eliminar" danger loading={procesando} onConfirm={ejecutar} onCancel={() => setAccion(null)} />
      ) : accion && (
        <AppModal isOpen onClose={() => setAccion(null)} title={titulo} icon={<FileSignature size={20} />} size="md"
          footer={<><ActionButton variant="secondary" onClick={() => setAccion(null)}>Cancelar</ActionButton><ActionButton variant={accion.tipo === 'rescindir' ? 'danger' : 'primary'} onClick={ejecutar} loading={procesando}>{accion.tipo === 'activar' ? 'Activar' : accion.tipo === 'renovar' ? 'Renovar' : 'Rescindir'}</ActionButton></>}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{accion.contrato.unidad_codigo} · {accion.contrato.inquilino_nombre} · {usd(accion.contrato.canon_usd)}/mes</p>
            {accion.tipo === 'activar' && (
              <>
                <p className="text-sm text-slate-500">Se generará un cobro de canon por cada mes del contrato{Number(accion.contrato.deposito_usd) > 0 ? ' y el cobro del depósito' : ''}.</p>
                {Number(accion.contrato.deposito_usd) > 0 && <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={cobrarDeposito} onChange={(e) => setCobrarDeposito(e.target.checked)} className="rounded border-slate-300 text-primary-600" /> Cobrar el depósito de {usd(accion.contrato.deposito_usd)}</label>}
              </>
            )}
            {accion.tipo === 'rescindir' && (
              <>
                <div><label className={etiqueta}>Fecha de rescisión</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} /></div>
                <div><label className={etiqueta}>Motivo</label><input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={campo} /></div>
                <p className="text-xs text-slate-400">Los cobros posteriores a esa fecha que no tengan pagos se cancelan.</p>
              </>
            )}
            {accion.tipo === 'renovar' && (
              <>
                <p className="text-sm text-slate-500">El nuevo contrato empieza el día siguiente al fin del actual ({fechaCorta(accion.contrato.fecha_fin)}).</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={etiqueta}>Nueva fecha de fin</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} /></div>
                  <div><label className={etiqueta}>Nuevo canon (USD)</label><input type="number" min={0} step="0.01" value={nuevoCanon} onChange={(e) => setNuevoCanon(e.target.value)} className={campo} placeholder="Igual al actual" /></div>
                </div>
              </>
            )}
          </div>
        </AppModal>
      )}
    </div>
  );
}
