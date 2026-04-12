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
        url: "/showcase-retail-hero.png",
        labelKey: "auth.showcase.img0.label",
        altKey: "auth.showcase.img0.alt",
      },
      {
        url: "/image.png",
        labelKey: "auth.showcase.img1.label",
        altKey: "auth.showcase.img1.alt",
      },
      {
        url: "/showcase-construction-hero.png",
        labelKey: "auth.showcase.img2.label",
        altKey: "auth.showcase.img2.alt",
      },
      {
        url: "/restaurant-waterfront.png",
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
    <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-[#0A0D10]">
      {/* Hero Image Background with Dark Overlay */}
      <div className="absolute inset-0">
        {/* Background Image with Fade Transition */}
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
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
          loading="eager"
          decoding="async"
        />

        {/* Softer overlays for a lighter, premium feel */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/65 via-slate-950/45 to-transparent" />

        {/* Additional overlay for better text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 to-transparent" />

        {/* Subtle accent elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-l from-[#00E676]/10 to-transparent rounded-full mix-blend-multiply filter blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between h-screen p-8">
        {/* Top Section - Marketing Copy */}
        <div className="flex-1 flex items-center">
          <div className="max-w-lg">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              {headline}
            </h2>
            <p className="text-lg text-white/80 leading-relaxed">
              {subheading}
            </p>
          </div>
        </div>

        {/* Bottom Section - Stats */}
        <div className="space-y-8">
          {/* Statistics Cards */}
          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="relative rounded-lg p-4 h-24 backdrop-blur-md bg-white/5 border border-[#00E676]/20 hover:border-[#00E676]/40 transition-all group"
                >
                  {/* Blurred background effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00E676]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />

                  <div className="relative h-full flex flex-col justify-center space-y-2">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-5 w-5 text-[#00E676]" />
                      <span className="text-sm font-semibold text-[#00E676]">
                        {stat.number}
                      </span>
                    </div>
                    <p className="text-xs text-[#B0BEC5]">{t(stat.labelKey)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Image Label */}
          <div className="text-center">
            <p className="text-sm font-semibold text-[#00E676]">{t(currentImage.labelKey)}</p>
          </div>

          {/* Pagination Dots */}
          <div className="flex items-center justify-center space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`transition-all ${currentSlide === index
                  ? "w-8 h-2 bg-[#00E676] rounded-full"
                  : "w-2 h-2 bg-[#00E676]/40 rounded-full hover:bg-[#00E676]/60"
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