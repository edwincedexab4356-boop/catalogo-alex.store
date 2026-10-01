import React from 'react';
import { Categoria } from '../../types/database';
import { FolderTree, ArrowRight, Package } from 'lucide-react';

interface CategoriesPageProps {
  categorias: Categoria[];
  onSelectCategory: (id: number | string) => void;
  onBackToCatalog: () => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  categorias,
  onSelectCategory,
  onBackToCatalog,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#eae3d5] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Colecciones AlexStore
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Explora las categorías disponibles en nuestro catálogo
          </p>
        </div>

        <button
          onClick={onBackToCatalog}
          className="text-xs font-bold uppercase tracking-wider text-[#c5a059] hover:text-[#9e7a33] transition-colors"
        >
          Ver todo el catálogo →
        </button>
      </div>

      {/* Categories Grid */}
      {categorias.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#eae3d5] p-8 space-y-3">
          <FolderTree className="w-12 h-12 text-[#c5a059] opacity-40 mx-auto" />
          <h3 className="font-bold text-stone-900">No hay categorías configuradas</h3>
          <p className="text-xs text-stone-400">
            Aún no se han configurado categorías activas en Supabase.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categorias.map((cat) => (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="group bg-white rounded-3xl border border-[#eae3d5] overflow-hidden shadow-xs hover:shadow-xl hover:border-[#c5a059]/60 transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div className="relative aspect-video w-full bg-[#faf7f0] overflow-hidden">
                {cat.imagen_url ? (
                  <img
                    src={cat.imagen_url}
                    alt={cat.nombre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
                    <FolderTree className="w-10 h-10 opacity-30 mb-2 text-[#c5a059]" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Colección</span>
                  </div>
                )}

                <div className="absolute top-3 right-3 bg-[#0c0a08]/85 backdrop-blur-md text-[#f1eaa7] text-[10px] font-bold px-3 py-1 rounded-full border border-[#c5a059]/30">
                  {cat.total_productos ?? 0} {cat.total_productos === 1 ? 'artículo' : 'artículos'}
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg text-stone-900 group-hover:text-[#c5a059] transition-colors">
                    {cat.nombre}
                  </h3>
                  {cat.descripcion && (
                    <p className="text-xs text-stone-500 mt-2 line-clamp-2 leading-relaxed">
                      {cat.descripcion}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-[#f4ede3] flex items-center justify-between text-xs font-bold text-[#c5a059]">
                  <span className="uppercase tracking-wider">Explorar artículos</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
