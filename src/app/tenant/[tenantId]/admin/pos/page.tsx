"use client";

import { useState, useEffect, use, type ReactElement } from 'react';
import { Search, Loader2, Barcode, PlusCircle } from 'lucide-react';
import { useNotify } from '@/hooks/useNotify';
import { getProductos } from '@/services/inventoryService';
import { getClientes } from '@/services/clientesService';
import { createFactura, registrarPago } from '@/services/facturacionService';
import { Producto, Cliente } from '@/types/api';
import SaleCart, { CartItem } from './components/SaleCart';
import PaymentModal from './components/PaymentModal';
import ClientModal from './components/ClientModal';

/**
 * Página de Punto de Venta (POS).
 * Permite buscar productos, añadirlos a un carrito y procesar la venta.
 * @returns {ReactElement} El componente de la página POS.
 */
export default function PosPage({ params }: { params: Promise<{ tenantId: string }> }): ReactElement {
  const { tenantId } = use(params);
  const notify = useNotify();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Producto[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Producto[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);

  const fetchProducts = async () => {
    try {
      // No set loading here to allow for silent refresh
      const [productsData, clientsData] = await Promise.all([
        getProductos(),
        getClientes(),
      ]);
      setProducts(productsData);
      setFilteredProducts(productsData);
      setClients(clientsData);
    } catch (error) {
      console.error("Error al cargar datos iniciales:", error);
      notify.error("No se pudieron cargar los productos o clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = products.filter(product =>
      product.nombre.toLowerCase().includes(lowercasedQuery) ||
      product.codigo_barras?.toLowerCase().includes(lowercasedQuery) ||
      product.sku?.toLowerCase().includes(lowercasedQuery)
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  const handleAddToCart = (product: Producto) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      const stockDisponible = product.cantidad || 0;

      if (existingItem) {
        if (existingItem.quantity >= stockDisponible) {
          notify.error(`No hay más stock para ${product.nombre}.`);
          return prevItems;
        }
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      if (stockDisponible < 1) {
        notify.error(`El producto ${product.nombre} está agotado.`);
        return prevItems;
      }

      return [...prevItems, { ...product, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (productId: number) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const handleUpdateQuantity = (productId: number, newQuantity: number) => {
    const productInCatalog = products.find(p => p.id === productId);
    if (!productInCatalog) return;

    const stockDisponible = productInCatalog.cantidad || 0;

    if (newQuantity < 1) {
      handleRemoveFromCart(productId);
      return;
    }

    if (newQuantity > stockDisponible) {
      notify.error(`Solo hay ${stockDisponible} unidades disponibles.`);
      newQuantity = stockDisponible;
    }

    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleClearCart = () => {
    setCartItems([]);
    setSelectedClient(null);
  };

  const handleProceedToPayment = () => {
    if (cartItems.length === 0) {
      notify.error("El carrito está vacío.");
      return;
    }
    if (!selectedClient) {
      notify.error("Por favor, seleccione un cliente para la venta.");
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const handleClientCreated = (newClient: Cliente) => {
    // Añadir el nuevo cliente a la lista y seleccionarlo automáticamente
    setClients(prevClients => [...prevClients, newClient]);
    setSelectedClient(newClient);
    setIsClientModalOpen(false);
  };

  const handleFinalizeSale = async (paymentMethodId: number) => {
    setIsPaymentModalOpen(false);

    const facturaPayload = {
      fecha_operacion: new Date().toISOString(),
      cliente: selectedClient?.id,
      estado: 'borrador', // Creamos la factura como borrador
      metodo_pago: paymentMethodId,
      detalles_para_crear: cartItems.map(item => ({
        producto: item.id,
        cantidad: item.quantity,
        precio_unitario: item.precio || '0',
      })),
    };

    try {
      const toastId = notify.loading("Creando factura...");
      const nuevaFactura = await createFactura(facturaPayload);
      notify.dismiss(toastId);

      const pagoToastId = notify.loading("Registrando pago y actualizando stock...");
      await registrarPago(nuevaFactura.id, paymentMethodId, nuevaFactura.total);
      notify.success("Venta completada con éxito.");
      handleClearCart();
      await fetchProducts(); 
      notify.dismiss(pagoToastId);
    } catch (error) {
      console.error("Error al finalizar la venta:", error);
      notify.error("Hubo un error al procesar la venta.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-8rem)]">
      {/* Listado de Productos y Búsqueda */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar producto por nombre, SKU o código de barras..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-primary-500"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center gap-1 text-xs font-mono">
              <Barcode size={16} />
              <span>SCAN</span>
            </div>
          </div>
        </div>
        <div className="flex-grow overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              <Loader2 size={32} className="animate-spin mr-3" />
              Cargando productos...
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => handleAddToCart(product)}
                  className="group border rounded-xl p-3 text-left hover:border-primary-500 hover:bg-primary-50 transition-all flex flex-col"
                >
                  <div className="flex-grow">
                    <p className="font-bold text-sm text-slate-800 group-hover:text-primary-700">{product.nombre}</p>
                    <p className="text-xs text-slate-400">SKU: {product.sku || 'N/A'}</p>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-black text-slate-900">${parseFloat(product.precio || '0').toFixed(2)}</span>
                    <PlusCircle className="text-primary-500 group-hover:text-primary-700" size={20} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Carrito de Venta */}
      <div className="lg:col-span-1">
        <SaleCart
          cartItems={cartItems}
          onRemoveItem={handleRemoveFromCart}
          onUpdateQuantity={handleUpdateQuantity}
          onClearCart={handleClearCart}
          onClientSelect={setSelectedClient}
          clients={clients}
          selectedClient={selectedClient}
          onNewClientClick={() => setIsClientModalOpen(true)}
          onProceedToPayment={handleProceedToPayment}
        />
      </div>

      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onClientCreated={handleClientCreated}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onFinalize={handleFinalizeSale}
        totalAmount={cartItems.reduce((acc, item) => acc + (parseFloat(item.precio || '0') * item.quantity), 0) * 1.16}
      />
    </div>
  );
}
