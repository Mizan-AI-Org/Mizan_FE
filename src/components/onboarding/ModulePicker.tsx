import { Check, Link2, Lock, Sparkles } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { BUNDLES, CORE_MODULES, MODULES, withDependencies } from "@/config/modules";
import type { ModuleKey, ModulePricing } from "@/lib/types";

type Props = {
  value: ModuleKey[];
  onChange: (next: ModuleKey[]) => void;
  recommended: ModuleKey[];
  /** Monthly price per module key (from the backend catalog). */
  prices?: Partial<Record<ModuleKey, number>>;
  pricing?: ModulePricing;
  /** "auth" = dark signup screen, "app" = themed settings page. */
  variant?: "auth" | "app";
  disabled?: boolean;
  /** Footer under the total (e.g. "14 days free"). */
  totalNote?: string;
};

const STYLES = {
  auth: {
    card: "border-white/10 bg-white/[0.03] hover:border-[#00E676]/40",
    cardOn: "border-[#00E676]/60 bg-[#00E676]/[0.07] shadow-[0_0_0_1px_rgba(0,230,118,0.25)]",
    icon: "bg-white/5 text-[#B0BEC5]",
    iconOn: "bg-[#00E676]/15 text-[#00E676]",
    title: "text-white",
    body: "text-[#90A4AE]",
    muted: "text-[#78909C]",
    check: "border-white/25",
    checkOn: "border-[#00E676] bg-[#00E676] text-[#0A0D10]",
    badge: "bg-[#00E676]/10 text-[#00E676]",
    core: "bg-white/10 text-[#CFD8DC]",
    link: "text-[#00E676] hover:text-[#00F77B]",
    price: "text-[#CFD8DC]",
    total: "border-[#00E676]/30 bg-[#00E676]/[0.06]",
    totalText: "text-white",
    group: "text-[#78909C]",
  },
  app: {
    card: "border-border bg-card hover:border-primary/40",
    cardOn: "border-primary/60 bg-primary/[0.06] shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]",
    icon: "bg-muted text-muted-foreground",
    iconOn: "bg-primary/15 text-primary",
    title: "text-foreground",
    body: "text-muted-foreground",
    muted: "text-muted-foreground",
    check: "border-input",
    checkOn: "border-primary bg-primary text-primary-foreground",
    badge: "bg-primary/10 text-primary",
    core: "bg-muted text-foreground/80",
    link: "text-primary hover:underline",
    price: "text-foreground/80",
    total: "border-primary/30 bg-primary/[0.05]",
    totalText: "text-foreground",
    group: "text-muted-foreground",
  },
} as const;

export function formatMoney(amount: number, currency = "MAD") {
  // "2 210 MAD": a space groups thousands in every language (fr-MA's "2.210" reads as 2.21 in English).
  // Prices are whole dirhams; invoice amounts (tax, proration) keep their centimes: "1 070,40 MAD".
  const cents = Math.round(amount * 100);
  const whole = String(Math.trunc(Math.abs(cents) / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const sign = cents < 0 ? "-" : "";
  const frac = Math.abs(cents) % 100;
  return `${sign}${whole}${frac ? `,${String(frac).padStart(2, "0")}` : ""} ${currency}`;
}

/** The monthly bill (HT) for a selection: platform fee + bundles taken whole + other modules. */
export function monthlyTotal(value: ModuleKey[], prices: Partial<Record<ModuleKey, number>>, pricing?: ModulePricing) {
  const chosen = new Set(value.filter((k) => !CORE_MODULES.includes(k)));
  let paid = 0;
  // Same rule as the bill: a whole bundle costs its bundle price.
  for (const bundle of Object.values(pricing?.bundles ?? {})) {
    if (bundle.modules.length && bundle.modules.every((k) => chosen.has(k as ModuleKey))) {
      const parts = bundle.modules.reduce((sum, k) => sum + (prices[k as ModuleKey] ?? 0), 0);
      paid += Math.min(bundle.monthly, parts);
      bundle.modules.forEach((k) => chosen.delete(k as ModuleKey));
    }
  }
  chosen.forEach((k) => (paid += prices[k] ?? 0));
  return (pricing?.platformMonthly ?? 0) + paid;
}

/** Pick the product modules for a tenant, with what each one costs. Core modules (operations, team) are always on. */
export function ModulePicker({ value, onChange, recommended, prices = {}, pricing, variant = "app", disabled, totalNote }: Props) {
  const { t } = useLanguage();
  const s = STYLES[variant];
  const on = new Set<ModuleKey>([...CORE_MODULES, ...value]);
  const optional = MODULES.filter((m) => !m.core);
  const currency = pricing?.currency || "MAD";
  const showPrices = !!pricing;
  const total = monthlyTotal([...on], prices, pricing);
  const yearMonths = pricing?.yearlyMonths ?? 10;

  const toggle = (key: ModuleKey) => {
    if (disabled || CORE_MODULES.includes(key)) return;
    const turningOn = !on.has(key);
    const next = new Set(on);
    if (turningOn) next.add(key);
    else next.delete(key);
    onChange(withDependencies([...next], key, turningOn));
  };
  const setAll = (keys: ModuleKey[]) => !disabled && onChange(withDependencies([...CORE_MODULES, ...keys]));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className={cn("font-medium", s.muted)} aria-live="polite">
          {t("modules.count", { on: optional.filter((m) => on.has(m.key)).length, total: optional.length })}
        </span>
        <div className="flex items-center gap-3">
          <button type="button" className={cn("font-semibold", s.link)} onClick={() => setAll(recommended)} disabled={disabled}>
            {t("modules.use_recommended")}
          </button>
          <button type="button" className={cn("font-semibold", s.link)} onClick={() => setAll(optional.map((m) => m.key))} disabled={disabled}>
            {t("modules.select_all")}
          </button>
        </div>
      </div>

      {BUNDLES.map((bundle) => {
        const items = MODULES.filter((m) => m.bundle === bundle);
        return (
          <div key={bundle} className="space-y-1.5">
            <p className={cn("flex items-baseline justify-between text-[11px] font-bold uppercase tracking-widest", s.group)}>
              <span>{t(`modules.bundle.${bundle}`)}</span>
              {bundle === "core" && showPrices ? (
                <span className={cn("normal-case tracking-normal font-semibold", s.price)}>
                  {t("modules.per_month", { price: formatMoney(pricing!.platformMonthly, currency) })}
                </span>
              ) : null}
            </p>
            <div
              className={cn("grid gap-2", variant === "app" && "sm:grid-cols-2 sm:gap-2.5")}
              role="group"
              aria-label={t(`modules.bundle.${bundle}`)}
            >
              {items.map((m) => {
                const active = on.has(m.key);
                const Icon = m.icon;
                const isCore = !!m.core;
                const price = prices[m.key];
                return (
                  <button
                    key={m.key}
                    type="button"
                    role="checkbox"
                    aria-checked={active}
                    aria-disabled={isCore || disabled}
                    onClick={() => toggle(m.key)}
                    className={cn(
                      "group relative flex w-full items-start gap-3 rounded-xl border text-start transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
                      variant === "auth" ? "px-3 py-2.5 focus-visible:ring-[#00E676]/50" : "p-3 focus-visible:ring-primary/50",
                      active ? s.cardOn : s.card,
                      isCore ? "cursor-default" : "cursor-pointer",
                    )}
                  >
                    <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", active ? s.iconOn : s.icon)}>
                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className={cn("text-sm font-semibold", s.title)}>{t(`modules.${m.key}.name`)}</span>
                        {isCore ? (
                          <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold", s.core)}>
                            <Lock className="h-2.5 w-2.5" aria-hidden />
                            {t("modules.always_on")}
                          </span>
                        ) : recommended.includes(m.key) ? (
                          <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold", s.badge)}>
                            <Sparkles className="h-2.5 w-2.5" aria-hidden />
                            {t("modules.recommended")}
                          </span>
                        ) : null}
                      </span>
                      <span className={cn("block text-xs leading-snug", s.body)}>{t(`modules.${m.key}.desc`)}</span>
                      {m.requires?.length ? (
                        <span className={cn("inline-flex items-center gap-1 text-[11px]", s.muted)}>
                          <Link2 className="h-3 w-3" aria-hidden />
                          {t("modules.includes_required", {
                            names: m.requires.map((r) => t(`modules.${r}.name`)).join(", "),
                          })}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1.5">
                      {!isCore && (
                        <span
                          aria-hidden
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-md border transition-colors",
                            active ? s.checkOn : s.check,
                          )}
                        >
                          {active ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                        </span>
                      )}
                      {!isCore && showPrices && price != null ? (
                        <span className={cn("whitespace-nowrap text-[11px] font-semibold tabular-nums", s.price)}>
                          {t("modules.per_month_short", { price: formatMoney(price, currency) })}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {showPrices ? (
        <div className={cn("sticky bottom-0 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl border px-4 py-3 backdrop-blur", s.total)}>
          <span className={cn("text-sm font-semibold", s.totalText)}>{t("modules.total_label")}</span>
          <span className={cn("text-lg font-black tabular-nums", s.totalText)} aria-live="polite">
            {t("modules.per_month", { price: formatMoney(total, currency) })}
          </span>
          <span className={cn("w-full text-[11px]", s.muted)}>
            {t("modules.yearly_hint", { price: formatMoney(total * yearMonths, currency), free: 12 - yearMonths })}
            {totalNote ? ` · ${totalNote}` : ""}
          </span>
        </div>
      ) : null}
    </div>
  );
}
