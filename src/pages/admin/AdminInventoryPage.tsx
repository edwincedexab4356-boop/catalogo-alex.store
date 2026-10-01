import React, { useState, useEffect } from 'react';
import { inventarioService } from '../../services/inventarioService';
import { Inventario, getStockStatus } from '../../types/database';
import { StockBadge } from '../../components/catalog/StockBadge';
import { StockAdjustModal } from '../../components/admin/StockAdjustModal';
import { useToast } from '../../contexts/ToastContext';
import {
  Boxes,
  Plus,
  Minus,
  Edit3,
  Search,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

export const AdminInventoryPage: React.FC = () => {
  const [inventario, setInventario] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'DISPONIBLE' | 'STOCK_BAJO' | 'AGOTADO'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal
  const [selectedItem, setSelectedItem] = useState<Inventario | null>(null);

  const { success: toastSuccess, error: toastError } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await inventarioService.getInventarioList();
      setInventario(data);
    } catch (e: any) {
      console.error('Error fetching inventory:', e);
      toastError(e.message || 'Error al cargar inventario de Supabase');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickDelta = async (item: Inventario, delta: number) => {
    const newQty = Math.max(0, (item.cantidad ?? 0) + delta);
    try {
      // Optimistic update
      setInventario((prev) =>
        prev.map((inv) => (inv.id === item.id ? { ...inv, cantidad: newQty } : inv))
      );
      await inventarioService.updateStock(item.producto_id, newQty, item.stock_minimo);
      toastSuccess(`Stock actualizado: ${newQty} unidades`);
    } catch (err: any) {
      toastError(err.message || 'Error al actualizar stock');
      loadData();
    }
  };

  const handleSaveModal = async (productoId: number | string, cantidad: number, stockMinimo: number) => {
    await inventarioService.updateStock(productoId, cantidad, stockMinimo);
    await loadData();
  };

  // Filter items
  const filteredItems = inventario.filter((item) => {
    const status = getStockStatus(item.cantidad, item.stock_minimo);
    const matchesStatus = filterStatus === 'all' || status === filterStatus;
    const prodName = item.producto?.nombre || '';
    const matchesSearch =
      searchTerm === '' || prodName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter and Search bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por producto..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059]"
            />
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterStatus === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('DISPONIBLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterStatus === 'DISPONIBLE'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Disponibles
            </button>
            <button
              onClick={() => setFilterStatus('STOCK_BAJO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterStatus === 'STOCK_BAJO'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Stock Bajo
            </button>
            <button
              onClick={() => setFilterStatus('AGOTADO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterStatus === 'AGOTADO'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Agotados
            </button>
          </div>
        </div>

        <button
          onClick={loadData}
          title="Recargar inventario"
          className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 self-end sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Cargando registros de public.inventario...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Boxes className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="text-slate-700 font-bold text-sm">No se encontraron registros de inventario</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Cada vez que creas un producto en Supabase, se genera automáticamente su fila asociada en public.inventario.
            </p>
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
                    Stock Actual
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Stock Mínimo
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Estado
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-center">
                    Ajuste Rápido
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-right">
                    Detalles
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const prod = item.producto;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Producto */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {prod?.imagen_url ? (
                              <img
                                src={prod.imagen_url}
                                alt={prod.nombre}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 line-clamp-1">
                              {prod?.nombre || `Producto ID #${item.producto_id}`}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {prod?.categoria?.nombre || 'General'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Stock Actual */}
                      <td className="py-3 px-4">
                        <span className="font-black text-slate-900 text-base">
                          {item.cantidad}
                        </span>{' '}
                        <span className="text-xs text-slate-400">unids.</span>
                      </td>

                      {/* Stock Mínimo */}
                      <td className="py-3 px-4 text-xs font-semibold text-slate-500">
                        {item.stock_minimo} unids.
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4">
                        <StockBadge
                          cantidad={item.cantidad}
                          stockMinimo={item.stock_minimo}
                          showExactCount={false}
                        />
                      </td>

                      {/* Ajuste rápido */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleQuickDelta(item, -1)}
                            disabled={item.cantidad <= 0}
                            title="Restar 1 unidad"
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 flex items-center justify-center font-bold text-sm transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleQuickDelta(item, 1)}
                            title="Añadir 1 unidad"
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          Editar
                        </button>
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
      {selectedItem && (
        <StockAdjustModal
          isOpen={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          inventarioItem={selectedItem}
          onSave={handleSaveModal}
        />
      )}
    </div>
  );
};
