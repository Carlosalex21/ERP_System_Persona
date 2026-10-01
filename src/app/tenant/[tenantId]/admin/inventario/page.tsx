"use client";

import { useState, useEffect, use, useMemo, useCallback, type ReactElement } from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Package, AlertTriangle, Plus, Trash2, Pencil, Search, Boxes, DollarSign, XCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getApiErrorMessages, getNombreById } from '@/utils/helpers';
import { useMonedaVista } from '@/context/MonedaVistaContext';
import { DataTable, PageHeader, StatCard, Card, Stagger, StaggerItem, TableSkeleton, ConfirmDialog } from '@/components/ui';
import ProductModal from '../inventario/components/ProductModal';
import type { PresentacionForm } from '../inventario/components/PresentacionesFields';
import { Almacen, Categoria, Departamento, Iva, Moneda, Producto, ProductoRequest, VariacionproductoRequest } from '@/types/api';
import {
  createProducto, updateProducto, createVarianteProducto, deleteProducto, getAlmacenes, getCategorias, getProductos,
  createPresentacionProducto, updatePresentacionProducto, deletePresentacionProducto,
} from '@/services/inventoryService';
import { getIvas } from '@/services/configService';
import { getMonedas } from '@/services/configuracionService';
import { getDepartamentos } from '@/services/rrhhService';

export default function InventarioPage({ params }: { params: Promise<{ tenantId: string }> }): ReactElement {
  use(params);
  // Cada producto guarda su precio/costo en SU moneda (`Producto.moneda`,
  // vacío = base): se convierte a la moneda de vista elegida en la barra
  // superior, en vez de pegarle un "$" fijo a cualquier número.
  const { convertir, formatear, formatearEnVista } = useMonedaVista();

  // Arranca en `true` (no `false`): el `useEffect` que carga los datos
  // corre después del primer render, así que si esto arrancaba en `false`
  // había un parpadeo de la tabla "vacía" (0 productos) antes de que el
  // efecto alcanzara a poner `cargando=true` y disparar el spinner.
  const [cargando, setCargando] = useState(true);
  // Guardar/eliminar NO reutiliza `cargando`: antes cada guardado volvía a
  // pintar la tabla entera como esqueleto (parpadeo) aunque los datos
  // seguían ahí. Tras una mutación se refresca en segundo plano.
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const [productos, setProductos] = useState<Producto[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [ivas, setIvas] = useState<Iva[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);

  const [modalProducto, setModalProducto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [esProductoConVariantes, setEsProductoConVariantes] = useState(false);
  // Algo que se cobra pero no es un ítem físico (ej. "Servicio Técnico") --
  // mutuamente excluyente con `esProductoConVariantes` (ver `handleTipoChange`).
  const [esServicio, setEsServicio] = useState(false);
  const [variantes, setVariantes] = useState<any[]>([
    { nombre: '', sku: '', precio: '', cantidad: 0, codigo_barras: '', costo_promedio: '' }
  ]);
  const [presentaciones, setPresentaciones] = useState<PresentacionForm[]>([]);
  // Ids de las presentaciones que ya existían al abrir la edición -- para
  // saber, al guardar, cuáles se quitaron del formulario y hay que borrar.
  const [presentacionesOriginalIds, setPresentacionesOriginalIds] = useState<number[]>([]);
  const [formProducto, setFormProducto] = useState({
    nombre: '', descripcion: '', precio: '', costo_promedio: '', cantidad: 0, stock_minimo: '', meses_garantia: '', sku: '',
    codigo_barras: '', disponible_online: true, es_insumo: false, tipo: 'simple' as 'simple' | 'variable' | 'servicio',
    almacen: '', configuracion_iva: '', categoria: '', moneda: '', departamento: '', imagen: null as File | null,
  });

  const cargarDatosMaestros = useCallback(async (): Promise<void> => {
    // Promise.allSettled en vez de Promise.all: si un solo endpoint falla
    // (ej. IVA 500), antes tumbaba TODO el batch y dejaba almacenes/productos
    // vacíos aunque sus propias peticiones sí hubieran funcionado.
    const [resProd, resAlm, resIva, resCat, resMon, resDep] = await Promise.allSettled([
      getProductos(),
      getAlmacenes(),
      getIvas(),
      getCategorias(),
      getMonedas(),
      getDepartamentos(),
    ]);

    if (resProd.status === 'fulfilled') setProductos(resProd.value);
    if (resAlm.status === 'fulfilled') setAlmacenes(resAlm.value);
    if (resIva.status === 'fulfilled') setIvas(resIva.value);
    if (resCat.status === 'fulfilled') setCategorias(resCat.value);
    if (resMon.status === 'fulfilled') setMonedas(resMon.value);
    if (resDep.status === 'fulfilled') setDepartamentos(resDep.value);

    const fallos = [resProd, resAlm, resIva, resCat, resMon, resDep].filter(r => r.status === 'rejected');
    if (fallos.length > 0) {
      console.error("Error cargando inventario:", fallos.map(f => (f as PromiseRejectedResult).reason));
      // Un 401 real ya lo resuelve el interceptor de `apiPrivada` (refresca
      // o manda al login); borrar cookies aquí expulsaba también a las
      // demás pestañas ante un 401 que el refresh sí habría arreglado.
      const soloAuth = fallos.every(f => (f as PromiseRejectedResult).reason?.response?.status === 401);
      if (!soloAuth) {
        toast.error('Algunos datos no se pudieron cargar. Intenta actualizar la página.');
      }
    }

    setCargando(false);
  }, []);

  useEffect(() => {
    cargarDatosMaestros();
  }, [cargarDatosMaestros]);

  // useMemo: filtrado de productos por búsqueda (nombre, SKU, código de barras).
  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.codigo_barras || '').toLowerCase().includes(q),
    );
  }, [productos, busqueda]);

  // useMemo: estadísticas del inventario. "Bajo stock" usa el umbral propio
  // del producto (`stock_minimo`) cuando está definido -- si no, cae al `5`
  // general (mismo criterio que el dashboard, que usa `10` como umbral
  // general propio; cada pantalla puede tener su propio "general" pero
  // ambas respetan el umbral específico del producto cuando existe).
  const UMBRAL_BAJO_STOCK_GENERAL = 5;
  const codigoMoneda = useCallback(
    (monedaId: number | null | undefined): string | null => monedas.find((m) => m.id === monedaId)?.codigo ?? null,
    [monedas],
  );
  const stats = useMemo(() => {
    const total = productos.length;
    const bajoStock = productos.filter(p => {
      const cantidad = p.cantidad || 0;
      const umbral = p.stock_minimo ?? UMBRAL_BAJO_STOCK_GENERAL;
      return cantidad > 0 && cantidad <= umbral;
    }).length;
    // 'servicio' no tiene stock real (siempre cantidad 0) -- sin excluirlo,
    // cada servicio del catálogo aparecía contado como "agotado".
    const agotados = productos.filter(p => p.tipo !== 'servicio' && (!p.cantidad || p.cantidad <= 0)).length;
    // A COSTO (`costo_promedio`), no a precio de venta -- ver misma nota en
    // `apps.reportes.core.dashboard_service.obtener_metricas_dashboard`.
    // Un producto 'variable' no tiene costo/cantidad propios: viven en cada variante.
    const valor = productos.reduce((acc, p) => {
      const codigo = codigoMoneda(p.moneda);
      if (p.tipo === 'variable') {
        return acc + p.variantes.reduce((accV, v) => accV + convertir(parseFloat(v.costo_promedio || '0') * (v.cantidad || 0), codigo), 0);
      }
      return acc + convertir(parseFloat(p.costo_promedio || '0') * (p.cantidad || 0), codigo);
    }, 0);
    return { total, bajoStock, agotados, valor };
  }, [productos, convertir, codigoMoneda]);

  const faltantes = useMemo(() => [
    !almacenes.length && { etiqueta: 'un almacén', href: '/admin/inventario/almacenes' },
    !ivas.length && { etiqueta: 'un impuesto (IVA)', href: '/admin/configuracion/iva' },
    !categorias.length && { etiqueta: 'una categoría', href: '/admin/inventario/categorias' },
  ].filter((f): f is { etiqueta: string; href: string } => Boolean(f)), [almacenes, ivas, categorias]);

  const cerrarModalProducto = (): void => {
    setModalProducto(false);
    setEditandoId(null);
    setFormProducto({
      nombre: '', descripcion: '', precio: '', costo_promedio: '', cantidad: 0, stock_minimo: '', meses_garantia: '', sku: '',
      codigo_barras: '', disponible_online: true, es_insumo: false, tipo: 'simple' as 'simple' | 'variable' | 'servicio',
      almacen: '', configuracion_iva: '', categoria: '', moneda: '', departamento: '', imagen: null,
    });
    setVariantes([{ nombre: '', sku: '', precio: '', cantidad: 0, codigo_barras: '', costo_promedio: '' }]);
    setPresentaciones([]);
    setPresentacionesOriginalIds([]);
    setEsProductoConVariantes(false);
    setEsServicio(false);
  };

  const abrirCreacion = (): void => {
    const base = monedas.find(m => m.es_predeterminada) ?? monedas[0];
    setEditandoId(null);
    setEsServicio(false);
    setEsProductoConVariantes(false);
    setFormProducto(prev => ({ ...prev, moneda: base ? String(base.id) : '' }));
    setModalProducto(true);
  };

  // No todos los rubros usan código de barras (mucha mercancía sencillamente
  // no trae uno) -- por eso el campo NO es obligatorio, ni en el modelo ni
  // en este formulario. Abre el producto existente para editarlo.
  const abrirEdicion = (producto: Producto): void => {
    setEditandoId(producto.id);
    setFormProducto({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: producto.precio || '',
      costo_promedio: producto.costo_promedio || '',
      cantidad: producto.cantidad || 0,
      stock_minimo: producto.stock_minimo != null ? String(producto.stock_minimo) : '',
      meses_garantia: producto.meses_garantia != null ? String(producto.meses_garantia) : '',
      sku: producto.sku || '',
      codigo_barras: producto.codigo_barras || '',
      disponible_online: producto.disponible_online ?? true,
      es_insumo: producto.es_insumo ?? false,
      tipo: producto.tipo,
      almacen: producto.almacen != null ? String(producto.almacen) : '',
      configuracion_iva: producto.configuracion_iva != null ? String(producto.configuracion_iva) : '',
      categoria: producto.categoria != null ? String(producto.categoria) : '',
      moneda: producto.moneda != null ? String(producto.moneda) : '',
      departamento: producto.departamento != null ? String(producto.departamento) : '',
      imagen: null,
    });
    const presentacionesActivas = (producto.presentaciones || []).filter(p => p.activo);
    setPresentaciones(presentacionesActivas.map(p => ({
      id: p.id,
      nombre: p.nombre,
      factor_conversion: String(p.factor_conversion),
      precio: p.precio || '',
      es_default: p.es_default,
    })));
    setPresentacionesOriginalIds(presentacionesActivas.map(p => p.id));
    setEsProductoConVariantes(false);
    setEsServicio(producto.tipo === 'servicio');
    setModalProducto(true);
  };

  const guardarProducto = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setGuardando(true);

    const payload: ProductoRequest = {
      ...formProducto,
      // Código de barras y SKU son únicos pero opcionales -- si se manda ""
      // (en vez de omitir el campo) dos productos sin código chocan contra
      // la restricción de unicidad ("ya existe") aunque ninguno tenga uno
      // de verdad. `null` sí se trata como "sin valor" y no choca nunca.
      // Un servicio no tiene ninguno de estos -- se envían vacíos aunque el
      // formulario los haya dejado con basura de un toggle anterior.
      codigo_barras: esServicio ? null : (formProducto.codigo_barras.trim() || null),
      sku: esServicio ? null : (formProducto.sku.trim() || null),
      stock_minimo: esServicio ? null : (formProducto.stock_minimo.trim() !== '' ? Number(formProducto.stock_minimo) : null),
      meses_garantia: esServicio ? null : (formProducto.meses_garantia.trim() !== '' ? Number(formProducto.meses_garantia) : null),
      cantidad: esServicio ? 0 : formProducto.cantidad,
      // Solo se aplica al CREAR (el backend lo ignora al editar -- ver
      // `ProductoSerializer.update()`): tocar el costo de un producto que ya
      // tiene stock debe pasar por un Ajuste de Inventario, para que se
      // promedie en vez de pisarse.
      costo_promedio: esServicio ? null : (formProducto.costo_promedio.trim() || null),
      almacen: esServicio ? null : (Number(formProducto.almacen) || null),
      es_insumo: esServicio ? false : formProducto.es_insumo,
      configuracion_iva: Number(formProducto.configuracion_iva) || null,
      categoria: Number(formProducto.categoria) || null,
      moneda: Number(formProducto.moneda) || null,
      departamento: Number(formProducto.departamento) || null,
      activo: true,
      tipo: esServicio ? 'servicio' : (esProductoConVariantes ? 'variable' : 'simple'),
    };
    // Editar solo toca los campos "simples" (por ahora no hay UI para
    // editar variantes existentes) -- omitir `tipo` en el PATCH evita que
    // un producto que sí tiene variantes ('variable') se degrade en
    // silencio a 'simple' solo por abrir y guardar su edición.
    if (editandoId) {
      delete (payload as Partial<ProductoRequest>).tipo;
    }

    try {
      const resProductoPadre = editandoId
        ? await updateProducto(editandoId, payload)
        : await createProducto(payload);
      const productoId = resProductoPadre.id;

      if (!editandoId && esProductoConVariantes && productoId) {
        const promesasVariantes = variantes.map(variante =>
          createVarianteProducto({
            ...variante,
            codigo_barras: variante.codigo_barras.trim() || null,
            sku: variante.sku.trim() || null,
            producto: productoId,
            atributos: [],
          } as VariacionproductoRequest)
        );
        await Promise.all(promesasVariantes);
      }

      // Presentaciones de venta: se sincronizan aparte (mismo patrón que las
      // variantes, endpoint propio) tanto al crear como al editar -- a
      // diferencia de las variantes, sí hay UI para editarlas después.
      if (productoId) {
        const presentacionesValidas = presentaciones.filter(p => p.nombre.trim() && Number(p.factor_conversion) > 0);
        const idsActuales = presentacionesValidas.filter(p => p.id != null).map(p => p.id as number);
        const idsABorrar = presentacionesOriginalIds.filter(id => !idsActuales.includes(id));

        await Promise.all([
          ...presentacionesValidas.map(p => {
            const datos = {
              producto: productoId,
              nombre: p.nombre.trim(),
              factor_conversion: Number(p.factor_conversion),
              precio: p.precio.trim() || null,
              es_default: p.es_default,
            };
            return p.id != null
              ? updatePresentacionProducto(p.id, datos)
              : createPresentacionProducto(datos);
          }),
          ...idsABorrar.map(id => deletePresentacionProducto(id)),
        ]);
      }

      cerrarModalProducto();
      toast.success(editandoId ? 'Producto actualizado correctamente.' : 'Producto guardado correctamente.');
      cargarDatosMaestros();
    } catch (error) {
      console.error("Error guardando producto:", error);
      const messages = getApiErrorMessages(error);
      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(msg));
      } else {
        toast.error("Error al guardar el producto. Revisa que todos los campos obligatorios estén llenos.");
      }
    } finally { setGuardando(false); }
  };

  const handleAñadirVariante = (): void => {
    setVariantes([...variantes, { nombre: '', sku: '', precio: '', cantidad: 0, codigo_barras: '', costo_promedio: '' }]);
  };

  const handleEliminarVariante = (index: number): void => {
    const nuevasVariantes = variantes.filter((_, i) => i !== index);
    setVariantes(nuevasVariantes);
  };

  const handleCambioVariante = (index: number, campo: string, valor: any): void => {
    const nuevasVariantes = [...variantes];
    nuevasVariantes[index] = { ...nuevasVariantes[index], [campo]: valor };
    setVariantes(nuevasVariantes);
  };

  const handleAñadirPresentacion = (): void => {
    setPresentaciones([...presentaciones, { nombre: '', factor_conversion: '', precio: '', es_default: false }]);
  };

  const handleEliminarPresentacion = (index: number): void => {
    setPresentaciones(presentaciones.filter((_, i) => i !== index));
  };

  const handleCambioPresentacion = (index: number, campo: string, valor: any): void => {
    const nuevasPresentaciones = [...presentaciones];
    nuevasPresentaciones[index] = { ...nuevasPresentaciones[index], [campo]: valor };
    setPresentaciones(nuevasPresentaciones);
  };

  const [productoAEliminar, setProductoAEliminar] = useState<Producto | null>(null);
  const [eliminandoProducto, setEliminandoProducto] = useState(false);

  const confirmarEliminarProducto = async (): Promise<void> => {
    if (!productoAEliminar) return;
    setEliminandoProducto(true);
    try {
      await deleteProducto(productoAEliminar.id);
      toast.success('Producto eliminado.');
      setProductoAEliminar(null);
      cargarDatosMaestros();
    } catch (error) {
      toast.error("No se pudo eliminar el producto.");
      console.error("Error eliminando producto:", error);
    } finally {
      setEliminandoProducto(false);
    }
  };

  // useMemo: columnas de la tabla (orden + paginación reales vía DataTable/TanStack).
  const columns = useMemo<ColumnDef<Producto>[]>(() => [
    {
      accessorKey: 'nombre',
      header: 'Producto',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.imagen ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL dinámica servida por Django (MEDIA_URL), no un asset del bundle.
            <img
              src={row.original.imagen}
              alt={row.original.nombre}
              className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-100"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
              <Package size={16} />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{row.original.nombre}</p>
            <p className="text-[10px] font-mono text-slate-400 truncate">SKU: {row.original.sku || row.original.codigo_barras || 'N/A'}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'categoria',
      header: 'Categoría',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
          {getNombreById(categorias, row.original.categoria) || 'Sin categoría'}
        </span>
      ),
    },
    {
      accessorKey: 'precio',
      header: () => <div className="text-right">Precio</div>,
      cell: ({ row }) => (
        <div className="text-right font-black text-slate-900">{formatear(row.original.precio, codigoMoneda(row.original.moneda))}</div>
      ),
      sortingFn: (a, b) => convertir(a.original.precio, codigoMoneda(a.original.moneda)) - convertir(b.original.precio, codigoMoneda(b.original.moneda)),
    },
    {
      accessorKey: 'cantidad',
      header: () => <div className="text-center">Stock</div>,
      cell: ({ row }) => {
        if (row.original.tipo === 'servicio') {
          return (
            <div className="text-center">
              <span className="px-2.5 py-1 rounded-lg font-bold text-xs border bg-slate-50 text-slate-500 border-slate-200">
                Servicio
              </span>
            </div>
          );
        }
        const cantidad = row.original.cantidad || 0;
        const umbral = row.original.stock_minimo ?? UMBRAL_BAJO_STOCK_GENERAL;
        return (
          <div className="text-center">
            <span className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${
              cantidad <= 0
                ? 'bg-red-50 text-red-600 border-red-200'
                : cantidad <= umbral
                  ? 'bg-orange-50 text-orange-600 border-orange-200'
                  : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              {cantidad}
            </span>
          </div>
        );
      },
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-right flex justify-end gap-1">
          <button
            onClick={() => abrirEdicion(row.original)}
            className="p-2 text-slate-400 hover:text-primary-600 transition-colors"
            aria-label="Editar producto"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setProductoAEliminar(row.original)}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            aria-label="Eliminar producto"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ], [categorias, formatear, convertir, codigoMoneda]);

  // useMemo: tarjetas de estadísticas.
  // Mientras carga se muestra "…" en vez de 0: un "0 productos" momentáneo
  // se leía como "perdí mi inventario".
  const statCards = useMemo(() => {
    const valor = (v: string): string => (cargando ? '…' : v);
    return [
      { label: 'Total Productos', value: valor(String(stats.total)), icon: <Boxes size={20} />, color: 'bg-primary-600' },
      { label: 'Bajo Stock', value: valor(String(stats.bajoStock)), icon: <AlertTriangle size={20} />, color: 'bg-orange-500' },
      { label: 'Agotados', value: valor(String(stats.agotados)), icon: <XCircle size={20} />, color: 'bg-red-500' },
      { label: 'Valor Inventario (costo)', value: valor(formatearEnVista(stats.valor)), icon: <DollarSign size={20} />, color: 'bg-green-600' },
    ];
  }, [stats, cargando, formatearEnVista]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        icon={<Package size={20} />}
        title="Catálogo de Productos"
        description="Productos, precios y existencias de tu negocio."
        actions={
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={abrirCreacion}
            className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-md"
          >
            <Plus size={18} /> Nuevo Producto
          </motion.button>
        }
      />

      {/* Aviso de configuración inicial -- solo con los datos ya cargados
          (antes aparecía durante la carga porque las listas aún estaban vacías). */}
      {!cargando && faltantes.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-orange-800 text-sm">Falta configuración inicial</h4>
            <p className="text-xs text-orange-700 mt-1">
              Antes de crear tu primer producto crea al menos:{' '}
              {faltantes.map((f, i) => (
                <span key={f.href}>
                  <Link href={f.href} className="font-bold underline hover:text-orange-900">{f.etiqueta}</Link>
                  {i < faltantes.length - 1 ? ', ' : '.'}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <StaggerItem key={card.label}>
            <StatCard {...card} />
          </StaggerItem>
        ))}
      </Stagger>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, SKU o código de barras..."
          className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
        />
      </div>

      {/* Tabla */}
      {cargando ? (
        <TableSkeleton rows={6} cols={4} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <DataTable
            columns={columns}
            data={productosFiltrados}
            resultLabel="productos"
            emptyState={
              <div className="p-12 text-center text-slate-400">
                <Package size={40} className="mx-auto mb-3 text-slate-300" />
                <p className="font-bold text-slate-500">No hay productos en el inventario</p>
                <p className="text-xs mt-1">Crea tu primer producto o ajusta la búsqueda.</p>
              </div>
            }
          />
        </Card>
      )}

      {modalProducto && (
        <ProductModal
          formProducto={formProducto}
          setFormProducto={setFormProducto}
          esProductoConVariantes={esProductoConVariantes}
          setEsProductoConVariantes={setEsProductoConVariantes}
          esServicio={esServicio}
          setEsServicio={setEsServicio}
          variantes={variantes}
          setVariantes={setVariantes}
          handleAñadirVariante={handleAñadirVariante}
          handleEliminarVariante={handleEliminarVariante}
          handleCambioVariante={handleCambioVariante}
          presentaciones={presentaciones}
          handleAñadirPresentacion={handleAñadirPresentacion}
          handleEliminarPresentacion={handleEliminarPresentacion}
          handleCambioPresentacion={handleCambioPresentacion}
          almacenes={almacenes}
          ivas={ivas}
          categorias={categorias}
          monedas={monedas}
          departamentos={departamentos}
          guardarProducto={guardarProducto}
          cargando={guardando}
          setModalProducto={(abierto) => { if (!abierto) cerrarModalProducto(); }}
          editando={!!editandoId}
        />
      )}

      <ConfirmDialog
        isOpen={!!productoAEliminar}
        title="Eliminar Producto"
        message={`¿Eliminar "${productoAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={eliminandoProducto}
        onConfirm={confirmarEliminarProducto}
        onCancel={() => setProductoAEliminar(null)}
      />
    </div>
  );
}
