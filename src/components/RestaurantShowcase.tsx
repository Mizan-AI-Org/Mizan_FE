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

  return (
    <div className="relative hidden min-w-0 flex-1 overflow-hidden bg-[#0A0D10] lg:flex">
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

        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0D10]/95 via-[#0A0D10]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D10]/90 via-transparent to-[#0A0D10]/30" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-gradient-to-l from-[#00E676]/10 to-transparent mix-blend-screen blur-3xl filter" />
      </div>

      <div className="relative z-10 flex h-screen flex-col justify-between p-8">
        <div className="flex flex-1 items-center">
          <div className="max-w-lg">
            <h2 className="mb-6 text-4xl font-bold leading-tight text-white md:text-5xl">
              {headline}
            </h2>
            <p className="text-lg leading-relaxed text-[#B0BEC5]">{subheading}</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="group relative h-24 rounded-xl border border-white/[0.1] bg-white/[0.06] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all hover:border-[#00E676]/40"
                >
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#00E676]/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                  <div className="relative flex h-full flex-col justify-center space-y-2">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-5 w-5 text-[#00E676]" />
                      <span className="text-sm font-semibold text-[#00E676]">
                        {stat.number}
                      </span>
                    </div>
                    <p className="text-xs text-[#78909C]">{t(stat.labelKey)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-[#00E676]">{t(currentImage.labelKey)}</p>
          </div>

          <div className="flex items-center justify-center space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`transition-all ${
                  currentSlide === index
                    ? "h-2 w-8 rounded-full bg-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.5)]"
                    : "h-2 w-2 rounded-full bg-white/30 hover:bg-[#00E676]/60"
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