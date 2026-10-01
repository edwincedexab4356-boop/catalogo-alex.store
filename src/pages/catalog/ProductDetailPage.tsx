import React, { useState, useEffect } from 'react';
import { productosService } from '../../services/productosService';
import { Producto } from '../../types/database';
import { ProductGallery } from '../../components/catalog/ProductGallery';
import { StockBadge } from '../../components/catalog/StockBadge';
import { ProductCard } from '../../components/catalog/ProductCard';
import { useCart } from '../../contexts/CartContext';
import {
  ArrowLeft,
  Share2,
  CheckCircle2,
  ShieldCheck,
  MessageCircle,
  Loader2,
  Plus,
  Minus,
  ShoppingBag,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface ProductDetailPageProps {
  productId: number | string;
  onBack: () => void;
  onSelectProduct: (product: Producto) => void;
  onSelectCategory: (categoryId: number | string) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  productId,
  onBack,
  onSelectProduct,
  onSelectCategory,
}) => {
  const [producto, setProducto] = useState<Producto | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [cantidad, setCantidad] = useState(1);
  const { addToCart, sendSingleProductToWhatsApp, setIsCartOpen } = useCart();
  const { success: toastSuccess } = useToast();

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await productosService.getProductoById(productId);
        if (isMounted && data) {
          setProducto(data);
          setCantidad(1);
          if (data.categoria_id) {
            const rel = await productosService.getRelatedProductos(data.categoria_id, data.id, 4);
            if (isMounted) setRelatedProducts(rel);
          }
        }
      } catch (err) {
        console.error('Error loading product details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-stone-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#c5a059] mb-3" />
        <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
          Cargando detalle del producto...
        </span>
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-stone-900">Producto no disponible</h2>
        <p className="text-xs sm:text-sm text-stone-500">
          El artículo seleccionado no se encuentra en el catálogo activo de AlexStore.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0c0a08] text-[#f7e8c5] font-bold text-xs uppercase tracking-wider hover:bg-stone-800 transition-colors shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la Colección
        </button>
      </div>
    );
  }

  const rawPrice = typeof producto.precio === 'number' ? producto.precio : parseFloat(producto.precio as any) || 0;
  const stockCantidad = producto.inventario?.cantidad ?? 0;
  const stockMinimo = producto.inventario?.stock_minimo ?? 3;
  const isOutOfStock = stockCantidad <= 0;

  const formattedPrice = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(rawPrice);

  const formattedTotal = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(rawPrice * cantidad);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${producto.nombre} - AlexStore`,
          text: producto.descripcion || `Mira este producto en AlexStore:`,
          url: window.location.href,
        });
      } catch {
        // Cancelled by user
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toastSuccess('Enlace copiado al portapapeles');
    }
  };

  const handleDirectWhatsAppOrder = () => {
    sendSingleProductToWhatsApp(producto, cantidad);
  };

  const handleAddToCart = () => {
    addToCart(producto, cantidad);
    setIsCartOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-[#f3ede1] text-stone-700 text-xs font-bold uppercase tracking-wider border border-[#eae3d5] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-stone-500" />
          Volver a la Colección
        </button>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-stone-600 hover:text-stone-900 hover:bg-[#f3ede1] border border-[#eae3d5] transition-colors text-xs font-bold cursor-pointer"
          title="Compartir enlace"
        >
          <Share2 className="w-4 h-4 text-[#c5a059]" />
          <span className="hidden sm:inline">Compartir</span>
        </button>
      </div>

      {/* Main Product Info Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 bg-white p-6 sm:p-10 rounded-3xl border border-[#eae3d5] shadow-xs">
        {/* Left: Gallery */}
        <div>
          <ProductGallery
            mainImageUrl={producto.imagen_url}
            images={producto.imagenes}
            productName={producto.nombre}
          />
        </div>

        {/* Right: Product Details */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Category badge */}
            {producto.categoria && (
              <button
                onClick={() => onSelectCategory(producto.categoria!.id)}
                className="text-[11px] font-black uppercase tracking-[0.2em] text-[#c5a059] hover:text-[#9e7a33] transition-colors inline-block cursor-pointer"
              >
                {producto.categoria.nombre}
              </button>
            )}

            {/* Product Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 tracking-tight leading-tight">
              {producto.nombre}
            </h1>

            {/* Stock status indicator */}
            <div className="flex items-center gap-3 pt-1">
              <StockBadge
                cantidad={stockCantidad}
                stockMinimo={stockMinimo}
                showExactCount={true}
              />
              <span className="text-xs text-stone-400 font-medium">
                Inventario verificado en tiempo real
              </span>
            </div>

            {/* Price Box */}
            <div className="p-5 rounded-2xl bg-[#faf7f0] border border-[#ebdcc4] my-2">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                Precio Especial AlexStore
              </div>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
                  {formattedPrice}
                </div>
                {cantidad > 1 && (
                  <div className="text-xs font-bold text-stone-600">
                    Subtotal: <span className="font-black text-[#c5a059]">{formattedTotal}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div className="flex items-center gap-4 py-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Cantidad a pedir:
                </span>
                <div className="flex items-center border border-[#d6cdbd] rounded-xl bg-white overflow-hidden shadow-xs">
                  <button
                    onClick={() => setCantidad((prev) => Math.max(1, prev - 1))}
                    disabled={cantidad <= 1}
                    className="w-9 h-9 flex items-center justify-center text-stone-600 hover:bg-stone-100 disabled:opacity-40 transition-colors cursor-pointer"
                    aria-label="Restar uno"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-12 text-center text-sm font-black text-stone-900">
                    {cantidad}
                  </span>
                  <button
                    onClick={() => setCantidad((prev) => (stockCantidad > 0 ? Math.min(stockCantidad, prev + 1) : prev + 1))}
                    className="w-9 h-9 flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                    aria-label="Sumar uno"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#c5a059]" />
                  </button>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 mb-2">
                Descripción
              </h3>
              <div className="text-xs sm:text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                {producto.descripcion || 'Artículo exclusivo sin descripción detallada.'}
              </div>
            </div>
          </div>

          {/* Action buttons: WhatsApp Checkout and Add to Cart */}
          <div className="space-y-3 pt-6 border-t border-[#f0eae0]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* WhatsApp direct order button */}
              <button
                onClick={handleDirectWhatsAppOrder}
                disabled={isOutOfStock}
                className={`py-4 px-5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-md ${
                  isOutOfStock
                    ? 'bg-stone-200 text-stone-500 cursor-not-allowed border-none'
                    : 'bg-[#25D366] hover:bg-[#20ba59] text-white shadow-emerald-600/20 cursor-pointer transform hover:-translate-y-0.5'
                }`}
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                {isOutOfStock ? 'Agotado' : 'Pedir por WhatsApp'}
              </button>

              {/* Add to Order Bag button */}
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`py-4 px-5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-xs ${
                  isOutOfStock
                    ? 'bg-stone-100 text-stone-400 cursor-not-allowed border-none'
                    : 'bg-[#0c0a08] hover:bg-stone-800 text-[#f7e8c5] border border-[#c5a059]/40 hover:border-[#c5a059] cursor-pointer'
                }`}
              >
                <ShoppingBag className="w-4 h-4 text-[#c5a059]" />
                Añadir a la Bolsa
              </button>
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-stone-600">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#faf7f0] border border-[#ece4d5]">
                <CheckCircle2 className="w-4 h-4 text-[#c5a059] shrink-0" />
                <span>Garantía AlexStore</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#faf7f0] border border-[#ece4d5]">
                <ShieldCheck className="w-4 h-4 text-[#c5a059] shrink-0" />
                <span>Atención Oficial</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <div className="pt-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#eae3d5] pb-4">
            <div>
              <h2 className="text-xl font-black text-stone-900 tracking-tight">
                Colección Relacionada
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Más artículos en {producto.categoria?.nombre || 'esta categoría'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((rel) => (
              <ProductCard
                key={rel.id}
                producto={rel}
                onSelect={(p) => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  onSelectProduct(p);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
