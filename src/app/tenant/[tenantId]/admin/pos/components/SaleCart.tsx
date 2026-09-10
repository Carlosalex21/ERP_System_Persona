/**
 * @file Carrito de venta del POS.
 * Renderiza el selector de cliente, los ítems del carrito (memoizados con
 * `React.memo`) y el desglose de totales con impuestos en tiempo real.
 */
"use client";

import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { Search, ShoppingCart, User, XCircle } from 'lucide-react';

import { Cliente, Moneda, Producto } from '@/types/api';
import type { TasaCambioActual } from '@/services/configuracionService';
import type { TotalesCalculo } from '@/utils/taxCalculator';

import CartLineItem from './CartLineItem';
import CurrencySelector from './CurrencySelector';
import TotalsBreakdown from './TotalsBreakdown';

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

  monedas: Moneda[];
  tasasActuales: Record<string, TasaCambioActual>;
  selectedCurrencyCode: string;
  baseCurrencyCode: string;
  onCurrencyChange: (code: string) => void;
  onRefreshRates: () => void;
  refreshingRates: boolean;
  totales: TotalesCalculo;
}

/**
 * Componente que renderiza el carrito de la venta actual en el POS.
 * @param {SaleCartProps} props - Propiedades para gestionar el carrito.
 * @returns {ReactElement} El componente del carrito de venta.
 */
export default function SaleCart({
  cartItems,
  onRemoveItem,
  onUpdateQuantity,
  onClearCart,
  onProceedToPayment,
  clients,
  selectedClient,
  onClientSelect,
  onNewClientClick,
  monedas,
  tasasActuales,
  selectedCurrencyCode,
  baseCurrencyCode,
  onCurrencyChange,
  onRefreshRates,
  refreshingRates,
  totales,
}: SaleCartProps): ReactElement {
  const [clientSearch, setClientSearch] = useState('');

  const currencySymbol = useMemo(() => {
    const moneda = monedas.find(m => m.codigo === selectedCurrencyCode);
    return moneda?.simbolo ?? `${selectedCurrencyCode} `;
  }, [monedas, selectedCurrencyCode]);

  // useMemo: el listado de clientes solo se recalcula cuando cambia la búsqueda o la lista.
  const filteredClients = useMemo(() => {
    if (!clientSearch) return [];
    const lowercasedQuery = clientSearch.toLowerCase();
    return clients
      .filter(client =>
        client.nombre.toLowerCase().includes(lowercasedQuery) ||
        client.documento?.toLowerCase().includes(lowercasedQuery),
      )
      .slice(0, 5);
  }, [clientSearch, clients]);

  // useCallback: handlers de incremento/decremento con referencias estables.
  // El padre (PosView) se encarga de validar stock y de eliminar cuando llega a 0.
  const handleIncrement = useCallback(
    (productId: number) => {
      const item = cartItems.find(i => i.id === productId);
      if (!item) return;
      onUpdateQuantity(productId, item.quantity + 1);
    },
    [cartItems, onUpdateQuantity],
  );

  const handleDecrement = useCallback(
    (productId: number) => {
      const item = cartItems.find(i => i.id === productId);
      if (!item) return;
      onUpdateQuantity(productId, item.quantity - 1);
    },
    [cartItems, onUpdateQuantity],
  );

  const handleQuantityChange = useCallback(
    (productId: number, newQuantity: number) => {
      onUpdateQuantity(productId, newQuantity);
    },
    [onUpdateQuantity],
  );

  const handleRemove = useCallback(
    (productId: number) => onRemoveItem(productId),
    [onRemoveItem],
  );

  const handleSelectClient = useCallback(
    (client: Cliente) => {
      onClientSelect(client);
      setClientSearch('');
    },
    [onClientSelect],
  );

  return (
    <div className="bg-white h-full flex flex-col rounded-2xl border border-slate-200 shadow-sm">
      {/* Selector de Moneda */}
      <div className="p-4 border-b bg-slate-50/50">
        <div className="mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Moneda de la venta
        </div>
        <CurrencySelector
          monedas={monedas}
          tasasActuales={tasasActuales}
          selectedCurrencyCode={selectedCurrencyCode}
          onCurrencyChange={onCurrencyChange}
          onRefreshRates={onRefreshRates}
          refreshingRates={refreshingRates}
        />
      </div>

      {/* Sección de Cliente */}
      <div className="p-4 border-b relative">
        {selectedClient ? (
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-semibold">CLIENTE</p>
              <p className="font-bold text-primary-700 truncate">{selectedClient.nombre}</p>
            </div>
            <button
              type="button"
              onClick={() => onClientSelect(null)}
              className="text-xs font-semibold text-red-500 hover:text-red-700 shrink-0 ml-2"
            >
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
                  {filteredClients.length > 0 ? (
                    filteredClients.map(client => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => handleSelectClient(client)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100"
                      >
                        {client.nombre}
                      </button>
                    ))
                  ) : (
                    <p className="px-4 py-2 text-sm text-slate-500">No se encontraron clientes.</p>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onNewClientClick}
              className="w-full text-center px-4 py-2 text-sm font-bold text-primary-600 hover:bg-primary-50 border-2 border-dashed border-primary-200 rounded-lg flex items-center justify-center gap-2"
            >
              <User size={16} /> Crear nuevo cliente
            </button>
          </div>
        )}
      </div>

      {/* Encabezado del carrito */}
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <ShoppingCart size={20} className="text-primary-600" />
          Venta Actual
        </h2>
        {cartItems.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1"
          >
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
            <CartLineItem
              key={item.id}
              item={item}
              currencySymbol={currencySymbol}
              onRemove={handleRemove}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onQuantityChange={handleQuantityChange}
            />
          ))
        )}
      </div>

      {/* Totales y Botón de Pago */}
      {cartItems.length > 0 && (
        <div className="p-4 border-t bg-slate-50/50 rounded-b-2xl">
          <TotalsBreakdown
            totales={totales}
            currencyCode={selectedCurrencyCode}
            baseCurrencyCode={baseCurrencyCode}
          />
          <button
            type="button"
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
