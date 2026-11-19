import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { APP_CONFIG } from '../../config/app.config';
import { useApp } from '../../context/AppContext';
import {
  DEFAULT_SOCIAL_SLIDERS,
  normalizeBannerSliders,
} from '../../utils/bannerSliders';
import { PlatformIcon } from '../common/PlatformIcon';

export function BannerSlider() {
  const { systemSettings, selectPlatformForOrder, setActiveTab } = useApp();
  const brandName = systemSettings?.websiteName?.trim() || APP_CONFIG.brandName;

  const adminSliders = useMemo(
    () => normalizeBannerSliders(systemSettings?.defaultSettings),
    [systemSettings?.defaultSettings]
  );

  const hasCustomImages = adminSliders.length > 0;
  const totalSlides = hasCustomImages
    ? adminSliders.length
    : DEFAULT_SOCIAL_SLIDERS.length;

  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [brokenUrls, setBrokenUrls] = useState<Record<string, boolean>>({});
  const touchStartX = useRef<number | null>(null);
  const didSwipeRef = useRef(false);

  const slidersSignature = useMemo(
    () => adminSliders.map((item) => `${item.imageUrl}::${item.videoUrl}`).join('|'),
    [adminSliders]
  );

  useEffect(() => {
    setActiveIndex(0);
    setBrokenUrls({});
  }, [slidersSignature]);

  useEffect(() => {
    if (totalSlides <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalSlides);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [totalSlides, paused]);

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    didSwipeRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const currentX = e.touches[0]?.clientX ?? touchStartX.current;
    if (Math.abs(currentX - touchStartX.current) >= 12) {
      didSwipeRef.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || totalSlides <= 1) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 36) return;
    didSwipeRef.current = true;
    if (delta > 0) goPrev();
    else goNext();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (totalSlides <= 1) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    }
  };

  const handleSlideAction = (platformId: string) => {
    if (didSwipeRef.current) {
      didSwipeRef.current = false;
      return;
    }
    if (platformId === 'all') {
      setActiveTab('services');
      return;
    }
    selectPlatformForOrder(platformId as Parameters<typeof selectPlatformForOrder>[0]);
  };

  return (
    <section
      aria-label="Social media promotional sliders"
      aria-roledescription="carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-violet-100/90 bg-slate-950 shadow-sm shadow-violet-950/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"
    >
      <div
        className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {hasCustomImages
          ? adminSliders.map((slider, idx) => {
              const { imageUrl, videoUrl } = slider;
              const isBroken = Boolean(brokenUrls[imageUrl]);
              const slideInner = (
                <>
                  {isBroken ? (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-r from-[#5B21B6] via-[#7C3AED] to-[#4F46E5] px-4 text-center text-white">
                      <span className="font-display text-sm sm:text-base font-bold">
                        {brandName}
                      </span>
                      <span className="mt-0.5 text-[11px] text-violet-100">
                        Banner image #{idx + 1} unavailable
                      </span>
                    </div>
                  ) : (
                    <img
                      src={imageUrl}
                      alt={`${brandName} banner ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      loading={idx === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      fetchPriority={idx === 0 ? 'high' : 'auto'}
                      onError={() =>
                        setBrokenUrls((prev) => ({ ...prev, [imageUrl]: true }))
                      }
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.015] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950/45 to-transparent" />
                </>
              );

              return videoUrl ? (
                <a
                  key={`${imageUrl}-${idx}`}
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open video for ${brandName} banner ${idx + 1}`}
                  onClick={(e) => {
                    if (didSwipeRef.current) {
                      e.preventDefault();
                      didSwipeRef.current = false;
                    }
                  }}
                  className="relative block h-32 sm:h-44 md:h-52 w-full shrink-0 overflow-hidden bg-slate-900 cursor-pointer"
                >
                  {slideInner}
                </a>
              ) : (
                <div
                  key={`${imageUrl}-${idx}`}
                  className="relative h-32 sm:h-44 md:h-52 w-full shrink-0 overflow-hidden bg-slate-900"
                >
                  {slideInner}
                </div>
              );
            })
          : DEFAULT_SOCIAL_SLIDERS.map((slide, idx) => {
              const isBroken = Boolean(brokenUrls[slide.imageUrl]);
              return (
                <div
                  key={slide.id}
                  className="relative h-32 sm:h-44 md:h-52 w-full shrink-0 overflow-hidden bg-slate-950"
                >
                  {isBroken ? (
                    <div
                      className={`flex h-full w-full items-center justify-end bg-gradient-to-r ${slide.fallbackGradient} pr-6 sm:pr-8`}
                    >
                      <div className="opacity-25 scale-125 sm:scale-150">
                        <PlatformIcon
                          platform={slide.platformId === 'all' ? 'instagram' : slide.platformId}
                          size="lg"
                        />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={slide.imageUrl}
                      alt={`${slide.title} — ${brandName}`}
                      referrerPolicy="no-referrer"
                      loading={idx === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      fetchPriority={idx === 0 ? 'high' : 'auto'}
                      onError={() =>
                        setBrokenUrls((prev) => ({ ...prev, [slide.imageUrl]: true }))
                      }
                      className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  )}

                  {/* Measured left & bottom contrast scrims for WCAG AA legibility */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-950/15"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-12 sm:h-16 bg-gradient-to-t from-slate-950/55 to-transparent"
                  />

                  <div className="absolute inset-0 flex items-center px-4 sm:px-7 md:px-9">
                    <div className="max-w-[78%] sm:max-w-lg min-w-0">
                      <p className="truncate text-[10px] sm:text-xs font-medium tracking-wide text-violet-200">
                        {slide.kicker}
                      </p>
                      <h2 className="mt-0.5 sm:mt-1 font-display text-sm sm:text-xl md:text-2xl font-bold tracking-tight text-white leading-snug text-balance line-clamp-1 sm:line-clamp-2">
                        {slide.title}
                      </h2>
                      <p className="mt-0.5 sm:mt-1 hidden sm:block truncate text-xs sm:text-sm text-slate-200">
                        {slide.subtitle}
                      </p>
                      <div className="mt-2 sm:mt-3">
                        <button
                          type="button"
                          onClick={() => handleSlideAction(slide.platformId)}
                          className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-lg sm:rounded-xl bg-white px-3 sm:px-4 text-[11px] sm:text-xs font-bold text-slate-950 shadow-sm transition-colors hover:bg-violet-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white whitespace-nowrap shrink-0"
                        >
                          <span>{slide.ctaLabel}</span>
                          <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {totalSlides > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous banner"
            className="hidden sm:inline-flex z-10 absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full bg-slate-950/55 text-white opacity-0 backdrop-blur-xs transition-all duration-200 hover:bg-slate-950/80 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={goNext}
            aria-label="Next banner"
            className="hidden sm:inline-flex z-10 absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full bg-slate-950/55 text-white opacity-0 backdrop-blur-xs transition-all duration-200 hover:bg-slate-950/80 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div
            className="z-10 absolute bottom-2 right-3 sm:bottom-2.5 sm:right-5 flex items-center gap-1 sm:gap-1.5"
            role="tablist"
            aria-label="Banner slides"
          >
            {Array.from({ length: totalSlides }).map((_, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Go to banner ${idx + 1}`}
                  onClick={() => setActiveIndex(idx)}
                  className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                    isActive
                      ? 'w-4 sm:w-6 bg-white shadow-xs'
                      : 'w-1.5 sm:w-2 bg-white/50 hover:bg-white/85'
                  }`}
                />
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

