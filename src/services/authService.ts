import { supabase } from '../lib/supabase';
import { Perfil } from '../types/database';

export const authService = {
  async signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return null;
    return user;
  },

  async getPerfil(userId: string): Promise<Perfil | null> {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error al consultar perfiles:', error.message);
        return null;
      }
      return data as Perfil;
    } catch (e) {
      console.error('Error fetching perfil:', e);
      return null;
    }
  },

  async checkIsAdmin(userId: string): Promise<boolean> {
    try {
      // First attempt: query perfiles table
      const perfil = await this.getPerfil(userId);
      if (perfil && perfil.rol === 'admin') {
        return true;
      }

      // Second check: try RPC es_admin() if available in DB
      try {
        const { data: isRpcAdmin, error: rpcErr } = await supabase.rpc('es_admin');
        if (!rpcErr && isRpcAdmin === true) {
          return true;
        }
      } catch {
        // RPC might not exist yet, fallback to perfil
      }

      return false;
    } catch (err) {
      console.error('Error verifying admin status:', err);
      return false;
    }
  },

  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
