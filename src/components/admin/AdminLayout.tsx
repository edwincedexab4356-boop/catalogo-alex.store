import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AdminSidebar, AdminTab } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { Loader2, ShieldAlert } from 'lucide-react';

interface AdminLayoutProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onNavigateCatalog: () => void;
  onNavigateLogin: () => void;
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onSelectTab,
  onNavigateCatalog,
  onNavigateLogin,
  title,
  subtitle,
  actionButton,
  children,
}) => {
  const { user, isAdmin, loading, error } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 1. Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0a08] flex flex-col items-center justify-center text-white p-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#c5a059] mb-4" />
        <h2 className="text-lg font-bold text-white">Verificando Credenciales de Administrador...</h2>
        <p className="text-xs text-stone-400 mt-1">Consultando public.perfiles en Supabase</p>
      </div>
    );
  }

  // 2. Unauthenticated check
  if (!user) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#eae3d5] p-8 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#faf6ed] text-[#c5a059] flex items-center justify-center mx-auto border border-[#eedab2]">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-stone-900">Acceso Restringido</h2>
          <p className="text-xs sm:text-sm text-stone-600">
            Debes iniciar sesión con una cuenta autorizada para acceder al panel de administración de AlexStore.
          </p>
          <div className="pt-2">
            <button
              onClick={onNavigateLogin}
              className="w-full py-3 px-4 rounded-xl bg-[#0c0a08] hover:bg-stone-800 text-[#f7e8c5] border border-[#c5a059]/40 font-bold text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
            >
              Iniciar Sesión como Administrador
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated but NOT admin check
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 p-8 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Permisos Insuficientes</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Tu cuenta (<strong>{user.email}</strong>) no posee el rol <code className="bg-rose-50 text-rose-700 px-1 py-0.5 rounded font-mono">admin</code> en la tabla <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">public.perfiles</code>.
          </p>
          <div className="pt-2 space-y-2">
            <button
              onClick={onNavigateLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors"
            >
              Cambiar de Cuenta
            </button>
            <button
              onClick={onNavigateCatalog}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
            >
              Volver al Catálogo Público
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <AdminSidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        onNavigateCatalog={onNavigateCatalog}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title={title}
          subtitle={subtitle}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onNavigateCatalog={onNavigateCatalog}
          actionButton={actionButton}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
