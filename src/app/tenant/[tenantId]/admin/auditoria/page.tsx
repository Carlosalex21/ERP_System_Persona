"use client";

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ShieldCheck, Search, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getRegistrosAuditoria, type FiltrosAuditoria } from '@/services/auditoriaService';
import { getApiErrorMessages } from '@/utils/helpers';
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
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modelo, setModelo] = useState('');
  const [accion, setAccion] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [q, setQ] = useState('');
  const [seleccionado, setSeleccionado] = useState<RegistroAuditoria | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const filtros: FiltrosAuditoria = {};
    if (modelo) filtros.modelo = modelo;
    if (accion) filtros.accion = accion;
    if (fechaDesde) filtros.fecha_desde = fechaDesde;
    if (fechaHasta) filtros.fecha_hasta = fechaHasta;
    if (q) filtros.q = q;
    try {
      const data = await getRegistrosAuditoria(filtros);
      setRegistros(data);
    } catch (error) {
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error('No se pudo cargar el registro de auditoría.');
      }
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

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
              onKeyDown={(e) => e.key === 'Enter' && cargar()}
            />
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={cargar}
              disabled={cargando}
              className="shrink-0 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center"
              aria-label="Buscar"
            >
              <Search size={16} />
            </motion.button>
          </div>
        </div>
      </Card>

      {cargando ? (
        <TableSkeleton rows={8} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable
            columns={columns}
            data={registros}
            pageSize={20}
            resultLabel="registros"
            emptyState={
              <div className="p-12 text-center text-slate-400 text-sm">
                No hay registros de auditoría para los filtros seleccionados.
              </div>
            }
          />
        </Card>
      )}

      {seleccionado && (
        <CambiosModal registro={seleccionado} onClose={() => setSeleccionado(null)} />
      )}
    </div>
  );
}
