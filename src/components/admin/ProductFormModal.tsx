import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Producto, Categoria } from '../../types/database';
import { storageService } from '../../services/storageService';
import { UploadCloud, X, Plus, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: {
      nombre: string;
      descripcion?: string | null;
      precio: number;
      categoria_id?: number | string | null;
      imagen_url?: string | null;
      imagenes?: string[];
      activo: boolean;
    },
    initialStock?: { cantidad: number; stock_minimo: number }
  ) => Promise<void>;
  productToEdit?: Producto | null;
  categorias: Categoria[];
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  productToEdit,
  categorias,
}) => {
  const isEditing = Boolean(productToEdit);
  const { error: toastError, success: toastSuccess } = useToast();

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState<string>('');
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [activo, setActivo] = useState(true);

  // Main Image state
  const [mainImageUrl, setMainImageUrl] = useState<string>('');
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [mainPreview, setMainPreview] = useState<string>('');

  // Additional Images
  const [additionalUrls, setAdditionalUrls] = useState<string[]>([]);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);

  // Initial stock for new products
  const [cantidad, setCantidad] = useState<number>(10);
  const [stockMinimo, setStockMinimo] = useState<number>(3);

  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  useEffect(() => {
    if (productToEdit) {
      setNombre(productToEdit.nombre || '');
      setDescripcion(productToEdit.descripcion || '');
      setPrecio(productToEdit.precio ? productToEdit.precio.toString() : '0');
      setCategoriaId(productToEdit.categoria_id ? productToEdit.categoria_id.toString() : '');
      setActivo(productToEdit.activo ?? true);
      setMainImageUrl(productToEdit.imagen_url || '');
      setMainPreview(productToEdit.imagen_url || '');
      setAdditionalUrls(productToEdit.imagenes || []);
      setAdditionalPreviews(productToEdit.imagenes || []);
      setMainFile(null);
      setAdditionalFiles([]);
    } else {
      setNombre('');
      setDescripcion('');
      setPrecio('');
      setCategoriaId(categorias[0]?.id?.toString() || '');
      setActivo(true);
      setMainImageUrl('');
      setMainPreview('');
      setMainFile(null);
      setAdditionalUrls([]);
      setAdditionalFiles([]);
      setAdditionalPreviews([]);
      setCantidad(10);
      setStockMinimo(3);
    }
  }, [productToEdit, categorias, isOpen]);

  // Handle main image file selection from local device
  const handleMainFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = storageService.validateImageFile(file);
    if (!validation.valid) {
      toastError(validation.error || 'Archivo inválido');
      return;
    }

    setMainFile(file);
    const objectUrl = URL.createObjectURL(file);
    setMainPreview(objectUrl);
  };

  // Handle additional images from local device
  const handleAdditionalFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of files) {
      const val = storageService.validateImageFile(file);
      if (val.valid) {
        newFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      } else {
        toastError(`El archivo "${file.name}" no es válido (solo JPG, PNG, WEBP).`);
      }
    }

    setAdditionalFiles((prev) => [...prev, ...newFiles]);
    setAdditionalPreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveAdditionalPreview = (index: number) => {
    // If it was already an uploaded URL
    if (index < additionalUrls.length) {
      setAdditionalUrls((prev) => prev.filter((_, i) => i !== index));
      setAdditionalPreviews((prev) => prev.filter((_, i) => i !== index));
    } else {
      // It was in the newly added files
      const fileIndex = index - additionalUrls.length;
      setAdditionalFiles((prev) => prev.filter((_, i) => i !== fileIndex));
      setAdditionalPreviews((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toastError('El nombre del producto es obligatorio.');
      return;
    }

    const numericPrice = parseFloat(precio);
    if (isNaN(numericPrice) || numericPrice < 0) {
      toastError('Ingresa un precio válido mayor o igual a 0.');
      return;
    }

    try {
      setSaving(true);
      let finalMainUrl = mainImageUrl;

      // 1. Upload main image to Supabase Storage if a local file was chosen
      if (mainFile) {
        setUploadProgress('Subiendo imagen principal a Supabase Storage...');
        const uploadRes = await storageService.uploadFile(mainFile, 'productos');
        finalMainUrl = uploadRes.publicUrl;

        // If replacing an old image in Supabase, attempt to clean it up
        if (productToEdit?.imagen_url && productToEdit.imagen_url !== finalMainUrl) {
          storageService.deleteFileByUrl(productToEdit.imagen_url).catch(() => {});
        }
      }

      // 2. Upload additional images to Supabase Storage
      let finalAdditionalUrls = [...additionalUrls];
      if (additionalFiles.length > 0) {
        setUploadProgress(`Subiendo ${additionalFiles.length} imágenes adicionales a Supabase Storage...`);
        const uploadedUrls = await storageService.uploadMultipleFiles(additionalFiles, 'galeria');
        finalAdditionalUrls = [...finalAdditionalUrls, ...uploadedUrls];
      }

      setUploadProgress('Guardando datos en Supabase...');
      await onSubmit(
        {
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          precio: numericPrice,
          categoria_id: categoriaId ? categoriaId : null,
          imagen_url: finalMainUrl || null,
          imagenes: finalAdditionalUrls,
          activo,
        },
        !isEditing ? { cantidad, stock_minimo: stockMinimo } : undefined
      );

      toastSuccess(
        isEditing ? 'Producto actualizado correctamente' : 'Producto creado correctamente'
      );
      onClose();
    } catch (err: any) {
      console.error('Submit product error:', err);
      toastError(err.message || 'Error al guardar el producto en Supabase');
    } finally {
      setSaving(false);
      setUploadProgress('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Producto' : 'Nuevo Producto'}
      subtitle={
        isEditing
          ? 'Modifica los datos del producto en public.productos'
          : 'Crea un nuevo producto en public.productos con inventario asociado'
      }
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: Nombre & Categoría */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Nombre del Producto *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Cafetera Italiana Express"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] text-sm text-stone-900 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Categoría
            </label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] text-sm text-stone-900 bg-white"
            >
              <option value="">-- Sin categoría asignada --</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {!c.activo ? '(Inactiva)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Precio & Estado Activo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Precio (COP / USD) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                $
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="45000"
                required
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] text-sm text-stone-900 bg-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c5a059]"></div>
              <span className="ml-3 text-sm font-semibold text-slate-700">
                {activo ? 'Producto Activo (Visible en Catálogo)' : 'Producto Oculto / Inactivo'}
              </span>
            </label>
          </div>
        </div>

        {/* Initial inventory fields when creating */}
        {!isEditing && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              Inventario Inicial (public.inventario)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Cantidad Inicial de Unidades
                </label>
                <input
                  type="number"
                  min="0"
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Alerta de Stock Mínimo
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockMinimo}
                  onChange={(e) => setStockMinimo(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Descripción */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Descripción Detallada
          </label>
          <textarea
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describe las características principales, materiales, dimensiones..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] text-sm text-stone-900 bg-white"
          />
        </div>

        {/* Imagen Principal (desde dispositivo -> Supabase Storage) */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Imagen Principal del Producto (Supabase Storage)
          </label>

          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* Preview Box */}
            <div className="relative w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
              {mainPreview ? (
                <>
                  <img
                    src={mainPreview}
                    alt="Preview principal"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMainPreview('');
                      setMainImageUrl('');
                      setMainFile(null);
                    }}
                    className="absolute top-1 right-1 bg-slate-900/80 text-white rounded-full p-1 hover:bg-rose-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                  <ImageIcon className="w-8 h-8 opacity-40 mb-1" />
                  <span className="text-[10px]">Sin imagen</span>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="flex-1 space-y-2">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0c0a08] text-[#f7e8c5] hover:bg-stone-800 border border-[#c5a059]/40 text-xs font-bold cursor-pointer transition-colors shadow-sm">
                <UploadCloud className="w-4 h-4 text-[#c5a059]" />
                Cargar imagen desde mi dispositivo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleMainFileChange}
                  className="hidden"
                />
              </label>

              <div className="text-xs text-slate-400">
                Formatos permitidos: JPG, PNG, WEBP. Se guardará directamente en el bucket{' '}
                <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">productos</code> de Supabase.
              </div>

              {/* Or manual URL fallback */}
              <div className="pt-1">
                <input
                  type="url"
                  value={mainImageUrl}
                  onChange={(e) => {
                    setMainImageUrl(e.target.value);
                    setMainPreview(e.target.value);
                  }}
                  placeholder="O pega una URL directa de imagen..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Galería de Imágenes Adicionales */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Galería de Fotos Adicionales ({additionalPreviews.length})
            </label>

            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c5a059]/40 text-stone-800 hover:bg-[#faf6ed] text-xs font-semibold cursor-pointer transition-colors">
              <Plus className="w-3.5 h-3.5 text-[#c5a059]" />
              Añadir más fotos desde mi dispositivo
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleAdditionalFilesChange}
                className="hidden"
              />
            </label>
          </div>

          {additionalPreviews.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
              {additionalPreviews.map((previewUrl, index) => (
                <div
                  key={index}
                  className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100"
                >
                  <img
                    src={previewUrl}
                    alt={`Preview extra ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAdditionalPreview(index)}
                    className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar imagen"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">
              No hay fotos secundarias añadidas. Puedes seleccionar múltiples fotos de una sola vez.
            </div>
          )}
        </div>

        {/* Progress notification during upload */}
        {uploadProgress && (
          <div className="p-3 rounded-xl bg-[#faf6ed] border border-[#eedab2] text-xs font-medium text-[#7d561a] flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#c5a059]" />
            {uploadProgress}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-sm transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0c0a08] hover:bg-stone-800 text-[#f7e8c5] border border-[#c5a059]/40 disabled:opacity-50 font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#c5a059]" />
                Guardando en Supabase...
              </>
            ) : isEditing ? (
              'Guardar Cambios'
            ) : (
              'Crear Producto'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
