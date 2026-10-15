import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { PaymentModal } from './PaymentModal';
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Phone,
  CheckCircle2,
  CreditCard,
  Building2,
  Smartphone,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalItems,
    totalPrice,
    whatsappNumber,
    setWhatsappNumber,
  } = useCart();

  const [showPhoneConfig, setShowPhoneConfig] = useState(false);
  const [tempPhone, setTempPhone] = useState(whatsappNumber);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  if (!isCartOpen) return null;

  const formattedTotal = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(totalPrice);

  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    setWhatsappNumber(tempPhone);
    setShowPhoneConfig(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0c0a08]/75 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-[#eae3d5]">
          {/* Header */}
          <div className="p-5 border-b border-[#eae3d5] bg-[#faf8f5] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0c0a08] text-[#f7e8c5] flex items-center justify-center border border-[#c5a059]/40">
                <ShoppingBag className="w-4 h-4 text-[#c5a059]" />
              </div>
              <div>
                <h2 className="text-base font-black text-stone-900 tracking-tight">
                  Tu Bolsa de Pedido
                </h2>
                <span className="text-[11px] text-stone-500 font-semibold uppercase tracking-wider">
                  {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  title="Vaciar bolsa"
                  className="p-2 text-stone-400 hover:text-rose-600 rounded-lg transition-colors text-xs font-semibold cursor-pointer"
                >
                  Vaciar
                </button>
              )}
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-800 rounded-lg transition-colors cursor-pointer"
                aria-label="Cerrar bolsa"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#faf6ed] text-[#c5a059] flex items-center justify-center border border-[#eedab2]">
                  <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Tu bolsa está vacía</h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-xs">
                    Explora los productos de AlexStore y añádelos a tu bolsa para realizar tu compra oficial.
                  </p>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#0c0a08] text-[#f7e8c5] font-bold text-xs uppercase tracking-wider hover:bg-stone-800 transition-colors shadow-xs cursor-pointer"
                >
                  Ver Catálogo
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {items.map(({ producto, cantidad }) => {
                    const price =
                      typeof producto.precio === 'number'
                        ? producto.precio
                        : parseFloat(producto.precio as any) || 0;
                    const subtotal = price * cantidad;
                    const formattedSubtotal = new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                      maximumFractionDigits: 0,
                    }).format(subtotal);

                    return (
                      <div
                        key={producto.id}
                        className="flex gap-3 p-3.5 rounded-2xl bg-[#faf8f5] border border-[#eae3d5] hover:border-[#c5a059]/40 transition-colors"
                      >
                        {/* Thumbnail */}
                        <div className="w-16 h-16 rounded-xl bg-white border border-[#eae3d5] overflow-hidden shrink-0">
                          {producto.imagen_url ? (
                            <img
                              src={producto.imagen_url}
                              alt={producto.nombre}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400 font-bold">
                              ALEX
                            </div>
                          )}
                        </div>

                        {/* Info & Quantity */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-stone-900 truncate">
                              {producto.nombre}
                            </h4>
                            <div className="text-[11px] font-bold text-[#c5a059]">
                              {formattedSubtotal}
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border border-stone-200 rounded-lg bg-white overflow-hidden">
                              <button
                                onClick={() => updateQuantity(producto.id, cantidad - 1)}
                                className="w-6 h-6 flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                                aria-label="Restar uno"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center text-xs font-bold text-stone-900">
                                {cantidad}
                              </span>
                              <button
                                onClick={() => updateQuantity(producto.id, cantidad + 1)}
                                className="w-6 h-6 flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                                aria-label="Sumar uno"
                              >
                                <Plus className="w-3 h-3 text-[#c5a059]" />
                              </button>
                            </div>

                            <button
                              onClick={() => removeFromCart(producto.id)}
                              className="p-1 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Eliminar artículo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 3 Payment Options Info Banner */}
                <div className="p-4 rounded-2xl bg-[#faf7f0] border border-[#ebdcc4] space-y-2.5 mt-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    3 Opciones de Pago Disponibles:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-xl bg-white border border-[#eae3d5] text-center">
                      <Building2 className="w-4 h-4 text-[#c5a059] mx-auto mb-1" />
                      <span className="text-[10px] font-bold text-stone-800 block">Transferencia</span>
                      <span className="text-[9px] text-stone-400">Banco / ACH</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-[#eae3d5] text-center">
                      <CreditCard className="w-4 h-4 text-purple-700 mx-auto mb-1" />
                      <span className="text-[10px] font-bold text-stone-800 block">Tarjeta</span>
                      <span className="text-[9px] text-stone-400">Débito / Crédito</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-[#eae3d5] text-center">
                      <Smartphone className="w-4 h-4 text-[#0072CE] mx-auto mb-1" />
                      <span className="text-[10px] font-bold text-stone-800 block">Yappy</span>
                      <span className="text-[9px] text-stone-400">B. General</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-stone-500 pt-1 leading-relaxed">
                    Al confirmar el pago obtendrás tu <strong>Recibo Oficial</strong> y podrás enviarlo con el comprobante adjunto directamente a WhatsApp.
                  </p>
                </div>

                {/* WhatsApp Phone Number Configuration Toggle */}
                <div className="text-[11px] text-stone-400 pt-1">
                  {!showPhoneConfig ? (
                    <button
                      type="button"
                      onClick={() => setShowPhoneConfig(true)}
                      className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-800 underline cursor-pointer"
                    >
                      <Phone className="w-3 h-3 text-[#c5a059]" />
                      <span>WhatsApp pedidos: <strong>{whatsappNumber || '66212802'}</strong> (cambiar)</span>
                    </button>
                  ) : (
                    <form onSubmit={handleSavePhone} className="p-3 rounded-xl bg-white border border-stone-200 space-y-2 mt-1">
                      <div className="font-bold text-stone-700 text-xs">
                        Número de WhatsApp de AlexStore:
                      </div>
                      <input
                        type="text"
                        value={tempPhone}
                        onChange={(e) => setTempPhone(e.target.value)}
                        placeholder="Ej: 66212802"
                        className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-[#c5a059]"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setShowPhoneConfig(false)}
                          className="px-2.5 py-1 text-xs text-stone-500 hover:bg-stone-100 rounded cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 text-xs font-bold bg-[#0c0a08] text-[#f7e8c5] rounded cursor-pointer"
                        >
                          Guardar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer with Checkout CTA */}
          {items.length > 0 && (
            <div className="p-5 border-t border-[#eae3d5] bg-[#faf8f5] space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Total del Pedido
                </span>
                <span className="text-2xl font-black text-stone-900 tracking-tight">
                  {formattedTotal}
                </span>
              </div>

              {/* Primary: Online Payment with Transferencia / Tarjeta / Yappy */}
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full py-4 px-6 rounded-2xl bg-[#0c0a08] hover:bg-stone-800 text-[#f7e8c5] border border-[#c5a059]/40 hover:border-[#c5a059] font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg shadow-black/20 transition-all cursor-pointer transform hover:-translate-y-0.5"
              >
                <CreditCard className="w-5 h-5 text-[#c5a059]" />
                Proceder al Pago (Transferencia • Tarjeta • Yappy)
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Generación de Recibo Oficial y comprobante
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Online Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        items={items}
        totalPrice={totalPrice}
        totalItems={totalItems}
        whatsappStorePhone={whatsappNumber}
        onSuccess={() => {
          clearCart();
          setIsCartOpen(false);
        }}
      />
    </div>
  );
};
