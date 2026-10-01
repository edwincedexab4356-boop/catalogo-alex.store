import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Inventario } from '../../types/database';
import { StockBadge } from '../catalog/StockBadge';
import { Plus, Minus, Check, Loader2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventarioItem: Inventario | null;
  onSave: (productoId: number | string, cantidad: number, stockMinimo: number) => Promise<void>;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  onClose,
  inventarioItem,
  onSave,
}) => {
  const [cantidad, setCantidad] = useState<number>(0);
  const [stockMinimo, setStockMinimo] = useState<number>(5);
  const [saving, setSaving] = useState(false);
  const { error: toastError, success: toastSuccess } = useToast();

  useEffect(() => {
    if (inventarioItem) {
      setCantidad(inventarioItem.cantidad ?? 0);
      setStockMinimo(inventarioItem.stock_minimo ?? 5);
    }
  }, [inventarioItem, isOpen]);

  const handleAdjust = (delta: number) => {
    setCantidad((prev) => Math.max(0, prev + delta));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventarioItem) return;

    try {
      setSaving(true);
      await onSave(inventarioItem.producto_id, cantidad, stockMinimo);
      toastSuccess('Inventario actualizado correctamente en Supabase');
      onClose();
    } catch (err: any) {
      console.error('Update inventory error:', err);
      toastError(err.message || 'Error al actualizar el inventario');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajuste de Inventario"
      subtitle={
        inventarioItem?.producto?.nombre
          ? `Producto: ${inventarioItem.producto.nombre}`
          : 'Actualiza existencias y alerta de stock'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Current status preview */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Estado resultante:
          </span>
          <StockBadge cantidad={cantidad} stockMinimo={stockMinimo} showExactCount={true} />
        </div>

        {/* Cantidad actual */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Cantidad de Unidades Disponibles
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleAdjust(-1)}
              className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors text-lg font-bold"
              aria-label="Restar 1"
            >
              <Minus className="w-5 h-5" />
            </button>

            <input
              type="number"
              min="0"
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(0, parseInt(e.target.value) || 0))}
              required
              className="flex-1 text-center font-black text-2xl py-2 px-4 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] text-stone-900 bg-white"
            />

            <button
              type="button"
              onClick={() => handleAdjust(1)}
              className="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center transition-colors text-lg font-bold cursor-pointer"
              aria-label="Sumar 1"
            >
              <Plus className="w-5 h-5 text-[#c5a059]" />
            </button>
          </div>

          {/* Quick buttons */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => handleAdjust(-5)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
            >
              -5
            </button>
            <button
              type="button"
              onClick={() => handleAdjust(5)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
            >
              +5
            </button>
            <button
              type="button"
              onClick={() => handleAdjust(10)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
            >
              +10
            </button>
            <button
              type="button"
              onClick={() => setCantidad(0)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
            >
              Marcar Agotado (0)
            </button>
          </div>
        </div>

        {/* Stock mínimo */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Umbral de Alerta (Stock Mínimo)
          </label>
          <input
            type="number"
            min="0"
            value={stockMinimo}
            onChange={(e) => setStockMinimo(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] text-sm text-stone-900 bg-white"
          />
          <span className="text-xs text-slate-400 mt-1 block">
            Cuando la cantidad sea menor o igual a este número, se marcará como "Stock Bajo".
          </span>
        </div>

        {/* Buttons */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium cursor-pointer"
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
                Actualizando...
              </>
            ) : (
              'Guardar Inventario'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
