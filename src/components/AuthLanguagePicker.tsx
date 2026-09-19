import React from "react";
import { useLanguage } from "@/hooks/use-language";
import type { Language } from "@/contexts/LanguageContext.types";
import { LANGUAGE_OPTIONS } from "@/config/languages";
import { cn } from "@/lib/utils";

interface AuthLanguagePickerProps {
  compact?: boolean;
  className?: string;
}

/** Segmented language control for the auth page — persists via LanguageProvider. */
export const AuthLanguagePicker: React.FC<AuthLanguagePickerProps> = ({
  compact = false,
  className,
}) => {
  const { language, setLanguage, t, isChanging } = useLanguage();

  return (
    <div
      className={cn("shrink-0", compact ? "w-[min(100%,15rem)]" : "w-full max-w-sm", className)}
    >
      <div
        className="grid grid-cols-3 gap-1.5"
        role="radiogroup"
        aria-label={t("auth.language.label", "Language")}
      >
        {LANGUAGE_OPTIONS.map((opt) => {
          const active = language === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={opt.native}
              disabled={isChanging}
              onClick={() => setLanguage(opt.id as Language)}
              className={cn(
                "flex w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-2",
                "text-center transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E676]/50",
                compact ? "h-[3.25rem]" : "h-[4.5rem] py-2.5",
                active
                  ? "border-[#00E676]/60 bg-[#00E676]/15 shadow-[0_0_16px_rgba(0,230,118,0.12)]"
                  : "border-white/10 bg-white/[0.03] hover:border-[#00E676]/30 hover:bg-white/[0.06]",
              )}
            >
              <span className="text-base leading-none" aria-hidden>
                {opt.flag}
              </span>
              <span
                className={cn(
                  "w-full truncate font-medium text-white leading-tight",
                  compact ? "text-[10px] px-0.5" : "text-xs px-1",
                )}
              >
                {opt.native}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
