import React from 'react';
import { StockStatus } from '../../types/database';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface StockBadgeProps {
  cantidad: number;
  stockMinimo: number;
  showExactCount?: boolean;
  size?: 'sm' | 'md';
}

export const StockBadge: React.FC<StockBadgeProps> = ({
  cantidad,
  stockMinimo,
  showExactCount = false,
  size = 'md',
}) => {
  let status: StockStatus = 'DISPONIBLE';
  if (cantidad <= 0) {
    status = 'AGOTADO';
  } else if (cantidad <= stockMinimo) {
    status = 'STOCK_BAJO';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  if (status === 'AGOTADO') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 ${sizeClasses}`}
      >
        <XCircle className="w-3.5 h-3.5 text-rose-500" />
        Agotado
      </span>
    );
  }

  if (status === 'STOCK_BAJO') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 ${sizeClasses}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        {showExactCount ? `Últimas ${cantidad} unidades` : 'Stock Bajo'}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${sizeClasses}`}
    >
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
      {showExactCount ? `${cantidad} disponibles` : 'Disponible'}
    </span>
  );
};
