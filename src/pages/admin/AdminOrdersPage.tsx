import React, { useState, useEffect } from 'react';
import { pedidosService } from '../../services/pedidosService';
import { ventasService } from '../../services/ventasService';
import { Pedido, EstadoPedido } from '../../types/database';
import { useToast } from '../../contexts/ToastContext';
import { Modal } from '../../components/common/Modal';
import {
  ShoppingBag,
  Search,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  CheckCheck,
  XCircle,
  TrendingUp,
  Image as ImageIcon,
  Copy,
  Trash2,
  Download,
  Smartphone,
  Building2,
  CreditCard,
  AlertCircle,
  Database,
  Code,
  Check,
} from 'lucide-react';

export const AdminOrdersPage: React.FC = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<{
    url: string;
    orderCode: string;
    customer: string;
    total: number;
  } | null>(null);

  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await pedidosService.getPedidos();
      setPedidos(data);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      toastError(err.message || 'Error al cargar pedidos');
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

  const handleUpdateStatus = async (id: string, nuevoEstado: EstadoPedido) => {
    try {
      await pedidosService.updateEstado(id, nuevoEstado);
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p))
      );
      toastSuccess(`Estado del pedido actualizado a "${nuevoEstado}"`);
    } catch (err: any) {
      toastError(err.message || 'Error al actualizar estado');
    }
  };

  const handleAprobarYRegistrarVenta = async (pedido: Pedido) => {
    try {
      await ventasService.convertirPedidoAVenta(pedido);
      setPedidos((prev) =>
        prev.map((p) => (p.id === pedido.id ? { ...p, estado: 'aprobado' } : p))
      );
      toastSuccess(`¡Pedido ${pedido.codigo} aprobado y registrado en el módulo de Ventas!`);
    } catch (err: any) {
      toastError(err.message || 'Error al registrar venta');
    }
  };

  const handleDelete = async (id: string, codigo: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el pedido ${codigo}?`)) return;
    try {
      await pedidosService.deletePedido(id);
      setPedidos((prev) => prev.filter((p) => p.id !== id));
      toastSuccess(`Pedido ${codigo} eliminado`);
    } catch (err: any) {
      toastError(err.message || 'Error al eliminar pedido');
    }
  };

  const openCustomerWhatsApp = (phone: string, codigo: string, cliente: string) => {
    const clean = phone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `¡Hola ${cliente}! 👋 Te contactamos de AlexStore respecto a tu pedido *${codigo}*:`
    );
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
  };

  // Filtered orders
  const filteredPedidos = pedidos.filter((p) => {
    const matchesStatus = filterStatus === 'all' || p.estado === filterStatus;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === '' ||
      p.codigo.toLowerCase().includes(term) ||
      p.cliente_nombre.toLowerCase().includes(term) ||
      p.cliente_telefono.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  // Metrics
  const totalRecaudado = pedidos
    .filter((p) => p.estado !== 'cancelado')
    .reduce((sum, p) => sum + (Number(p.total) || 0), 0);
  const pendientesCount = pedidos.filter((p) => p.estado === 'pendiente').length;
  const aprobadosCount = pedidos.filter((p) => p.estado === 'aprobado' || p.estado === 'entregado').length;

  const getStatusBadge = (estado: EstadoPedido) => {
    switch (estado) {
      case 'pendiente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" />
            Pendiente
          </span>
        );
      case 'comprobante_verificado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
            <CheckCircle2 className="w-3 h-3" />
            Comprobante Verificado
          </span>
        );
      case 'aprobado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            <TrendingUp className="w-3 h-3" />
            Aprobado / Venta Registrada
          </span>
        );
      case 'en_camino':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
            <Truck className="w-3 h-3" />
            En Camino
          </span>
        );
      case 'entregado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
            <CheckCheck className="w-3 h-3" />
            Entregado
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
            <XCircle className="w-3 h-3" />
            Cancelado
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
            Total Pedidos Registrados
          </span>
          <div className="text-2xl font-black text-stone-900">{pedidos.length}</div>
          <span className="text-[11px] text-stone-500 mt-1 block">En línea y WhatsApp</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
            Pendientes por Verificar
          </span>
          <div className="text-2xl font-black text-amber-700">{pendientesCount}</div>
          <span className="text-[11px] text-stone-400 mt-1 block">Comprobante por revisar</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
            Aprobados & Entregados
          </span>
          <div className="text-2xl font-black text-emerald-700">{aprobadosCount}</div>
          <span className="text-[11px] text-stone-400 mt-1 block">Pasados a ventas</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#c5a059] block mb-1">
            Volumen Total en Pedidos
          </span>
          <div className="text-2xl font-black text-stone-900">{formatCOP(totalRecaudado)}</div>
          <span className="text-[11px] text-stone-400 mt-1 block">Excluye cancelados</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, cliente o teléfono..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059]"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pendiente', label: 'Pendientes' },
              { id: 'aprobado', label: 'Aprobados' },
              { id: 'entregado', label: 'Entregados' },
              { id: 'cancelado', label: 'Cancelados' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  filterStatus === tab.id
                    ? 'bg-[#0c0a08] text-[#f7e8c5]'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setShowSqlModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#c5a059]/40 bg-[#faf7f0] hover:bg-[#f3ede1] text-stone-800 text-xs font-bold transition-colors cursor-pointer"
            title="Ver código SQL para crear tablas en Supabase"
          >
            <Database className="w-3.5 h-3.5 text-[#c5a059]" />
            <span>SQL Supabase</span>
          </button>

          <button
            onClick={loadData}
            title="Recargar pedidos"
            className="p-2 text-stone-500 hover:text-stone-800 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-stone-400 text-sm bg-white rounded-2xl border border-stone-200">
            Cargando pedidos de AlexStore...
          </div>
        ) : filteredPedidos.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-white rounded-2xl border border-stone-200">
            <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto" />
            <div className="text-stone-700 font-bold text-sm">No se encontraron pedidos</div>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Cuando los clientes paguen en la tienda web con Yappy o Transferencia bancaria y adjunten su comprobante, aparecerán aquí de inmediato.
            </p>
          </div>
        ) : (
          filteredPedidos.map((pedido) => (
            <div
              key={pedido.id}
              className="bg-white rounded-2xl border border-stone-200/90 shadow-xs hover:border-[#c5a059]/50 transition-all p-5 sm:p-6 space-y-4"
            >
              {/* Header row: Code, Date, Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0c0a08] text-[#f7e8c5] flex items-center justify-center font-black text-xs border border-[#c5a059]/40">
                    ALX
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-stone-900 text-base">{pedido.codigo}</span>
                      {getStatusBadge(pedido.estado)}
                    </div>
                    <span className="text-[11px] text-stone-400">
                      {new Date(pedido.creado_en || Date.now()).toLocaleString('es-CO', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={pedido.estado}
                    onChange={(e) => handleUpdateStatus(pedido.id, e.target.value as EstadoPedido)}
                    className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-bold bg-white text-stone-800 focus:outline-none focus:border-[#c5a059]"
                  >
                    <option value="pendiente">Estado: Pendiente</option>
                    <option value="comprobante_verificado">Estado: Comprobante Verificado</option>
                    <option value="aprobado">Estado: Aprobado (Venta)</option>
                    <option value="en_camino">Estado: En Camino</option>
                    <option value="entregado">Estado: Entregado</option>
                    <option value="cancelado">Estado: Cancelado</option>
                  </select>

                  <button
                    onClick={() => handleDelete(pedido.id, pedido.codigo)}
                    className="p-2 text-stone-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                    title="Eliminar pedido"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Grid: Client, Payment & Receipt, Items */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Cliente */}
                <div className="space-y-2 bg-stone-50/70 p-4 rounded-xl border border-stone-200/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    Datos del Cliente
                  </span>
                  <div className="font-bold text-sm text-stone-900">{pedido.cliente_nombre}</div>
                  <div className="text-xs text-stone-600 flex items-center gap-1.5">
                    <span>📱 {pedido.cliente_telefono}</span>
                    <button
                      onClick={() => openCustomerWhatsApp(pedido.cliente_telefono, pedido.codigo, pedido.cliente_nombre)}
                      className="p-1 rounded-md bg-[#25D366] text-white hover:bg-[#20ba59] transition-colors"
                      title="Abrir chat de WhatsApp"
                    >
                      <MessageCircle className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                  {pedido.cliente_direccion && (
                    <div className="text-xs text-stone-500 leading-relaxed">
                      📍 {pedido.cliente_direccion}
                    </div>
                  )}
                  {pedido.notas && (
                    <div className="text-xs text-stone-500 italic pt-1 border-t border-stone-200/60">
                      "{pedido.notas}"
                    </div>
                  )}
                </div>

                {/* 2. Método de Pago & Comprobante */}
                <div className="space-y-3 bg-stone-50/70 p-4 rounded-xl border border-stone-200/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Pago & Comprobante
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                      pedido.metodo_pago === 'yappy'
                        ? 'bg-[#0072CE] text-white'
                        : pedido.metodo_pago === 'tarjeta'
                        ? 'bg-purple-700 text-white'
                        : 'bg-[#0c0a08] text-[#f7e8c5]'
                    }`}>
                      {pedido.metodo_pago === 'yappy' && <Smartphone className="w-3 h-3" />}
                      {pedido.metodo_pago === 'tarjeta' && <CreditCard className="w-3 h-3" />}
                      {pedido.metodo_pago === 'transferencia' && <Building2 className="w-3 h-3 text-[#c5a059]" />}
                      {pedido.metodo_pago}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-600 font-medium">Monto Total:</span>
                    <span className="text-lg font-black text-stone-900">{formatCOP(pedido.total)}</span>
                  </div>

                  {/* Comprobante preview box */}
                  {pedido.comprobante_url ? (
                    <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-stone-200">
                      <img
                        src={pedido.comprobante_url}
                        alt="Comprobante"
                        className="w-12 h-12 rounded-lg object-cover border border-stone-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-stone-800 truncate">Comprobante Adjunto</div>
                        <span className="text-[10px] text-emerald-600 font-semibold block">Listo para verificar</span>
                      </div>
                      <button
                        onClick={() =>
                          setSelectedReceipt({
                            url: pedido.comprobante_url!,
                            orderCode: pedido.codigo,
                            customer: pedido.cliente_nombre,
                            total: pedido.total,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-[#0c0a08] hover:bg-stone-800 text-[#f7e8c5] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Ver comprobante en grande"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#c5a059]" />
                        Ver
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Sin comprobante cargado</span>
                    </div>
                  )}
                </div>

                {/* 3. Items Comprados */}
                <div className="space-y-2 bg-stone-50/70 p-4 rounded-xl border border-stone-200/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    Productos del Pedido ({pedido.items?.length || 0})
                  </span>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {(pedido.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-stone-100 last:border-none">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          {item.imagen_url ? (
                            <img src={item.imagen_url} alt={item.nombre} className="w-6 h-6 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-6 h-6 rounded bg-stone-200 shrink-0 flex items-center justify-center text-[9px]">P</div>
                          )}
                          <span className="font-semibold text-stone-800 truncate">{item.nombre}</span>
                          <span className="text-stone-400 font-bold shrink-0">x{item.cantidad}</span>
                        </div>
                        <span className="font-bold text-stone-900 shrink-0">{formatCOP(item.subtotal || item.precio * item.cantidad)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Quick Action: Convert to Sale */}
              {pedido.estado !== 'aprobado' && pedido.estado !== 'cancelado' && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleAprobarYRegistrarVenta(pedido)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Aprobar Comprobante y Pasar a Ventas
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Full Resolution Receipt Modal */}
      {selectedReceipt && (
        <Modal
          isOpen={Boolean(selectedReceipt)}
          onClose={() => setSelectedReceipt(null)}
          title={`Comprobante de Pago - ${selectedReceipt.orderCode}`}
          subtitle={`Cliente: ${selectedReceipt.customer} • Total: ${formatCOP(selectedReceipt.total)}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="max-h-[65vh] overflow-auto rounded-2xl border border-stone-200 bg-stone-950 flex items-center justify-center p-2">
              <img
                src={selectedReceipt.url}
                alt={`Comprobante ${selectedReceipt.orderCode}`}
                className="max-h-[60vh] max-w-full object-contain rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={selectedReceipt.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#c5a059]" />
                Abrir en pestaña nueva
              </a>

              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-5 py-2 rounded-xl bg-[#0c0a08] text-[#f7e8c5] text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Supabase SQL Setup Modal */}
      {showSqlModal && (
        <Modal
          isOpen={showSqlModal}
          onClose={() => setShowSqlModal(false)}
          title="Script SQL para Supabase (Pedidos, Ventas y Comprobantes)"
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
