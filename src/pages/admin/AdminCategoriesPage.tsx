import React, { useState, useEffect } from 'react';
import { categoriasService } from '../../services/categoriasService';
import { storageService } from '../../services/storageService';
import { Categoria } from '../../types/database';
import { CategoryFormModal } from '../../components/admin/CategoryFormModal';
import { useToast } from '../../contexts/ToastContext';
import {
  Plus,
  Edit2,
  Trash2,
  FolderTree,
  Image as ImageIcon,
  CheckCircle,
  EyeOff,
  RefreshCw,
} from 'lucide-react';

export const AdminCategoriesPage: React.FC = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Categoria | null>(null);

  const { success: toastSuccess, error: toastError } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await categoriasService.getCategorias(false);
      setCategorias(data);
    } catch (e: any) {
      console.error('Error fetching categories:', e);
      toastError(e.message || 'Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setCategoryToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Categoria) => {
    setCategoryToEdit(c);
    setIsModalOpen(true);
  };

  const handleToggleActivo = async (c: Categoria) => {
    try {
      const nextState = !c.activo;
      await categoriasService.toggleActivo(c.id, nextState);
      setCategorias((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, activo: nextState } : item))
      );
      toastSuccess(`Categoría ${nextState ? 'activada' : 'ocultada'} correctamente`);
    } catch (err: any) {
      toastError(err.message || 'Error al cambiar estado de la categoría');
    }
  };

  const handleDelete = async (c: Categoria) => {
    const hasProducts = (c.total_productos ?? 0) > 0;
    const confirmMsg = hasProducts
      ? `ADVERTENCIA: La categoría "${c.nombre}" tiene ${c.total_productos} productos asociados. Si la eliminas, esos productos quedarán sin categoría (categoria_id = NULL).\n\n¿Deseas continuar?`
      : `¿Estás seguro de eliminar la categoría "${c.nombre}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await categoriasService.deleteCategoria(c.id);
      if (c.imagen_url) {
        storageService.deleteFileByUrl(c.imagen_url).catch(() => {});
      }
      setCategorias((prev) => prev.filter((item) => item.id !== c.id));
      toastSuccess('Categoría eliminada correctamente');
    } catch (err: any) {
      toastError(err.message || 'Error al eliminar categoría de Supabase');
    }
  };

  const handleModalSubmit = async (data: any) => {
    if (categoryToEdit) {
      await categoriasService.updateCategoria(categoryToEdit.id, data);
    } else {
      await categoriasService.createCategoria(data);
    }
    await loadData();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Categorías Registradas ({categorias.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organiza los productos en public.categorias. En el catálogo público solo se verán las categorías activas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Recargar categorías"
            className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0c0a08] hover:bg-stone-800 text-[#f7e8c5] border border-[#c5a059]/40 font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#c5a059]" />
            Nueva Categoría
          </button>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Cargando categorías desde Supabase...
          </div>
        ) : categorias.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FolderTree className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="text-slate-700 font-bold text-sm">No hay categorías creadas aún</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Crea categorías como "Ropa", "Tecnología", "Hogar", etc., para clasificar tus productos.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              Crear Primera Categoría
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th scope="col" className="py-3.5 px-4">
                    Categoría
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Descripción
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Productos
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
                {categorias.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Imagen & Nombre */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {c.imagen_url ? (
                            <img
                              src={c.imagen_url}
                              alt={c.nombre}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FolderTree className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="font-bold text-slate-900">{c.nombre}</div>
                      </div>
                    </td>

                    {/* Descripción */}
                    <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {c.descripcion || <span className="italic text-slate-400">Sin descripción</span>}
                    </td>

                    {/* Cantidad de productos */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        {c.total_productos ?? 0} {c.total_productos === 1 ? 'producto' : 'productos'}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleActivo(c)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                          c.activo
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            c.activo ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {c.activo ? 'Activa' : 'Oculta'}
                      </button>
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          title="Editar categoría"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#c5a059] hover:bg-[#faf6ed] transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          title="Eliminar categoría"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <CategoryFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleModalSubmit}
          categoryToEdit={categoryToEdit}
        />
      )}
    </div>
  );
};
