import React from 'react';
import { BrandLogo } from '../common/BrandLogo';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Boxes,
  HardDrive,
  LogOut,
  ExternalLink,
  ShieldCheck,
  X,
} from 'lucide-react';

export type AdminTab = 'dashboard' | 'productos' | 'categorias' | 'inventario' | 'storage';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onNavigateCatalog: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  onNavigateCatalog,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { user, perfil, signOut } = useAuth();

  const navItems: { id: AdminTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'productos', label: 'Productos', icon: Package },
    { id: 'categorias', label: 'Categorías', icon: FolderTree },
    { id: 'inventario', label: 'Inventario', icon: Boxes },
    { id: 'storage', label: 'Storage & Base de Datos', icon: HardDrive },
  ];

  const handleLogout = async () => {
    if (window.confirm('¿Deseas cerrar la sesión de administrador de AlexStore?')) {
      await signOut();
      onNavigateCatalog();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0c0a08] text-stone-300 border-r border-[#262018] w-64">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#201b14] flex items-center justify-between">
        <BrandLogo size="sm" variant="light" />
        {isOpenMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1 text-stone-400 hover:text-white lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Admin User Info Pill */}
      <div className="p-4 mx-4 my-3 rounded-2xl bg-[#17130f] border border-[#362b1e] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#261f15] border border-[#c5a059]/40 flex items-center justify-center text-[#c5a059]">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-[#f7e8c5] truncate">
            {perfil?.nombre || user?.email?.split('@')[0] || 'Administrador'}
          </div>
          <div className="text-[10px] text-[#c5a059] flex items-center gap-1 font-semibold uppercase tracking-widest mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></span>
            Rol: Admin
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto pt-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8c7a64] px-3 py-1">
          Menú AlexStore
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#221c15] text-[#f7e8c5] border border-[#c5a059]/50 shadow-xs'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-[#16120e] border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#c5a059]' : 'text-stone-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-[#201b14] space-y-2">
        <button
          onClick={onNavigateCatalog}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-stone-400 hover:text-white hover:bg-[#16120e] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-[#c5a059]" />
            Ver Catálogo Público
          </span>
          <span className="text-[10px] bg-[#1d1711] border border-[#3b3021] px-1.5 py-0.5 rounded text-stone-400">Web</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400/90 hover:text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <div className="hidden lg:block h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile drawer overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#0c0a08]/80 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-64 max-w-[80vw] h-full shadow-2xl animate-in slide-in-from-left">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
