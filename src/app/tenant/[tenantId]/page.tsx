"use client";

import { useState, use } from 'react';
import { 
  ShoppingCart, 
  Store, 
  Plus, 
  Minus, 
  Trash2, 
  X, 
  ArrowRight, 
  MessageCircle,
  Search
} from 'lucide-react';

// Definición de tipos para TypeScript
type Producto = { id: string; nombre: string; precio: number; categoria: string; imagen: string };
type ItemCarrito = Producto & { cantidad: number };

export default function TiendaPublica({ params }: { params: Promise<{ tenantId: string }> }) {
  // Desempaquetar el subdominio (nombre de la tienda)
  const { tenantId } = use(params);

  // Estados interactivos
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [filtro, setFiltro] = useState('');

  // Simulación de catálogo de base de datos (Esto vendrá de tu API Django luego)
  const productosBase: Producto[] = [
    { id: 'P1', nombre: 'Zapatos Deportivos Nitro V2', precio: 45.00, categoria: 'Calzado', imagen: '👟' },
    { id: 'P2', nombre: 'Camiseta Básica Oversize', precio: 15.00, categoria: 'Ropa', imagen: '👕' },
    { id: 'P3', nombre: 'Gorra Urban Trucker', precio: 12.50, categoria: 'Accesorios', imagen: '🧢' },
    { id: 'P4', nombre: 'Mochila de Viaje 40L', precio: 35.00, categoria: 'Accesorios', imagen: '🎒' },
    { id: 'P5', nombre: 'Lentes de Sol Polarizados', precio: 22.00, categoria: 'Accesorios', imagen: '🕶️' },
    { id: 'P6', nombre: 'Pantalón Cargo Negro', precio: 28.00, categoria: 'Ropa', imagen: '👖' },
  ];

  // Lógica del Carrito
  const agregarAlCarrito = (producto: Producto) => {
    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id);
      if (existe) {
        return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
    setCarritoAbierto(true); // Abre el panel automáticamente para dar feedback
  };

  const modificarCantidad = (id: string, delta: number) => {
    setCarrito(prev => prev.map(item => {
      if (item.id === id) {
        const nuevaCantidad = item.cantidad + delta;
        return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : item;
      }
      return item;
    }));
  };

  const eliminarItem = (id: string) => {
    setCarrito(prev => prev.filter(item => item.id !== id));
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  // Motor generador de la orden hacia WhatsApp
  const enviarPedidoWhatsApp = () => {
    const telefonoVendedor = "584141172383"; // Aquí iría el número configurado por el inquilino
    const nombreTienda = tenantId.toUpperCase();
    
    let mensaje = `👋 Hola *${nombreTienda}*, quisiera realizar el siguiente pedido:\n\n`;
    
    carrito.forEach((item, index) => {
      mensaje += `*${index + 1}.* ${item.nombre}\n`;
      mensaje += `   Cantidad: ${item.cantidad} x $${item.precio.toFixed(2)}\n`;
      mensaje += `   _Subtotal: $${(item.cantidad * item.precio).toFixed(2)}_\n\n`;
    });

    mensaje += `🛒 *TOTAL A PAGAR: $${totalCarrito.toFixed(2)}*\n\n`;
    mensaje += `Por favor confirmen disponibilidad y métodos de pago. ¡Gracias!`;

    const url = `https://wa.me/${telefonoVendedor}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');

    setCarrito([]);           // Vacía el carrito
    setCarritoAbierto(false);
  };

  // Filtrado de productos para la barra de búsqueda
  const productosFiltrados = productosBase.filter(p => p.nombre.toLowerCase().includes(filtro.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden relative">
      
      {/* 1. NAVBAR DE LA TIENDA */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Store size={20} />
            </div>
            <h1 className="text-xl font-black tracking-tight uppercase text-slate-800">
              {tenantId.replace('-', ' ')}
            </h1>
          </div>

          <button 
            onClick={() => setCarritoAbierto(true)}
            className="relative p-2 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
          >
            <ShoppingCart size={24} />
            {totalItems > 0 && (
              <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-white shadow-sm transform scale-100 animate-bounce">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 2. HERO SECTION / BANNER PROMOCIONAL */}
      <section className="bg-primary-900 text-white py-12 px-4 relative overflow-hidden">
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary-800 rounded-full blur-3xl opacity-50"></div>
        <div className="max-w-7xl mx-auto relative z-10 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-2">Nueva Colección Disponible</h2>
            <p className="text-primary-200">Compra rápido y seguro directo a nuestro WhatsApp.</p>
          </div>
          
          {/* Barra de Búsqueda */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar productos..." 
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:bg-white focus:text-slate-900 focus:placeholder-slate-400 transition-all"
            />
          </div>
        </div>
      </section>

      {/* 3. GRILLA DE PRODUCTOS (CATÁLOGO) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-slate-800">Todos los productos</h3>
          <span className="text-sm font-medium text-slate-500">{productosFiltrados.length} resultados</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {productosFiltrados.map((producto) => (
            <div key={producto.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-300 flex flex-col">
              
              {/* Imagen (Simulada con emojis y fondo claro para este ejemplo) */}
              <div className="h-48 bg-slate-50 flex items-center justify-center text-7xl relative overflow-hidden">
                <span className="transform group-hover:scale-110 transition-transform duration-500">{producto.imagen}</span>
                <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-wider shadow-sm">
                  {producto.categoria}
                </div>
              </div>
              
              {/* Detalles del Producto */}
              <div className="p-5 flex flex-col flex-grow">
                <h4 className="font-bold text-slate-800 text-lg leading-tight mb-1 group-hover:text-primary-600 transition-colors">
                  {producto.nombre}
                </h4>
                <div className="mt-auto pt-4 flex items-center justify-between">
                  <span className="text-xl font-black text-slate-900">${producto.precio.toFixed(2)}</span>
                  <button 
                    onClick={() => agregarAlCarrito(producto)}
                    className="bg-slate-100 text-primary-700 w-10 h-10 rounded-full flex items-center justify-center font-bold hover:bg-primary-600 hover:text-white transition-colors shadow-sm active:scale-95"
                    aria-label="Agregar al carrito"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {productosFiltrados.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              No se encontraron productos con "{filtro}".
            </div>
          )}
        </div>
      </main>

      {/* 4. OVERLAY OSCURO Y CARRITO LATERAL (DRAWER) */}
      
      {/* Fondo oscuro cuando el carrito está abierto */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${carritoAbierto ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={() => setCarritoAbierto(false)}
      />

      {/* Panel del Carrito */}
      <aside className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${carritoAbierto ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Cabecera del Carrito */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
            <ShoppingCart size={20} className="text-primary-600" /> Mi Pedido
          </div>
          <button onClick={() => setCarritoAbierto(false)} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Lista de Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {carrito.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <ShoppingCart size={48} className="opacity-20" />
              <p>Tu carrito está vacío</p>
            </div>
          ) : (
            carrito.map(item => (
              <div key={item.id} className="flex gap-4 bg-white p-3 border border-slate-100 rounded-xl shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center text-2xl shrink-0">
                  {item.imagen}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <h5 className="font-bold text-slate-800 text-sm leading-tight pr-2">{item.nombre}</h5>
                    <button onClick={() => eliminarItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-black text-primary-700 text-sm">${(item.precio * item.cantidad).toFixed(2)}</span>
                    
                    {/* Controles de Cantidad */}
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                      <button onClick={() => modificarCantidad(item.id, -1)} className="text-slate-500 hover:text-slate-800"><Minus size={14} /></button>
                      <span className="font-bold text-slate-800 text-xs w-4 text-center">{item.cantidad}</span>
                      <button onClick={() => modificarCantidad(item.id, 1)} className="text-slate-500 hover:text-slate-800"><Plus size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer del Carrito (Total y Botón de Pago) */}
        {carrito.length > 0 && (
          <div className="p-6 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 font-medium">Subtotal ({totalItems} items)</span>
              <span className="text-2xl font-black text-slate-900">${totalCarrito.toFixed(2)}</span>
            </div>
            
            <button 
              onClick={enviarPedidoWhatsApp}
              className="w-full bg-green-500 text-white py-4 rounded-xl font-black text-base shadow-lg hover:bg-green-600 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              <MessageCircle size={22} /> Enviar Orden por WhatsApp
            </button>
            <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
              <Store size={12}/> Venta directa y segura con el comercio.
            </p>
          </div>
        )}
      </aside>

      {/* BOTÓN FLOTANTE MÓVIL (Solo visible en pantallas pequeñas cuando el carrito está cerrado y hay items) */}
      {!carritoAbierto && totalItems > 0 && (
        <button
          onClick={() => setCarritoAbierto(true)}
          className="md:hidden fixed bottom-6 right-6 bg-primary-600 text-white p-4 rounded-full shadow-2xl hover:bg-primary-700 animate-bounce flex items-center justify-center z-30"
        >
          <ShoppingCart size={24} />
          <span className="absolute -top-2 -right-2 bg-accent-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white">
            {totalItems}
          </span>
        </button>
      )}

    </div>
  );
}