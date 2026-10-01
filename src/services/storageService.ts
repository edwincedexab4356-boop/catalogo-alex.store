import { supabase } from '../lib/supabase';
import { StorageStats, DatabaseStats, StorageFileItem } from '../types/database';

export const BUCKET_NAME = 'productos';
export const FREE_TIER_STORAGE_BYTES = 1024 * 1024 * 1024; // 1 GB
export const FREE_TIER_DB_BYTES = 500 * 1024 * 1024; // 500 MB

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const storageService = {
  /**
   * Valida formato de archivo (JPG, JPEG, PNG, WEBP)
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      return {
        valid: false,
        error: 'Formato inválido. Solo se admiten archivos JPG, JPEG, PNG y WEBP.',
      };
    }
    // Limit to 10MB per image
    if (file.size > 10 * 1024 * 1024) {
      return {
        valid: false,
        error: 'La imagen excede el límite máximo recomendado de 10 MB.',
      };
    }
    return { valid: true };
  },

  /**
   * Sube un archivo desde el dispositivo del usuario a Supabase Storage
   */
  async uploadFile(file: File, folder: string = 'productos'): Promise<{ publicUrl: string; path: string }> {
    const validation = this.validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Clean file name
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanBaseName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 30);
    const fileName = `${folder}/${timestamp}_${cleanBaseName}_${randomSuffix}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      // Provide actionable error details
      if (uploadError.message?.toLowerCase().includes('bucket not found') || (uploadError as any).statusCode === '404') {
        throw new Error(
          `El bucket '${BUCKET_NAME}' no existe aún en tu Supabase Storage. Créalo como público en Supabase -> Storage -> Create bucket ('productos', Public: ON).`
        );
      }
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return {
      publicUrl: urlData.publicUrl,
      path: fileName,
    };
  },

  /**
   * Sube múltiples archivos desde el dispositivo
   */
  async uploadMultipleFiles(files: File[], folder: string = 'galeria'): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const res = await this.uploadFile(file, folder);
      urls.push(res.publicUrl);
    }
    return urls;
  },

  /**
   * Elimina un archivo de Supabase Storage dada su URL o path
   */
  async deleteFileByUrl(fileUrl: string): Promise<void> {
    if (!fileUrl || !fileUrl.includes(BUCKET_NAME)) return;

    try {
      // Extract path after /productos/
      const parts = fileUrl.split(`/${BUCKET_NAME}/`);
      if (parts.length > 1) {
        const filePath = decodeURIComponent(parts[1].split('?')[0]);
        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([filePath]);
        if (error) {
          console.warn('Error deleting old image from storage:', error.message);
        }
      }
    } catch (err) {
      console.warn('Could not parse or delete file URL:', err);
    }
  },

  /**
   * Obtiene estadísticas de uso del Storage de Supabase (bucket productos)
   */
  async getStorageStats(): Promise<StorageStats> {
    try {
      // List root and common folders
      const { data: rootItems, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list('', { limit: 500, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) {
        console.warn('Error listing bucket items:', error.message);
        return {
          totalFiles: 0,
          totalSizeBytes: 0,
          usedFormatted: '0 MB',
          maxQuotaBytes: FREE_TIER_STORAGE_BYTES,
          percentageUsed: 0,
          remainingBytes: FREE_TIER_STORAGE_BYTES,
          remainingFormatted: '1.00 GB',
          files: [],
        };
      }

      let allFiles: StorageFileItem[] = [];
      let totalBytes = 0;

      for (const item of rootItems || []) {
        if (item.id === null) {
          // It's a folder, list subfolder items
          const { data: subItems } = await supabase.storage
            .from(BUCKET_NAME)
            .list(item.name, { limit: 500 });
          for (const sub of subItems || []) {
            if (sub.name !== '.emptyFolderPlaceholder') {
              const size = sub.metadata?.size || 0;
              totalBytes += size;
              allFiles.push({
                ...sub,
                name: `${item.name}/${sub.name}`,
                size,
              });
            }
          }
        } else if (item.name !== '.emptyFolderPlaceholder') {
          const size = item.metadata?.size || 0;
          totalBytes += size;
          allFiles.push({
            ...item,
            size,
          });
        }
      }

      const percentageUsed = Math.min(100, Number(((totalBytes / FREE_TIER_STORAGE_BYTES) * 100).toFixed(2)));
      const remainingBytes = Math.max(0, FREE_TIER_STORAGE_BYTES - totalBytes);

      return {
        totalFiles: allFiles.length,
        totalSizeBytes: totalBytes,
        usedFormatted: formatBytes(totalBytes),
        maxQuotaBytes: FREE_TIER_STORAGE_BYTES,
        percentageUsed,
        remainingBytes,
        remainingFormatted: formatBytes(remainingBytes),
        files: allFiles,
      };
    } catch (e) {
      console.error('Error fetching storage stats:', e);
      return {
        totalFiles: 0,
        totalSizeBytes: 0,
        usedFormatted: '0 MB',
        maxQuotaBytes: FREE_TIER_STORAGE_BYTES,
        percentageUsed: 0,
        remainingBytes: FREE_TIER_STORAGE_BYTES,
        remainingFormatted: '1.00 GB',
        files: [],
      };
    }
  },

  /**
   * Obtiene estadísticas estimadas de uso de la base de datos (conteo de filas en tablas)
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      const [prodRes, catRes, invRes, perfRes] = await Promise.all([
        supabase.from('productos').select('*', { count: 'exact', head: true }),
        supabase.from('categorias').select('*', { count: 'exact', head: true }),
        supabase.from('inventario').select('*', { count: 'exact', head: true }),
        supabase.from('perfiles').select('*', { count: 'exact', head: true }),
      ]);

      const counts = {
        productos: prodRes.count ?? 0,
        categorias: catRes.count ?? 0,
        inventario: invRes.count ?? 0,
        perfiles: perfRes.count ?? 0,
      };

      const totalRows = counts.productos + counts.categorias + counts.inventario + counts.perfiles;
      // PostgreSQL baseline table/schema metadata + approx ~2KB per row + indexes
      const baseSchemaSize = 25 * 1024 * 1024; // Supabase default template databases start ~25-35MB with auth/pg_catalog
      const rowSizeEstimate = totalRows * 2048;
      const estimatedBytes = baseSchemaSize + rowSizeEstimate;

      const percentageUsed = Math.min(100, Number(((estimatedBytes / FREE_TIER_DB_BYTES) * 100).toFixed(2)));
      const remainingBytes = Math.max(0, FREE_TIER_DB_BYTES - estimatedBytes);

      return {
        tableCounts: counts,
        totalRows,
        estimatedSizeBytes: estimatedBytes,
        usedFormatted: formatBytes(estimatedBytes),
        maxQuotaBytes: FREE_TIER_DB_BYTES,
        percentageUsed,
        remainingFormatted: formatBytes(remainingBytes),
      };
    } catch (e) {
      console.error('Error fetching DB stats:', e);
      return {
        tableCounts: { productos: 0, categorias: 0, inventario: 0, perfiles: 0 },
        totalRows: 0,
        estimatedSizeBytes: 28 * 1024 * 1024,
        usedFormatted: '28 MB',
        maxQuotaBytes: FREE_TIER_DB_BYTES,
        percentageUsed: 5.6,
        remainingFormatted: '472 MB',
      };
    }
  },
};
