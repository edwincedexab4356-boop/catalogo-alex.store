import React, { useState, useEffect } from 'react';
import { ventasService } from '../../services/ventasService';
import { productosService } from '../../services/productosService';
import { Venta, Producto, MetodoPago, PedidoItem } from '../../types/database';
import { useToast } from '../../contexts/ToastContext';
import { Modal } from '../../components/common/Modal';
import {
  TrendingUp,
  Plus,
  Search,
  RefreshCw,
  DollarSign,
  Calendar,
  Smartphone,
  Building2,
  Banknote,
  Trash2,
  Package,
  CheckCircle2,
  FileSpreadsheet,
  Database,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

export const AdminSalesPage: React.FC = () => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<'all' | 'web' | 'manual'>('all');
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Manual Sale Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [montoLibre, setMontoLibre] = useState<string>('');
  const [descontarInventario, setDescontarInventario] = useState(true);
  const [notas, setNotas] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ producto: Producto; cantidad: number }[]>([]);
  const [selectedProdId, setSelectedProdId] = useState('');
  const [saving, setSaving] = useState(false);

  const { success: toastSuccess, error: toastError } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [ventasData, prodsData] = await Promise.all([
        ventasService.getVentas(),
        productosService.getProductos(),
      ]);
      setVentas(ventasData);
      setProductos(prodsData);
    } catch (e: any) {
      console.error('Error fetching ventas:', e);
      toastError(e.message || 'Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCOP = (num: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(num);

  // Calculate totals
  const totalIngresos = ventas.reduce((sum, v) => sum + (Number(v.total) || 0), 0);
  const totalTransacciones = ventas.length;
  const ticketPromedio = totalTransacciones > 0 ? totalIngresos / totalTransacciones : 0;

  // This month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const ventasEsteMes = ventas.filter((v) => {
    const d = new Date(v.creado_en || now);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const ingresosEsteMes = ventasEsteMes.reduce((sum, v) => sum + (Number(v.total) || 0), 0);

  // Manual sale items calculation
  const totalProductosSeleccionados = selectedItems.reduce(
    (sum, item) => sum + Number(item.producto.precio) * item.cantidad,
    0
  );
  const totalVentaManual =
    selectedItems.length > 0 ? totalProductosSeleccionados : parseFloat(montoLibre) || 0;

  const handleAddProductToSale = () => {
    if (!selectedProdId) return;
    const prod = productos.find((p) => String(p.id) === String(selectedProdId));
    if (!prod) return;

    const existingIndex = selectedItems.findIndex((i) => String(i.producto.id) === String(prod.id));
    if (existingIndex >= 0) {
      setSelectedItems((prev) =>
        prev.map((i, idx) => (idx === existingIndex ? { ...i, cantidad: i.cantidad + 1 } : i))
      );
    } else {
      setSelectedItems((prev) => [...prev, { producto: prod, cantidad: 1 }]);
    }
    setSelectedProdId('');
  };

  const handleRemoveProductFromSale = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateItemQty = (index: number, qty: number) => {
    if (qty <= 0) {
      handleRemoveProductFromSale(index);
      return;
    }
    setSelectedItems((prev) =>
      prev.map((i, idx) => (idx === index ? { ...i, cantidad: qty } : i))
    );
  };

  const handleCreateVentaManual = async (e: React.FormEvent) => {
    e.preventDefault();

    if (totalVentaManual <= 0) {
      toastError('El monto de la venta debe ser mayor a 0.');
      return;
    }

    try {
      setSaving(true);

      const items: PedidoItem[] = selectedItems.map((i) => ({
        producto_id: i.producto.id,
        nombre: i.producto.nombre,
        precio: Number(i.producto.precio),
        cantidad: i.cantidad,
        subtotal: Number(i.producto.precio) * i.cantidad,
        imagen_url: i.producto.imagen_url || null,
      }));

      // If no catalog products selected, create a generic item with the custom amount
      if (items.length === 0) {
        items.push({
          producto_id: 'custom',
          nombre: 'Venta Directa / Mostrador',
          precio: totalVentaManual,
          cantidad: 1,
          subtotal: totalVentaManual,
        });
      }

      await ventasService.createVentaManual({
        cliente_nombre: clienteNombre.trim() || 'Cliente Mostrador / Venta Directa',
        cliente_telefono: clienteTelefono.trim() || undefined,
        metodo_pago: metodoPago,
        items,
        total: totalVentaManual,
        notas: notas.trim() || undefined,
        descontarInventario,
      });

      toastSuccess('¡Venta manual registrada exitosamente!');
      setIsModalOpen(false);
      // Reset form
      setClienteNombre('');
      setClienteTelefono('');
      setMetodoPago('efectivo');
      setMontoLibre('');
      setSelectedItems([]);
      setNotas('');
      loadData();
    } catch (err: any) {
      console.error('Error creating manual sale:', err);
      toastError(err.message || 'Error al guardar la venta');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, codigo: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el registro de venta ${codigo}?`)) return;
    try {
      await ventasService.deleteVenta(id);
      setVentas((prev) => prev.filter((v) => v.id !== id));
      toastSuccess(`Registro de venta ${codigo} eliminado`);
    } catch (err: any) {
      toastError(err.message || 'Error al eliminar venta');
    }
  };

  // Filtered sales
  const filteredVentas = ventas.filter((v) => {
    const matchesTipo = filterTipo === 'all' || v.tipo === filterTipo;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === '' ||
      v.codigo.toLowerCase().includes(term) ||
      v.cliente_nombre.toLowerCase().includes(term) ||
      (v.cliente_telefono && v.cliente_telefono.toLowerCase().includes(term));
    return matchesTipo && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
            Ingresos Totales
          </span>
          <div className="text-2xl font-black text-stone-900">{formatCOP(totalIngresos)}</div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Acumulado histórico</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
            Ventas este Mes
          </span>
          <div className="text-2xl font-black text-stone-900">{formatCOP(ingresosEsteMes)}</div>
          <span className="text-[11px] text-stone-500 mt-1 block">{ventasEsteMes.length} transacciones</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
            Total Transacciones
          </span>
          <div className="text-2xl font-black text-stone-900">{totalTransacciones}</div>
          <span className="text-[11px] text-stone-500 mt-1 block">Web + Manuales</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#c5a059] block mb-1">
            Ticket Promedio
          </span>
          <div className="text-2xl font-black text-[#c5a059]">{formatCOP(ticketPromedio)}</div>
          <span className="text-[11px] text-stone-400 mt-1 block">Por cada venta</span>
        </div>
      </div>

      {/* Top Header Actions & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar venta, cliente o código..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059]"
            />
          </div>

          {/* Type Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterTipo('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterTipo === 'all'
                  ? 'bg-[#0c0a08] text-[#f7e8c5]'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Todas ({ventas.length})
            </button>
            <button
              onClick={() => setFilterTipo('web')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterTipo === 'web'
                  ? 'bg-blue-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Web Aprobadas
            </button>
            <button
              onClick={() => setFilterTipo('manual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterTipo === 'manual'
                  ? 'bg-[#c5a059] text-[#0c0a08]'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Manuales
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setShowSqlModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#c5a059]/40 bg-[#faf7f0] hover:bg-[#f3ede1] text-stone-800 text-xs font-bold transition-colors cursor-pointer"
            title="Ver código SQL para crear tablas en Supabase"
          >
            <Database className="w-3.5 h-3.5 text-[#c5a059]" />
            <span>SQL Supabase</span>
          </button>

          <button
            onClick={loadData}
            title="Recargar ventas"
            className="p-2.5 text-stone-500 hover:text-stone-800 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Button to register manual sale */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0c0a08] hover:bg-stone-800 text-[#f7e8c5] border border-[#c5a059]/40 font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#c5a059]" />
            Registrar Venta Manual
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400 text-sm">
            Cargando historial de ventas...
          </div>
        ) : filteredVentas.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <TrendingUp className="w-12 h-12 text-stone-300 mx-auto" />
            <div className="text-stone-700 font-bold text-sm">No se encontraron ventas registradas</div>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Puedes aprobar pedidos web verificados o pulsar en "Registrar Venta Manual" para añadir ventas directas por mostrador o chat.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-600">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th scope="col" className="py-3.5 px-4">
                    Código & Origen
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Cliente
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Método
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Artículos
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Total
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-right">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredVentas.map((venta) => (
                  <tr key={venta.id} className="hover:bg-stone-50/70 transition-colors">
                    {/* Código & Fecha */}
                    <td className="py-3 px-4">
                      <div className="font-black text-stone-900 text-xs sm:text-sm">{venta.codigo}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          venta.tipo === 'web'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {venta.tipo === 'web' ? 'Web Pedido' : 'Manual'}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          {new Date(venta.creado_en || Date.now()).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                    </td>

                    {/* Cliente */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900 text-xs sm:text-sm">{venta.cliente_nombre}</div>
                      {venta.cliente_telefono && (
                        <div className="text-[11px] text-stone-500">{venta.cliente_telefono}</div>
                      )}
                    </td>

                    {/* Método de Pago */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-800 capitalize">
                        {venta.metodo_pago === 'yappy' && <Smartphone className="w-3.5 h-3.5 text-[#0072CE]" />}
                        {venta.metodo_pago === 'transferencia' && <Building2 className="w-3.5 h-3.5 text-[#c5a059]" />}
                        {venta.metodo_pago === 'efectivo' && <Banknote className="w-3.5 h-3.5 text-emerald-600" />}
                        {venta.metodo_pago}
                      </span>
                    </td>

                    {/* Items */}
                    <td className="py-3 px-4">
                      <div className="text-xs text-stone-700">
                        {venta.items?.length || 0} {venta.items?.length === 1 ? 'producto' : 'productos'}
                      </div>
                      <div className="text-[11px] text-stone-400 line-clamp-1 max-w-xs">
                        {(venta.items || []).map((i) => `${i.nombre} (x${i.cantidad})`).join(', ')}
                      </div>
                    </td>

                    {/* Total */}
                    <td className="py-3 px-4">
                      <span className="font-black text-stone-900 text-sm sm:text-base">
                        {formatCOP(venta.total)}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(venta.id, venta.codigo)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Eliminar venta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Manual Sale */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Registrar Venta Manual"
          subtitle="Registra ventas directas, de mostrador o confirmadas por otros canales"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreateVentaManual} className="space-y-5">
            {/* Cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Ej: Juan Pérez (o Cliente Mostrador)"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-[#c5a059] bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Teléfono / WhatsApp (Opcional)
                </label>
                <input
                  type="tel"
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  placeholder="Ej: +507 6000-0000"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-[#c5a059] bg-white"
                />
              </div>
            </div>

            {/* Método de Pago */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'yappy', label: 'Yappy', icon: Smartphone },
                  { id: 'transferencia', label: 'Transferencia', icon: Building2 },
                  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMetodoPago(m.id as MetodoPago)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        metodoPago === m.id
                          ? 'border-[#0c0a08] bg-[#0c0a08] text-[#f7e8c5]'
                          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de Productos de la tienda */}
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                Seleccionar Productos del Catálogo (Opcional)
              </label>

              <div className="flex gap-2">
                <select
                  value={selectedProdId}
                  onChange={(e) => setSelectedProdId(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-none focus:border-[#c5a059]"
                >
                  <option value="">Selecciona un producto para añadir...</option>
                  {productos.map((p) => (
                    <option key={String(p.id)} value={String(p.id)}>
                      {p.nombre} — {formatCOP(p.precio)}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddProductToSale}
                  disabled={!selectedProdId}
                  className="px-3.5 py-2 rounded-xl bg-stone-900 text-white font-bold text-xs disabled:opacity-40 hover:bg-black transition-colors cursor-pointer shrink-0"
                >
                  Añadir
                </button>
              </div>

              {/* Added items list */}
              {selectedItems.length > 0 ? (
                <div className="space-y-2 p-3 rounded-xl bg-stone-50 border border-stone-200">
                  {selectedItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1">
                      <span className="font-bold text-stone-900 truncate max-w-xs">
                        {item.producto.nombre}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, item.cantidad - 1)}
                            className="w-5 h-5 rounded bg-stone-200 hover:bg-stone-300 flex items-center justify-center font-bold"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-black">{item.cantidad}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, item.cantidad + 1)}
                            className="w-5 h-5 rounded bg-stone-200 hover:bg-stone-300 flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                        </div>
                        <span className="font-black text-stone-900 w-24 text-right">
                          {formatCOP(Number(item.producto.precio) * item.cantidad)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveProductFromSale(idx)}
                          className="text-stone-400 hover:text-rose-600"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="pt-2 border-t border-stone-200 flex justify-between font-black text-xs text-stone-900">
                    <span>Subtotal de productos:</span>
                    <span>{formatCOP(totalProductosSeleccionados)}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    O ingresa un Monto Libre / Directo ($ COP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={montoLibre}
                    onChange={(e) => setMontoLibre(e.target.value)}
                    placeholder="Ej: 50000"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-[#c5a059] bg-white font-black"
                  />
                </div>
              )}

              {/* Checkbox: Descontar de inventario */}
              {selectedItems.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={descontarInventario}
                    onChange={(e) => setDescontarInventario(e.target.checked)}
                    className="rounded border-stone-300 text-[#c5a059] focus:ring-[#c5a059]"
                  />
                  <span className="text-xs text-stone-700 font-medium">
                    Descontar automáticamente del inventario (public.inventario)
                  </span>
                </label>
              )}
            </div>

            {/* Total Sale Banner */}
            <div className="p-3.5 rounded-xl bg-[#0c0a08] text-[#f7e8c5] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#c5a059]">
                Total de la Venta
              </span>
              <span className="text-xl font-black">{formatCOP(totalVentaManual)}</span>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Notas / Observaciones
              </label>
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Pagado en tienda física, entregado inmediatamente"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-[#c5a059] bg-white"
              />
            </div>

            {/* Submit */}
            <div className="pt-3 border-t border-stone-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-bold uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || totalVentaManual <= 0}
                className="px-6 py-2.5 rounded-xl bg-[#0c0a08] hover:bg-stone-800 text-[#f7e8c5] border border-[#c5a059]/40 font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Guardando Venta...' : 'Registrar Venta'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Supabase SQL Setup Modal */}
      {showSqlModal && (
        <Modal
          isOpen={showSqlModal}
          onClose={() => setShowSqlModal(false)}
          title="Script SQL para Supabase (Ventas, Pedidos y Comprobantes)"
          subtitle="Copia y ejecuta este script en el SQL Editor de tu consola de Supabase"
          maxWidth="3xl"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                💡 <strong>¿Por qué se ejecuta en Supabase?</strong> Por estrictas razones de seguridad en la nube, Supabase no permite que una web externa ejecute comandos destructivos o cree tablas usando la clave anónima (<code>anon key</code>); solo el propietario puede crearlas desde su consola oficial.
                <div className="mt-1 text-stone-700">
                  Haz clic en el botón verde, pega este script en la ventana y haz clic en <strong>Run</strong>.
                </div>
              </div>
              <a
                href="https://supabase.com/dashboard/project/gfkzdakcekvvylzsyexi/sql/new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 transition-colors shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir SQL Editor
              </a>
            </div>

            <div className="relative">
              <pre className="p-4 rounded-2xl bg-stone-900 text-stone-100 font-mono text-xs overflow-x-auto max-h-[50vh] leading-relaxed border border-stone-800">
{`-- ALEXSTORE: TABLAS DE PEDIDOS, VENTAS Y BUCKETS DE STORAGE
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL UNIQUE,
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT NOT NULL,
    cliente_direccion TEXT,
    metodo_pago TEXT NOT NULL DEFAULT 'transferencia',
    comprobante_url TEXT,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    notas TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL UNIQUE,
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT,
    metodo_pago TEXT NOT NULL DEFAULT 'transferencia',
    total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    tipo TEXT NOT NULL DEFAULT 'web',
    notas TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir pedidos a todos" ON public.pedidos;
CREATE POLICY "Permitir pedidos a todos" ON public.pedidos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir ventas a todos" ON public.ventas;
CREATE POLICY "Permitir ventas a todos" ON public.ventas FOR ALL USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('comprobantes', 'comprobantes', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('productos', 'productos', true) ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Acceso publico comprobantes" ON storage.objects;
CREATE POLICY "Acceso publico comprobantes" ON storage.objects FOR ALL USING (bucket_id IN ('comprobantes', 'productos')) WITH CHECK (bucket_id IN ('comprobantes', 'productos'));

GRANT ALL ON TABLE public.pedidos TO anon, authenticated;
GRANT ALL ON TABLE public.ventas TO anon, authenticated;`}
              </pre>

              <button
                onClick={() => {
                  const sql = `-- ALEXSTORE: TABLAS DE PEDIDOS, VENTAS Y BUCKETS DE STORAGE
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL UNIQUE,
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT NOT NULL,
    cliente_direccion TEXT,
    metodo_pago TEXT NOT NULL DEFAULT 'transferencia',
    comprobante_url TEXT,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    notas TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL UNIQUE,
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT,
    metodo_pago TEXT NOT NULL DEFAULT 'transferencia',
    total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    tipo TEXT NOT NULL DEFAULT 'web',
    notas TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir pedidos a todos" ON public.pedidos;
CREATE POLICY "Permitir pedidos a todos" ON public.pedidos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir ventas a todos" ON public.ventas;
CREATE POLICY "Permitir ventas a todos" ON public.ventas FOR ALL USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('comprobantes', 'comprobantes', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('productos', 'productos', true) ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Acceso publico comprobantes" ON storage.objects;
CREATE POLICY "Acceso publico comprobantes" ON storage.objects FOR ALL USING (bucket_id IN ('comprobantes', 'productos')) WITH CHECK (bucket_id IN ('comprobantes', 'productos'));

GRANT ALL ON TABLE public.pedidos TO anon, authenticated;
GRANT ALL ON TABLE public.ventas TO anon, authenticated;`;
                  navigator.clipboard.writeText(sql);
                  setCopiedSql(true);
                  toastSuccess('¡Código SQL copiado al portapapeles!');
                  setTimeout(() => setCopiedSql(false), 3000);
                }}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-[#c5a059] hover:bg-[#b08d47] text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
              >
                {copiedSql ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
                {copiedSql ? '¡Copiado!' : 'Copiar SQL'}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-stone-500">
                Archivo guardado en el proyecto: <code>/supabase_setup.sql</code>
              </span>
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#0c0a08] text-[#f7e8c5] font-bold text-xs uppercase tracking-wider hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Entendido / Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
