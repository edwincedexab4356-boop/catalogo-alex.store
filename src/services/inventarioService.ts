import { supabase } from '../lib/supabase';
import { Inventario } from '../types/database';

export const inventarioService = {
  async getInventarioList(): Promise<Inventario[]> {
    const { data, error } = await supabase
      .from('inventario')
      .select('*, producto:productos(*, categoria:categorias(*))')
      .order('id', { ascending: true });

    if (error) {
      console.warn('Fallback simple query for inventario:', error.message);
      try {
        const { data: simpleData, error: simpleErr } = await supabase
          .from('inventario')
          .select('*');
        if (simpleErr) {
          console.warn('Inventario query notice:', simpleErr.message);
          return [];
        }
        return (simpleData || []) as Inventario[];
      } catch {
        return [];
      }
    }

    return (data || []).map((item: any) => ({
      ...item,
      producto: Array.isArray(item.producto) ? item.producto[0] : item.producto,
    })) as Inventario[];
  },

  async getInventarioByProductoId(productoId: number | string): Promise<Inventario | null> {
    const { data, error } = await supabase
      .from('inventario')
      .select('*')
      .eq('producto_id', productoId)
      .maybeSingle();

    if (error) throw error;
    return data as Inventario;
  },

  async updateStock(
    productoId: number | string,
    cantidad: number,
    stockMinimo?: number
  ): Promise<Inventario> {
    const safeCantidad = Math.max(0, Math.floor(cantidad));
    const updateData: Record<string, any> = {
      cantidad: safeCantidad,
      actualizado_en: new Date().toISOString(),
    };
    if (stockMinimo !== undefined) {
      updateData.stock_minimo = Math.max(0, Math.floor(stockMinimo));
    }

    // Try update first
    const { data, error } = await supabase
      .from('inventario')
      .update(updateData)
      .eq('producto_id', productoId)
      .select()
      .maybeSingle();

    if (error) throw error;

    // If no row existed yet, insert one
    if (!data) {
      const { data: insertData, error: insertError } = await supabase
        .from('inventario')
        .insert([
          {
            producto_id: productoId,
            cantidad: safeCantidad,
            stock_minimo: stockMinimo !== undefined ? Math.max(0, stockMinimo) : 5,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;
      return insertData as Inventario;
    }

    return data as Inventario;
  },

  async adjustStockDelta(
    productoId: number | string,
    delta: number
  ): Promise<Inventario> {
    // Fetch current
    const current = await this.getInventarioByProductoId(productoId);
    const currentQty = current?.cantidad ?? 0;
    const newQty = Math.max(0, currentQty + delta);
    return this.updateStock(productoId, newQty, current?.stock_minimo);
  },
};
