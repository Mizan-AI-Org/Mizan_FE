import React from "react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { useMyLanguage } from "@/hooks/use-my-language";
import { LANGUAGE_OPTIONS } from "@/config/languages";
import { cn } from "@/lib/utils";

interface LanguageQuickSwitchProps {
  /** Also make it the business default (the owner setting up the business). */
  business?: boolean;
  className?: string;
}

/** Compact EN / FR / AR switch for headers: switches the app at once and saves the person's language. */
export const LanguageQuickSwitch: React.FC<LanguageQuickSwitchProps> = ({ business = false, className }) => {
  const { t, isChanging } = useLanguage();
  const { language, changeLanguage, saving } = useMyLanguage();

  return (
    <div
      role="radiogroup"
      aria-label={t("language.switch.label", "Language")}
      className={cn(
        "inline-flex shrink-0 items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-0.5",
        className,
      )}
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
            title={opt.native}
            disabled={isChanging || saving}
            onClick={() => {
              if (active) return;
              changeLanguage(opt.id, { business }).catch(() =>
                toast.error(t("settings.language.save_error", "Could not save your language. Try again.")),
              );
            }}
            className={cn(
              "h-7 min-w-[2.25rem] rounded-md px-2 text-[11px] font-semibold uppercase tracking-wide transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
              active
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100",
            )}
          >
            {opt.id}
          </button>
        );
      })}
    </div>
  );
};
