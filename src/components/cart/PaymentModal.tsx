import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { CartItem } from '../../contexts/CartContext';
import { MetodoPago, PedidoItem } from '../../types/database';
import { paymentConfigService } from '../../services/paymentConfigService';
import { pedidosService } from '../../services/pedidosService';
import { storageService } from '../../services/storageService';
import { receiptImageService } from '../../services/receiptImageService';
import { useToast } from '../../contexts/ToastContext';
import {
  Smartphone,
  Building2,
  CreditCard,
  UploadCloud,
  CheckCircle2,
  Copy,
  Check,
  X,
  Loader2,
  MessageCircle,
  FileText,
  Printer,
  Download,
  ShieldCheck,
  Lock,
  ArrowRight,
  Store,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  totalPrice: number;
  totalItems: number;
  onSuccess: () => void;
  whatsappStorePhone: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  items,
  totalPrice,
  totalItems,
  onSuccess,
  whatsappStorePhone,
}) => {
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const paymentConfig = paymentConfigService.getConfig();

  // Form State
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [nota, setNota] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('transferencia');

  // Credit/Debit Card Fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Receipt File State
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');

  // Process State
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Official Receipt State upon confirmation
  const [officialReceipt, setOfficialReceipt] = useState<{
    reciboNumero: string;
    pedidoCodigo: string;
    fecha: string;
    comprobanteUrl: string | null;
    cliente: {
      nombre: string;
      telefono: string;
      direccion?: string;
    };
    metodoPago: MetodoPago;
    items: PedidoItem[];
    total: number;
    tarjetaUltimos4?: string;
  } | null>(null);

  // Combined Receipt Image (Comprobante + Pedido debajo)
  const [combinedReceiptImage, setCombinedReceiptImage] = useState<{
    file: File;
    blob: Blob;
    dataUrl: string;
  } | null>(null);

  const receiptPrintRef = useRef<HTMLDivElement>(null);

  const formatCOP = (num: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(num);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toastSuccess('Copiado al portapapeles');
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = storageService.validateImageFile(file);
    if (!validation.valid) {
      toastError(validation.error || 'Formato de imagen inválido');
      return;
    }

    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview('');
  };

  // Format Card Number (adds spaces every 4 digits)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
  };

  // Format Card Expiry (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    if (raw.length > 2) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    setCardExpiry(raw);
  };

  // Generate WhatsApp message with order details
  const buildWhatsAppMessage = (orderCode: string, receiptNum: string, receiptUrl?: string | null) => {
    let msg = `¡Hola AlexStore! 👋 Acabo de realizar mi pedido oficial:\n\n`;
    msg += `📄 *RECIBO OFICIAL N°:* ${receiptNum}\n`;
    msg += `🏷️ *CÓDIGO DE PEDIDO:* ${orderCode}\n`;
    msg += `👤 *Cliente:* ${nombre.trim()}\n`;
    msg += `📱 *Teléfono:* ${telefono.trim()}\n`;
    if (direccion.trim()) {
      msg += `📍 *Dirección de Entrega:* ${direccion.trim()}\n`;
    }
    msg += `💳 *Método de Pago:* ${metodoPago.toUpperCase()}\n`;
    if (metodoPago === 'tarjeta' && cardNumber) {
      const cleanCard = cardNumber.replace(/\s/g, '');
      msg += `   • Tarjeta: **** **** **** ${cleanCard.slice(-4)}\n`;
    }
    msg += `💰 *TOTAL PAGADO: ${formatCOP(totalPrice)}*\n\n`;

    msg += `🛒 *RESUMEN DEL PEDIDO (${totalItems} artículos):*\n`;
    items.forEach((item, idx) => {
      const price = typeof item.producto.precio === 'number' ? item.producto.precio : parseFloat(item.producto.precio as any) || 0;
      msg += `${idx + 1}. *${item.producto.nombre}* x${item.cantidad} (${formatCOP(price * item.cantidad)})\n`;
    });

    if (nota.trim()) {
      msg += `\n📝 *Nota:* ${nota.trim()}\n`;
    }

    if (receiptUrl) {
      msg += `\n📸 *Comprobante de pago guardado:*\n${receiptUrl}\n`;
    }

    msg += `\nAdjunto la imagen de mi comprobante y pedido. Por favor confírmenme. ¡Muchas gracias!`;
    return msg;
  };

  // Trigger WhatsApp: sends the combined receipt photo (comprobante + pedido debajo) directly
  const handleSendToWhatsApp = async (orderCode: string, receiptNum: string, receiptUrl?: string | null) => {
    const message = buildWhatsAppMessage(orderCode, receiptNum, receiptUrl);
    const cleanPhone = (whatsappStorePhone.trim() || '66212802').replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;

    // Target image file to share
    const targetFile = combinedReceiptImage?.file || receiptFile;

    // 1. Mobile Web Share API Level 2 (native file + text share to WhatsApp app)
    if (
      targetFile &&
      navigator.canShare &&
      navigator.canShare({ files: [targetFile] })
    ) {
      try {
        await navigator.share({
          title: `Pedido AlexStore ${orderCode}`,
          text: message,
          files: [targetFile],
        });
        toastSuccess('¡Pedido y comprobante compartidos con éxito!');
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Native share fallback:', err);
        } else {
          return;
        }
      }
    }

    // 2. Fallback for Desktop/Browsers without direct file share:
    // Automatically download the combined receipt image so the user has it ready
    if (combinedReceiptImage?.file) {
      receiptImageService.downloadReceiptFile(combinedReceiptImage.file);
      if (combinedReceiptImage.blob) {
        receiptImageService.copyReceiptImage(combinedReceiptImage.blob);
      }
      toastInfo('Imagen de comprobante y pedido descargada. Pégala o adjúntala en el chat de WhatsApp que se abrirá.');
    }

    // 3. Open WhatsApp Web / App
    try {
      const link = document.createElement('a');
      link.href = waUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.location.href = waUrl;
    }
  };

  const handleDownloadCombinedImage = () => {
    if (combinedReceiptImage?.file) {
      receiptImageService.downloadReceiptFile(combinedReceiptImage.file);
      toastSuccess('Imagen del recibo oficial y comprobante descargada');
    } else {
      toastError('La imagen aún se está generando');
    }
  };

  const handleCopyCombinedImage = async () => {
    if (combinedReceiptImage?.blob) {
      const copied = await receiptImageService.copyReceiptImage(combinedReceiptImage.blob);
      if (copied) {
        toastSuccess('¡Imagen copiada al portapapeles! Puedes pegarla en WhatsApp con Ctrl+V');
      } else {
        toastInfo('Tu navegador no permite copiar imágenes directamente. Usa el botón Descargar.');
      }
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      toastError('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!telefono.trim()) {
      toastError('Por favor ingresa tu número de WhatsApp / teléfono.');
      return;
    }

    // Validation for Transferencia & Yappy: Must attach receipt
    if ((metodoPago === 'yappy' || metodoPago === 'transferencia') && !receiptFile) {
      toastError(`Por favor adjunta la foto o captura de tu comprobante de ${metodoPago.toUpperCase()}.`);
      return;
    }

    // Validation for Card: Must enter valid card numbers
    if (metodoPago === 'tarjeta') {
      const cleanNum = cardNumber.replace(/\s/g, '');
      if (cleanNum.length < 15) {
        toastError('Por favor ingresa un número de tarjeta válido.');
        return;
      }
      if (!cardExpiry || cardExpiry.length < 5) {
        toastError('Ingresa la fecha de vencimiento (MM/AA).');
        return;
      }
      if (!cardCvv || cardCvv.length < 3) {
        toastError('Ingresa el código de seguridad CVV.');
        return;
      }
    }

    try {
      setLoading(true);
      setUploadStatus('Guardando pedido y subiendo comprobante a Supabase...');

      const orderItems: PedidoItem[] = items.map((item) => {
        const price = typeof item.producto.precio === 'number' ? item.producto.precio : parseFloat(item.producto.precio as any) || 0;
        return {
          producto_id: item.producto.id,
          nombre: item.producto.nombre,
          precio: price,
          cantidad: item.cantidad,
          subtotal: price * item.cantidad,
          imagen_url: item.producto.imagen_url || null,
        };
      });

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const receiptNo = `REC-${new Date().getFullYear()}-${randomSuffix}`;
      const nowFormatted = new Date().toLocaleString('es-CO', {
        dateStyle: 'long',
        timeStyle: 'short',
      });

      // 1. Create order in database (pedidosService saves to Supabase Storage + table + local cache)
      const created = await pedidosService.createPedido({
        cliente_nombre: nombre,
        cliente_telefono: telefono,
        cliente_direccion: direccion,
        metodo_pago: metodoPago,
        items: orderItems,
        total: totalPrice,
        notas: metodoPago === 'tarjeta'
          ? `Pago con Tarjeta terminada en ${cardNumber.replace(/\s/g, '').slice(-4)}. ${nota}`.trim()
          : nota,
        comprobanteFile: receiptFile,
      });

      setUploadStatus('Generando imagen oficial del recibo y comprobante...');

      // 2. Generate combined image (comprobante + recibo oficial debajo)
      try {
        const generatedImg = await receiptImageService.generateCombinedReceiptImage({
          reciboNumero: receiptNo,
          pedidoCodigo: created.codigo,
          clienteNombre: nombre.trim(),
          clienteTelefono: telefono.trim(),
          clienteDireccion: direccion.trim() || undefined,
          metodoPago: metodoPago,
          items: orderItems.map((i) => ({
            nombre: i.nombre,
            cantidad: i.cantidad,
            precio: i.precio,
            subtotal: i.subtotal,
          })),
          total: totalPrice,
          fecha: nowFormatted,
          comprobanteFile: receiptFile,
          comprobanteUrlOrBlob: created.comprobante_url || receiptPreview || null,
        });

        setCombinedReceiptImage(generatedImg);
      } catch (imgErr) {
        console.warn('Notice generating combined receipt image:', imgErr);
      }

      setOfficialReceipt({
        reciboNumero: receiptNo,
        pedidoCodigo: created.codigo,
        fecha: nowFormatted,
        comprobanteUrl: created.comprobante_url || receiptPreview || null,
        cliente: {
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          direccion: direccion.trim() || undefined,
        },
        metodoPago,
        items: orderItems,
        total: totalPrice,
        tarjetaUltimos4: metodoPago === 'tarjeta' ? cardNumber.replace(/\s/g, '').slice(-4) : undefined,
      });

      toastSuccess(`¡Pedido ${created.codigo} guardado con éxito! Recibo oficial generado.`);
      onSuccess(); // Clears cart
    } catch (err: any) {
      console.error('Error submitting order:', err);
      toastError(err.message || 'Error al procesar el pago');
    } finally {
      setLoading(false);
      setUploadStatus('');
    }
  };

  // ==========================================
  // VIEW: OFFICIAL DIGITAL RECEIPT & WHATSAPP
  // ==========================================
  if (officialReceipt) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Recibo Oficial de Compra" maxWidth="2xl">
        <div className="space-y-6 py-2">
          {/* Printable Official Receipt Card */}
          <div
            ref={receiptPrintRef}
            className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-stone-800 shadow-xl space-y-6 relative overflow-hidden"
          >
            {/* Stamp "PAGADO / VERIFICADO" */}
            <div className="absolute top-6 right-6 border-2 border-emerald-600 text-emerald-700 px-3 py-1 rounded-xl font-black text-xs uppercase tracking-widest rotate-6 pointer-events-none opacity-85">
              ✓ PAGADO & REGISTRADO
            </div>

            {/* Receipt Header */}
            <div className="border-b-2 border-stone-100 pb-5">
              <div className="flex items-center gap-2 mb-1">
                <Store className="w-5 h-5 text-[#c5a059]" />
                <h3 className="text-xl font-black text-stone-950 tracking-tight">ALEXSTORE</h3>
              </div>
              <p className="text-xs text-stone-500">Recibo Oficial de Compra Electrónica</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-3 border-t border-stone-100 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">No. Recibo</span>
                  <span className="font-mono font-bold text-stone-900">{officialReceipt.reciboNumero}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Código Pedido</span>
                  <span className="font-mono font-black text-[#c5a059]">{officialReceipt.pedidoCodigo}</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Fecha y Hora</span>
                  <span className="font-medium text-stone-800">{officialReceipt.fecha}</span>
                </div>
              </div>
            </div>

            {/* Client Info */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 text-xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                Datos del Comprador
              </div>
              <div className="font-bold text-stone-900">{officialReceipt.cliente.nombre}</div>
              <div className="text-stone-600">Teléfono: {officialReceipt.cliente.telefono}</div>
              {officialReceipt.cliente.direccion && (
                <div className="text-stone-600">Dirección: {officialReceipt.cliente.direccion}</div>
              )}
              <div className="text-stone-800 pt-1">
                Método de Pago:{' '}
                <strong className="uppercase text-[#c5a059]">{officialReceipt.metodoPago}</strong>
                {officialReceipt.tarjetaUltimos4 && ` (Terminada en ${officialReceipt.tarjetaUltimos4})`}
              </div>
            </div>

            {/* Products Table */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                Detalle de Artículos
              </div>
              <div className="border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100">
                {officialReceipt.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 text-xs bg-white">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      {item.imagen_url && (
                        <img src={item.imagen_url} alt={item.nombre} className="w-8 h-8 rounded-lg object-cover shrink-0 border border-stone-200" />
                      )}
                      <div>
                        <div className="font-bold text-stone-900 truncate">{item.nombre}</div>
                        <div className="text-[11px] text-stone-400">Cantidad: {item.cantidad} x {formatCOP(item.precio)}</div>
                      </div>
                    </div>
                    <span className="font-black text-stone-900 shrink-0">{formatCOP(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Box */}
            <div className="p-4 rounded-2xl bg-[#0c0a08] text-white flex items-center justify-between border border-[#c5a059]/40">
              <span className="text-xs font-bold uppercase tracking-wider text-[#c5a059]">
                Total Pagado
              </span>
              <span className="text-2xl font-black text-[#f7e8c5]">
                {formatCOP(officialReceipt.total)}
              </span>
            </div>

            {/* Comprobante de Pago Adjunto */}
            {officialReceipt.comprobanteUrl && (
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                  📸 Comprobante de Pago Adjunto
                </span>
                <img
                  src={officialReceipt.comprobanteUrl}
                  alt="Comprobante de pago"
                  className="max-h-56 max-w-full mx-auto rounded-xl object-contain border border-stone-300 shadow-xs"
                />
              </div>
            )}

            <div className="text-center text-[10px] text-stone-400 pt-2 border-t border-stone-100">
              Este recibo oficial es un comprobante digital verificado registrado en la sección de pedidos de AlexStore.
            </div>
          </div>

          {/* Under Receipt: Direct WhatsApp Sharing Action & Image Tools */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() =>
                handleSendToWhatsApp(
                  officialReceipt.pedidoCodigo,
                  officialReceipt.reciboNumero,
                  officialReceipt.comprobanteUrl
                )
              }
              className="w-full py-4 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              Enviar Pedido y Comprobante a WhatsApp
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={handleDownloadCombinedImage}
                className="py-2.5 px-3 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Descargar imagen completa del recibo oficial con comprobante"
              >
                <Download className="w-4 h-4 text-[#c5a059]" />
                Descargar Imagen
              </button>

              <button
                type="button"
                onClick={handleCopyCombinedImage}
                className="py-2.5 px-3 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Copiar imagen al portapapeles"
              >
                <Copy className="w-4 h-4 text-stone-600" />
                Copiar Imagen
              </button>

              <button
                type="button"
                onClick={handlePrintReceipt}
                className="py-2.5 px-3 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-stone-500" />
                Imprimir Recibo
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-[#0c0a08] hover:bg-stone-800 text-[#f7e8c5] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Listo / Finalizar
              </button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // ==========================================
  // VIEW: CHECKOUT FORM WITH 3 PAYMENT METHODS
  // (1. Transferencia, 2. Tarjeta, 3. Yappy)
  // ==========================================
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pago de Pedido & Recibo Oficial"
      subtitle="Elige tu medio de pago: Transferencia, Tarjeta o Yappy y obtén tu recibo oficial"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Total to pay banner */}
        <div className="p-4 rounded-2xl bg-[#0c0a08] text-white flex items-center justify-between border border-[#362b1e]">
          <div>
            <span className="text-[10px] font-bold text-[#c5a059] uppercase tracking-widest block">
              Total a Pagar ({totalItems} {totalItems === 1 ? 'artículo' : 'artículos'})
            </span>
            <div className="text-2xl font-black text-[#f7e8c5] tracking-tight">
              {formatCOP(totalPrice)}
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#261f15] border border-[#c5a059]/40 text-xs font-bold text-[#f1eaa7] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#c5a059]" />
            Pago Seguro
          </div>
        </div>

        {/* Step 1: Customer Details */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#0c0a08] text-white text-[10px] flex items-center justify-center">
              1
            </span>
            Datos del Comprador
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Carlos Gómez"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] bg-white text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                WhatsApp / Teléfono *
              </label>
              <input
                type="tel"
                required
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 66212802"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] bg-white text-stone-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Dirección de Entrega / Ciudad
              </label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Ciudad de Panamá, Betania, Calle 3ra"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] bg-white text-stone-900"
              />
            </div>
          </div>
        </div>

        {/* Step 2: The 3 Payment Methods (Transferencia, Tarjeta, Yappy) */}
        <div className="space-y-3 pt-2 border-t border-stone-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#0c0a08] text-white text-[10px] flex items-center justify-center">
              2
            </span>
            Selecciona Método de Pago (3 Opciones)
          </h4>

          <div className="grid grid-cols-3 gap-2.5">
            {/* 1. Transferencia Bancaria */}
            <button
              type="button"
              onClick={() => setMetodoPago('transferencia')}
              className={`p-3 sm:p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                metodoPago === 'transferencia'
                  ? 'border-[#c5a059] bg-amber-50/70 ring-2 ring-[#c5a059]/20 shadow-xs'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="px-2 py-0.5 rounded bg-[#0c0a08] text-[#f7e8c5] font-black text-[10px] border border-[#c5a059]/40">
                  BANCO
                </span>
                <Building2 className="w-4 h-4 text-[#c5a059]" />
              </div>
              <div className="text-xs font-bold text-stone-900">Transferencia</div>
              <div className="text-[10px] text-stone-500">Cuenta / ACH</div>
            </button>

            {/* 2. Tarjeta */}
            <button
              type="button"
              onClick={() => setMetodoPago('tarjeta')}
              className={`p-3 sm:p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                metodoPago === 'tarjeta'
                  ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-600/20 shadow-xs'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="px-2 py-0.5 rounded bg-purple-700 text-white font-black text-[10px]">
                  TARJETA
                </span>
                <CreditCard className="w-4 h-4 text-purple-700" />
              </div>
              <div className="text-xs font-bold text-stone-900">Tarjeta</div>
              <div className="text-[10px] text-stone-500">Débito / Crédito</div>
            </button>

            {/* 3. Yappy */}
            <button
              type="button"
              onClick={() => setMetodoPago('yappy')}
              className={`p-3 sm:p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                metodoPago === 'yappy'
                  ? 'border-[#0072CE] bg-blue-50/70 ring-2 ring-[#0072CE]/20 shadow-xs'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="px-2 py-0.5 rounded bg-[#0072CE] text-white font-black text-[10px]">
                  YAPPY
                </span>
                <Smartphone className="w-4 h-4 text-[#0072CE]" />
              </div>
              <div className="text-xs font-bold text-stone-900">Yappy</div>
              <div className="text-[10px] text-stone-500">Móvil B. General</div>
            </button>
          </div>

          {/* Details for Option 1: Transferencia Bancaria */}
          {metodoPago === 'transferencia' && (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-amber-900">Banco:</span>
                <span className="font-bold text-amber-950">{paymentConfig.transferencia.banco}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-amber-900">Tipo de Cuenta:</span>
                <span className="font-semibold text-amber-950">{paymentConfig.transferencia.tipoCuenta}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900">Número de Cuenta:</span>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-amber-950 font-mono bg-white px-2 py-0.5 rounded-lg border border-amber-200">
                    {paymentConfig.transferencia.numeroCuenta}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(paymentConfig.transferencia.numeroCuenta, 'cuenta')}
                    className="p-1 rounded-lg bg-[#0c0a08] text-[#f7e8c5] hover:bg-stone-800 transition-colors cursor-pointer"
                    title="Copiar cuenta"
                  >
                    {copiedField === 'cuenta' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-amber-900">Beneficiario:</span>
                <span className="font-bold text-amber-950">{paymentConfig.transferencia.beneficiario}</span>
              </div>

              {paymentConfig.transferencia.cedulaRuc && (
                <div className="flex items-center justify-between">
                  <span className="text-amber-900">Cédula / RUC:</span>
                  <span className="font-semibold text-amber-950">{paymentConfig.transferencia.cedulaRuc}</span>
                </div>
              )}

              <div className="text-[11px] text-amber-800/80 pt-1 border-t border-amber-200/60 leading-relaxed">
                {paymentConfig.transferencia.instrucciones}
              </div>
            </div>
          )}

          {/* Details for Option 2: Tarjeta */}
          {metodoPago === 'tarjeta' && (
            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
                <div className="font-bold text-purple-950 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-700" />
                  Datos de la Tarjeta (Débito o Crédito)
                </div>
                <span className="text-[10px] text-purple-800 font-semibold">Visa / Mastercard / Clave</span>
              </div>

              <div>
                <label className="block text-purple-900 font-medium mb-1">Nombre en la Tarjeta</label>
                <input
                  type="text"
                  required={metodoPago === 'tarjeta'}
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                  placeholder="NOMBRE COMO APARECE EN LA TARJETA"
                  className="w-full px-3 py-2 rounded-xl border border-purple-300 text-xs uppercase bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-purple-900 font-medium mb-1">Número de Tarjeta (16 dígitos)</label>
                <input
                  type="text"
                  required={metodoPago === 'tarjeta'}
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder="•••• •••• •••• ••••"
                  className="w-full px-3 py-2 rounded-xl border border-purple-300 text-xs bg-white font-mono font-bold tracking-widest"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-purple-900 font-medium mb-1">Vencimiento (MM/AA)</label>
                  <input
                    type="text"
                    required={metodoPago === 'tarjeta'}
                    value={cardExpiry}
                    onChange={handleExpiryChange}
                    placeholder="12/28"
                    className="w-full px-3 py-2 rounded-xl border border-purple-300 text-xs bg-white font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-purple-900 font-medium mb-1">Código CVV</label>
                  <input
                    type="password"
                    maxLength={4}
                    required={metodoPago === 'tarjeta'}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="•••"
                    className="w-full px-3 py-2 rounded-xl border border-purple-300 text-xs bg-white font-mono text-center font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Details for Option 3: Yappy */}
          {metodoPago === 'yappy' && (
            <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900">Número de Teléfono Yappy:</span>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-blue-950 font-mono bg-white px-2 py-0.5 rounded-lg border border-blue-200">
                    {paymentConfig.yappy.telefono}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(paymentConfig.yappy.telefono, 'yappy')}
                    className="p-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
                    title="Copiar número"
                  >
                    {copiedField === 'yappy' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-blue-800">Titular de la Cuenta:</span>
                <span className="font-bold text-blue-950">{paymentConfig.yappy.nombre}</span>
              </div>

              <div className="text-[11px] text-blue-800/80 pt-1 border-t border-blue-200/60 leading-relaxed">
                {paymentConfig.yappy.instrucciones}
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Receipt Upload */}
        <div className="space-y-3 pt-2 border-t border-stone-100">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#0c0a08] text-white text-[10px] flex items-center justify-center">
                3
              </span>
              {metodoPago === 'tarjeta'
                ? 'Comprobante o Autorización (Opcional)'
                : 'Sube tu Comprobante de Pago *'}
            </h4>
            <span className="text-[11px] text-stone-400 font-medium">JPG, PNG o WEBP</span>
          </div>

          {receiptPreview ? (
            <div className="relative p-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={receiptPreview}
                  alt="Comprobante"
                  className="w-16 h-16 rounded-xl object-cover border border-emerald-300"
                />
                <div>
                  <div className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Comprobante cargado listo
                  </div>
                  <div className="text-[11px] text-stone-500 truncate max-w-xs">
                    {receiptFile?.name} ({((receiptFile?.size || 0) / 1024).toFixed(0)} KB)
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemoveReceipt}
                className="p-1.5 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 transition-colors cursor-pointer"
                title="Cambiar comprobante"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 hover:bg-[#faf6ed] hover:border-[#c5a059] transition-all cursor-pointer group">
              <UploadCloud className="w-8 h-8 text-stone-400 group-hover:text-[#c5a059] mb-2 transition-colors" />
              <span className="text-xs font-bold text-stone-700 group-hover:text-stone-900">
                Toca aquí para seleccionar la captura o foto del comprobante
              </span>
              <span className="text-[11px] text-stone-400 mt-0.5">
                Se guardará en Supabase y se combinará con tu recibo oficial para WhatsApp
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Nota o aclaración para el vendedor (opcional)
            </label>
            <input
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: Favor entregar en la tarde o llamar al llegar"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] bg-white text-stone-900"
            />
          </div>
        </div>

        {/* Upload status message */}
        {uploadStatus && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-semibold flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#c5a059]" />
            {uploadStatus}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 font-medium text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={loading || ((metodoPago === 'yappy' || metodoPago === 'transferencia') && !receiptFile)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0c0a08] hover:bg-stone-800 text-[#f7e8c5] border border-[#c5a059]/40 font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#c5a059]" />
                Generando Recibo Oficial...
              </>
            ) : (
              <>
                Confirmar y Ver Recibo Oficial
                <ArrowRight className="w-4 h-4 text-[#c5a059]" />
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
