import React from 'react';
import { useCart } from '../../contexts/CartContext';
import { ShoppingBag } from 'lucide-react';

export const CartFloatingButton: React.FC = () => {
  const { totalItems, setIsCartOpen, totalPrice } = useCart();

  if (totalItems === 0) return null;

  const formattedTotal = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(totalPrice);

  return (
    <div className="fixed bottom-6 right-6 z-40 animate-in fade-in slide-in-from-bottom-4">
      <button
        onClick={() => setIsCartOpen(true)}
        className="flex items-center gap-3 px-5 py-3.5 rounded-full bg-[#0c0a08] text-[#f7e8c5] border border-[#c5a059]/60 shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer group"
        aria-label="Ver bolsa de compras"
      >
        <div className="relative">
          <ShoppingBag className="w-5 h-5 text-[#c5a059] group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-2 -right-2 bg-[#25D366] text-[#0c0a08] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
            {totalItems}
          </span>
        </div>

        <div className="flex flex-col text-left leading-tight">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#c5a059]">
            Ver Pedido ({totalItems})
          </span>
          <span className="text-xs font-black text-white">
            {formattedTotal}
          </span>
        </div>
      </button>
    </div>
  );
};
