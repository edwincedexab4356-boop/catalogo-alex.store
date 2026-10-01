import React, { useState } from 'react';
import { Producto } from '../../types/database';
import { StockBadge } from './StockBadge';
import { useCart } from '../../contexts/CartContext';
import { Image as ImageIcon, Eye, ArrowUpRight, Plus, ShoppingBag } from 'lucide-react';

interface ProductCardProps {
  producto: Producto;
  onSelect: (producto: Producto) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ producto, onSelect }) => {
  const [imgError, setImgError] = useState(false);
  const { addToCart } = useCart();

  // Safe numerical price
  const rawPrice = typeof producto.precio === 'number' ? producto.precio : parseFloat(producto.precio as any) || 0;

  // Formatter for price
  const formattedPrice = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(rawPrice);

  const stockCantidad = producto.inventario?.cantidad ?? 0;
  const stockMinimo = producto.inventario?.stock_minimo ?? 3;
  const isOutOfStock = stockCantidad <= 0;
  const hasImages = Boolean(producto.imagenes && producto.imagenes.length > 0);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(producto, 1);
  };

  return (
    <div
      onClick={() => onSelect(producto)}
      className="group bg-white rounded-2xl border border-[#eae3d5] overflow-hidden shadow-xs hover:shadow-xl hover:border-[#c5a059]/60 transition-all duration-300 flex flex-col cursor-pointer transform hover:-translate-y-1"
    >
      {/* Product Image Area */}
      <div className="relative aspect-square w-full bg-[#f7f4ed] overflow-hidden">
        {producto.imagen_url && !imgError ? (
          <img
            src={producto.imagen_url}
            alt={producto.nombre}
            onError={() => setImgError(true)}
            loading="lazy"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 p-4 text-center">
            <ImageIcon className="w-10 h-10 stroke-[1.2] mb-2 opacity-40 text-stone-400" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-stone-400">AlexStore</span>
          </div>
        )}

        {/* Floating Stock Badge */}
        <div className="absolute top-3 left-3 z-10">
          <StockBadge cantidad={stockCantidad} stockMinimo={stockMinimo} size="sm" />
        </div>

        {/* Quick Add to Cart button */}
        {!isOutOfStock && (
          <button
            onClick={handleQuickAdd}
            title="Añadir a la bolsa de pedido"
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-[#0c0a08]/85 text-[#f7e8c5] hover:bg-[#c5a059] hover:text-[#0c0a08] flex items-center justify-center border border-[#c5a059]/40 shadow-md transition-all cursor-pointer transform hover:scale-110"
            aria-label="Añadir a la bolsa"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {/* Gallery badge if multiple images */}
        {producto.imagenes && producto.imagenes.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-[#0c0a08]/85 backdrop-blur-md text-[#f1eaa7] text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-[#c5a059]/30 shadow-xs">
            <span>{producto.imagenes.length} fotos</span>
          </div>
        )}

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-[#0c0a08]/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#0c0a08] text-[#f7e8c5] font-bold text-xs shadow-lg border border-[#c5a059]/40">
            <Eye className="w-3.5 h-3.5 text-[#c5a059]" />
            Ver Detalles
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-white">
        <div>
          {/* Category Tag */}
          <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#c5a059] mb-1.5">
            {producto.categoria?.nombre || 'Colección'}
          </div>

          {/* Title */}
          <h3 className="font-bold text-stone-900 text-sm sm:text-base line-clamp-1 group-hover:text-[#c5a059] transition-colors">
            {producto.nombre}
          </h3>

          {/* Description preview */}
          {producto.descripcion && (
            <p className="text-xs text-stone-500 line-clamp-2 mt-1.5 leading-relaxed">
              {producto.descripcion}
            </p>
          )}
        </div>

        {/* Price & Action footer */}
        <div className="mt-4 pt-3.5 border-t border-[#f2ede4] flex items-baseline justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-400 block uppercase tracking-wider">Precio</span>
            <span className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
              {formattedPrice}
            </span>
          </div>

          <span className="text-xs font-bold text-[#c5a059] group-hover:text-[#9e7a33] flex items-center gap-0.5">
            Pedir <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
};
