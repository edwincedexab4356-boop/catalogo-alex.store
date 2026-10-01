import { supabase } from '../lib/supabase';
import { Categoria } from '../types/database';

export const categoriasService = {
  async getCategorias(onlyActive: boolean = false): Promise<Categoria[]> {
    try {
      // 1. Fetch categories with product counts (without filtering on 'activo' in SQL to prevent schema cache errors)
      const { data, error } = await supabase
        .from('categorias')
        .select('*, productos:productos(count)')
        .order('nombre', { ascending: true });

      let list = data;

      if (error) {
        // Fallback to simple select if count join fails
        console.warn('Fallback simple select for categorias:', error.message);
        const { data: simpleData, error: simpleError } = await supabase
          .from('categorias')
          .select('*')
          .order('nombre', { ascending: true });

        if (simpleError) {
          console.warn('Categorias simple query error:', simpleError.message);
          return [];
        }
        list = simpleData;
      }

      // Map categories and normalize both "activa" and "activo" column names
      const mapped = (list || []).map((cat: any) => {
        // Check both 'activa' and 'activo', default to true if null or undefined
        const isActiva =
          cat.activa !== undefined
            ? Boolean(cat.activa)
            : cat.activo !== undefined
            ? Boolean(cat.activo)
            : true;

        return {
          ...cat,
          activo: isActiva,
          activa: isActiva,
          total_productos: Array.isArray(cat.productos)
            ? (cat.productos[0]?.count ?? 0)
            : (cat.productos?.count ?? 0),
        };
      }) as Categoria[];

      if (onlyActive) {
        return mapped.filter((c) => c.activo !== false);
      }

      return mapped;
    } catch (err) {
      console.error('Error fetching categorias:', err);
      return [];
    }
  },

  async getCategoriaById(id: number | string): Promise<Categoria | null> {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const isActiva =
      data.activa !== undefined
        ? Boolean(data.activa)
        : data.activo !== undefined
        ? Boolean(data.activo)
        : true;

    return {
      ...data,
      activo: isActiva,
      activa: isActiva,
    } as Categoria;
  },

  async createCategoria(payload: {
    nombre: string;
    descripcion?: string | null;
    imagen_url?: string | null;
    activo?: boolean;
    activa?: boolean;
  }): Promise<Categoria> {
    const isActivo =
      payload.activa !== undefined
        ? payload.activa
        : payload.activo !== undefined
        ? payload.activo
        : true;

    const baseData = {
      nombre: payload.nombre.trim(),
      descripcion: payload.descripcion?.trim() || null,
      imagen_url: payload.imagen_url || null,
    };

    // Attempt insert with 'activa' (the column in current database)
    let { data, error } = await supabase
      .from('categorias')
      .insert([{ ...baseData, activa: isActivo }])
      .select()
      .single();

    // If 'activa' does not exist in schema cache, fallback to 'activo'
    if (error && (error.code === '42703' || error.message?.includes('activa'))) {
      const retry = await supabase
        .from('categorias')
        .insert([{ ...baseData, activo: isActivo }])
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    return {
      ...data,
      activo: isActivo,
      activa: isActivo,
    } as Categoria;
  },

  async updateCategoria(
    id: number | string,
    payload: Partial<Categoria>
  ): Promise<Categoria> {
    const updateData: Record<string, any> = {};
    if (payload.nombre !== undefined) updateData.nombre = payload.nombre.trim();
    if (payload.descripcion !== undefined) updateData.descripcion = payload.descripcion?.trim() || null;
    if (payload.imagen_url !== undefined) updateData.imagen_url = payload.imagen_url || null;

    const isActivo =
      payload.activa !== undefined
        ? payload.activa
        : payload.activo !== undefined
        ? payload.activo
        : undefined;

    if (isActivo !== undefined) {
      updateData.activa = isActivo;
    }

    let { data, error } = await supabase
      .from('categorias')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    // If 'activa' column does not exist, retry with 'activo'
    if (error && (error.code === '42703' || error.message?.includes('activa'))) {
      delete updateData.activa;
      updateData.activo = isActivo;
      const retry = await supabase
        .from('categorias')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    return {
      ...data,
      activo: isActivo ?? true,
      activa: isActivo ?? true,
    } as Categoria;
  },

  async toggleActivo(id: number | string, activo: boolean): Promise<void> {
    let { error } = await supabase
      .from('categorias')
      .update({ activa: activo })
      .eq('id', id);

    if (error && (error.code === '42703' || error.message?.includes('activa'))) {
      const retry = await supabase
        .from('categorias')
        .update({ activo })
        .eq('id', id);
      error = retry.error;
    }

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
