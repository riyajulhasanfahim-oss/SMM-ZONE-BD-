import type { PlatformId } from '../types';
import sliderInstagramImg from '../assets/images/slider_instagram_growth_1795062576265.jpg';
import sliderYoutubeImg from '../assets/images/slider_youtube_studio_1795062577292.jpg';
import sliderFacebookImg from '../assets/images/slider_facebook_reach_1795062576012.jpg';
import sliderSocialSuiteImg from '../assets/images/slider_social_suite_1795062576561.jpg';

export interface BannerSliderItem {
  imageUrl: string;
  videoUrl: string;
}

export interface DefaultSocialSlider {
  id: string;
  imageUrl: string;
  kicker: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  platformId: PlatformId | 'all';
  fallbackGradient: string;
}

export const DEFAULT_SOCIAL_SLIDERS: DefaultSocialSlider[] = [
  {
    id: 'social-instagram-growth',
    imageUrl: sliderInstagramImg,
    kicker: 'Instagram & Reels · Instant Start',
    title: 'Grow Instagram Followers & Reel Views',
    subtitle: 'High-retention engagement, story views & profile growth packages',
    ctaLabel: 'Order Instagram',
    platformId: 'instagram',
    fallbackGradient: 'from-[#4C1D95] via-[#6D28D9] to-[#312E81]',
  },
  {
    id: 'social-youtube-studio',
    imageUrl: sliderYoutubeImg,
    kicker: 'YouTube Studio · Creator Monetization',
    title: 'Boost Watch Time & Channel Subscribers',
    subtitle: 'Non-drop views, organic watch hours & livestream viewers',
    ctaLabel: 'Order YouTube',
    platformId: 'youtube',
    fallbackGradient: 'from-[#1E1B4B] via-[#4338CA] to-[#5B21B6]',
  },
  {
    id: 'social-facebook-reach',
    imageUrl: sliderFacebookImg,
    kicker: 'Facebook Pages & Reels · Fast Delivery',
    title: 'Expand Page Likes & Campaign Reach',
    subtitle: 'Page followers, post reactions & targeted video views in seconds',
    ctaLabel: 'Order Facebook',
    platformId: 'facebook',
    fallbackGradient: 'from-[#1E293B] via-[#3730A3] to-[#6D28D9]',
  },
  {
    id: 'social-multi-suite',
    imageUrl: sliderSocialSuiteImg,
    kicker: 'TikTok, Telegram & X · 24/7 Automated',
    title: 'All-in-One Social Media Growth Suite',
    subtitle: 'Live progress tracking, instant wallet checkout & reseller API ready',
    ctaLabel: 'Browse Services',
    platformId: 'all',
    fallbackGradient: 'from-[#312E81] via-[#5B21B6] to-[#4F46E5]',
  },
];

const YOUTUBE_ROOT_DOMAINS = ['youtube.com', 'youtu.be', 'youtube-nocookie.com'] as const;
const FACEBOOK_ROOT_DOMAINS = ['facebook.com', 'fb.watch', 'fb.com'] as const;

function matchesRootDomain(hostname: string, domains: readonly string[]): boolean {
  const host = hostname.toLowerCase().replace(/\.+$/, '');
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function isValidHttpUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return /^https?:\/\//i.test(trimmed);
  }
}

export function normalizeVideoUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

export function getVideoPlatform(raw: string): 'youtube' | 'facebook' | null {
  const normalized = normalizeVideoUrl(raw);
  if (!normalized) return null;
  try {
    const { hostname } = new URL(normalized);
    if (matchesRootDomain(hostname, YOUTUBE_ROOT_DOMAINS)) return 'youtube';
    if (matchesRootDomain(hostname, FACEBOOK_ROOT_DOMAINS)) return 'facebook';
    return null;
  } catch {
    return null;
  }
}

export function isSupportedSliderVideoUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  return getVideoPlatform(trimmed) !== null;
}

export function normalizeBannerSliders(defaultSettings: unknown): BannerSliderItem[] {
  if (!defaultSettings || typeof defaultSettings !== 'object') {
    return [];
  }

  const record = defaultSettings as {
    bannerItems?: unknown;
    bannerImages?: unknown;
  };

  const legacyUrls: string[] = Array.isArray(record.bannerImages)
    ? record.bannerImages
        .filter((item): item is string => typeof item === 'string')
        .map((url) => url.trim())
        .filter((url) => isValidHttpUrl(url))
    : [];

  if (Array.isArray(record.bannerItems) && record.bannerItems.length > 0) {
    const parsedItems: BannerSliderItem[] = [];
    for (const entry of record.bannerItems) {
      if (!entry || typeof entry !== 'object') continue;
      const item = entry as { imageUrl?: unknown; videoUrl?: unknown };
      const imageUrl = typeof item.imageUrl === 'string' ? item.imageUrl.trim() : '';
      if (!isValidHttpUrl(imageUrl)) continue;
      const rawVideo = typeof item.videoUrl === 'string' ? item.videoUrl.trim() : '';
      const validVideo =
        rawVideo && isSupportedSliderVideoUrl(rawVideo) ? normalizeVideoUrl(rawVideo) : '';
      parsedItems.push({
        imageUrl,
        videoUrl: validVideo,
      });
    }

    if (parsedItems.length > 0) {
      // Preserve any legacy bannerImages appended externally if bannerItems fell behind
      if (legacyUrls.length === 0 || parsedItems.length >= legacyUrls.length) {
        return parsedItems;
      }
      const videoByImage = new Map<string, string>();
      for (const item of parsedItems) {
        if (item.videoUrl && !videoByImage.has(item.imageUrl)) {
          videoByImage.set(item.imageUrl, item.videoUrl);
        }
      }
      return legacyUrls.map((imageUrl, idx) => ({
        imageUrl,
        videoUrl:
          parsedItems[idx]?.imageUrl === imageUrl
            ? parsedItems[idx].videoUrl
            : videoByImage.get(imageUrl) ?? '',
      }));
    }
  }

  return legacyUrls.map((imageUrl) => ({
    imageUrl,
    videoUrl: '',
  }));
}
