import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Categoria } from '../../types/database';
import { storageService } from '../../services/storageService';
import { UploadCloud, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    nombre: string;
    descripcion?: string | null;
    imagen_url?: string | null;
    activo: boolean;
  }) => Promise<void>;
  categoryToEdit?: Categoria | null;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categoryToEdit,
}) => {
  const isEditing = Boolean(categoryToEdit);
  const { error: toastError, success: toastSuccess } = useToast();

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [activo, setActivo] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [preview, setPreview] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (categoryToEdit) {
      setNombre(categoryToEdit.nombre || '');
      setDescripcion(categoryToEdit.descripcion || '');
      setActivo(categoryToEdit.activo ?? true);
      setImageUrl(categoryToEdit.imagen_url || '');
      setPreview(categoryToEdit.imagen_url || '');
      setFile(null);
    } else {
      setNombre('');
      setDescripcion('');
      setActivo(true);
      setImageUrl('');
      setPreview('');
      setFile(null);
    }
  }, [categoryToEdit, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const val = storageService.validateImageFile(f);
    if (!val.valid) {
      toastError(val.error || 'Archivo inválido');
      return;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toastError('El nombre de la categoría es requerido.');
      return;
    }

    try {
      setSaving(true);
      let finalUrl = imageUrl;

      if (file) {
        const uploadRes = await storageService.uploadFile(file, 'categorias');
        finalUrl = uploadRes.publicUrl;
      }

      await onSubmit({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        imagen_url: finalUrl || null,
        activo,
      });

      toastSuccess(
        isEditing ? 'Categoría actualizada correctamente' : 'Categoría creada correctamente'
      );
      onClose();
    } catch (err: any) {
      console.error('Submit category error:', err);
      toastError(err.message || 'Error al guardar la categoría');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
      subtitle={
        isEditing
          ? 'Modifica los datos de la categoría en public.categorias'
          : 'Crea una nueva categoría para agrupar tus productos'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Nombre de la Categoría *
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Calzado, Accesorios, Tecnología..."
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] text-sm text-stone-900 bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Descripción
          </label>
          <textarea
            rows={2}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Breve detalle sobre los productos incluidos..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] text-sm text-stone-900 bg-white"
          />
        </div>

        {/* Imagen de la Categoría */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Imagen Representativa
          </label>
          <div className="flex gap-4 items-center">
            <div className="relative w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
              {preview ? (
                <>
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setPreview('');
                      setImageUrl('');
                      setFile(null);
                    }}
                    className="absolute top-1 right-1 bg-slate-900/80 text-white rounded-full p-1 hover:bg-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <ImageIcon className="w-6 h-6 text-slate-400 opacity-50" />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0c0a08] text-[#f7e8c5] hover:bg-stone-800 border border-[#c5a059]/40 text-xs font-bold cursor-pointer transition-colors">
                <UploadCloud className="w-3.5 h-3.5 text-[#c5a059]" />
                Cargar desde dispositivo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <div className="text-[11px] text-slate-400">
                Se guardará en Supabase Storage (bucket productos).
              </div>
            </div>
          </div>
        </div>

        {/* Activo switch */}
        <div className="pt-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c5a059]"></div>
            <span className="ml-3 text-sm font-semibold text-slate-700">
              {activo ? 'Categoría Activa (Visible en Catálogo)' : 'Categoría Oculta'}
            </span>
          </label>
        </div>

        {/* Buttons */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0c0a08] hover:bg-stone-800 text-[#f7e8c5] border border-[#c5a059]/40 disabled:opacity-50 font-bold text-xs uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#c5a059]" />
                Guardando...
              </>
            ) : isEditing ? (
              'Guardar Cambios'
            ) : (
              'Crear Categoría'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
