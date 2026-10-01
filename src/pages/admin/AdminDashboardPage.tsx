import React, { useEffect, useState } from 'react';
import { productosService } from '../../services/productosService';
import { categoriasService } from '../../services/categoriasService';
import { inventarioService } from '../../services/inventarioService';
import { Producto, Categoria, Inventario, getStockStatus } from '../../types/database';
import { StockBadge } from '../../components/catalog/StockBadge';
import { StockAdjustModal } from '../../components/admin/StockAdjustModal';
import { supabase } from '../../lib/supabase';
import { SUPABASE_SCHEMA_SQL } from '../../lib/schemaSql';
import { useToast } from '../../contexts/ToastContext';
import {
  Package,
  CheckCircle,
  FolderTree,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Plus,
  RefreshCw,
  Copy,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { AdminTab } from '../../components/admin/AdminSidebar';

interface AdminDashboardPageProps {
  onNavigateTab: (tab: AdminTab) => void;
  onOpenNewProduct: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  onNavigateTab,
  onOpenNewProduct,
}) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [selectedInventario, setSelectedInventario] = useState<Inventario | null>(null);
  const { success: toastSuccess } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      setPermissionError(null);

      // Check if Supabase tables have permission issues (e.g. 42501)
      const { error: testErr } = await supabase.from('productos').select('id').limit(1);
      if (testErr) {
        if (testErr.code === '42501' || testErr.message?.includes('permission denied')) {
          setPermissionError(
            'Tu base de datos Supabase requiere ejecutar permisos SQL (Error 42501). Concede acceso a las tablas con el script de abajo.'
          );
        } else if (testErr.code === '42P01' || testErr.message?.includes('does not exist')) {
          setPermissionError(
            'Las tablas de AlexStore aún no están creadas en Supabase. Ejecuta el script SQL para inicializarlas.'
          );
        }
      }

      const [prods, cats] = await Promise.all([
        productosService.getProductos(),
        categoriasService.getCategorias(),
      ]);
      setProductos(prods);
      setCategorias(cats);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
      setCopiedSql(true);
      toastSuccess('¡Script SQL copiado! Pégalo en el SQL Editor de tu consola Supabase.');
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalProductos = productos.length;
  const productosActivos = productos.filter((p) => p.activo).length;
  const totalCategorias = categorias.length;

  const productosAgotados = productos.filter((p) => {
    const qty = p.inventario?.cantidad ?? 0;
    return qty <= 0;
  });

  const productosStockBajo = productos.filter((p) => {
    const qty = p.inventario?.cantidad ?? 0;
    const min = p.inventario?.stock_minimo ?? 3;
    return qty > 0 && qty <= min;
  });

  const handleStockSave = async (productoId: number | string, cantidad: number, stockMinimo: number) => {
    await inventarioService.updateStock(productoId, cantidad, stockMinimo);
    await loadData();
  };

  return (
    <div className="space-y-8">
      {/* Supabase Error 42501 / Permissions Notice Banner */}
      {permissionError && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-950">
                Atención: Permisos requeridos en Supabase (Error 42501)
              </h3>
              <p className="text-xs text-amber-800 mt-1 max-w-2xl leading-relaxed">
                {permissionError} Para solucionarlo en 1 minuto, copia el script SQL y ejecútalo en el <strong>SQL Editor</strong> de tu proyecto Supabase.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={handleCopySql}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0c0a08] hover:bg-stone-800 text-[#f7e8c5] border border-[#c5a059]/40 font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
            >
              {copiedSql ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ¡Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#c5a059]" />
                  Copiar Script SQL
                </>
              )}
            </button>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors"
              title="Abrir Supabase Dashboard"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Resumen General del Negocio
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Datos sincronizados en tiempo real con Supabase Database & Storage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Recargar datos"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenNewProduct}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0c0a08] hover:bg-stone-800 text-[#f7e8c5] border border-[#c5a059]/40 font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#c5a059]" />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Productos */}
        <div
          onClick={() => onNavigateTab('productos')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:border-[#c5a059] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Productos
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-[#faf6ed] group-hover:text-[#c5a059] transition-colors">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {loading ? '...' : totalProductos}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 group-hover:text-[#c5a059] font-medium">
            Ver catálogo completo <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Productos Activos */}
        <div
          onClick={() => onNavigateTab('productos')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:border-emerald-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Activos (Visibles)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {loading ? '...' : productosActivos}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalProductos > 0
              ? `${Math.round((productosActivos / totalProductos) * 100)}% del total`
              : '0%'}
          </div>
        </div>

        {/* Categorías */}
        <div
          onClick={() => onNavigateTab('categorias')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:border-[#c5a059] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Categorías
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#faf6ed] text-[#c5a059] flex items-center justify-center">
              <FolderTree className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {loading ? '...' : totalCategorias}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 group-hover:text-[#c5a059] font-medium">
            Gestionar categorías <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Stock Bajo */}
        <div
          onClick={() => onNavigateTab('inventario')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Stock Bajo
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">
            {loading ? '...' : productosStockBajo.length}
          </div>
          <div className="text-[11px] text-amber-700/80 mt-1 font-medium">
            Requieren reposición
          </div>
        </div>

        {/* Agotados */}
        <div
          onClick={() => onNavigateTab('inventario')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:border-rose-400 transition-all cursor-pointer group col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Agotados
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">
            {loading ? '...' : productosAgotados.length}
          </div>
          <div className="text-[11px] text-rose-700/80 mt-1 font-medium">
            Sin existencias (0)
          </div>
        </div>
      </div>

      {/* Two Alert Lists as requested in requirements: Stock Bajo and Agotados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List 1: Productos con Stock Bajo */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
              <h3 className="font-bold text-slate-900 text-sm">
                Productos con Stock Bajo ({productosStockBajo.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('inventario')}
              className="text-xs font-bold uppercase tracking-wider text-[#c5a059] hover:underline cursor-pointer"
            >
              Ver inventario →
            </button>
          </div>

          <div className="flex-1 mt-4 space-y-3">
            {productosStockBajo.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                ¡Excelente! No hay productos con stock por debajo del mínimo.
              </div>
            ) : (
              productosStockBajo.map((p) => {
                const qty = p.inventario?.cantidad ?? 0;
                const min = p.inventario?.stock_minimo ?? 3;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-200/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
                        {p.imagen_url ? (
                          <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                            N/A
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">{p.nombre}</div>
                        <div className="text-[11px] text-slate-500">
                          {p.categoria?.nombre || 'General'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-black text-amber-700">{qty} unids.</div>
                        <div className="text-[10px] text-slate-400">Mín: {min}</div>
                      </div>
                      <button
                        onClick={() =>
                          setSelectedInventario(
                            p.inventario || {
                              id: 0,
                              producto_id: p.id,
                              cantidad: qty,
                              stock_minimo: min,
                              producto: p,
                            }
                          )
                        }
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                      >
                        Ajustar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* List 2: Productos Agotados */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
              <h3 className="font-bold text-slate-900 text-sm">
                Productos Agotados ({productosAgotados.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('inventario')}
              className="text-xs font-bold uppercase tracking-wider text-[#c5a059] hover:underline cursor-pointer"
            >
              Ver inventario →
            </button>
          </div>

          <div className="flex-1 mt-4 space-y-3">
            {productosAgotados.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No tienes productos agotados actualmente.
              </div>
            ) : (
              productosAgotados.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-rose-50/50 border border-rose-200/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
                      {p.imagen_url ? (
                        <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                          N/A
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">{p.nombre}</div>
                      <div className="text-[11px] text-slate-500">
                        {p.categoria?.nombre || 'General'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-rose-700">0 unidades</span>
                    <button
                      onClick={() =>
                        setSelectedInventario(
                          p.inventario || {
                            id: 0,
                            producto_id: p.id,
                            cantidad: 0,
                            stock_minimo: 3,
                            producto: p,
                          }
                        )
                      }
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                    >
                      Reponer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal for adjusting stock from dashboard */}
      {selectedInventario && (
        <StockAdjustModal
          isOpen={Boolean(selectedInventario)}
          onClose={() => setSelectedInventario(null)}
          inventarioItem={selectedInventario}
          onSave={handleStockSave}
        />
      )}
    </div>
  );
};
