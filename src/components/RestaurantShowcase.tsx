import React, { useState, useEffect, useMemo } from "react";
import { Users, Building2, Smile } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

const SLIDE_COUNT = 4;

export const RestaurantShowcase: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { t } = useLanguage();

  const isLocalPublicAsset = (url: string) => url.startsWith("/") && !url.startsWith("//");

  const withUnsplashParams = (url: string, width: number, quality = 92) => {
    // Local assets in /public should not get Unsplash CDN query params.
    if (isLocalPublicAsset(url)) {
      return url;
    }
    // Unsplash image CDN supports width/quality params, which render reliably in most apps.
    const next = url
      .replace(/([?&])w=\d+/g, `$1w=${width}`)
      .replace(/([?&])q=\d+/g, `$1q=${quality}`);
    if (!/[?&]w=\d+/.test(next)) {
      return `${next}${next.includes("?") ? "&" : "?"}w=${width}`;
    }
    if (!/[?&]q=\d+/.test(next)) {
      return `${next}&q=${quality}`;
    }
    return next;
  };

  const images = useMemo(
    () => [
      {
        url: "/showcase-retail-hero.webp",
        labelKey: "auth.showcase.img0.label",
        altKey: "auth.showcase.img0.alt",
      },
      {
        url: "/image.webp",
        labelKey: "auth.showcase.img1.label",
        altKey: "auth.showcase.img1.alt",
      },
      {
        url: "/showcase-construction-hero.webp",
        labelKey: "auth.showcase.img2.label",
        altKey: "auth.showcase.img2.alt",
      },
      {
        url: "/restaurant-waterfront.webp",
        labelKey: "auth.showcase.img3.label",
        altKey: "auth.showcase.img3.alt",
      },
    ],
    []
  );

  const stats = useMemo(
    () => [
      { icon: Users, number: "500+", labelKey: "auth.showcase.stat.staff" },
      { icon: Building2, number: "10+", labelKey: "auth.showcase.stat.restaurants" },
      { icon: Smile, number: "98%", labelKey: "auth.showcase.stat.satisfaction" },
    ],
    []
  );

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDE_COUNT);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slideIdx = currentSlide % SLIDE_COUNT;
  const headline = t(`auth.showcase.slide${slideIdx}.headline`);
  const subheading = t(`auth.showcase.slide${slideIdx}.subheading`);
  const currentImage = images[slideIdx];
  const sectorLabel = t(currentImage.labelKey);
  const showSectorEyebrow =
    sectorLabel.trim().length > 0 &&
    sectorLabel.trim().toLowerCase() !== headline.trim().toLowerCase();

  return (
    <div className="relative hidden min-h-screen min-w-0 flex-1 overflow-hidden bg-[#0A0D10] lg:flex">
      <div className="absolute inset-0">
        <img
          src={withUnsplashParams(currentImage.url, 1600, 92)}
          srcSet={
            isLocalPublicAsset(currentImage.url)
              ? undefined
              : [
                  `${withUnsplashParams(currentImage.url, 1200, 92)} 1200w`,
                  `${withUnsplashParams(currentImage.url, 1600, 92)} 1600w`,
                  `${withUnsplashParams(currentImage.url, 2200, 92)} 2200w`,
                  `${withUnsplashParams(currentImage.url, 2800, 92)} 2800w`,
                ].join(", ")
          }
          sizes="(min-width: 1024px) 50vw, 100vw"
          alt={t(currentImage.altKey)}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
          loading="eager"
          decoding="async"
        />

        <div className="absolute inset-0 bg-[#0A0D10]/45" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,13,16,0.55)_70%)]" />
        <div className="absolute inset-0 bg-gradient-to-l from-[#0A0D10]/85 via-transparent to-[#0A0D10]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D10]/75 via-transparent to-[#0A0D10]/20" />
      </div>

      <div className="relative z-10 flex min-h-screen w-full items-end justify-center px-5 pb-6 pt-24 sm:px-8 lg:px-10 lg:pb-8 xl:pb-10">
        <div
          key={slideIdx}
          className="flex h-[14.75rem] w-full max-w-[34rem] flex-col animate-in fade-in slide-in-from-bottom-2 duration-500 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-5 py-4 text-center shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-sm sm:h-[15rem] sm:max-w-xl sm:px-6 sm:py-5 lg:max-w-2xl"
        >
          <div className="flex h-4 shrink-0 items-center justify-center">
            {showSectorEyebrow ? (
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#00E676]">
                {sectorLabel}
              </p>
            ) : (
              <span className="invisible text-[9px]" aria-hidden>
                —
              </span>
            )}
          </div>
          <h2
            className="mt-1 line-clamp-2 min-h-[2.35rem] text-[1.2rem] font-bold leading-tight tracking-tight text-white sm:min-h-[2.5rem] sm:text-[1.35rem]"
            title={headline}
          >
            {headline}
          </h2>
          <p
            className="mx-auto mt-1.5 line-clamp-3 min-h-[3.15rem] max-w-[28rem] text-xs leading-snug text-[#B0BEC5] sm:min-h-[3.3rem] sm:text-[13px]"
            title={subheading}
          >
            {subheading}
          </p>

          <div className="mt-auto grid h-[4.25rem] shrink-0 grid-cols-3 gap-2 border-t border-white/[0.05] pt-3">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="flex flex-col items-center justify-center gap-1 px-1"
                >
                  <Icon className="h-3.5 w-3.5 text-[#00E676]" aria-hidden />
                  <span className="text-sm font-bold tabular-nums leading-none text-white">
                    {stat.number}
                  </span>
                  <p className="line-clamp-2 text-[9px] font-medium leading-tight text-[#78909C]">
                    {t(stat.labelKey)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex h-4 shrink-0 items-center justify-center gap-2" role="tablist" aria-label="Showcase slides">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={currentSlide === index}
                onClick={() => setCurrentSlide(index)}
                className={`transition-all ${
                  currentSlide === index
                    ? "h-2 w-7 rounded-full bg-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.4)]"
                    : "h-2 w-2 rounded-full bg-white/35 hover:bg-[#00E676]/70"
                }`}
                aria-label={t("auth.showcase.aria_goto_slide", { n: index + 1 })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};