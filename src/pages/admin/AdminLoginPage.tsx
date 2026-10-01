import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BrandLogo } from '../../components/common/BrandLogo';
import { isSupabaseConfigured } from '../../lib/supabase';
import { Lock, Mail, Eye, EyeOff, Loader2, ArrowLeft, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
  onNavigateHome: () => void;
  onOpenConfigModal?: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onNavigateHome,
  onOpenConfigModal,
}) => {
  const { signIn } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Por favor ingresa tu correo y contraseña.');
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrorMessage('Debes configurar las credenciales VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY de tu proyecto Supabase primero.');
      onOpenConfigModal?.();
      return;
    }

    try {
      setLoading(true);
      await signIn(email.trim(), password);
      toastSuccess('¡Bienvenido! Sesión de administrador iniciada correctamente.');
      onLoginSuccess();
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err.message || 'Credenciales incorrectas o acceso no autorizado.';
      setErrorMessage(msg);
      toastError(msg, 'Error de inicio de sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080706] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background warm gold subtle ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#c5a059]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top back button */}
      <div className="absolute top-6 left-6">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400 hover:text-[#f1eaa7] transition-colors bg-[#14100c]/80 px-4 py-2 rounded-xl border border-[#2b2217] backdrop-blur-md cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#c5a059]" />
          Volver a AlexStore
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <BrandLogo size="lg" variant="light" />
        </div>
        <h2 className="text-center text-xl sm:text-2xl font-black tracking-tight text-white">
          Acceso de Gestión
        </h2>
        <p className="mt-1 text-center text-xs text-stone-400">
          Panel administrativo oficial de AlexStore
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-[#120f0c] border border-[#2b2217] py-8 px-6 sm:px-10 shadow-2xl rounded-3xl backdrop-blur-xl">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {!isSupabaseConfigured() && (
            <div className="mb-6 p-4 rounded-2xl bg-[#261f15] border border-[#c5a059]/40 text-[#f7e8c5] text-xs flex flex-col gap-2">
              <div className="font-bold flex items-center gap-1.5 text-[#f1eaa7]">
                <SlidersHorizontal className="w-4 h-4 text-[#c5a059]" />
                Supabase no conectado aún
              </div>
              <p className="text-[11px] text-stone-300">
                Ingresa tu URL y Clave Anon para iniciar sesión con tu usuario de Supabase.
              </p>
              {onOpenConfigModal && (
                <button
                  type="button"
                  onClick={onOpenConfigModal}
                  className="mt-1 inline-flex items-center justify-center py-2 px-3 rounded-xl bg-[#c5a059] hover:bg-[#d2a848] text-[#0c0a08] font-black text-xs transition-colors cursor-pointer"
                >
                  Configurar Supabase Ahora
                </button>
              )}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@alexmstore.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0a0806] border border-[#261e14] rounded-xl text-white placeholder-stone-600 focus:outline-none focus:border-[#c5a059] text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#0a0806] border border-[#261e14] rounded-xl text-white placeholder-stone-600 focus:outline-none focus:border-[#c5a059] text-xs sm:text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-500 hover:text-stone-300 cursor-pointer"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider text-[#0c0a08] bg-[#c5a059] hover:bg-[#d2a848] disabled:opacity-50 transition-colors shadow-lg cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0c0a08]" />
                    Verificando credenciales...
                  </>
                ) : (
                  'Iniciar Sesión de Administrador'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-[#201b14] text-center">
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Autenticación segura oficial vía Supabase Auth.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
