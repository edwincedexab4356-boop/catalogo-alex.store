import React, { useState, useEffect } from 'react';
import { storageService, FREE_TIER_STORAGE_BYTES, FREE_TIER_DB_BYTES } from '../../services/storageService';
import { StorageStats, DatabaseStats } from '../../types/database';
import {
  HardDrive,
  Database,
  Image as ImageIcon,
  RefreshCw,
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export const AdminStorageMetricsPage: React.FC = () => {
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { success: toastSuccess, error: toastError } = useToast();

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const [stor, db] = await Promise.all([
        storageService.getStorageStats(),
        storageService.getDatabaseStats(),
      ]);
      setStorageStats(stor);
      setDbStats(db);
    } catch (e: any) {
      console.error('Error fetching storage/db metrics:', e);
      toastError(e.message || 'Error al calcular métricas de almacenamiento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleDeleteStorageFile = async (filePath: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el archivo "${filePath}" de Supabase Storage?`)) {
      return;
    }
    try {
      await storageService.deleteFileByUrl(`/${filePath}`);
      toastSuccess('Archivo eliminado del storage');
      loadMetrics();
    } catch (err: any) {
      toastError(err.message || 'Error al eliminar archivo');
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#c5a059]" />
            Capacidad y Almacenamiento Supabase
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Espacio restante en tu bucket de archivos e imágenes y capacidad de almacenamiento en tablas PostgreSQL.
          </p>
        </div>

        <button
          onClick={loadMetrics}
          title="Recalcular espacio"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Recalcular Espacio
        </button>
      </div>

      {/* Gauges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Metric Card 1: Supabase Storage Bucket */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#faf6ed] text-[#c5a059] flex items-center justify-center font-bold">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Supabase Storage</h3>
                  <div className="text-[11px] text-slate-500">
                    Bucket: <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">productos</code>
                  </div>
                </div>
              </div>

              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                Plan Free (1 GB)
              </span>
            </div>

            {/* Gauge Progress Bar */}
            <div className="space-y-2 my-5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-bold text-slate-700">Espacio Usado: {storageStats?.usedFormatted || '0 Bytes'}</span>
                <span className="font-extrabold text-[#c5a059]">{storageStats?.percentageUsed ?? 0}%</span>
              </div>

              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#c5a059] to-[#d2a848] rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(2, storageStats?.percentageUsed ?? 0)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>0 MB</span>
                <span>Límite: 1,024 MB (1 GB)</span>
              </div>
            </div>

            {/* Remaining space banner */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Espacio Libre Disponible:
                </span>
                <span className="text-lg font-black text-slate-900">
                  {storageStats?.remainingFormatted || '1.00 GB'}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Total Archivos:
                </span>
                <span className="text-lg font-black text-[#c5a059]">
                  {storageStats?.totalFiles ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Card 2: Supabase Database Tables */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Almacenamiento de Tablas</h3>
                  <div className="text-[11px] text-slate-500">
                    PostgreSQL Database
                  </div>
                </div>
              </div>

              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                Plan Free (500 MB)
              </span>
            </div>

            {/* Gauge Progress Bar */}
            <div className="space-y-2 my-5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-bold text-slate-700">Espacio Usado Estimado: {dbStats?.usedFormatted || '28 MB'}</span>
                <span className="font-extrabold text-emerald-600">{dbStats?.percentageUsed ?? 5.6}%</span>
              </div>

              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(4, dbStats?.percentageUsed ?? 5.6)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>0 MB</span>
                <span>Límite: 500 MB</span>
              </div>
            </div>

            {/* Remaining space banner */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Espacio Libre en BD:
                </span>
                <span className="text-lg font-black text-slate-900">
                  {dbStats?.remainingFormatted || '472 MB'}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Total Registros:
                </span>
                <span className="text-lg font-black text-emerald-600">
                  {dbStats?.totalRows ?? 0} filas
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row breakdown by table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-500" />
          Desglose de Registros por Tabla
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-xs font-semibold text-slate-500 block">public.productos</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">
              {dbStats?.tableCounts.productos ?? 0}
            </span>
            <span className="text-[11px] text-slate-400">filas</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-xs font-semibold text-slate-500 block">public.categorias</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">
              {dbStats?.tableCounts.categorias ?? 0}
            </span>
            <span className="text-[11px] text-slate-400">filas</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-xs font-semibold text-slate-500 block">public.inventario</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">
              {dbStats?.tableCounts.inventario ?? 0}
            </span>
            <span className="text-[11px] text-slate-400">filas</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-xs font-semibold text-slate-500 block">public.perfiles</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">
              {dbStats?.tableCounts.perfiles ?? 0}
            </span>
            <span className="text-[11px] text-slate-400">usuarios</span>
          </div>
        </div>
      </div>

      {/* Files in Supabase Storage list */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Archivos en Supabase Storage ({storageStats?.files.length ?? 0})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Imágenes subidas desde tu dispositivo guardadas en el bucket "productos"
            </p>
          </div>
        </div>

        {storageStats?.files && storageStats.files.length > 0 ? (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {storageStats.files.map((file, idx) => {
              const formattedFileSize = file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'N/A';
              return (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate font-mono">
                        {file.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Tamaño: {formattedFileSize}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteStorageFile(file.name)}
                      title="Eliminar de storage"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            No se han subido archivos aún al bucket "productos" o el bucket está vacío.
          </div>
        )}
      </div>
    </div>
  );
};
