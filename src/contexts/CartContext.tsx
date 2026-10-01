import React, { createContext, useContext, useState, useEffect } from 'react';
import { Producto } from '../types/database';
import { useToast } from './ToastContext';

export interface CartItem {
  producto: Producto;
  cantidad: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (producto: Producto, cantidad?: number) => void;
  removeFromCart: (productoId: number | string) => void;
  updateQuantity: (productoId: number | string, cantidad: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  whatsappNumber: string;
  setWhatsappNumber: (phone: string) => void;
  sendCartToWhatsApp: (customerInfo?: { nombre?: string; direccion?: string; nota?: string }) => void;
  sendSingleProductToWhatsApp: (producto: Producto, cantidad: number, nota?: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'alexstore_cart_v1';
const WHATSAPP_STORAGE_KEY = 'alexstore_whatsapp_phone';
// Official store WhatsApp phone number
const DEFAULT_PHONE = '66212802';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [whatsappNumber, setWhatsappNumberState] = useState<string>(() => {
    const saved = localStorage.getItem(WHATSAPP_STORAGE_KEY);
    return saved && saved.trim() ? saved : DEFAULT_PHONE;
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const { success, info } = useToast();

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.warn('Could not save cart:', err);
    }
  }, [items]);

  const setWhatsappNumber = (phone: string) => {
    const clean = phone.replace(/[^0-9]/g, '');
    setWhatsappNumberState(clean);
    localStorage.setItem(WHATSAPP_STORAGE_KEY, clean);
  };

  const addToCart = (producto: Producto, cantidad = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.producto.id === producto.id);
      if (existing) {
        return prev.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item
        );
      }
      return [...prev, { producto, cantidad }];
    });
    success(`Agregado a la bolsa: ${producto.nombre}`);
  };

  const removeFromCart = (productoId: number | string) => {
    setItems((prev) => prev.filter((item) => item.producto.id !== productoId));
  };

  const updateQuantity = (productoId: number | string, cantidad: number) => {
    if (cantidad <= 0) {
      removeFromCart(productoId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.producto.id === productoId ? { ...item, cantidad } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.cantidad, 0);

  const totalPrice = items.reduce((sum, item) => {
    const p = typeof item.producto.precio === 'number' ? item.producto.precio : parseFloat(item.producto.precio as any) || 0;
    return sum + p * item.cantidad;
  }, 0);

  const formatCOP = (num: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(num);

  // Send entire cart to WhatsApp
  const sendCartToWhatsApp = (customerInfo?: { nombre?: string; direccion?: string; nota?: string }) => {
    if (items.length === 0) return;

    let message = `¡Hola AlexStore! 👋 Deseo realizar el siguiente pedido:\n\n`;
    message += `🛒 *RESUMEN DEL PEDIDO (${totalItems} artículos):*\n`;

    items.forEach((item, index) => {
      const price = typeof item.producto.precio === 'number' ? item.producto.precio : parseFloat(item.producto.precio as any) || 0;
      const subtotal = price * item.cantidad;
      message += `${index + 1}. *${item.producto.nombre}*\n`;
      message += `   • Cantidad: ${item.cantidad}\n`;
      message += `   • Precio c/u: ${formatCOP(price)}\n`;
      message += `   • Subtotal: ${formatCOP(subtotal)}\n\n`;
    });

    message += `💰 *TOTAL A PAGAR: ${formatCOP(totalPrice)}*\n\n`;

    if (customerInfo?.nombre?.trim()) {
      message += `👤 *Cliente:* ${customerInfo.nombre.trim()}\n`;
    }
    if (customerInfo?.direccion?.trim()) {
      message += `📍 *Ciudad / Dirección:* ${customerInfo.direccion.trim()}\n`;
    }
    if (customerInfo?.nota?.trim()) {
      message += `📝 *Nota adicional:* ${customerInfo.nota.trim()}\n`;
    }

    message += `\n¿Me confirman disponibilidad y datos de pago/envío? ¡Gracias!`;

    const encoded = encodeURIComponent(message);
    const phone = (whatsappNumber.trim() || DEFAULT_PHONE).replace(/[^0-9]/g, '');
    const url = `https://wa.me/${phone}?text=${encoded}`;
    window.open(url, '_blank');
  };

  // Direct single product order to WhatsApp
  const sendSingleProductToWhatsApp = (producto: Producto, cantidad: number, nota?: string) => {
    const rawPrice = typeof producto.precio === 'number' ? producto.precio : parseFloat(producto.precio as any) || 0;
    const subtotal = rawPrice * cantidad;

    let message = `¡Hola AlexStore! 👋 Deseo pedir el siguiente producto:\n\n`;
    message += `📌 *Producto:* ${producto.nombre}\n`;
    message += `🔢 *Cantidad:* ${cantidad} unidad(es)\n`;
    message += `💵 *Precio unitario:* ${formatCOP(rawPrice)}\n`;
    message += `💰 *Total:* ${formatCOP(subtotal)}\n\n`;

    if (nota?.trim()) {
      message += `📝 *Nota:* ${nota.trim()}\n\n`;
    }

    message += `¿Tienen disponibilidad inmediata para coordinar envío y pago? ¡Gracias!`;

    const encoded = encodeURIComponent(message);
    const phone = (whatsappNumber.trim() || DEFAULT_PHONE).replace(/[^0-9]/g, '');
    const url = `https://wa.me/${phone}?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isCartOpen,
        setIsCartOpen,
        whatsappNumber,
        setWhatsappNumber,
        sendCartToWhatsApp,
        sendSingleProductToWhatsApp,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
