import React, { useState, useEffect } from 'react';
import { productosService } from '../../services/productosService';
import { categoriasService } from '../../services/categoriasService';
import { Producto, Categoria } from '../../types/database';
import { ProductCard } from '../../components/catalog/ProductCard';
import { ProductFilters } from '../../components/catalog/ProductFilters';
import { Sparkles, Package, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

interface HomePageProps {
  onSelectProduct: (p: Producto) => void;
  selectedCategoriaId: number | string | null;
  onSelectCategoria: (id: number | string | null) => void;
  searchTerm: string;
  onOpenConfigModal?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSelectProduct,
  selectedCategoriaId,
  onSelectCategoria,
  searchTerm,
  onOpenConfigModal,
}) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'name_asc'>('newest');

  const loadCatalog = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const [prods, cats] = await Promise.all([
        productosService.getProductos({
          onlyActive: true,
          categoriaId: selectedCategoriaId,
          search: searchTerm,
          sortBy,
        }),
        categoriasService.getCategorias(true), // Only active categories
      ]);
      setProductos(prods || []);
      setCategorias(cats || []);
    } catch (err: any) {
      console.warn('Notice loading catalog data:', err);
      setFetchError(err?.message || 'No se pudieron sincronizar los productos en este momento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [selectedCategoriaId, searchTerm, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* AlexStore Hero Banner */}
      <section className="relative rounded-3xl bg-[#0c0a08] text-white overflow-hidden p-8 sm:p-12 lg:p-16 border border-[#2b241b] shadow-xl">
        {/* Subtle Warm Gold Light */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-[#c5a059]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-10 w-64 h-64 bg-[#d2a848]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1b1712] border border-[#c5a059]/40 text-[#f1eaa7] text-xs font-bold uppercase tracking-[0.15em]">
            <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" />
            AlexStore • Catálogo Oficial
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
            Colección Selecta <br />
            <span className="text-[#c5a059]">Disponibilidad en Vivo</span>
          </h1>

          <p className="text-stone-300 text-xs sm:text-sm leading-relaxed max-w-xl">
            La mejor calidad 1:1 en tu tienda de confianza. Diseños exclusivos con acabados de máximo nivel y atención directa a tu WhatsApp. ¡Pide el tuyo antes de que se agote!
          </p>
        </div>
      </section>

      {/* Filters: Category pills, count and sorting */}
      <ProductFilters
        categorias={categorias}
        selectedCategoriaId={selectedCategoriaId}
        onSelectCategoria={onSelectCategoria}
        sortBy={sortBy}
        onSortChange={setSortBy}
        totalProductsCount={productos.length}
      />

      {/* Fetch error graceful message */}
      {fetchError && (
        <div className="p-4 rounded-2xl bg-[#fdf5e6] border border-[#eedab2] text-[#7d561a] text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#c5a059] shrink-0" />
            <span>{fetchError}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadCatalog}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c0a08] text-[#f7e8c5] font-bold text-xs hover:bg-stone-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reintentar
            </button>
            {onOpenConfigModal && (
              <button
                onClick={onOpenConfigModal}
                className="px-3 py-1.5 rounded-lg border border-[#c5a059]/40 text-stone-800 font-semibold text-xs hover:bg-white transition-colors"
              >
                Verificar Supabase
              </button>
            )}
          </div>
        </div>
      )}

      {/* Product Grid Area */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-stone-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#c5a059] mb-3" />
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Cargando catálogo AlexStore...
          </span>
        </div>
      ) : productos.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-[#eae3d5] p-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#faf6ed] text-[#c5a059] flex items-center justify-center mx-auto border border-[#eedab2]">
            <Package className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h3 className="text-lg font-bold text-stone-900">No hay productos en esta selección</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
            {searchTerm || selectedCategoriaId
              ? 'No se encontraron artículos que coincidan con los filtros aplicados.'
              : 'Pronto añadiremos nuevos artículos exclusivos a nuestra colección.'}
          </p>

          {(searchTerm || selectedCategoriaId) && (
            <button
              onClick={() => onSelectCategoria(null)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0c0a08] text-[#f7e8c5] text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors shadow-xs"
            >
              Restablecer Filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {productos.map((producto) => (
            <ProductCard
              key={producto.id}
              producto={producto}
              onSelect={onSelectProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
};
