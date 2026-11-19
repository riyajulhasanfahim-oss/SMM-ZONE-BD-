/**
 * White-label application configuration.
 * In Phase 2+, brand settings, active currency, and backend provider bindings
 * can be hydrated dynamically from the Admin Panel & App Initialization layer.
 */
export interface AppBrandConfig {
  brandName: string;
  brandTagline: string;
  brandLogo: string;
  currencySymbol: string;
  currencyCode: string;
  supportEmail: string;
  supportHours: string;
  dataSourceMode: 'demo' | 'remote';
}

export const APP_CONFIG: AppBrandConfig = {
  brandName: 'SMM ZONE',
  brandTagline: 'Your Social Media Growth Partner',
  brandLogo: '/assets/aistudio/Business_Suite_creation_1476970364442259_953edfba.jpeg',
  currencySymbol: '৳',
  currencyCode: 'BDT',
  supportEmail: 'support@smmzone.com',
  supportHours: '24/7 Live Assistance',
  dataSourceMode: 'remote',
};

const LEGACY_BRAND_NAMES = new Set(['rj world bd', 'nn world bd', 'rj-smm']);
const LEGACY_TAGLINES = new Set(['smm panel', 'nn world bd', 'rj world bd']);
const LEGACY_LOGO_URLS = new Set(['https://i.ibb.co/qfh2jxbx/converted.png']);

export function normalizeBrandSettings<
  T extends {
    websiteName?: string;
    brandTagline?: string;
    websiteDescription?: string;
    logo?: string;
    favicon?: string;
  },
>(settings: T | null): T | null {
  if (!settings) return null;
  const next = { ...settings };

  const nameLower = (next.websiteName ?? '').trim().toLowerCase();
  if (!nameLower || LEGACY_BRAND_NAMES.has(nameLower)) {
    next.websiteName = APP_CONFIG.brandName;
  }

  const taglineLower = (next.brandTagline ?? '').trim().toLowerCase();
  if (!taglineLower || LEGACY_TAGLINES.has(taglineLower)) {
    next.brandTagline = APP_CONFIG.brandTagline;
  }

  const desc = (next.websiteDescription ?? '').trim();
  if (!desc || /rj\s*world\s*bd|nn\s*world\s*bd/i.test(desc)) {
    next.websiteDescription = `${APP_CONFIG.brandName} — ${APP_CONFIG.brandTagline}. Fast, reliable, white-label SMM Panel platform.`;
  }

  const logoTrimmed = (next.logo ?? '').trim();
  if (!logoTrimmed || LEGACY_LOGO_URLS.has(logoTrimmed.toLowerCase())) {
    next.logo = APP_CONFIG.brandLogo;
  }

  const favTrimmed = (next.favicon ?? '').trim();
  if (!favTrimmed || LEGACY_LOGO_URLS.has(favTrimmed.toLowerCase())) {
    next.favicon = APP_CONFIG.brandLogo;
  }

  return next;
}
