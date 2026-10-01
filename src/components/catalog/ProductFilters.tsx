import React from 'react';
import { Categoria } from '../../types/database';
import { ArrowUpDown } from 'lucide-react';

interface ProductFiltersProps {
  categorias: Categoria[];
  selectedCategoriaId: number | string | null;
  onSelectCategoria: (id: number | string | null) => void;
  sortBy: 'newest' | 'price_asc' | 'price_desc' | 'name_asc';
  onSortChange: (sort: 'newest' | 'price_asc' | 'price_desc' | 'name_asc') => void;
  totalProductsCount: number;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  categorias,
  selectedCategoriaId,
  onSelectCategoria,
  sortBy,
  onSortChange,
  totalProductsCount,
}) => {
  return (
    <div className="flex flex-col gap-4 py-4 border-b border-[#eae3d5]">
      {/* Category horizontal scroll bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => onSelectCategoria(null)}
          className={`shrink-0 px-4 py-2 rounded-xl text-xs sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            selectedCategoriaId === null
              ? 'bg-[#0c0a08] text-[#f7e8c5] border border-[#c5a059]/40 shadow-xs'
              : 'bg-[#f4efe4] text-stone-700 hover:bg-[#ede5d5] hover:text-stone-900 border border-transparent'
          }`}
        >
          Todos ({totalProductsCount})
        </button>

        {categorias.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategoria(cat.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCategoriaId === cat.id
                ? 'bg-[#0c0a08] text-[#f7e8c5] border border-[#c5a059]/40 shadow-xs'
                : 'bg-[#f4efe4] text-stone-700 hover:bg-[#ede5d5] hover:text-stone-900 border border-transparent'
            }`}
          >
            {cat.nombre}
            {cat.total_productos !== undefined && cat.total_productos > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategoriaId === cat.id
                    ? 'bg-[#c5a059] text-[#0c0a08] font-black'
                    : 'bg-stone-200/80 text-stone-600'
                }`}
              >
                {cat.total_productos}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sorting bar & count */}
      <div className="flex items-center justify-between text-xs sm:text-xs text-stone-500 font-medium">
        <div>
          Mostrando <span className="font-extrabold text-stone-900">{totalProductsCount}</span>{' '}
          {totalProductsCount === 1 ? 'artículo disponible' : 'artículos disponibles'}
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
          <span className="hidden sm:inline text-stone-600 font-medium">Ordenar por:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as any)}
            className="bg-transparent font-bold text-stone-900 border-none focus:outline-none cursor-pointer py-1 text-xs"
          >
            <option value="newest">Más recientes</option>
            <option value="price_asc">Menor precio</option>
            <option value="price_desc">Mayor precio</option>
            <option value="name_asc">Nombre (A - Z)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
