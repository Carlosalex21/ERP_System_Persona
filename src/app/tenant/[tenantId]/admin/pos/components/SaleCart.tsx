"use client";

import { useMemo, useState, type ReactElement } from 'react';
import { Search, ShoppingCart, Trash2, User, XCircle } from 'lucide-react';
import { Cliente, Producto } from '@/types/api';

export interface CartItem extends Producto {
  quantity: number;
}

interface SaleCartProps {
  cartItems: CartItem[];
  onRemoveItem: (productId: number) => void;
  onUpdateQuantity: (productId: number, newQuantity: number) => void;
  onClearCart: () => void;
  onProceedToPayment: () => void;
  clients: Cliente[];
  selectedClient: Cliente | null;
  onClientSelect: (client: Cliente | null) => void;
  onNewClientClick: () => void;
}

/**
 * Componente que renderiza el carrito de la venta actual en el POS.
 * @param {SaleCartProps} props - Propiedades para gestionar el carrito.
 * @returns {ReactElement} El componente del carrito de venta.
 */
export default function SaleCart({ cartItems, onRemoveItem, onUpdateQuantity, onClearCart, onProceedToPayment, clients, selectedClient, onClientSelect, onNewClientClick }: SaleCartProps): ReactElement {
  const [clientSearch, setClientSearch] = useState('');
  const subtotal = cartItems.reduce((acc, item) => acc + (parseFloat(item.precio || '0') * item.quantity), 0);
  // NOTA: El IVA se asume en 16% por ahora. Esto debería obtenerse de la configuración del tenant.
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  const filteredClients = useMemo(() => {
    if (!clientSearch) return [];
    const lowercasedQuery = clientSearch.toLowerCase();
    return clients.filter(client =>
      client.nombre.toLowerCase().includes(lowercasedQuery) ||
      client.documento?.toLowerCase().includes(lowercasedQuery)
    ).slice(0, 5); // Limitar a 5 resultados para no saturar la UI
  }, [clientSearch, clients]);

  const handleSelectClient = (client: Cliente) => {
    onClientSelect(client);
    setClientSearch('');
  };

  return (
    <div className="bg-white h-full flex flex-col rounded-2xl border border-slate-200 shadow-sm">
      {/* Sección de Cliente */}
      <div className="p-4 border-b relative">
        {selectedClient ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold">CLIENTE</p>
              <p className="font-bold text-primary-700">{selectedClient.nombre}</p>
            </div>
            <button onClick={() => onClientSelect(null)} className="text-xs font-semibold text-red-500 hover:text-red-700">
              Quitar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg bg-slate-50 text-sm"
              />
            {clientSearch && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                {filteredClients.length > 0 ? filteredClients.map(client => (
                  <button key={client.id} onClick={() => handleSelectClient(client)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100" >
                    {client.nombre}
                  </button>
                )) : ( <p className="px-4 py-2 text-sm text-slate-500">No se encontraron clientes.</p> )}
              </div>
            )}
          </div>
              <button onClick={onNewClientClick} className="w-full text-center px-4 py-2 text-sm font-bold text-primary-600 hover:bg-primary-50 border-2 border-dashed border-primary-200 rounded-lg flex items-center justify-center gap-2">
                <User size={16} /> Crear nuevo cliente
              </button>
            </div>
        )}
      {/* Sección de Items del Carrito */}
      </div>
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <ShoppingCart size={20} className="text-primary-600" />
          Venta Actual
        </h2>
        {cartItems.length > 0 && (
          <button onClick={onClearCart} className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1">
            <XCircle size={14} /> Vaciar
          </button>
        )}
      </div>

      {/* Lista de Items del Carrito */}
      <div className="flex-grow overflow-y-auto p-4 space-y-3">
        {cartItems.length === 0 ? (
          <div className="text-center text-slate-400 pt-16">
            <p>Añade productos a la venta.</p>
          </div>
        ) : (
          cartItems.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border">
              <div className="flex-grow">
                <p className="font-bold text-sm text-slate-800">{item.nombre}</p>
                <p className="text-xs text-slate-500">${parseFloat(item.precio || '0').toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value, 10) || 1)}
                  className="w-12 text-center text-sm font-bold border rounded-md py-1"
                  min="1"
                />
                <button onClick={() => onRemoveItem(item.id)} className="text-slate-400 hover:text-red-500 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totales y Botón de Pago */}
      {cartItems.length > 0 && (
        <div className="p-4 border-t bg-slate-50/50 rounded-b-2xl">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-semibold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">IVA (16%):</span>
              <span className="font-semibold">${iva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-slate-900 border-t pt-2 mt-2">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={onProceedToPayment}
            disabled={cartItems.length === 0 || !selectedClient}
            className="w-full mt-4 bg-primary-600 text-white font-bold py-3 rounded-xl hover:bg-primary-700 transition-colors shadow-lg disabled:bg-slate-400"
          >
            Proceder al Pago
          </button>
        </div>
      )}
    </div>
  );
}