import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'catalogo_supabase_url';
const STORAGE_KEY_ANON = 'catalogo_supabase_anon_key';

// Default Supabase project credentials for AlexStore
const DEFAULT_SUPABASE_URL = 'https://hbfhuwsizuhdqhyojmzk.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiZmh1d3NpenVoZHFoeW9qbXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNzUyMzIsImV4cCI6MjEwNzY1MTIzMn0.Oa1a4o14nRXnMaLHp_6NKSe9avx8ADwPd6ezlx7I53E';

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envAnon = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').replace(/\s+/g, '');

  if (envUrl && envAnon && envUrl !== 'https://tu-proyecto.supabase.co' && !envUrl.includes('tu-proyecto')) {
    return { url: envUrl, anonKey: envAnon };
  }

  // Check localStorage fallback
  try {
    const localUrl = (localStorage.getItem(STORAGE_KEY_URL) || '').trim();
    const localAnon = (localStorage.getItem(STORAGE_KEY_ANON) || '').replace(/\s+/g, '');
    if (localUrl && localAnon && !localUrl.includes('tu-proyecto')) {
      return { url: localUrl, anonKey: localAnon };
    }
  } catch (e) {
    console.error('Error reading Supabase credentials from storage:', e);
  }

  return {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY,
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(
    url &&
    anonKey &&
    url.startsWith('https://') &&
    url.includes('.supabase.co') &&
    anonKey.length > 20 &&
    !url.includes('tu-proyecto')
  );
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_ANON, anonKey.replace(/\s+/g, ''));
    window.location.reload();
  } catch (e) {
    console.error('Error saving Supabase credentials:', e);
  }
}

export function clearSupabaseCredentials(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_ANON);
    window.location.reload();
  } catch (e) {
    console.error('Error clearing Supabase credentials:', e);
  }
}

const { url, anonKey } = getSupabaseCredentials();

export const supabase: SupabaseClient = createClient(
  url,
  anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
