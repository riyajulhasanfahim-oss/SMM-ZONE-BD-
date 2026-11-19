import React, { useEffect, useState } from 'react';
import { APP_CONFIG } from '../../config/app.config';
import { useApp } from '../../context/AppContext';

interface BrandLogoProps {
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

function isSupportedLogoPath(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith('/');
}

export function BrandLogo({ showTagline = false, size = 'md', onClick }: BrandLogoProps) {
  const { systemSettings } = useApp();
  const [imgFailed, setImgFailed] = useState(false);

  const brandName = systemSettings?.websiteName?.trim() || APP_CONFIG.brandName;
  const brandTagline = systemSettings?.brandTagline?.trim() || APP_CONFIG.brandTagline;
  const configuredLogo = systemSettings?.logo?.trim() || '';
  const resolvedLogo = isSupportedLogoPath(configuredLogo)
    ? configuredLogo
    : APP_CONFIG.brandLogo;
  const showLogoImage = Boolean(resolvedLogo && !imgFailed);
  const primaryColor = systemSettings?.themeColor?.trim() || '#6D28D9';
  const secondaryColor = systemSettings?.secondaryColor?.trim() || '#4F46E5';

  useEffect(() => {
    setImgFailed(false);
  }, [resolvedLogo]);

  const iconSize = size === 'sm' ? 'h-9 w-9' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
  const titleSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg';

  const content = (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <span
        style={
          showLogoImage
            ? undefined
            : { backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }
        }
        className={`${iconSize} relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${
          showLogoImage
            ? 'bg-white ring-1 ring-violet-200/80 shadow-xs'
            : 'text-white shadow-sm shadow-violet-600/25'
        }`}
      >
        {showLogoImage ? (
          <img
            src={resolvedLogo}
            alt={brandName}
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-display text-xs font-extrabold tracking-tight">SZ</span>
        )}
      </span>
      <span className="flex flex-col text-left leading-none">
        <span className={`${titleSize} font-display font-extrabold tracking-tight text-violet-950`}>
          {brandName}
        </span>
        {showTagline && (
          <span className="mt-0.5 text-[10px] font-medium text-slate-500 max-w-[175px] truncate sm:max-w-none">
            {brandTagline}
          </span>
        )}
      </span>
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"
      >
        {content}
      </button>
    );
  }

  return content;
}
