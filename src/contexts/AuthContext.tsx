import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { authService } from '../services/authService';
import { Perfil } from '../types/database';
import { isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  perfil: Perfil | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkUserAdminStatus = async (currentUser: User) => {
    try {
      const userProfile = await authService.getPerfil(currentUser.id);
      setPerfil(userProfile);

      const adminOk = await authService.checkIsAdmin(currentUser.id);
      setIsAdmin(adminOk);
      return adminOk;
    } catch (err: any) {
      console.error('Error checking admin status:', err);
      setIsAdmin(false);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }

      try {
        const curSession = await authService.getCurrentSession();
        if (mounted) {
          setSession(curSession);
          if (curSession?.user) {
            setUser(curSession.user);
            await checkUserAdminStatus(curSession.user);
          } else {
            setUser(null);
            setPerfil(null);
            setIsAdmin(false);
          }
        }
      } catch (e: any) {
        console.error('Init auth error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const { data: authListener } = authService.onAuthStateChange(async (event, newSession: any) => {
      if (!mounted) return;
      setSession(newSession);

      if (newSession?.user) {
        setUser(newSession.user);
        await checkUserAdminStatus(newSession.user);
      } else {
        setUser(null);
        setPerfil(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      const data = await authService.signInWithPassword(email, password);
      if (!data.user) {
        throw new Error('No se pudo verificar el usuario autenticado.');
      }

      setUser(data.user);
      setSession(data.session);

      // Verify admin role strictly
      const hasAdmin = await checkUserAdminStatus(data.user);
      if (!hasAdmin) {
        // Not admin: sign out immediately as requested
        await authService.signOut();
        setUser(null);
        setSession(null);
        setPerfil(null);
        setIsAdmin(false);
        const errMsg = 'Acceso denegado: Tu cuenta no tiene permisos de administrador (rol "admin") en public.perfiles.';
        setError(errMsg);
        throw new Error(errMsg);
      }

      return true;
    } catch (err: any) {
      const msg = err.message || 'Error al iniciar sesión';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
    } catch (e) {
      console.warn('Sign out notice:', e);
    } finally {
      setUser(null);
      setSession(null);
      setPerfil(null);
      setIsAdmin(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await checkUserAdminStatus(user);
    }
  };

  const value = useMemo(
    () => ({
      user,
      session,
      perfil,
      isAdmin,
      loading,
      error,
      signIn,
      signOut,
      refreshProfile,
    }),
    [user, session, perfil, isAdmin, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
