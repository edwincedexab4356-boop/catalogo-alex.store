import { supabase } from '../lib/supabase';
import { Categoria } from '../types/database';

export const categoriasService = {
  async getCategorias(onlyActive: boolean = false): Promise<Categoria[]> {
    let query = supabase
      .from('categorias')
      .select('*, productos:productos(count)')
      .order('nombre', { ascending: true });

    if (onlyActive) {
      query = query.eq('activo', true);
    }

    const { data, error } = await query;
    if (error) {
      // If the join fails due to relationship naming, fallback to simple select
      console.warn('Fallback simple select for categorias:', error.message);
      const simpleQuery = supabase
        .from('categorias')
        .select('*')
        .order('nombre', { ascending: true });
      if (onlyActive) {
        simpleQuery.eq('activo', true);
      }
      try {
        const { data: simpleData, error: simpleError } = await simpleQuery;
        if (simpleError) {
          console.warn('Categorias simple query notice:', simpleError.message);
          return [];
        }
        return (simpleData || []) as Categoria[];
      } catch {
        return [];
      }
    }

    return (data || []).map((cat: any) => ({
      ...cat,
      total_productos: Array.isArray(cat.productos)
        ? (cat.productos[0]?.count ?? 0)
        : (cat.productos?.count ?? 0),
    })) as Categoria[];
  },

  async getCategoriaById(id: number | string): Promise<Categoria | null> {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Categoria;
  },

  async createCategoria(payload: {
    nombre: string;
    descripcion?: string | null;
    imagen_url?: string | null;
    activo?: boolean;
  }): Promise<Categoria> {
    const { data, error } = await supabase
      .from('categorias')
      .insert([
        {
          nombre: payload.nombre.trim(),
          descripcion: payload.descripcion?.trim() || null,
          imagen_url: payload.imagen_url || null,
          activo: payload.activo !== undefined ? payload.activo : true,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as Categoria;
  },

  async updateCategoria(
    id: number | string,
    payload: Partial<Categoria>
  ): Promise<Categoria> {
    const updateData: Record<string, any> = {};
    if (payload.nombre !== undefined) updateData.nombre = payload.nombre.trim();
    if (payload.descripcion !== undefined) updateData.descripcion = payload.descripcion?.trim() || null;
    if (payload.imagen_url !== undefined) updateData.imagen_url = payload.imagen_url || null;
    if (payload.activo !== undefined) updateData.activo = payload.activo;

    const { data, error } = await supabase
      .from('categorias')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Categoria;
  },

  async toggleActivo(id: number | string, activo: boolean): Promise<void> {
    const { error } = await supabase
      .from('categorias')
      .update({ activo })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteCategoria(id: number | string): Promise<void> {
    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
