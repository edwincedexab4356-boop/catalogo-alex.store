import React, { useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { useCart } from '../../contexts/CartContext';
import { Search, Menu, X, SlidersHorizontal, ShoppingBag } from 'lucide-react';

interface NavbarProps {
  onSearchChange?: (val: string) => void;
  searchValue?: string;
  onNavigateHome?: () => void;
  onNavigateCategories?: () => void;
  onSecretAdminTrigger?: () => void;
  onOpenConfigModal?: () => void;
  activeTab?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearchChange,
  searchValue = '',
  onNavigateHome,
  onNavigateCategories,
  onSecretAdminTrigger,
  onOpenConfigModal,
  activeTab = 'catalog',
}) => {
  const { totalItems, setIsCartOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#fdfbf7]/95 backdrop-blur-md border-b border-[#eae3d5] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Logo with 3-tap secret admin trigger & single tap home navigation */}
          <div className="flex items-center">
            <BrandLogo
              size="md"
              variant="dark"
              onSecretAdminTrigger={onSecretAdminTrigger}
              onNavigateHome={onNavigateHome}
            />
          </div>

          {/* Search bar in center (desktop) */}
          {onSearchChange && (
            <div className="hidden md:flex flex-1 max-w-md mx-6">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Buscar en AlexStore..."
                  className="w-full pl-10 pr-8 py-2.5 text-xs sm:text-sm bg-white border border-[#e5decb] hover:border-[#c5a059]/60 focus:border-[#c5a059] rounded-full transition-all text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-[#c5a059]/10 shadow-xs"
                />
                {searchValue && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs bg-stone-100 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
                    aria-label="Limpiar búsqueda"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Desktop Navigation Links (No Admin button visible!) */}
          <nav className="hidden lg:flex items-center gap-2">
            <button
              onClick={onNavigateHome}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                activeTab === 'catalog'
                  ? 'text-[#0f0e0c] bg-[#efe8d8]'
                  : 'text-stone-600 hover:text-[#0f0e0c] hover:bg-[#f5efe3]'
              }`}
            >
              Catálogo
            </button>
            <button
              onClick={onNavigateCategories}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                activeTab === 'categories'
                  ? 'text-[#0f0e0c] bg-[#efe8d8]'
                  : 'text-stone-600 hover:text-[#0f0e0c] hover:bg-[#f5efe3]'
              }`}
            >
              Colecciones
            </button>

            {/* Shopping Bag CTA */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0c0a08] text-[#f7e8c5] hover:bg-stone-800 border border-[#c5a059]/40 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
              aria-label="Abrir bolsa de pedidos"
            >
              <ShoppingBag className="w-4 h-4 text-[#c5a059]" />
              <span>Bolsa</span>
              {totalItems > 0 && (
                <span className="bg-[#25D366] text-[#0c0a08] text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Config modal icon */}
            {onOpenConfigModal && (
              <button
                onClick={onOpenConfigModal}
                title="Configuración de Base de Datos"
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-[#f3ede1] rounded-xl transition-colors ml-1 cursor-pointer"
                aria-label="Configuración de base de datos"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            )}
          </nav>

          {/* Mobile icons: Bag + Menu */}
          <div className="flex items-center gap-2 lg:hidden">
            {/* Mobile Bag icon */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-stone-800 hover:bg-[#f5efe3] rounded-xl transition-colors cursor-pointer"
              aria-label="Bolsa de pedidos"
            >
              <ShoppingBag className="w-6 h-6 text-[#0c0a08]" />
              {totalItems > 0 && (
                <span className="absolute top-1 right-1 bg-[#25D366] text-[#0c0a08] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-stone-700 hover:text-stone-900 rounded-xl hover:bg-[#f5efe3] cursor-pointer"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        {onSearchChange && (
          <div className="pb-3 md:hidden">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar productos en AlexStore..."
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-[#e5decb] rounded-full text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#c5a059]"
              />
              {searchValue && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs bg-stone-200 rounded-full w-4 h-4 flex items-center justify-center"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile menu list (No Admin button visible!) */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#eae3d5] py-3 space-y-1 animate-in slide-in-from-top-2">
            <button
              onClick={() => {
                onNavigateHome?.();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-stone-800 hover:bg-[#f5efe3] cursor-pointer"
            >
              Catálogo
            </button>
            <button
              onClick={() => {
                onNavigateCategories?.();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-stone-800 hover:bg-[#f5efe3] cursor-pointer"
            >
              Colecciones
            </button>
            <button
              onClick={() => {
                setIsCartOpen(true);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#c5a059] bg-[#0c0a08] flex items-center justify-between cursor-pointer"
            >
              <span>Ver Bolsa de Pedidos</span>
              <span>({totalItems})</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
