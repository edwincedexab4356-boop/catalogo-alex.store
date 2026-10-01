import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Producto, Categoria } from '../../types/database';
import { storageService } from '../../services/storageService';
import { useToast } from '../../contexts/ToastContext';
import {
  UploadCloud,
  X,
  Plus,
  Loader2,
  Star,
  Link as LinkIcon,
  Image as ImageIcon,
} from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, initialStock?: { cantidad: number; stock_minimo: number }) => Promise<void>;
  productToEdit?: Producto | null;
  categorias: Categoria[];
}

interface ImageItem {
  id: string;
  previewUrl: string;
  file?: File;
  isRemote?: boolean;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  productToEdit,
  categorias,
}) => {
  const isEditing = Boolean(productToEdit);
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast();

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [activo, setActivo] = useState(true);

  // Up to 4 images manager
  const [imageList, setImageList] = useState<ImageItem[]>([]);
  const [urlInput, setUrlInput] = useState('');

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

      // Collect existing images up to 4
      const urls: string[] = [];
      if (productToEdit.imagen_url) {
        urls.push(productToEdit.imagen_url);
      }
      if (Array.isArray(productToEdit.imagenes)) {
        productToEdit.imagenes.forEach((u) => {
          if (u && !urls.includes(u) && urls.length < 4) {
            urls.push(u);
          }
        });
      }

      setImageList(
        urls.map((u) => ({
          id: Math.random().toString(36).substring(2, 9),
          previewUrl: u,
          isRemote: true,
        }))
      );
      setUrlInput('');
    } else {
      setNombre('');
      setDescripcion('');
      setPrecio('');
      setCategoriaId(categorias[0]?.id?.toString() || '');
      setActivo(true);
      setImageList([]);
      setUrlInput('');
      setCantidad(10);
      setStockMinimo(3);
    }
  }, [productToEdit, categorias, isOpen]);

  // Handle file uploads from device (up to 4 total)
  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const availableSlots = 4 - imageList.length;
    if (availableSlots <= 0) {
      toastError('Ya has alcanzado el límite máximo de 4 fotos por producto.');
      e.target.value = '';
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      toastInfo(`Solo se añadieron las primeras ${availableSlots} fotos (máximo 4 permitidas).`);
    }

    const validNewItems: ImageItem[] = [];
    for (const file of filesToProcess) {
      const validation = storageService.validateImageFile(file);
      if (validation.valid) {
        validNewItems.push({
          id: Math.random().toString(36).substring(2, 9),
          previewUrl: URL.createObjectURL(file),
          file,
        });
      } else {
        toastError(validation.error || `Archivo "${file.name}" inválido.`);
      }
    }

    setImageList((prev) => [...prev, ...validNewItems]);
    e.target.value = '';
  };

  // Add image by direct URL
  const handleAddUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;

    if (imageList.length >= 4) {
      toastError('Límite de 4 fotos alcanzado. Elimina una para añadir otra.');
      return;
    }

    const clean = urlInput.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      toastError('La URL debe comenzar con http:// o https://');
      return;
    }

    setImageList((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        previewUrl: clean,
        isRemote: true,
      },
    ]);
    setUrlInput('');
    toastSuccess('Foto agregada a la lista.');
  };

  // Set any photo as the main cover photo (slot 1)
  const handleMakeMain = (index: number) => {
    if (index === 0) return;
    setImageList((prev) => {
      const copy = [...prev];
      const [selected] = copy.splice(index, 1);
      copy.unshift(selected);
      return copy;
    });
    toastInfo('Foto establecida como principal (portada).');
  };

  // Remove photo
  const handleRemoveImage = (index: number) => {
    setImageList((prev) => prev.filter((_, i) => i !== index));
  };

  // Form submission
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

      // Upload any local files to Supabase Storage
      const finalUrls: string[] = [];
      const pendingUploads = imageList.filter((img) => img.file);
      let uploadIndex = 0;

      for (let i = 0; i < imageList.length; i++) {
        const item = imageList[i];
        if (item.file) {
          uploadIndex += 1;
          setUploadProgress(`Subiendo foto ${uploadIndex} de ${pendingUploads.length} a Supabase Storage...`);
          const uploadRes = await storageService.uploadFile(item.file, 'productos');
          finalUrls.push(uploadRes.publicUrl);
        } else {
          finalUrls.push(item.previewUrl);
        }
      }

      setUploadProgress('Guardando producto en base de datos...');

      await onSubmit(
        {
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          precio: numericPrice,
          categoria_id: categoriaId && categoriaId.trim() !== '' ? categoriaId.trim() : null,
          imagen_url: finalUrls[0] || null, // Slot 1 is main cover
          imagenes: finalUrls, // Array with up to 4 images
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
          : 'Crea un nuevo producto en public.productos con hasta 4 fotos e inventario'
      }
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Nombre del Producto *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Reloj Royal Gold Chronograph"
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
              <option value="">Sin categoría asignada</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Precio (COP $) *
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

          <div className="sm:col-span-2 flex items-center gap-3 pt-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c5a059]"></div>
              <span className="ml-3 text-xs sm:text-sm font-semibold text-slate-700">
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

        {/* Fotos del Producto (Hasta 4 fotos) */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                Fotos del Producto ({imageList.length} de 4)
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Puedes subir <strong>hasta 4 imágenes</strong> por producto. La primera será la portada principal.
              </p>
            </div>

            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              imageList.length === 4
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-50 text-emerald-700'
            }`}>
              {imageList.length}/4 fotos cargadas
            </span>
          </div>

          {/* 4 Slots Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((index) => {
              const item = imageList[index];
              const isMain = index === 0;

              return (
                <div
                  key={index}
                  className={`relative aspect-square rounded-2xl border-2 overflow-hidden flex flex-col items-center justify-center transition-all ${
                    item
                      ? isMain
                        ? 'border-[#c5a059] bg-stone-900 shadow-md ring-2 ring-[#c5a059]/30'
                        : 'border-slate-200 bg-slate-50'
                      : 'border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  {item ? (
                    <>
                      <img
                        src={item.previewUrl}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover"
                      />

                      {/* Top Badges / Actions */}
                      <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between z-10">
                        {isMain ? (
                          <span className="bg-[#0c0a08]/90 text-[#c5a059] border border-[#c5a059]/40 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-sm">
                            <Star className="w-3 h-3 fill-[#c5a059]" />
                            Portada
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMakeMain(index)}
                            className="bg-[#0c0a08]/80 hover:bg-[#c5a059] text-white hover:text-black text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm transition-colors cursor-pointer"
                            title="Hacer foto principal"
                          >
                            ⭐ Portada
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="bg-rose-600/90 hover:bg-rose-600 text-white rounded-full p-1 shadow-md transition-colors cursor-pointer"
                          title="Eliminar foto"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Bottom position label */}
                      <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                        #{index + 1}
                      </div>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center p-2 text-center cursor-pointer group">
                      <div className="w-8 h-8 rounded-full bg-slate-200 group-hover:bg-[#c5a059]/20 group-hover:text-[#c5a059] text-slate-500 flex items-center justify-center transition-colors mb-1.5">
                        <Plus className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900">
                        {isMain ? 'Foto Portada' : `Foto #${index + 1}`}
                      </span>
                      <span className="text-[9px] text-slate-400 mt-0.5">
                        Click para subir
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={handleFilesChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Row: Multiple Upload Button + URL Input */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Device Upload */}
              <label
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  imageList.length >= 4
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-[#0c0a08] hover:bg-stone-800 text-[#f7e8c5] border border-[#c5a059]/40'
                }`}
              >
                <UploadCloud className="w-4 h-4 text-[#c5a059]" />
                <span>Subir fotos desde dispositivo</span>
                <input
                  type="file"
                  multiple
                  disabled={imageList.length >= 4}
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleFilesChange}
                  className="hidden"
                />
              </label>

              <span className="text-xs text-slate-400 text-center sm:text-left">
                (Puedes seleccionar hasta 4 fotos simultáneamente)
              </span>
            </div>

            {/* Direct URL input fallback */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  value={urlInput}
                  disabled={imageList.length >= 4}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddUrl();
                    }
                  }}
                  placeholder={
                    imageList.length >= 4
                      ? 'Límite máximo de 4 fotos alcanzado'
                      : 'O pegar enlace directo de imagen (https://...)...'
                  }
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[#c5a059] bg-white disabled:bg-slate-100"
                />
              </div>
              <button
                type="button"
                onClick={() => handleAddUrl()}
                disabled={imageList.length >= 4 || !urlInput.trim()}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-40 transition-colors cursor-pointer shrink-0"
              >
                Agregar Foto
              </button>
            </div>
          </div>
        </div>

        {/* Progress notification during upload */}
        {uploadProgress && (
          <div className="p-3.5 rounded-xl bg-[#faf6ed] border border-[#eedab2] text-xs font-semibold text-[#7d561a] flex items-center gap-2.5 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-[#c5a059]" />
            <span>{uploadProgress}</span>
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
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0c0a08] hover:bg-stone-800 text-[#f7e8c5] border border-[#c5a059]/40 font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
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
