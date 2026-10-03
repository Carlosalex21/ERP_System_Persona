"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { FileText, Home, Link2, Pencil, Plus, ReceiptText, Search, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { Badge, Card, ConfirmDialog, DataTable, EmptyState, PageHeader, StatCard, TableSkeleton } from '@/components/ui';
import { useListaPaginada } from '@/hooks/useListaPaginada';
import {
  eliminarUnidad, getEdificios, getPaginaUnidades, getUnidades, pdfSolvencia, type Edificio, type Unidad,
} from '@/services/inmueblesService';
import { toastApiError } from '@/utils/errors';
import { numero, usd } from '@/components/inmuebles/formato';
import EnlacePortalModal from '@/components/inmuebles/EnlacePortalModal';
import EstadoCuentaModal from '@/components/inmuebles/EstadoCuentaModal';
import UnidadModal from './UnidadModal';
import ImportarUnidadesModal from './ImportarUnidadesModal';

const TONO_ESTADO: Record<string, 'green' | 'slate' | 'amber'> = { ocupada: 'green', disponible: 'slate', mantenimiento: 'amber' };

export default function UnidadesPage(): ReactElement {
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [edificioId, setEdificioId] = useState('');
  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [sumaAlicuotas, setSumaAlicuotas] = useState<number | null>(null);

  const [editando, setEditando] = useState<Unidad | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [importando, setImportando] = useState(false);
  const [aEliminar, setAEliminar] = useState<Unidad | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [estadoCuenta, setEstadoCuenta] = useState<Unidad | null>(null);
  const [portalDe, setPortalDe] = useState<Unidad | null>(null);

  useEffect(() => { getEdificios().then(setEdificios).catch(() => setEdificios([])); }, []);

  // Búsqueda con retardo: no consulta en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(busquedaTexto.trim()), 350);
    return () => clearTimeout(t);
  }, [busquedaTexto]);

  const filtros = useMemo(() => ({ edificio: edificioId || undefined, search: busqueda || undefined }), [edificioId, busqueda]);
  const cargarPagina = useCallback((pagina: number) => getPaginaUnidades(filtros, pagina, 'unidades'), [filtros]);
  const lista = useListaPaginada<Unidad>(cargarPagina);
  const { cargando, error: errorLista } = lista;

  useEffect(() => { if (errorLista) toastApiError(errorLista, 'No se pudieron cargar las unidades.'); }, [errorLista]);

  // Con un edificio elegido se verifica que sus alícuotas sumen 100 (si no, la distribución del mes no cuadra).
  const recalcularAlicuotas = useCallback(async (): Promise<void> => {
    if (!edificioId) return setSumaAlicuotas(null);
    try {
      const unidades = await getUnidades({ edificio: edificioId });
      setSumaAlicuotas(unidades.reduce((acc, u) => acc + Number(u.alicuota), 0));
    } catch {
      setSumaAlicuotas(null);
    }
  }, [edificioId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos externos
  useEffect(() => { void recalcularAlicuotas(); }, [recalcularAlicuotas]);

  const alCambiar = (): void => { void lista.recargar(); void recalcularAlicuotas(); };

  const confirmarEliminar = async (): Promise<void> => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await eliminarUnidad(aEliminar.id);
      toast.success('Unidad desactivada.');
      setAEliminar(null);
      alCambiar();
    } catch (e) {
      toastApiError(e, 'No se pudo desactivar la unidad.');
      setAEliminar(null);
    } finally {
      setEliminando(false);
    }
  };

  const columns = useMemo<ColumnDef<Unidad>[]>(() => [
    {
      accessorKey: 'codigo',
      header: 'Unidad',
      cell: ({ row }) => (
        <div>
          <p className="font-bold text-slate-900">{row.original.codigo}</p>
          <p className="text-[11px] text-slate-400">{row.original.edificio_nombre ?? '—'}</p>
        </div>
      ),
    },
    {
      id: 'propietario',
      header: 'Propietario',
      cell: ({ row }) => (
        <div>
          <p className="text-slate-700 font-medium">{row.original.propietario_nombre ?? <span className="text-amber-600 text-xs font-bold">Sin propietario</span>}</p>
          {row.original.ocupante_nombre && row.original.ocupante !== row.original.propietario && <p className="text-[11px] text-slate-400">Ocupa: {row.original.ocupante_nombre}</p>}
        </div>
      ),
    },
    {
      accessorKey: 'alicuota',
      header: () => <div className="text-right">Alícuota</div>,
      cell: ({ row }) => <div className="text-right font-mono tabular-nums text-slate-600">{numero(row.original.alicuota, 4)} %</div>,
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => <Badge tone={TONO_ESTADO[row.original.estado] ?? 'slate'}>{row.original.estado === 'ocupada' ? 'Ocupada' : row.original.estado === 'disponible' ? 'Disponible' : 'Mantenimiento'}</Badge>,
    },
    {
      id: 'saldo',
      header: () => <div className="text-right">Deuda</div>,
      cell: ({ row }) => {
        const vencido = Number(row.original.vencido_usd);
        const pendiente = Number(row.original.saldo_pendiente_usd);
        return (
          <div className="text-right">
            <p className={`font-mono font-bold tabular-nums ${vencido > 0 ? 'text-red-600' : pendiente > 0 ? 'text-amber-600' : 'text-green-600'}`}>{pendiente > 0 ? usd(pendiente) : 'Al día'}</p>
            {vencido > 0 && <p className="text-[10px] text-red-500 font-bold">{usd(vencido)} vencido</p>}
          </div>
        );
      },
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      cell: ({ row }) => {
        const u = row.original;
        const boton = 'p-2 text-slate-400 hover:text-primary-600 transition-colors';
        return (
          <div className="flex justify-end gap-0.5">
            <button onClick={() => setEstadoCuenta(u)} className={boton} title="Estado de cuenta" aria-label={`Estado de cuenta de ${u.codigo}`}><ReceiptText size={16} /></button>
            <button onClick={() => pdfSolvencia(u.id).catch((e) => toastApiError(e, 'No se pudo generar la solvencia.'))} className={boton} title="Constancia de solvencia" aria-label={`Solvencia de ${u.codigo}`}><ShieldCheck size={16} /></button>
            {u.propietario && <button onClick={() => setPortalDe(u)} className={boton} title="Enlace del portal" aria-label={`Portal de ${u.codigo}`}><Link2 size={16} /></button>}
            <button onClick={() => { setEditando(u); setModalAbierto(true); }} className={boton} title="Editar" aria-label={`Editar ${u.codigo}`}><Pencil size={16} /></button>
            <button onClick={() => setAEliminar(u)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Desactivar" aria-label={`Desactivar ${u.codigo}`}><Trash2 size={16} /></button>
          </div>
        );
      },
    },
  ], []);

  const alicuotasOk = sumaAlicuotas !== null && Math.abs(sumaAlicuotas - 100) <= 0.01;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Home size={20} />}
        title="Unidades y propietarios"
        description="Apartamentos, casas y locales de cada edificio, con su alícuota y su propietario."
        actions={
          <>
            <button onClick={() => setImportando(true)} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Upload size={16} /> Importar CSV</button>
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setEditando(null); setModalAbierto(true); }} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2 shadow-md">
              <Plus size={18} /> Nueva unidad
            </motion.button>
          </>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <select value={edificioId} onChange={(e) => setEdificioId(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white sm:w-64" aria-label="Filtrar por edificio">
          <option value="">Todos los edificios</option>
          {edificios.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busquedaTexto} onChange={(e) => setBusquedaTexto(e.target.value)} placeholder="Buscar por unidad, propietario o inquilino..." className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white" />
        </div>
      </div>

      {edificioId && sumaAlicuotas !== null && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Suma de alícuotas" value={`${numero(sumaAlicuotas, 4)} %`} color={alicuotasOk ? 'bg-green-600' : 'bg-amber-500'} icon={<FileText size={20} />} note={alicuotasOk ? 'Cuadra con el 100 %: ya puedes emitir recibos.' : `Deben sumar 100 %. ${sumaAlicuotas < 100 ? 'Faltan' : 'Sobran'} ${numero(Math.abs(100 - sumaAlicuotas), 4)} %.`} />
        </div>
      )}

      {cargando && lista.items.length === 0 ? (
        <TableSkeleton rows={6} />
      ) : lista.total === 0 && !busqueda && !edificioId ? (
        <EmptyState
          icon={<Home size={28} />}
          title="Aún no hay unidades"
          description="Agrega las unidades de tu edificio una por una o súbelas todas de una vez desde un archivo CSV."
          action={<div className="flex gap-2"><button onClick={() => setImportando(true)} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Upload size={16} /> Importar CSV</button><button onClick={() => { setEditando(null); setModalAbierto(true); }} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2"><Plus size={16} /> Nueva unidad</button></div>}
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable
            columns={columns}
            data={lista.items}
            resultLabel="unidades"
            paginacionServidor={{ pagina: lista.pagina, totalPaginas: lista.totalPaginas, total: lista.total, onCambiarPagina: lista.irAPagina, cargando }}
            emptyState={<div className="p-10 text-center text-sm text-slate-400">Ninguna unidad coincide con la búsqueda.</div>}
          />
        </Card>
      )}

      {modalAbierto && (
        <UnidadModal unidad={editando} edificioInicial={edificioId ? Number(edificioId) : null} edificios={edificios} onClose={() => setModalAbierto(false)} onSaved={() => { setModalAbierto(false); alCambiar(); }} />
      )}
      {importando && <ImportarUnidadesModal edificios={edificios} edificioInicial={edificioId ? Number(edificioId) : null} onClose={() => setImportando(false)} onDone={alCambiar} />}
      {estadoCuenta && <EstadoCuentaModal unidadId={estadoCuenta.id} titulo={`${estadoCuenta.codigo}${estadoCuenta.edificio_nombre ? ` · ${estadoCuenta.edificio_nombre}` : ''}`} onClose={() => setEstadoCuenta(null)} />}
      {portalDe && portalDe.propietario && <EnlacePortalModal clienteId={portalDe.propietario} nombre={portalDe.propietario_nombre ?? 'Propietario'} onClose={() => setPortalDe(null)} />}
      <ConfirmDialog
        isOpen={!!aEliminar}
        title="Desactivar unidad"
        message={`¿Desactivar la unidad "${aEliminar?.codigo}"? Solo es posible si no tiene deudas pendientes. Su historial se conserva.`}
        confirmLabel="Desactivar"
        danger
        loading={eliminando}
        onConfirm={confirmarEliminar}
        onCancel={() => setAEliminar(null)}
      />
    </div>
  );
}
