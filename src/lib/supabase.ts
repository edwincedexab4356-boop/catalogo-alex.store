import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'catalogo_supabase_url';
const STORAGE_KEY_ANON = 'catalogo_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envAnon && envUrl !== 'https://tu-proyecto.supabase.co' && !envUrl.includes('tu-proyecto')) {
    return { url: envUrl, anonKey: envAnon };
  }

  // Check localStorage fallback for preview/runtime flexibility
  try {
    const localUrl = localStorage.getItem(STORAGE_KEY_URL);
    const localAnon = localStorage.getItem(STORAGE_KEY_ANON);
    if (localUrl && localAnon) {
      return { url: localUrl, anonKey: localAnon };
    }
  } catch (e) {
    console.error('Error reading Supabase credentials from storage:', e);
  }

  return {
    url: envUrl || '',
    anonKey: envAnon || '',
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
    localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
    // Refresh page to re-initialize singleton with fresh credentials
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

// Create safe fallback instance if credentials are not yet configured to prevent app crash
const fallbackUrl = 'https://placeholder-project.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase: SupabaseClient = createClient(
  url && url.startsWith('https://') ? url : fallbackUrl,
  anonKey && anonKey.length > 10 ? anonKey : fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
