import React, { useState, useRef } from 'react';

interface BrandLogoProps {
  className?: string;
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark'; // 'light' means light text for dark backgrounds, 'dark' means dark text for light backgrounds
  onSecretAdminTrigger?: () => void;
  onNavigateHome?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  showSubtitle = true,
  size = 'md',
  variant = 'dark',
  onSecretAdminTrigger,
  onNavigateHome,
}) => {
  // Try logo sources in order of preference
  const logoSources = [
    '/images/logo.png',
    '/images/logo.jpg',
    '/images/logo.jfif',
    '/images/Alexm%20stopre.jfif',
    '/images/logo.svg',
  ];
  const [sourceIndex, setSourceIndex] = useState(0);
  const [hasFailedAll, setHasFailedAll] = useState(false);

  // Triple-tap tracking for mobile / tablet secret admin access
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleClickOrTap = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    tapCountRef.current += 1;

    if (tapCountRef.current === 1) {
      // Set a timer to trigger normal home navigation if no further taps occur
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
        onNavigateHome?.();
      }, 350);
    } else if (tapCountRef.current === 2) {
      // Second tap: cancel single-click timer, awaiting third tap
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
        onNavigateHome?.();
      }, 500);
    } else if (tapCountRef.current >= 3) {
      // Third tap: trigger secret admin access immediately!
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapCountRef.current = 0;
      if (onSecretAdminTrigger) {
        onSecretAdminTrigger();
      }
    }
  };

  const handleImageError = () => {
    if (sourceIndex < logoSources.length - 1) {
      setSourceIndex((prev) => prev + 1);
    } else {
      setHasFailedAll(true);
    }
  };

  // Dimensions based on size
  const iconSizeClass =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const titleClass =
    size === 'sm'
      ? 'text-base font-black tracking-tight'
      : size === 'lg'
      ? 'text-2xl font-black tracking-tight'
      : 'text-xl font-black tracking-tight';
  const subtitleClass = size === 'sm' ? 'text-[9px]' : 'text-[11px]';

  const isLightText = variant === 'light';

  return (
    <div
      onClick={handleClickOrTap}
      className={`flex items-center gap-3 select-none cursor-pointer group ${className}`}
      title="AlexStore"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onNavigateHome?.();
      }}
    >
      {/* Brand Icon / Logo image */}
      {!hasFailedAll ? (
        <div
          className={`relative ${iconSizeClass} rounded-xl overflow-hidden shadow-xs border border-amber-900/10 bg-[#0c0a08] shrink-0 flex items-center justify-center p-0.5 group-hover:scale-105 transition-transform`}
        >
          <img
            src={logoSources[sourceIndex]}
            alt="AlexStore Logo"
            onError={handleImageError}
            className="w-full h-full object-contain pointer-events-none"
          />
        </div>
      ) : (
        <div
          className={`${iconSizeClass} rounded-xl bg-[#0c0a08] border border-[#d2a848]/30 flex items-center justify-center text-[#d2a848] font-bold shadow-xs shrink-0 group-hover:scale-105 transition-transform`}
        >
          <span className="text-sm font-black tracking-wider">A</span>
        </div>
      )}

      {/* Brand Typography: AlexStore */}
      <div className="flex flex-col">
        <div className="flex items-center leading-none">
          <span
            className={`${titleClass} ${
              isLightText ? 'text-white' : 'text-[#120f0c]'
            }`}
          >
            Alex
          </span>
          <span className={`${titleClass} text-[#c5a059]`}>Store</span>
        </div>
        {showSubtitle && (
          <span
            className={`${subtitleClass} font-semibold uppercase tracking-[0.2em] mt-1 ${
              isLightText ? 'text-amber-200/60' : 'text-stone-500'
            }`}
          >
            Catálogo Oficial
          </span>
        )}
      </div>
    </div>
  );
};
