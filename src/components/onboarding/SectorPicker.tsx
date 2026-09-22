import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Briefcase,
  Building2,
  Check,
  Factory,
  HardHat,
  HeartPulse,
  Hotel,
  LayoutGrid,
  ShoppingBag,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  SIGNUP_SECTOR_OPTIONS,
  type BusinessVertical,
} from "@/config/staffInviteRolesByVertical";
import { playbooksForVertical } from "@/config/sectorPlaybookPreview";

const SECTOR_ICONS: Record<BusinessVertical, LucideIcon> = {
  RESTAURANT: UtensilsCrossed,
  RETAIL: ShoppingBag,
  MANUFACTURING: Factory,
  CONSTRUCTION: HardHat,
  HEALTHCARE: HeartPulse,
  HOSPITALITY: Hotel,
  SERVICES: Briefcase,
  OTHER: LayoutGrid,
};

export type SectorPickerTone = "dark" | "light";

interface SectorPickerProps {
  value: BusinessVertical;
  onChange: (next: BusinessVertical) => void;
  tone?: SectorPickerTone;
  columns?: 2 | 4;
  /** Override the grid class (e.g. when rendered inside a narrower container). */
  gridClass?: string;
  /** Show the selected pack as chips under the grid. */
  showPreview?: boolean;
  name?: string;
  labelledBy?: string;
  describedBy?: string;
}

export const SectorPicker: React.FC<SectorPickerProps> = ({
  value,
  onChange,
  tone,
  columns = 4,
  gridClass,
  showPreview = true,
  name = "businessVertical",
  labelledBy,
  describedBy,
}) => {
  const { t } = useTranslation();
  // Auto-detect theme if not explicitly provided
  const [resolvedTone, setResolvedTone] = useState<SectorPickerTone>(tone || "light");
  
  useEffect(() => {
    if (tone) {
      setResolvedTone(tone);
      return;
    }
    // Auto-detect from document.documentElement.classList
    const isDark = document.documentElement.classList.contains("dark");
    setResolvedTone(isDark ? "dark" : "light");
    
    // Listen for theme changes
    const handleThemeChange = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setResolvedTone(isDark ? "dark" : "light");
    };
    
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    
    return () => observer.disconnect();
  }, [tone]);
  
  const dark = resolvedTone === "dark";
  const preview = playbooksForVertical(value).slice(0, 3);

  const resolvedGridClass = gridClass ?? (
    columns === 4
      ? "grid-cols-2 sm:grid-cols-4"
      : "grid-cols-2"
  );

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={value} />
      <div
        role="radiogroup"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={cn("grid gap-2.5", resolvedGridClass)}
      >
        {SIGNUP_SECTOR_OPTIONS.map((opt) => {
          const selected = opt.value === value;
          const Icon = SECTOR_ICONS[opt.value];
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={cn(
                "relative text-left rounded-xl border p-3 transition-all focus-visible:outline-none focus-visible:ring-2 flex flex-col gap-2",
                dark
                  ? selected
                    ? "border-[#00E676] bg-[#00E676]/10 ring-1 ring-[#00E676]/40"
                    : "border-white/10 bg-[#0A0D10]/50 hover:border-white/25 hover:bg-white/5"
                  : selected
                    ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20"
                    : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50/80",
                dark
                  ? "focus-visible:ring-[#00E676]/60"
                  : "focus-visible:ring-emerald-500/50",
              )}
            >
              {/* Selected check badge */}
              {selected && (
                <span
                  className={cn(
                    "absolute top-2 right-2 h-5 w-5 rounded-full flex items-center justify-center shadow-sm",
                    dark ? "bg-[#00E676] text-[#0A0D10]" : "bg-emerald-500 text-white",
                  )}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}

              {/* Icon */}
              <span
                className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                  dark
                    ? selected
                      ? "bg-[#00E676]/20 text-[#00E676]"
                      : "bg-white/5 text-[#B0BEC5]"
                    : selected
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-500",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>

              {/* Text */}
              <span className="space-y-0.5">
                <span
                  className={cn(
                    "block text-sm font-semibold leading-tight",
                    dark ? "text-white" : selected ? "text-emerald-800" : "text-slate-800",
                  )}
                >
                  {t(opt.nameKey)}
                </span>
                <span
                  className={cn(
                    "block text-[11px] leading-snug",
                    dark ? "text-[#B0BEC5]" : "text-slate-400",
                  )}
                >
                  {t(opt.taglineKey)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {showPreview && (
        <div
          className={cn(
            "rounded-xl border px-3 py-2.5",
            dark
              ? "border-white/10 bg-white/5"
              : "border-emerald-100 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-medium mb-2",
              dark ? "text-[#00E676]" : "text-emerald-700 dark:text-emerald-300",
            )}
          >
            <Building2 className="h-3.5 w-3.5" />
            {t(
              "onboarding.industry.preview_label",
              "Miya will watch for",
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {preview.map((item) => (
              <span
                key={item.seed_id}
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                  dark
                    ? "bg-[#00E676]/15 text-[#B9F6CA] border border-[#00E676]/25"
                    : "bg-white text-emerald-800 border border-emerald-200 dark:bg-slate-900 dark:text-emerald-200 dark:border-emerald-800",
                )}
              >
                {t(`onboarding.industry.playbook.${item.seed_id}`, item.name)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
