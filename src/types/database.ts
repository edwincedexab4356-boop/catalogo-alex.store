export interface Perfil {
  id: string;
  email?: string;
  nombre?: string;
  rol: 'admin' | 'user';
  creado_en?: string;
  actualizado_en?: string;
}

export interface Categoria {
  id: number | string;
  nombre: string;
  descripcion?: string | null;
  imagen_url?: string | null;
  activo: boolean;
  creado_en?: string;
  total_productos?: number;
}

export interface Producto {
  id: number | string;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  categoria_id?: number | string | null;
  imagen_url?: string | null;
  imagenes?: string[];
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
  categoria?: Categoria;
  inventario?: Inventario;
}

export interface Inventario {
  id: number | string;
  producto_id: number | string;
  cantidad: number;
  stock_minimo: number;
  actualizado_en?: string;
  producto?: Producto;
}

export type StockStatus = 'DISPONIBLE' | 'STOCK_BAJO' | 'AGOTADO';

export function getStockStatus(cantidad: number, stockMinimo: number): StockStatus {
  if (cantidad <= 0) return 'AGOTADO';
  if (cantidad <= stockMinimo) return 'STOCK_BAJO';
  return 'DISPONIBLE';
}

export interface StorageFileItem {
  name: string;
  id?: string | null;
  created_at?: string | null;
  size?: number;
  metadata?: {
    size?: number;
    mimetype?: string;
    [key: string]: unknown;
  } | null;
}

export interface StorageStats {
  totalFiles: number;
  totalSizeBytes: number;
  usedFormatted: string;
  maxQuotaBytes: number;
  percentageUsed: number;
  remainingBytes: number;
  remainingFormatted: string;
  files: StorageFileItem[];
}

export interface DatabaseStats {
  tableCounts: {
    productos: number;
    categorias: number;
    inventario: number;
    perfiles: number;
  };
  totalRows: number;
  estimatedSizeBytes: number;
  usedFormatted: string;
  maxQuotaBytes: number;
  percentageUsed: number;
  remainingFormatted: string;
}
