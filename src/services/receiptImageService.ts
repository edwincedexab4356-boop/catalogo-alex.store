export interface ReceiptImagePayload {
  reciboNumero: string;
  pedidoCodigo: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteDireccion?: string;
  metodoPago: string;
  items: {
    nombre: string;
    cantidad: number;
    precio: number;
    subtotal: number;
  }[];
  total: number;
  fecha: string;
  comprobanteUrlOrBlob?: string | null;
  comprobanteFile?: File | null;
}

export const receiptImageService = {
  /**
   * Generates a high-definition combined image of the payment voucher + official order receipt
   */
  async generateCombinedReceiptImage(payload: ReceiptImagePayload): Promise<{
    file: File;
    blob: Blob;
    dataUrl: string;
  }> {
    const width = 850;
    const padding = 45;
    const contentWidth = width - padding * 2;

    // First load the voucher image if available to know its dimensions
    let voucherImg: HTMLImageElement | null = null;
    let voucherSrc: string | null = null;

    if (payload.comprobanteFile) {
      voucherSrc = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(payload.comprobanteFile!);
      });
    } else if (payload.comprobanteUrlOrBlob) {
      voucherSrc = payload.comprobanteUrlOrBlob;
    }

    if (voucherSrc) {
      try {
        voucherImg = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('No se pudo cargar la imagen del comprobante'));
          img.src = voucherSrc!;
        });
      } catch (err) {
        console.warn('Could not load voucher image into canvas:', err);
      }
    }

    // Calculate canvas height dynamically
    let voucherSectionHeight = 0;
    let voucherRenderWidth = 0;
    let voucherRenderHeight = 0;

    if (voucherImg && voucherImg.naturalWidth > 0) {
      const maxVoucherW = contentWidth;
      const maxVoucherH = 500;
      const ratio = Math.min(maxVoucherW / voucherImg.naturalWidth, maxVoucherH / voucherImg.naturalHeight, 1);
      voucherRenderWidth = Math.round(voucherImg.naturalWidth * ratio);
      voucherRenderHeight = Math.round(voucherImg.naturalHeight * ratio);
      voucherSectionHeight = voucherRenderHeight + 70; // 70px for header & margins
    }

    const itemsHeight = payload.items.length * 36 + 60;
    const baseHeight = 650;
    const totalHeight = baseHeight + itemsHeight + voucherSectionHeight;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo inicializar canvas 2D');

    // Smooth rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, totalHeight);

    // Subtle outer border
    ctx.strokeStyle = '#D9D2C5';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, width - 20, totalHeight - 20);

    let y = padding + 10;

    // 2. Header Bar
    ctx.fillStyle = '#0C0A08';
    ctx.beginPath();
    ctx.roundRect(padding, y, contentWidth, 75, 16);
    ctx.fill();

    // Store Name
    ctx.fillStyle = '#F7E8C5';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ALEXSTORE', padding + 24, y + 46);

    // Receipt Tag
    ctx.fillStyle = '#C5A059';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('RECIBO OFICIAL DE COMPRA', padding + contentWidth - 24, y + 36);
    ctx.fillStyle = '#A39987';
    ctx.font = '11px sans-serif';
    ctx.fillText('Comprobante Electrónico Verificado', padding + contentWidth - 24, y + 54);

    y += 95;

    // 3. Status Badge & Order Details Grid
    ctx.fillStyle = '#F8F6F0';
    ctx.strokeStyle = '#E8E1D3';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(padding, y, contentWidth, 90, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#736B5E';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('N° RECIBO:', padding + 20, y + 30);
    ctx.fillText('CÓDIGO PEDIDO:', padding + 260, y + 30);
    ctx.fillText('FECHA Y HORA:', padding + 520, y + 30);

    ctx.fillStyle = '#0C0A08';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(payload.reciboNumero, padding + 20, y + 55);

    ctx.fillStyle = '#C5A059';
    ctx.font = 'bold 17px monospace';
    ctx.fillText(payload.pedidoCodigo, padding + 260, y + 55);

    ctx.fillStyle = '#2D2820';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(payload.fecha, padding + 520, y + 55);

    y += 105;

    // 4. Customer & Payment Info
    ctx.fillStyle = '#FAFAF8';
    ctx.strokeStyle = '#EAE5DB';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(padding, y, contentWidth, 100, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#8C8272';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('DATOS DEL CLIENTE', padding + 20, y + 25);
    ctx.fillText('MÉTODO DE PAGO', padding + 480, y + 25);

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(payload.clienteNombre, padding + 20, y + 48);

    ctx.fillStyle = '#4B5563';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Tel: ${payload.clienteTelefono}`, padding + 20, y + 68);
    if (payload.clienteDireccion) {
      ctx.fillText(`Dirección: ${payload.clienteDireccion}`, padding + 20, y + 86);
    }

    // Payment method pill
    const paymentPillX = padding + 480;
    const paymentPillY = y + 38;
    ctx.fillStyle = payload.metodoPago.toLowerCase() === 'yappy' ? '#0072CE' : (payload.metodoPago.toLowerCase() === 'tarjeta' ? '#6B21A8' : '#0C0A08');
    ctx.beginPath();
    ctx.roundRect(paymentPillX, paymentPillY, 220, 34, 10);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(payload.metodoPago.toUpperCase(), paymentPillX + 110, paymentPillY + 22);

    y += 115;

    // 5. Products Table
    ctx.fillStyle = '#0C0A08';
    ctx.beginPath();
    ctx.roundRect(padding, y, contentWidth, 34, 8);
    ctx.fill();

    ctx.fillStyle = '#F7E8C5';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PRODUCTO / ARTÍCULO', padding + 16, y + 22);
    ctx.textAlign = 'center';
    ctx.fillText('CANT', padding + contentWidth - 250, y + 22);
    ctx.fillText('PRECIO UNIT', padding + contentWidth - 140, y + 22);
    ctx.textAlign = 'right';
    ctx.fillText('SUBTOTAL', padding + contentWidth - 16, y + 22);

    y += 38;

    const formatCOP = (num: number) =>
      new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(num);

    payload.items.forEach((item, index) => {
      ctx.fillStyle = index % 2 === 0 ? '#FFFFFF' : '#F9F8F5';
      ctx.fillRect(padding, y, contentWidth, 34);

      ctx.strokeStyle = '#EFECE6';
      ctx.lineWidth = 1;
      ctx.strokeRect(padding, y, contentWidth, 34);

      ctx.fillStyle = '#1F2937';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      // Truncate long product names
      const maxChars = 40;
      const displayName = item.nombre.length > maxChars ? `${item.nombre.slice(0, maxChars)}...` : item.nombre;
      ctx.fillText(displayName, padding + 16, y + 22);

      ctx.fillStyle = '#4B5563';
      ctx.textAlign = 'center';
      ctx.fillText(`x${item.cantidad}`, padding + contentWidth - 250, y + 22);
      ctx.fillText(formatCOP(item.precio), padding + contentWidth - 140, y + 22);

      ctx.fillStyle = '#0C0A08';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(formatCOP(item.subtotal), padding + contentWidth - 16, y + 22);

      y += 34;
    });

    y += 15;

    // 6. Total Box
    ctx.fillStyle = '#0C0A08';
    ctx.beginPath();
    ctx.roundRect(padding, y, contentWidth, 65, 14);
    ctx.fill();

    ctx.fillStyle = '#C5A059';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TOTAL OFICIAL PAGADO:', padding + 24, y + 38);

    ctx.fillStyle = '#F7E8C5';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(formatCOP(payload.total), padding + contentWidth - 24, y + 42);

    y += 85;

    // 7. Attached Payment Voucher Section (Comprobante de pago arriba/debajo)
    if (voucherImg && voucherRenderHeight > 0) {
      // Header for voucher
      ctx.fillStyle = '#F3EFE6';
      ctx.strokeStyle = '#D6CCBA';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(padding, y, contentWidth, 32, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#5A5243';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('📸 COMPROBANTE DE PAGO ADJUNTO (FOTO / CAPTURA):', padding + 16, y + 21);

      y += 42;

      // Center voucher image
      const voucherX = padding + (contentWidth - voucherRenderWidth) / 2;
      ctx.strokeStyle = '#C5A059';
      ctx.lineWidth = 2;
      ctx.strokeRect(voucherX - 2, y - 2, voucherRenderWidth + 4, voucherRenderHeight + 4);

      ctx.drawImage(voucherImg, voucherX, y, voucherRenderWidth, voucherRenderHeight);

      y += voucherRenderHeight + 25;
    }

    // 8. Footer Note & Verification Seal
    ctx.fillStyle = '#8C8272';
    ctx.font = 'italic 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AlexStore • Calidad Premium 1:1 • Gracias por tu compra oficial', width / 2, y + 10);
    ctx.fillText('Este documento es tu comprobante oficial digital con número único registrado.', width / 2, y + 26);

    // Convert canvas to Blob & File
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('No se pudo generar imagen Blob desde canvas'));
      }, 'image/png', 0.95);
    });

    const fileName = `recibo_alexstore_${payload.pedidoCodigo}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });
    const dataUrl = canvas.toDataURL('image/png', 0.95);

    return { file, blob, dataUrl };
  },

  /**
   * Helper to trigger download of the receipt image file
   */
  downloadReceiptFile(file: File) {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },

  /**
   * Helper to copy receipt image to clipboard
   */
  async copyReceiptImage(blob: Blob): Promise<boolean> {
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ]);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Clipboard copy image not supported:', e);
      return false;
    }
  },
};
