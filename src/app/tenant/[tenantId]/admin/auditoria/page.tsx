"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ShieldCheck, Search, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getPaginaAuditoria, type FiltrosAuditoria } from '@/services/auditoriaService';
import { useListaPaginada } from '@/hooks/useListaPaginada';
import { toastApiError } from '@/utils/errors';
import { getHistorialAccesos, type IntentoLogin } from '@/services/authService';
import { DataTable, PageHeader, Card, Badge, TableSkeleton } from '@/components/ui';
import type { RegistroAuditoria } from '@/types/api';
import CambiosModal from './CambiosModal';

const MODELOS: { value: string; label: string }[] = [
  { value: 'Factura', label: 'Facturas' },
  { value: 'Detallefactura', label: 'Líneas de factura' },
  { value: 'NotaCredito', label: 'Notas de crédito' },
  { value: 'NotaDebito', label: 'Notas de débito' },
  { value: 'Retencion', label: 'Retenciones' },
  { value: 'Transaccionpago', label: 'Pagos (POS)' },
  { value: 'TransaccionPasarela', label: 'Pagos (catálogo público)' },
  { value: 'MetodoPago', label: 'Métodos de pago' },
  { value: 'Producto', label: 'Productos' },
  { value: 'Variacionproducto', label: 'Variantes de producto' },
  { value: 'Cliente', label: 'Clientes' },
  { value: 'Proveedor', label: 'Proveedores' },
  { value: 'ConfiguracionEmpresa', label: 'Datos de la empresa' },
  { value: 'ConfiguracionCorrelativo', label: 'Numeración de facturas' },
];

const ACCIONES: { value: string; label: string; tone: 'green' | 'amber' | 'red' | 'slate' }[] = [
  { value: 'crear', label: 'Creación', tone: 'green' },
  { value: 'actualizar', label: 'Actualización', tone: 'amber' },
  { value: 'eliminar', label: 'Baja / eliminación', tone: 'red' },
  { value: 'reactivar', label: 'Reactivación', tone: 'slate' },
];

function accionTone(accion: string): 'green' | 'amber' | 'red' | 'slate' {
  return ACCIONES.find((a) => a.value === accion)?.tone ?? 'slate';
}

function accionLabel(accion: string): string {
  return ACCIONES.find((a) => a.value === accion)?.label ?? accion;
}

/**
 * Página de auditoría: quién hizo qué cambio, cuándo, y con qué valores
 * antes/después. Pensada para poder responder a una fiscalización (SENIAT,
 * DIAN, SUNAT) mostrando la trazabilidad completa del sistema.
 */
export default function AuditoriaPage(): ReactElement {
  const [tab, setTab] = useState<'cambios' | 'accesos'>('cambios');
  const [modelo, setModelo] = useState('');
  const [accion, setAccion] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [q, setQ] = useState('');
  const [seleccionado, setSeleccionado] = useState<RegistroAuditoria | null>(null);

  // Los selects y las fechas filtran al cambiar; el texto libre, con Enter o la
  // lupa (`qAplicado`), para no consultar en cada tecla. Los filtros se derivan
  // (no se guardan aparte): mismo contenido = mismo objeto = sin consulta extra.
  const [qAplicado, setQAplicado] = useState('');
  const filtros = useMemo<FiltrosAuditoria>(() => {
    const f: FiltrosAuditoria = {};
    if (modelo) f.modelo = modelo;
    if (accion) f.accion = accion;
    if (fechaDesde) f.fecha_desde = fechaDesde;
    if (fechaHasta) f.fecha_hasta = fechaHasta;
    if (qAplicado.trim()) f.q = qAplicado.trim();
    return f;
  }, [modelo, accion, fechaDesde, fechaHasta, qAplicado]);
  const aplicar = useCallback(() => setQAplicado(q), [q]);

  const cargarPagina = useCallback((pagina: number) => getPaginaAuditoria(filtros, pagina), [filtros]);
  const lista = useListaPaginada(cargarPagina);
  const registros = lista.items;
  const cargando = lista.cargando;

  useEffect(() => {
    if (lista.error) toastApiError(lista.error, 'No se pudo cargar el registro de auditoría.');
  }, [lista.error]);

  const [accesos, setAccesos] = useState<IntentoLogin[]>([]);
  const [cargandoAccesos, setCargandoAccesos] = useState(false);
  const [accesosCargados, setAccesosCargados] = useState(false);

  useEffect(() => {
    if (tab !== 'accesos' || accesosCargados) return;
    setCargandoAccesos(true);
    getHistorialAccesos()
      .then((data) => { setAccesos(data); setAccesosCargados(true); })
      .catch(() => toast.error('No se pudo cargar el historial de accesos.'))
      .finally(() => setCargandoAccesos(false));
  }, [tab, accesosCargados]);

  const columns = useMemo<ColumnDef<RegistroAuditoria>[]>(() => [
    {
      accessorKey: 'fecha',
      header: 'Fecha',
      cell: ({ row }) => (
        <span className="text-slate-600 text-xs whitespace-nowrap">
          {new Date(row.original.fecha).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      ),
    },
    {
      accessorKey: 'usuario_nombre',
      header: 'Usuario',
      cell: ({ row }) => <span className="text-slate-700 font-medium">{row.original.usuario_nombre || 'Sistema'}</span>,
    },
    {
      accessorKey: 'accion',
      header: 'Acción',
      cell: ({ row }) => <Badge tone={accionTone(row.original.accion)}>{accionLabel(row.original.accion)}</Badge>,
    },
    {
      accessorKey: 'modelo',
      header: 'Modelo',
      enableSorting: false,
      cell: ({ row }) => <span className="text-xs font-mono text-slate-500">{row.original.modelo}</span>,
    },
    {
      accessorKey: 'objeto_repr',
      header: 'Objeto',
      enableSorting: false,
      cell: ({ row }) => <span className="text-slate-700 max-w-[260px] truncate block" title={row.original.objeto_repr}>{row.original.objeto_repr}</span>,
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Detalle</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <button
            onClick={() => setSeleccionado(row.original)}
            className="p-2 text-slate-400 hover:text-primary-600 transition-colors"
            aria-label="Ver detalle del cambio"
          >
            <Eye size={16} />
          </button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<ShieldCheck size={20} />}
        title="Auditoría"
        description="Trazabilidad completa del sistema: quién hizo qué cambio, cuándo, y con qué valores antes/después -- para poder responder ante una fiscalización."
      />

      <div className="flex gap-2">
        {([
          { value: 'cambios', label: 'Cambios' },
          { value: 'accesos', label: 'Accesos' },
        ] as const).map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              tab === t.value ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'cambios' && (
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="aud-modelo">Modelo</label>
            <select
              id="aud-modelo"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
            >
              <option value="">Todos</option>
              {MODELOS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="aud-accion">Acción</label>
            <select
              id="aud-accion"
              value={accion}
              onChange={(e) => setAccion(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
            >
              <option value="">Todas</option>
              {ACCIONES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="aud-desde">Desde</label>
            <input
              id="aud-desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="aud-hasta">Hasta</label>
            <input
              id="aud-hasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar objeto o usuario..."
              className="w-full px-3 py-2 border rounded-lg text-sm"
              onKeyDown={(e) => e.key === 'Enter' && aplicar()}
            />
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={aplicar}
              disabled={cargando}
              className="shrink-0 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center"
              aria-label="Buscar"
            >
              <Search size={16} />
            </motion.button>
          </div>
        </div>
      </Card>
      )}

      {tab === 'cambios' && (
        cargando && registros.length === 0 ? (
          <TableSkeleton rows={8} />
        ) : (
          <Card padding="none" className="overflow-hidden">
            <DataTable
              columns={columns}
              data={registros}
              pageSize={20}
              paginacionServidor={{
                pagina: lista.pagina,
                totalPaginas: lista.totalPaginas,
                total: lista.total,
                onCambiarPagina: lista.irAPagina,
                cargando,
              }}
              resultLabel="registros"
              emptyState={
                <div className="p-12 text-center text-slate-400 text-sm">
                  No hay registros de auditoría para los filtros seleccionados.
                </div>
              }
            />
          </Card>
        )
      )}

      {tab === 'accesos' && (
        cargandoAccesos ? (
          <TableSkeleton rows={8} />
        ) : (
          <Card padding="none" className="overflow-hidden">
            {accesos.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">No hay intentos de inicio de sesión registrados.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase border-b border-slate-200">
                      <th className="p-3 text-left">Fecha</th>
                      <th className="p-3 text-left">Usuario</th>
                      <th className="p-3 text-left">IP</th>
                      <th className="p-3 text-center">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accesos.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="p-3 text-xs text-slate-600 whitespace-nowrap">{new Date(a.timestamp).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td className="p-3 font-medium text-slate-700">{a.usuario_nombre}</td>
                        <td className="p-3 font-mono text-xs text-slate-500">{a.ip || '—'}</td>
                        <td className="p-3 text-center">
                          <Badge tone={a.success ? 'green' : 'red'}>{a.success ? 'Exitoso' : 'Fallido'}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )
      )}

      {seleccionado && (
        <CambiosModal registro={seleccionado} onClose={() => setSeleccionado(null)} />
      )}
    </div>
  );
}
