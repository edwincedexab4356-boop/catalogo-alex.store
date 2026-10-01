import React, { useState } from 'react';
import { Modal } from './Modal';
import { getSupabaseCredentials, saveSupabaseCredentials } from '../../lib/supabase';
import { SUPABASE_SCHEMA_SQL } from '../../lib/schemaSql';
import { Database, Key, Check, Copy, ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react';
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
      await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
      setCopiedSql(true);
      success('¡Script SQL copiado! Pégalo en tu Supabase SQL Editor y pulsa Run.');
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      // Fallback
      try {
        const textarea = document.createElement('textarea');
        textarea.value = SUPABASE_SCHEMA_SQL;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedSql(true);
        success('¡Script SQL copiado! Pégalo en tu Supabase SQL Editor.');
        setTimeout(() => setCopiedSql(false), 3000);
      } catch {
        error('Por favor copia manualmente el texto que aparece en la pestaña Tablas & Script SQL.');
      }
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
            Tablas & Permisos SQL
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
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://gfkzdakcekvvylzsyexi.supabase.co"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#eae3d5] rounded-xl focus:outline-none focus:border-[#c5a059] font-mono text-stone-900"
                required
              />
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
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#eae3d5] rounded-xl focus:outline-none focus:border-[#c5a059] font-mono text-stone-900 resize-none"
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('sql')}
                className="text-xs text-[#c5a059] hover:underline font-bold"
              >
                ¿Falta crear tablas o permisos? Ver Script SQL →
              </button>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0c0a08] hover:bg-stone-800 text-[#f7e8c5] border border-[#c5a059]/40 font-bold text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
              >
                Guardar Credenciales
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Solución a error 42501 (Permission Denied):
              </div>
              <p>
                Si la consola indica <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">permission denied for table productos</code>, solo necesitas copiar este script y ejecutarlo en tu consola de Supabase. Concede los permisos <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">GRANT SELECT ON public.productos TO anon;</code> y configura las políticas RLS y tablas necesarias.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Script SQL Completo (AlexStore)
              </span>
              <button
                type="button"
                onClick={copySqlScript}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0c0a08] hover:bg-stone-800 text-[#f7e8c5] border border-[#c5a059]/40 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#c5a059]" />
                    Copiar Script SQL
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <pre className="p-4 bg-stone-900 text-stone-200 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-72 border border-stone-800 leading-relaxed">
                {SUPABASE_SCHEMA_SQL}
              </pre>
            </div>

            <div className="p-4 rounded-2xl bg-[#faf7f0] border border-[#ebdcc4] text-xs text-stone-600 space-y-2">
              <div className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                Pasos para ejecutar en Supabase:
              </div>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Ve a tu proyecto en <strong>supabase.com/dashboard</strong>.</li>
                <li>En el menú lateral izquierdo, haz clic en <strong>SQL Editor</strong>.</li>
                <li>Haz clic en <strong>New query</strong>, pega el script copiado y pulsa el botón verde <strong>Run</strong>.</li>
                <li>¡Listo! Tus tablas, permisos para visitantes y artículos iniciales estarán activos.</li>
              </ol>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
