import React from 'react';
import { ArrowRight, Flame } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PlatformIcon } from '../common/PlatformIcon';

function isLinkedInCategory(id: string, name: string): boolean {
  const normId = id.toLowerCase();
  const normName = name.toLowerCase();
  return normId === 'linkedin' || normId.includes('linkedin') || normName.includes('linkedin');
}

function isWebTrafficCategory(id: string, name: string): boolean {
  const normId = id.toLowerCase();
  const normName = name.toLowerCase();
  return (
    normId === 'webtraffic' ||
    normId === 'web-traffic' ||
    normId === 'web_traffic' ||
    normId.includes('traffic') ||
    normName.includes('web traffic') ||
    normName.includes('website traffic') ||
    normName.includes('traffic')
  );
}

const CORE_SLOT_SPECS = [
  {
    key: 'tiktok',
    fallbackLabel: 'TikTok',
    match: (id: string, name: string, icon: string) =>
      id === 'tiktok' || name === 'tiktok' || icon === 'tiktok',
  },
  {
    key: 'youtube',
    fallbackLabel: 'YouTube',
    match: (id: string, name: string, icon: string) =>
      id === 'youtube' || name.includes('youtube') || icon.includes('youtube'),
  },
  {
    key: 'facebook',
    fallbackLabel: 'Facebook',
    match: (id: string, name: string, icon: string) =>
      id === 'facebook' || name.includes('facebook') || icon.includes('facebook'),
  },
  {
    key: 'x',
    fallbackLabel: 'X',
    match: (id: string, name: string, icon: string) =>
      id === 'x' || id === 'twitter-x' || name === 'x' || name.includes('twitter') || icon === 'x',
  },
  {
    key: 'telegram',
    fallbackLabel: 'Telegram',
    match: (id: string, name: string, icon: string) =>
      id === 'telegram' || name.includes('telegram') || icon.includes('telegram'),
  },
  {
    key: 'instagram',
    fallbackLabel: 'Instagram',
    match: (id: string, name: string, icon: string) =>
      id === 'instagram' || name.includes('instagram') || icon.includes('instagram'),
  },
] as const;

export function PopularServices() {
  const { platforms, services, selectedPlatform, selectPlatformForOrder, setActiveTab, isLoading } = useApp();

  const serviceCountMap = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const srv of services) {
      counts.set(srv.categoryId, (counts.get(srv.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [services]);

  const nonSpecialPlatforms = platforms.filter(
    (platform) => !isLinkedInCategory(platform.id, platform.name) && !isWebTrafficCategory(platform.id, platform.name)
  );

  const usedIds = new Set<string>();
  const corePlatforms = CORE_SLOT_SPECS.map((spec) => {
    const candidates = nonSpecialPlatforms.filter((p) => {
      if (usedIds.has(p.id)) return false;
      return spec.match(p.id.toLowerCase(), p.name.toLowerCase(), (p.icon || '').toLowerCase());
    });
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      const aExact = a.id.toLowerCase() === spec.key ? 1 : 0;
      const bExact = b.id.toLowerCase() === spec.key ? 1 : 0;
      const aCount = serviceCountMap.get(a.id) ?? a.serviceCount ?? 0;
      const bCount = serviceCountMap.get(b.id) ?? b.serviceCount ?? 0;
      // Prefer exact canonical ID when it has active services (e.g. telegram, instagram, youtube, facebook),
      // otherwise pick the matching active category with the most API-connected services (e.g. twitter-x vs x).
      if (aExact !== bExact) {
        if (aExact && aCount > 0) return -1;
        if (bExact && bCount > 0) return 1;
      }
      return bCount - aCount;
    });

    const chosen = candidates[0];
    usedIds.add(chosen.id);
    return {
      ...chosen,
      shortName: chosen.shortName || spec.fallbackLabel,
    };
  }).filter((p): p is NonNullable<typeof p> => p !== null);

  if (corePlatforms.length < 6) {
    for (const extra of nonSpecialPlatforms) {
      if (usedIds.has(extra.id)) continue;
      corePlatforms.push(extra);
      usedIds.add(extra.id);
      if (corePlatforms.length >= 6) break;
    }
  }

  const linkedinCategory = platforms.find((platform) => isLinkedInCategory(platform.id, platform.name));
  const webTrafficCategory = platforms.find((platform) => isWebTrafficCategory(platform.id, platform.name));

  const linkedinId = linkedinCategory?.id ?? 'linkedin';
  const webTrafficId = webTrafficCategory?.id ?? 'webtraffic';

  return (
    <section aria-labelledby="popular-services-heading">
      <div className="mb-2.5 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
          <h2 id="popular-services-heading" className="font-display text-sm sm:text-base font-bold text-slate-900">
            Popular Services
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('services')}
          className="inline-flex h-7 items-center gap-1 rounded-full bg-white px-2.5 text-[11px] font-semibold text-slate-700 border border-slate-200 transition-all duration-200 hover:border-violet-300 hover:text-violet-700 hover:shadow-xs whitespace-nowrap"
        >
          <span>View All</span>
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      {isLoading && platforms.length === 0 ? (
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8 sm:gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 sm:h-16 rounded-xl bg-slate-200/70 animate-pulse" />
          ))}
        </div>
      ) : platforms.length === 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 text-center text-xs text-slate-500">
          No service categories are active yet.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8 sm:gap-2">
          {corePlatforms.map((platform) => {
            const isSelected = selectedPlatform === platform.id;
            return (
              <button
                key={platform.id}
                type="button"
                onClick={() => selectPlatformForOrder(platform.id)}
                className={`group flex flex-col items-center justify-center rounded-xl border px-1.5 py-2 sm:px-2 sm:py-2.5 transition-all duration-200 active:scale-[0.97] ${
                  isSelected
                    ? 'border-violet-400 bg-violet-50/80 shadow-sm shadow-violet-500/15 ring-1 ring-violet-400/30'
                    : 'border-slate-200/80 bg-white shadow-2xs hover:border-violet-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-violet-900/5'
                }`}
              >
                <span className="transition-transform duration-200 group-hover:scale-105">
                  <PlatformIcon platform={platform.id} name={platform.name} icon={platform.icon} size="sm" />
                </span>
                <span className="mt-1.5 w-full truncate text-center text-[10.5px] sm:text-[11px] font-semibold text-slate-800 leading-tight">
                  {platform.shortName}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => selectPlatformForOrder(linkedinId)}
            className={`group flex flex-col items-center justify-center rounded-xl border px-1.5 py-2 sm:px-2 sm:py-2.5 transition-all duration-200 active:scale-[0.97] ${
              selectedPlatform === linkedinId
                ? 'border-violet-400 bg-violet-50/80 shadow-sm shadow-violet-500/15 ring-1 ring-violet-400/30'
                : 'border-slate-200/80 bg-white shadow-2xs hover:border-violet-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-violet-900/5'
            }`}
          >
            <span className="transition-transform duration-200 group-hover:scale-105">
              <PlatformIcon platform={linkedinId} name={linkedinCategory?.name ?? 'LinkedIn'} icon={linkedinCategory?.icon} size="sm" />
            </span>
            <span className="mt-1.5 w-full truncate text-center text-[10.5px] sm:text-[11px] font-semibold text-slate-800 leading-tight">
              LinkedIn
            </span>
          </button>

          <button
            type="button"
            onClick={() => selectPlatformForOrder(webTrafficId)}
            className={`group flex flex-col items-center justify-center rounded-xl border px-1.5 py-2 sm:px-2 sm:py-2.5 transition-all duration-200 active:scale-[0.97] ${
              selectedPlatform === webTrafficId
                ? 'border-violet-400 bg-violet-50/80 shadow-sm shadow-violet-500/15 ring-1 ring-violet-400/30'
                : 'border-slate-200/80 bg-white shadow-2xs hover:border-violet-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-violet-900/5'
            }`}
          >
            <span className="transition-transform duration-200 group-hover:scale-105">
              <PlatformIcon platform={webTrafficId} name={webTrafficCategory?.name ?? 'Web Traffic'} icon={webTrafficCategory?.icon} size="sm" />
            </span>
            <span className="mt-1.5 w-full truncate text-center text-[10.5px] sm:text-[11px] font-semibold text-slate-800 leading-tight">
              Web Traffic
            </span>
          </button>
        </div>
      )}
    </section>
  );
}
