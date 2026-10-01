import React from 'react';
import { BrandLogo } from './BrandLogo';

interface FooterProps {
  onNavigateHome?: () => void;
  onNavigateCategories?: () => void;
  onSecretAdminTrigger?: () => void;
  onOpenConfigModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateHome,
  onNavigateCategories,
  onSecretAdminTrigger,
  onOpenConfigModal,
}) => {
  return (
    <footer className="bg-[#0c0a08] text-stone-400 border-t border-[#262018]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <BrandLogo size="md" variant="light" onSecretAdminTrigger={onSecretAdminTrigger} />
            <p className="text-xs sm:text-sm text-stone-400 max-w-md leading-relaxed">
              Catálogo oficial de <strong>AlexStore</strong>. Artículos seleccionados con calidad premium, pedidos directos por WhatsApp y disponibilidad en tiempo real.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#c5a059]">
              <span className="inline-block w-2 h-2 rounded-full bg-[#c5a059] animate-pulse"></span>
              Inventario en vivo y atención personalizada
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#f1eaa7] mb-4">
              Navegación
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <button
                  onClick={onNavigateHome}
                  className="hover:text-[#f1eaa7] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  Colección Completa
                </button>
              </li>
              <li>
                <button
                  onClick={onNavigateCategories}
                  className="hover:text-[#f1eaa7] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  Categorías
                </button>
              </li>
              {onOpenConfigModal && (
                <li>
                  <button
                    onClick={onOpenConfigModal}
                    className="hover:text-[#f1eaa7] transition-colors flex items-center gap-1 text-stone-500 hover:text-stone-300 cursor-pointer"
                  >
                    Estado de Conexión
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Information & service */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#f1eaa7] mb-4">
              Atención al Cliente
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed mb-4">
              Haz tu pedido agregando artículos a tu bolsa o contáctanos por WhatsApp para coordinar envíos y medios de pago.
            </p>
            <div className="text-xs text-stone-500">
              Despachos y entregas coordinadas directamente.
            </div>
          </div>
        </div>

        {/* Bottom copyright - completely clean, NO visible admin buttons */}
        <div className="mt-12 pt-8 border-t border-[#1f1a14] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div>
            © {new Date().getFullYear()} AlexStore. Todos los derechos reservados.
          </div>
          <div className="text-[11px] text-stone-600">
            Catálogo Digital Oficial
          </div>
        </div>
      </div>
    </footer>
  );
};
