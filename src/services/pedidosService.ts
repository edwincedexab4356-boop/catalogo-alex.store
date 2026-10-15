import { supabase } from '../lib/supabase';
import { Pedido, PedidoItem, EstadoPedido, MetodoPago } from '../types/database';
import { storageService } from './storageService';
import { inventarioService } from './inventarioService';

const LOCAL_PEDIDOS_KEY = 'alexstore_pedidos_local_v1';

export const pedidosService = {
  // Read local cache
  getLocalPedidos(): Pedido[] {
    try {
      const data = localStorage.getItem(LOCAL_PEDIDOS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Save local cache
  saveLocalPedidos(pedidos: Pedido[]): void {
    try {
      localStorage.setItem(LOCAL_PEDIDOS_KEY, JSON.stringify(pedidos));
    } catch (e) {
      console.warn('Error saving local pedidos:', e);
    }
  },

  // Get all pedidos (Supabase with localStorage fallback)
  async getPedidos(): Promise<Pedido[]> {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('creado_en', { ascending: false });

      if (error) {
        // Table doesn't exist yet or permission error
        console.warn('Supabase pedidos query notice:', error.message);
        return this.getLocalPedidos();
      }

      // Merge Supabase with any local ones that might not be synced
      const remoteList = (data || []).map((p: any) => ({
        ...p,
        items: Array.isArray(p.items) ? p.items : (typeof p.items === 'string' ? JSON.parse(p.items) : []),
      })) as Pedido[];

      this.saveLocalPedidos(remoteList);
      return remoteList;
    } catch (err) {
      console.warn('Failed to fetch from Supabase pedidos, returning local:', err);
      return this.getLocalPedidos();
    }
  },

  // Create a new order with receipt upload and stock decrement
  async createPedido(payload: {
    cliente_nombre: string;
    cliente_telefono: string;
    cliente_direccion?: string;
    metodo_pago: MetodoPago;
    items: PedidoItem[];
    total: number;
    notas?: string;
    comprobanteFile?: File | null;
  }): Promise<Pedido> {
    const randomCode = `ALX-${Math.floor(1000 + Math.random() * 9000)}`;
    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : `ped_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    let comprobanteUrl: string | null = null;

    // 1. Upload receipt to Supabase Storage if provided
    if (payload.comprobanteFile) {
      try {
        const uploadRes = await storageService.uploadFile(payload.comprobanteFile, 'recibos', 'comprobantes');
        comprobanteUrl = uploadRes.publicUrl;
      } catch (uploadErr) {
        console.warn('Notice uploading comprobante, creating blob preview fallback:', uploadErr);
        // Fallback: create an object URL or store base64 so it can be previewed
        try {
          comprobanteUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve(URL.createObjectURL(payload.comprobanteFile!));
            reader.readAsDataURL(payload.comprobanteFile!);
          });
        } catch {
          comprobanteUrl = URL.createObjectURL(payload.comprobanteFile);
        }
      }
    }

    const newPedido: Pedido = {
      id: newId,
      codigo: randomCode,
      cliente_nombre: payload.cliente_nombre.trim(),
      cliente_telefono: payload.cliente_telefono.trim(),
      cliente_direccion: payload.cliente_direccion?.trim() || null,
      metodo_pago: payload.metodo_pago,
      comprobante_url: comprobanteUrl,
      total: payload.total,
      estado: 'pendiente',
      items: payload.items,
      notas: payload.notas?.trim() || null,
      creado_en: nowIso,
      actualizado_en: nowIso,
    };

    // 2. Save in local cache first
    const localList = this.getLocalPedidos();
    this.saveLocalPedidos([newPedido, ...localList]);

    // 3. Try to save in Supabase
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .insert([
          {
            id: newPedido.id,
            codigo: newPedido.codigo,
            cliente_nombre: newPedido.cliente_nombre,
            cliente_telefono: newPedido.cliente_telefono,
            cliente_direccion: newPedido.cliente_direccion,
            metodo_pago: newPedido.metodo_pago,
            comprobante_url: newPedido.comprobante_url,
            total: newPedido.total,
            estado: newPedido.estado,
            items: newPedido.items,
            notas: newPedido.notas,
            creado_en: newPedido.creado_en,
            actualizado_en: newPedido.actualizado_en,
          },
        ])
        .select()
        .maybeSingle();

      if (error) {
        console.warn('Could not insert to public.pedidos in Supabase (saved locally):', error.message);
      }
    } catch (dbErr) {
      console.warn('Supabase pedidos exception:', dbErr);
    }

    // 4. Automatically adjust stock in inventario for ordered items
    for (const item of payload.items) {
      if (item.producto_id && item.cantidad > 0) {
        try {
          await inventarioService.adjustStockDelta(item.producto_id, -item.cantidad);
        } catch (stockErr) {
          console.warn(`Could not adjust stock for item ${item.nombre}:`, stockErr);
        }
      }
    }

    return newPedido;
  },

  // Update order status
  async updateEstado(id: string, nuevoEstado: EstadoPedido): Promise<void> {
    const nowIso = new Date().toISOString();

    // 1. Update local
    const local = this.getLocalPedidos();
    const updated = local.map((p) =>
      p.id === id ? { ...p, estado: nuevoEstado, actualizado_en: nowIso } : p
    );
    this.saveLocalPedidos(updated);

    // 2. Update Supabase
    try {
      await supabase
        .from('pedidos')
        .update({
          estado: nuevoEstado,
          actualizado_en: nowIso,
        })
        .eq('id', id);
    } catch (e) {
      console.warn('Supabase update estado error:', e);
    }
  },

  // Delete order
  async deletePedido(id: string): Promise<void> {
    const local = this.getLocalPedidos();
    this.saveLocalPedidos(local.filter((p) => p.id !== id));

    try {
      await supabase.from('pedidos').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete pedido error:', e);
    }
  },
};
