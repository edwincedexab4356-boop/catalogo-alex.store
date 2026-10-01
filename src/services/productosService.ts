import { supabase } from '../lib/supabase';
import { Producto } from '../types/database';

export interface ProductFilters {
  categoriaId?: number | string | null;
  search?: string;
  onlyActive?: boolean;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'name_asc';
}

export const productosService = {
  async getProductos(filters: ProductFilters = {}): Promise<Producto[]> {
    let query = supabase
      .from('productos')
      .select('*, categoria:categorias(*), inventario:inventario(*)');

    if (filters.onlyActive) {
      query = query.eq('activo', true);
    }

    if (filters.categoriaId) {
      query = query.eq('categoria_id', filters.categoriaId);
    }

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(`nombre.ilike.${term},descripcion.ilike.${term}`);
    }

    // Sorting
    switch (filters.sortBy) {
      case 'price_asc':
        query = query.order('precio', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('precio', { ascending: false });
        break;
      case 'name_asc':
        query = query.order('nombre', { ascending: true });
        break;
      case 'newest':
      default:
        query = query.order('creado_en', { ascending: false });
        break;
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Error fetching productos with relations, trying flat query:', error.message);
      try {
        let fallbackQuery = supabase.from('productos').select('*');
        if (filters.onlyActive) fallbackQuery = fallbackQuery.eq('activo', true);
        if (filters.categoriaId) fallbackQuery = fallbackQuery.eq('categoria_id', filters.categoriaId);
        const { data: fbData, error: fbError } = await fallbackQuery;
        if (fbError) {
          console.warn('Flat query for productos notice:', fbError.message);
          return [];
        }
        return (fbData || []) as Producto[];
      } catch (e) {
        console.warn('Fallback exception in productos:', e);
        return [];
      }
    }

    return (data || []).map((p: any) => ({
      ...p,
      // Normalize inventario if array was returned
      inventario: Array.isArray(p.inventario) ? p.inventario[0] : p.inventario,
      categoria: Array.isArray(p.categoria) ? p.categoria[0] : p.categoria,
      imagenes: Array.isArray(p.imagenes) ? p.imagenes : [],
    })) as Producto[];
  },

  async getProductoById(id: number | string): Promise<Producto | null> {
    const { data, error } = await supabase
      .from('productos')
      .select('*, categoria:categorias(*), inventario:inventario(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      ...data,
      inventario: Array.isArray(data.inventario) ? data.inventario[0] : data.inventario,
      categoria: Array.isArray(data.categoria) ? data.categoria[0] : data.categoria,
      imagenes: Array.isArray(data.imagenes) ? data.imagenes : [],
    } as Producto;
  },

  async getRelatedProductos(
    categoriaId: number | string,
    currentId: number | string,
    limit: number = 4
  ): Promise<Producto[]> {
    if (!categoriaId) return [];

    const { data, error } = await supabase
      .from('productos')
      .select('*, categoria:categorias(*), inventario:inventario(*)')
      .eq('categoria_id', categoriaId)
      .neq('id', currentId)
      .eq('activo', true)
      .limit(limit);

    if (error) {
      console.warn('Error fetching related productos:', error.message);
      return [];
    }

    return (data || []).map((p: any) => ({
      ...p,
      inventario: Array.isArray(p.inventario) ? p.inventario[0] : p.inventario,
      categoria: Array.isArray(p.categoria) ? p.categoria[0] : p.categoria,
      imagenes: Array.isArray(p.imagenes) ? p.imagenes : [],
    })) as Producto[];
  },

  async createProducto(
    payload: {
      nombre: string;
      descripcion?: string | null;
      precio: number;
      categoria_id?: number | string | null;
      imagen_url?: string | null;
      imagenes?: string[];
      activo?: boolean;
    },
    initialStock: { cantidad: number; stock_minimo: number } = { cantidad: 10, stock_minimo: 3 }
  ): Promise<Producto> {
    const { data, error } = await supabase
      .from('productos')
      .insert([
        {
          nombre: payload.nombre.trim(),
          descripcion: payload.descripcion?.trim() || null,
          precio: payload.precio,
          categoria_id: payload.categoria_id ? Number(payload.categoria_id) : null,
          imagen_url: payload.imagen_url || null,
          imagenes: payload.imagenes || [],
          activo: payload.activo !== undefined ? payload.activo : true,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Check if inventory was automatically created by DB trigger, or upsert it
    if (data?.id) {
      try {
        const { data: invCheck } = await supabase
          .from('inventario')
          .select('id')
          .eq('producto_id', data.id)
          .maybeSingle();

        if (!invCheck) {
          await supabase.from('inventario').insert([
            {
              producto_id: data.id,
              cantidad: Math.max(0, initialStock.cantidad ?? 10),
              stock_minimo: Math.max(0, initialStock.stock_minimo ?? 3),
            },
          ]);
        }
      } catch (invErr) {
        console.warn('Auto-create inventory notice:', invErr);
      }
    }

    return data as Producto;
  },

  async updateProducto(
    id: number | string,
    payload: Partial<Producto>
  ): Promise<Producto> {
    const updateData: Record<string, any> = {
      actualizado_en: new Date().toISOString(),
    };
    if (payload.nombre !== undefined) updateData.nombre = payload.nombre.trim();
    if (payload.descripcion !== undefined) updateData.descripcion = payload.descripcion?.trim() || null;
    if (payload.precio !== undefined) updateData.precio = payload.precio;
    if (payload.categoria_id !== undefined) {
      updateData.categoria_id = payload.categoria_id ? Number(payload.categoria_id) : null;
    }
    if (payload.imagen_url !== undefined) updateData.imagen_url = payload.imagen_url || null;
    if (payload.imagenes !== undefined) updateData.imagenes = payload.imagenes || [];
    if (payload.activo !== undefined) updateData.activo = payload.activo;

    const { data, error } = await supabase
      .from('productos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Producto;
  },

  async toggleActivo(id: number | string, activo: boolean): Promise<void> {
    const { error } = await supabase
      .from('productos')
      .update({ activo, actualizado_en: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteProducto(id: number | string): Promise<void> {
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
