import React from 'react';
import { Menu, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  onOpenMobileMenu: () => void;
  onNavigateCatalog: () => void;
  actionButton?: React.ReactNode;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  subtitle,
  onOpenMobileMenu,
  onNavigateCatalog,
  actionButton,
}) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-[#fdfbf7]/95 backdrop-blur-md border-b border-[#eae3d5] px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 text-stone-600 hover:text-stone-900 rounded-xl hover:bg-[#f5efe3] lg:hidden"
          aria-label="Abrir menú de navegación"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-stone-500 hidden sm:block mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {actionButton}

        <button
          onClick={onNavigateCatalog}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#dcd4c3] text-xs font-bold uppercase tracking-wider text-stone-700 hover:bg-[#f5efe3] hover:text-[#0c0a08] transition-colors cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#c5a059]" />
          Ver Catálogo
        </button>
      </div>
    </header>
  );
};
