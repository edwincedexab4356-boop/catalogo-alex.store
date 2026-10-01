import React, { useState } from 'react';
import { Modal } from './Modal';
import { getSupabaseCredentials, saveSupabaseCredentials } from '../../lib/supabase';
import { Database, Key, Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const currentCreds = getSupabaseCredentials();
  const [url, setUrl] = useState(currentCreds.url || '');
  const [anonKey, setAnonKey] = useState(currentCreds.anonKey || '');
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'credentials' | 'sql'>('credentials');
  const { success, error } = useToast();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim().startsWith('https://') || !url.includes('.supabase.co')) {
      error('La URL de Supabase debe tener el formato https://tu-proyecto.supabase.co');
      return;
    }
    if (anonKey.trim().length < 20) {
      error('La clave anon pública debe ser válida.');
      return;
    }

    saveSupabaseCredentials(url.trim(), anonKey.trim());
    success('Credenciales guardadas. Conectando a Supabase...');
    onClose();
  };

  const copySqlScript = async () => {
    try {
      const response = await fetch('/supabase-schema.sql');
      const text = await response.text();
      await navigator.clipboard.writeText(text);
      setCopiedSql(true);
      success('Script SQL copiado al portapapeles. Pégalo en tu Supabase SQL Editor.');
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      error('No se pudo copiar automáticamente. Puedes ver el archivo supabase-schema.sql en la raíz.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Conexión de Base de Datos Supabase"
      subtitle="Conecta tu proyecto Supabase para AlexStore de forma segura"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-[#eae3d5]">
          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === 'credentials'
                ? 'border-[#c5a059] text-[#c5a059]'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            Credenciales de Conexión
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === 'sql'
                ? 'border-[#c5a059] text-[#c5a059]'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            Tablas & Script SQL
          </button>
        </div>

        {activeTab === 'credentials' ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#faf7f0] border border-[#ebdcc4] text-xs text-stone-600 space-y-2">
              <div className="flex items-center gap-2 font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                <ShieldCheck className="w-4 h-4 text-[#c5a059]" />
                Seguridad de Conexión
              </div>
              <p>
                Utiliza únicamente la URL de tu proyecto y la clave pública <strong>anon</strong>. Nunca uses la clave <code className="text-rose-700 bg-rose-50 px-1 py-0.5 rounded font-mono">service_role</code> en el frontend.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#c5a059]" />
                URL del Proyecto Supabase (VITE_SUPABASE_URL)
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzabcdefghijklm.supabase.co"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[#d6cdbd] focus:outline-none focus:border-[#c5a059] text-stone-900 text-xs sm:text-sm bg-white"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Encuéntralo en Supabase: Project Settings ➔ API ➔ Project URL
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#c5a059]" />
                Clave Pública Anon (VITE_SUPABASE_ANON_KEY)
              </label>
              <textarea
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                rows={3}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[#d6cdbd] focus:outline-none focus:border-[#c5a059] text-stone-900 text-xs font-mono bg-white"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Encuéntralo en Supabase: Project Settings ➔ API ➔ Project API Keys (anon / public)
              </span>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#f0eae0]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#0c0a08] hover:bg-stone-800 text-[#f7e8c5] font-black text-xs uppercase tracking-wider border border-[#c5a059]/40 transition-colors shadow-xs cursor-pointer"
              >
                Guardar y Conectar
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#faf7f0] border border-[#ebdcc4] text-xs text-stone-800 space-y-2">
              <p className="font-bold flex items-center gap-2 uppercase tracking-wider text-[11px]">
                <Database className="w-4 h-4 text-[#c5a059]" />
                Estructura de Base de Datos Necesaria
              </p>
              <p className="text-xs text-stone-600">
                La aplicación utiliza las tablas <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-stone-200">public.perfiles</code>,{' '}
                <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-stone-200">public.categorias</code>,{' '}
                <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-stone-200">public.productos</code>,{' '}
                <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-stone-200">public.inventario</code> y el bucket de storage{' '}
                <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-stone-200">productos</code>.
              </p>
            </div>

            <div className="border border-[#262018] rounded-2xl p-4 bg-[#0c0a08] text-[#f1eaa7] font-mono text-xs max-h-56 overflow-y-auto">
              <pre>
{`-- Ejecuta esto en Supabase SQL Editor:
-- Tablas: perfiles, categorias, productos, inventario
-- Bucket storage: productos
-- Políticas RLS y función es_admin()`}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c5a059] hover:underline"
              >
                Abrir Supabase Dashboard
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={copySqlScript}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0c0a08] text-[#f7e8c5] hover:bg-stone-800 text-xs font-bold uppercase tracking-wider border border-[#c5a059]/40 transition-colors cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#c5a059]" />
                    Copiar Script SQL Completo
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
