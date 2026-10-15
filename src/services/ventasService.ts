import { supabase } from '../lib/supabase';
import { Venta, Pedido, PedidoItem, MetodoPago } from '../types/database';
import { pedidosService } from './pedidosService';
import { inventarioService } from './inventarioService';

const LOCAL_VENTAS_KEY = 'alexstore_ventas_local_v1';

export const ventasService = {
  getLocalVentas(): Venta[] {
    try {
      const data = localStorage.getItem(LOCAL_VENTAS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveLocalVentas(ventas: Venta[]): void {
    try {
      localStorage.setItem(LOCAL_VENTAS_KEY, JSON.stringify(ventas));
    } catch (e) {
      console.warn('Error saving local ventas:', e);
    }
  },

  async getVentas(): Promise<Venta[]> {
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .order('creado_en', { ascending: false });

      if (error) {
        console.warn('Supabase ventas query notice:', error.message);
        return this.getLocalVentas();
      }

      const remoteList = (data || []).map((v: any) => ({
        ...v,
        items: Array.isArray(v.items) ? v.items : (typeof v.items === 'string' ? JSON.parse(v.items) : []),
      })) as Venta[];

      this.saveLocalVentas(remoteList);
      return remoteList;
    } catch (err) {
      console.warn('Failed to fetch from Supabase ventas, returning local:', err);
      return this.getLocalVentas();
    }
  },

  // Create manual sale
  async createVentaManual(payload: {
    cliente_nombre: string;
    cliente_telefono?: string;
    metodo_pago: MetodoPago;
    items: PedidoItem[];
    total: number;
    notas?: string;
    descontarInventario?: boolean;
  }): Promise<Venta> {
    const randomCode = `VTA-${Math.floor(1000 + Math.random() * 9000)}`;
    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : `vta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newVenta: Venta = {
      id: newId,
      codigo: randomCode,
      pedido_id: null,
      cliente_nombre: payload.cliente_nombre.trim(),
      cliente_telefono: payload.cliente_telefono?.trim() || null,
      metodo_pago: payload.metodo_pago,
      total: payload.total,
      items: payload.items,
      tipo: 'manual',
      notas: payload.notas?.trim() || null,
      creado_en: nowIso,
    };

    // 1. Local save
    const local = this.getLocalVentas();
    this.saveLocalVentas([newVenta, ...local]);

    // 2. Supabase save
    try {
      await supabase.from('ventas').insert([
        {
          id: newVenta.id,
          codigo: newVenta.codigo,
          pedido_id: null,
          cliente_nombre: newVenta.cliente_nombre,
          cliente_telefono: newVenta.cliente_telefono,
          metodo_pago: newVenta.metodo_pago,
          total: newVenta.total,
          items: newVenta.items,
          tipo: 'manual',
          notas: newVenta.notas,
          creado_en: newVenta.creado_en,
        },
      ]);
    } catch (err) {
      console.warn('Could not insert manual sale to Supabase:', err);
    }

    // 3. Optional stock reduction for manual sale
    if (payload.descontarInventario !== false) {
      for (const item of payload.items) {
        if (item.producto_id && item.cantidad > 0) {
          try {
            await inventarioService.adjustStockDelta(item.producto_id, -item.cantidad);
          } catch (e) {
            console.warn(`Could not adjust stock for manual item ${item.nombre}:`, e);
          }
        }
      }
    }

    return newVenta;
  },

  // Convert an approved pedido into a venta
  async convertirPedidoAVenta(pedido: Pedido): Promise<Venta> {
    // Check if already converted
    const existing = this.getLocalVentas().find((v) => v.pedido_id === pedido.id);
    if (existing) {
      return existing;
    }

    const randomCode = `VTA-${Math.floor(1000 + Math.random() * 9000)}`;
    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : `vta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newVenta: Venta = {
      id: newId,
      codigo: randomCode,
      pedido_id: pedido.id,
      cliente_nombre: pedido.cliente_nombre,
      cliente_telefono: pedido.cliente_telefono,
      metodo_pago: pedido.metodo_pago,
      total: pedido.total,
      items: pedido.items,
      tipo: 'web',
      notas: `Aprobado desde pedido web ${pedido.codigo}. ${pedido.notas || ''}`.trim(),
      creado_en: nowIso,
    };

    // 1. Update pedido state to 'aprobado'
    await pedidosService.updateEstado(pedido.id, 'aprobado');

    // 2. Save venta locally
    const local = this.getLocalVentas();
    this.saveLocalVentas([newVenta, ...local]);

    // 3. Save venta to Supabase
    try {
      await supabase.from('ventas').insert([
        {
          id: newVenta.id,
          codigo: newVenta.codigo,
          pedido_id: pedido.id,
          cliente_nombre: newVenta.cliente_nombre,
          cliente_telefono: newVenta.cliente_telefono,
          metodo_pago: newVenta.metodo_pago,
          total: newVenta.total,
          items: newVenta.items,
          tipo: 'web',
          notas: newVenta.notas,
          creado_en: newVenta.creado_en,
        },
      ]);
    } catch (e) {
      console.warn('Could not insert converted sale to Supabase:', e);
    }

    return newVenta;
  },

  // Delete sale
  async deleteVenta(id: string): Promise<void> {
    const local = this.getLocalVentas();
    this.saveLocalVentas(local.filter((v) => v.id !== id));

    try {
      await supabase.from('ventas').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete venta error:', e);
    }
  },
};
