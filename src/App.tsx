import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { CartProvider } from './contexts/CartContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { SupabaseConfigModal } from './components/common/SupabaseConfigModal';
import { CartDrawer } from './components/cart/CartDrawer';
import { CartFloatingButton } from './components/cart/CartFloatingButton';
import { HomePage } from './pages/catalog/HomePage';
import { ProductDetailPage } from './pages/catalog/ProductDetailPage';
import { CategoriesPage } from './pages/catalog/CategoriesPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminInventoryPage } from './pages/admin/AdminInventoryPage';
import { AdminStorageMetricsPage } from './pages/admin/AdminStorageMetricsPage';
import { AdminTab } from './components/admin/AdminSidebar';
import { categoriasService } from './services/categoriasService';
import { productosService } from './services/productosService';
import { Categoria, Producto } from './types/database';
import { ProductFormModal } from './components/admin/ProductFormModal';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<number | string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  // Quick product create modal from dashboard
  const [isQuickProductModalOpen, setIsQuickProductModalOpen] = useState(false);
  const [categoriasForModal, setCategoriasForModal] = useState<Categoria[]>([]);

  // Browser navigation sync
  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Global secret shortcut: Ctrl + Shift + A (or Cmd + Shift + A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        navigate('/admin/login');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Secret admin trigger for phone / tablet: 3 taps on logo
  const handleSecretAdminTrigger = () => {
    navigate('/admin/login');
  };

  // Parse path for product or category detail
  useEffect(() => {
    if (currentPath.startsWith('/producto/')) {
      const id = currentPath.replace('/producto/', '');
      if (id) setSelectedProductId(id);
    } else if (currentPath.startsWith('/categoria/')) {
      const catId = currentPath.replace('/categoria/', '');
      if (catId) setSelectedCategoriaId(catId);
    }
  }, [currentPath]);

  // Load categories for quick product creation modal
  const handleOpenQuickProduct = async () => {
    try {
      const cats = await categoriasService.getCategorias(false);
      setCategoriasForModal(cats);
      setIsQuickProductModalOpen(true);
    } catch {
      setIsQuickProductModalOpen(true);
    }
  };

  const handleQuickProductSubmit = async (data: any, initialStock?: any) => {
    await productosService.createProducto(data, initialStock);
    setIsQuickProductModalOpen(false);
    navigate('/admin/productos');
  };

  // Determine active view
  const isAdminRoute = currentPath.startsWith('/admin') && currentPath !== '/admin/login';
  const isLoginPage = currentPath === '/admin/login';

  const renderContent = () => {
    // 1. Admin Login Page
    if (isLoginPage) {
      return (
        <AdminLoginPage
          onLoginSuccess={() => navigate('/admin')}
          onNavigateHome={() => navigate('/')}
          onOpenConfigModal={() => setIsConfigModalOpen(true)}
        />
      );
    }

    // 2. Admin Layout and Protected Pages
    if (isAdminRoute) {
      let currentAdminTab: AdminTab = 'dashboard';
      let title = 'Dashboard';
      let subtitle = 'Control general del catálogo, stock y almacenamiento';

      if (currentPath === '/admin/productos') {
        currentAdminTab = 'productos';
        title = 'Gestión de Productos';
        subtitle = 'Administra catálogo, precios, fotos e inventario en public.productos';
      } else if (currentPath === '/admin/categorias') {
        currentAdminTab = 'categorias';
        title = 'Gestión de Categorías';
        subtitle = 'Crea y edita categorías en public.categorias';
      } else if (currentPath === '/admin/inventario') {
        currentAdminTab = 'inventario';
        title = 'Control de Inventario';
        subtitle = 'Monitorea existencias, alertas de stock mínimo y reposición en public.inventario';
      } else if (currentPath === '/admin/storage') {
        currentAdminTab = 'storage';
        title = 'Capacidad & Storage Supabase';
        subtitle = 'Espacio ocupado y disponible en storage bucket y base de datos';
      }

      return (
        <AdminLayout
          currentTab={currentAdminTab}
          onSelectTab={(tab) => {
            const routes: Record<AdminTab, string> = {
              dashboard: '/admin',
              productos: '/admin/productos',
              categorias: '/admin/categorias',
              inventario: '/admin/inventario',
              storage: '/admin/storage',
            };
            navigate(routes[tab]);
          }}
          onNavigateCatalog={() => navigate('/')}
          onNavigateLogin={() => navigate('/admin/login')}
          title={title}
          subtitle={subtitle}
        >
          {currentAdminTab === 'dashboard' && (
            <AdminDashboardPage
              onNavigateTab={(tab) => {
                const routes: Record<AdminTab, string> = {
                  dashboard: '/admin',
                  productos: '/admin/productos',
                  categorias: '/admin/categorias',
                  inventario: '/admin/inventario',
                  storage: '/admin/storage',
                };
                navigate(routes[tab]);
              }}
              onOpenNewProduct={handleOpenQuickProduct}
            />
          )}
          {currentAdminTab === 'productos' && <AdminProductsPage />}
          {currentAdminTab === 'categorias' && <AdminCategoriesPage />}
          {currentAdminTab === 'inventario' && <AdminInventoryPage />}
          {currentAdminTab === 'storage' && <AdminStorageMetricsPage />}
        </AdminLayout>
      );
    }

    // 3. Product Detail Page
    if (currentPath.startsWith('/producto/') && selectedProductId) {
      return (
        <div className="min-h-screen flex flex-col bg-[#faf8f5]">
          <Navbar
            onNavigateHome={() => navigate('/')}
            onNavigateCategories={() => navigate('/categorias')}
            onSecretAdminTrigger={handleSecretAdminTrigger}
            onOpenConfigModal={() => setIsConfigModalOpen(true)}
            activeTab="catalog"
          />
          <main className="flex-1">
            <ProductDetailPage
              productId={selectedProductId}
              onBack={() => navigate('/')}
              onSelectProduct={(p) => {
                setSelectedProductId(p.id);
                navigate(`/producto/${p.id}`);
              }}
              onSelectCategory={(catId) => {
                setSelectedCategoriaId(catId);
                navigate('/');
              }}
            />
          </main>
          <Footer
            onNavigateHome={() => navigate('/')}
            onNavigateCategories={() => navigate('/categorias')}
            onSecretAdminTrigger={handleSecretAdminTrigger}
            onOpenConfigModal={() => setIsConfigModalOpen(true)}
          />
        </div>
      );
    }

    // 4. Categories Exploration Page
    if (currentPath === '/categorias') {
      return (
        <div className="min-h-screen flex flex-col bg-[#faf8f5]">
          <Navbar
            onNavigateHome={() => navigate('/')}
            onNavigateCategories={() => navigate('/categorias')}
            onSecretAdminTrigger={handleSecretAdminTrigger}
            onOpenConfigModal={() => setIsConfigModalOpen(true)}
            activeTab="categories"
          />
          <main className="flex-1">
            <CategoriesView
              onSelectCategory={(catId) => {
                setSelectedCategoriaId(catId);
                navigate('/');
              }}
              onBackToCatalog={() => navigate('/')}
            />
          </main>
          <Footer
            onNavigateHome={() => navigate('/')}
            onNavigateCategories={() => navigate('/categorias')}
            onSecretAdminTrigger={handleSecretAdminTrigger}
            onOpenConfigModal={() => setIsConfigModalOpen(true)}
          />
        </div>
      );
    }

    // 5. Default Public Catalog Home Page
    return (
      <div className="min-h-screen flex flex-col bg-[#faf8f5]">
        <Navbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          onNavigateHome={() => {
            setSelectedCategoriaId(null);
            setSearchTerm('');
            navigate('/');
          }}
          onNavigateCategories={() => navigate('/categorias')}
          onSecretAdminTrigger={handleSecretAdminTrigger}
          onOpenConfigModal={() => setIsConfigModalOpen(true)}
          activeTab="catalog"
        />

        <main className="flex-1">
          <HomePage
            searchTerm={searchTerm}
            selectedCategoriaId={selectedCategoriaId}
            onSelectCategoria={(id) => setSelectedCategoriaId(id)}
            onSelectProduct={(p: Producto) => {
              setSelectedProductId(p.id);
              navigate(`/producto/${p.id}`);
            }}
            onOpenConfigModal={() => setIsConfigModalOpen(true)}
          />
        </main>

        <Footer
          onNavigateHome={() => {
            setSelectedCategoriaId(null);
            setSearchTerm('');
            navigate('/');
          }}
          onNavigateCategories={() => navigate('/categorias')}
          onSecretAdminTrigger={handleSecretAdminTrigger}
          onOpenConfigModal={() => setIsConfigModalOpen(true)}
        />
      </div>
    );
  };

  return (
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          {renderContent()}

          {/* WhatsApp Cart Drawer */}
          <CartDrawer />

          {/* Floating Cart Button */}
          <CartFloatingButton />

          {/* Global Supabase credentials modal */}
          <SupabaseConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
          />

          {/* Quick Product Modal */}
          {isQuickProductModalOpen && (
            <ProductFormModal
              isOpen={isQuickProductModalOpen}
              onClose={() => setIsQuickProductModalOpen(false)}
              onSubmit={handleQuickProductSubmit}
              categorias={categoriasForModal}
            />
          )}
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

// Helper wrapper for categories list loading
function CategoriesView({
  onSelectCategory,
  onBackToCatalog,
}: {
  onSelectCategory: (id: number | string) => void;
  onBackToCatalog: () => void;
}) {
  const [cats, setCats] = useState<Categoria[]>([]);

  useEffect(() => {
    categoriasService.getCategorias(true).then(setCats).catch(console.error);
  }, []);

  return (
    <CategoriesPage
      categorias={cats}
      onSelectCategory={onSelectCategory}
      onBackToCatalog={onBackToCatalog}
    />
  );
}
