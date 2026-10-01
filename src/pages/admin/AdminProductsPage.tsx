import React, { useState, useEffect } from 'react';
import { productosService } from '../../services/productosService';
import { categoriasService } from '../../services/categoriasService';
import { storageService } from '../../services/storageService';
import { Producto, Categoria } from '../../types/database';
import { ProductFormModal } from '../../components/admin/ProductFormModal';
import { StockBadge } from '../../components/catalog/StockBadge';
import { useToast } from '../../contexts/ToastContext';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Image as ImageIcon,
  CheckCircle,
  EyeOff,
  Filter,
  RefreshCw,
  AlertCircle,
  Package,
} from 'lucide-react';

export const AdminProductsPage: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Producto | null>(null);

  const { success: toastSuccess, error: toastError } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, cats] = await Promise.all([
        productosService.getProductos(),
        categoriasService.getCategorias(),
      ]);
      setProductos(prods);
      setCategorias(cats);
    } catch (e: any) {
      console.error('Error fetching products list:', e);
      toastError(e.message || 'Error al cargar productos desde Supabase');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setProductToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Producto) => {
    setProductToEdit(p);
    setIsModalOpen(true);
  };

  const handleToggleActivo = async (p: Producto) => {
    try {
      const nextState = !p.activo;
      await productosService.toggleActivo(p.id, nextState);
      setProductos((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, activo: nextState } : item))
      );
      toastSuccess(`Producto ${nextState ? 'activado' : 'desactivado'} correctamente`);
    } catch (err: any) {
      toastError(err.message || 'Error al cambiar estado del producto');
    }
  };

  const handleDelete = async (p: Producto) => {
    const confirm = window.confirm(
      `¿Estás seguro de eliminar permanentemente el producto "${p.nombre}"?\nNota: Si solo deseas que no aparezca en el catálogo público, es preferible desactivarlo.`
    );
    if (!confirm) return;

    try {
      await productosService.deleteProducto(p.id);
      // Clean up storage image if exists
      if (p.imagen_url) {
        storageService.deleteFileByUrl(p.imagen_url).catch(() => {});
      }
      setProductos((prev) => prev.filter((item) => item.id !== p.id));
      toastSuccess('Producto eliminado correctamente');
    } catch (err: any) {
      toastError(err.message || 'Error al eliminar el producto de Supabase');
    }
  };

  const handleModalSubmit = async (data: any, initialStock?: any) => {
    if (productToEdit) {
      const updated = await productosService.updateProducto(productToEdit.id, data);
      await loadData();
    } else {
      await productosService.createProducto(data, initialStock);
      await loadData();
    }
  };

  // Filtered products
  const filteredProducts = productos.filter((p) => {
    const matchSearch =
      searchTerm === '' ||
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat =
      selectedCatFilter === 'all' ||
      (p.categoria_id && p.categoria_id.toString() === selectedCatFilter);
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        {/* Search & Category Filter */}
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059]"
            />
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={selectedCatFilter}
              onChange={(e) => setSelectedCatFilter(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c5a059]/20 text-slate-700"
            >
              <option value="all">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id.toString()}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadData}
            title="Recargar productos"
            className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 hidden sm:block cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Add Product Button */}
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0c0a08] hover:bg-stone-800 text-[#f7e8c5] border border-[#c5a059]/40 font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#c5a059]" />
          Nuevo Producto
        </button>
      </div>

      {/* Products Table / Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Cargando catálogo de productos desde Supabase...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="text-slate-700 font-bold text-sm">No se encontraron productos</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchTerm || selectedCatFilter !== 'all'
                ? 'Intenta cambiar tus filtros de búsqueda.'
                : 'Añade tu primer producto con fotos e inventario.'}
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              Crear Producto Ahora
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th scope="col" className="py-3.5 px-4">
                    Producto
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Categoría
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Precio
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Stock
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Estado
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const stockQty = p.inventario?.cantidad ?? 0;
                  const stockMin = p.inventario?.stock_minimo ?? 3;
                  const formattedPrice = new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0,
                  }).format(p.precio);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Imagen & Nombre */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {p.imagen_url ? (
                              <img
                                src={p.imagen_url}
                                alt={p.nombre}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 line-clamp-1">{p.nombre}</div>
                            {p.imagenes && p.imagenes.length > 0 && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                +{p.imagenes.length} fotos galería
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                        {p.categoria?.nombre || (
                          <span className="text-slate-400 font-normal italic">Sin categoría</span>
                        )}
                      </td>

                      {/* Precio */}
                      <td className="py-3 px-4 font-black text-slate-900 text-xs sm:text-sm">
                        {formattedPrice}
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-4">
                        <StockBadge cantidad={stockQty} stockMinimo={stockMin} showExactCount={true} />
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleActivo(p)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                            p.activo
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.activo ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {p.activo ? 'Activo' : 'Oculto'}
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Editar producto"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#c5a059] hover:bg-[#faf6ed] transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            title="Eliminar producto"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <ProductFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleModalSubmit}
          productToEdit={productToEdit}
          categorias={categorias}
        />
      )}
    </div>
  );
};
