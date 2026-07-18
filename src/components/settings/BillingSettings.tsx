import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  Check,
  CreditCard,
  ExternalLink,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type {
  BillingEntitlements,
  CurrentSubscription,
  SubscriptionPlan,
  SubscriptionTier,
} from "@/lib/types";
import { useLanguage } from "@/hooks/use-language";
import {
  translatePlanBadge,
  translatePlanDescription,
  translatePlanFeatures,
  translatePlanName,
} from "@/lib/billing-i18n";

type Interval = "month" | "year";
type Translate = (key: string, options?: Record<string, string | number>) => string;

const TIER_ORDER: Record<SubscriptionTier, number> = {
  FREE: 0,
  STARTER: 1,
  GROWTH: 2,
  ENTERPRISE: 3,
};

/** Prefer region-aware locales so MAD/EUR don't render as "$US". */
function currencyLocale(uiLanguage: string, currency: string): string {
  const cur = (currency || "").toUpperCase();
  const lang = (uiLanguage || "en").toLowerCase();
  if (cur === "MAD") return lang.startsWith("ar") ? "ar-MA" : "fr-MA";
  if (cur === "EUR") return lang.startsWith("fr") ? "fr-FR" : lang.startsWith("ar") ? "ar" : "en-IE";
  if (cur === "USD") return lang.startsWith("fr") ? "en-US" : lang;
  return lang;
}

const formatCurrency = (
  value: string | null | undefined,
  currency: string,
  locale: string,
) => {
  if (!value) return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  const code = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(currencyLocale(locale, code), {
      style: "currency",
      currency: code,
      maximumFractionDigits: n % 1 === 0 ? 0 : 2,
    }).format(n);
  } catch {
    return `${code} ${n}`;
  }
};

const formatDate = (iso: string | null | undefined, locale: string) => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

function priceIdFor(plan: SubscriptionPlan, interval: Interval): string {
  if (interval === "year") {
    return plan.stripe_price_id_yearly || plan.stripe_price_id_monthly || plan.stripe_price_id || "";
  }
  return plan.stripe_price_id_monthly || plan.stripe_price_id || "";
}

function PlanCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}

type TrialContext = {
  status?: string | null;
  trialEndsAt?: string | null;
  hasProviderSub?: boolean;
};

function trialCaption(
  t: Translate,
  plan: SubscriptionPlan,
  isCurrent: boolean,
  ctx: TrialContext,
  locale: string,
): string | null {
  // Trial is Starter-only (14 days at signup). Growth/Enterprise: pay for what you get.
  const isStarter = plan.tier === "STARTER" || plan.slug === "starter";
  if (!isStarter) return null;

  // Already paying — trial is gone.
  if (ctx.hasProviderSub || ctx.status === "active") return null;

  const status = (ctx.status || "").toLowerCase();
  if (isCurrent && status === "trialing" && ctx.trialEndsAt) {
    return t("billing.trial.current_ends", {
      date: formatDate(ctx.trialEndsAt, locale),
    });
  }
  return null;
}

interface PlanCardProps {
  plan: SubscriptionPlan;
  interval: Interval;
  isCurrent: boolean;
  ctaLabel: string;
  disabled: boolean;
  locale: string;
  checkoutPending: boolean;
  onSelect: (plan: SubscriptionPlan) => void;
  t: Translate;
  trialContext: TrialContext;
}

function PlanCard({
  plan,
  interval,
  isCurrent,
  ctaLabel,
  disabled,
  locale,
  checkoutPending,
  onSelect,
  t,
  trialContext,
}: PlanCardProps) {
  const monthlyPrice = plan.price_monthly ?? plan.price;
  const yearlyPrice = plan.price_yearly ?? (monthlyPrice ? String(Number(monthlyPrice) * 10) : null);
  const displayPrice = interval === "month" ? monthlyPrice : yearlyPrice;
  const monthlyEquivalent =
    interval === "year" && yearlyPrice
      ? String((Number(yearlyPrice) / 12).toFixed(0))
      : null;

  // On Starter trial, "Upgrade" stays clickable so they can convert to paid.
  const isPaidCurrent =
    isCurrent && (trialContext.status || "").toLowerCase() !== "trialing";
  const canAct = !isPaidCurrent;
  const features = translatePlanFeatures(t, plan);
  const description = translatePlanDescription(t, plan);
  const badge = plan.badge ? translatePlanBadge(t, plan.badge) : "";
  const trialText = trialCaption(t, plan, isCurrent, trialContext, locale);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border p-5 transition-shadow",
        plan.highlight
          ? "border-emerald-400 shadow-md shadow-emerald-500/10 dark:border-emerald-500/60"
          : "border-slate-200 dark:border-slate-800",
        isCurrent && "ring-2 ring-emerald-500/35",
      )}
    >
      {badge ? (
        <span
          className={cn(
            "absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            plan.highlight
              ? "bg-emerald-600 text-white"
              : "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
          )}
        >
          {badge}
        </span>
      ) : null}

      <div className="mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {translatePlanName(t, plan)}
          </h3>
          {isCurrent && (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px]">
              {t("billing.badge.active")}
            </Badge>
          )}
        </div>
        {description ? (
          <p className="mt-1 text-xs leading-snug text-slate-500 dark:text-slate-400 line-clamp-2">
            {description}
          </p>
        ) : null}
      </div>

      <div className="mb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {formatCurrency(displayPrice, plan.currency, locale)}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            /{interval === "year" ? t("billing.interval.yr") : t("billing.interval.mo")}
          </span>
        </div>
        {monthlyEquivalent && (
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {t("billing.billed_annually", {
              price: formatCurrency(monthlyEquivalent, plan.currency, locale),
            })}
          </p>
        )}
        {trialText ? (
          <p className="mt-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            {trialText}
          </p>
        ) : null}
      </div>

      <ul className="mb-4 space-y-1.5 text-xs">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-1.5">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span className="text-slate-700 dark:text-slate-300">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        <Button
          className={cn(
            "w-full h-10 rounded-lg font-semibold",
            plan.highlight
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "",
          )}
          variant={plan.highlight ? "default" : "outline"}
          disabled={disabled || isPaidCurrent || checkoutPending || !canAct}
          onClick={() => onSelect(plan)}
        >
          {checkoutPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {ctaLabel}
          {!isPaidCurrent && (
            <ArrowRight className="ml-2 h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

export default function BillingSettings() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [interval, setInterval] = useState<Interval>("month");
  const handledBillingParam = useRef(false);

  const locale = language || "en";

  const subscriptionQuery = useQuery<CurrentSubscription>({
    queryKey: ["current-subscription"],
    queryFn: () => api.getCurrentSubscription(),
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const entitlementsQuery = useQuery<BillingEntitlements>({
    queryKey: ["billing-entitlements"],
    queryFn: () => api.getBillingEntitlements(),
    retry: false,
    staleTime: 30 * 1000,
  });

  const plansQuery = useQuery<SubscriptionPlan[]>({
    // Refetch when subscription loads so prices use the tenant location currency.
    queryKey: ["subscription-plans", subscriptionQuery.data?.status ?? "anon"],
    queryFn: () => api.listSubscriptionPlans(),
    staleTime: 60 * 1000,
  });

  const sortedPlans = useMemo(() => {
    const plans = plansQuery.data ?? [];
    return [...plans]
      .filter((p) => p.tier !== "FREE")
      .sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99),
      );
  }, [plansQuery.data]);

  const currentSub = subscriptionQuery.data;
  const currentTier: SubscriptionTier =
    currentSub?.plan?.tier ?? currentSub?.tier ?? "FREE";
  const currentPlanSlug = currentSub?.plan?.slug ?? null;
  const isEntitled = Boolean(currentSub?.is_paid);
  const hasProviderSub = Boolean(currentSub?.has_provider_subscription);
  const staffUsed = entitlementsQuery.data?.usage?.staff;
  const maxStaff =
    entitlementsQuery.data?.limits?.max_staff ??
    currentSub?.plan?.max_staff ??
    null;

  const isPlanCurrent = (plan: SubscriptionPlan): boolean => {
    if (currentPlanSlug && plan.slug === currentPlanSlug) return true;
    if (!currentPlanSlug && currentTier && plan.tier === currentTier) return true;
    return false;
  };

  useEffect(() => {
    if (handledBillingParam.current) return;
    const params = new URLSearchParams(window.location.search);
    const billing = params.get("billing");
    if (!billing) return;
    handledBillingParam.current = true;
    params.delete("billing");
    if (!params.get("tab")) params.set("tab", "billing");
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", next);

    if (billing === "success") {
      toast.success(t("billing.toast.success"));
      void queryClient.invalidateQueries({ queryKey: ["current-subscription"] });
      void queryClient.invalidateQueries({ queryKey: ["billing-entitlements"] });
    } else if (billing === "cancelled") {
      toast.message(t("billing.toast.cancelled"));
    }
  }, [queryClient, t]);

  // Prefer the interval of the active provider subscription when known.
  useEffect(() => {
    if (currentSub?.billing_interval === "month" || currentSub?.billing_interval === "year") {
      setInterval(currentSub.billing_interval);
    }
  }, [currentSub?.billing_interval]);

  const checkoutMutation = useMutation({
    mutationFn: async (plan: SubscriptionPlan) => {
      const priceId = priceIdFor(plan, interval);
      const origin = window.location.origin;
      const base = `${origin}/dashboard/settings?tab=billing`;
      return api.createCheckoutSession({
        ...(priceId ? { price_id: priceId } : { plan_id: plan.id }),
        billing_interval: interval,
        success_url: `${base}&billing=success`,
        cancel_url: `${base}&billing=cancelled`,
      });
    },
    onSuccess: (result) => {
      const r = result as Awaited<ReturnType<typeof api.createCheckoutSession>>;
      if (r.action === "redirect" && r.url) {
        window.location.href = r.url;
        return;
      }
      if (r.action === "updated") {
        toast.success(r.message || t("billing.toast.plan_updated"));
        void queryClient.invalidateQueries({ queryKey: ["current-subscription"] });
        void queryClient.invalidateQueries({ queryKey: ["billing-entitlements"] });
        return;
      }
      if (r.action === "queued") {
        toast.message(r.message || t("billing.toast.queued"));
        void queryClient.invalidateQueries({ queryKey: ["current-subscription"] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || t("billing.toast.checkout_error"));
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const returnUrl = `${window.location.origin}/dashboard/settings?tab=billing`;
      return api.createBillingPortalSession(returnUrl);
    },
    onSuccess: (result) => {
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      toast.message(result?.message || t("billing.toast.portal_unavailable"));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("billing.toast.portal_error"));
    },
  });

  const handleSelect = (plan: SubscriptionPlan) => {
    void checkoutMutation.mutate(plan);
  };

  const isTrialing = (currentSub?.status || "").toLowerCase() === "trialing";

  const ctaForPlan = (plan: SubscriptionPlan): string => {
    if (isPlanCurrent(plan)) {
      // Starter trial → Upgrade (convert to paid). Paid current → Current Plan.
      return isTrialing ? t("billing.cta.upgrade") : t("billing.cta.current");
    }

    const currentOrder = TIER_ORDER[currentTier] ?? 0;
    const targetOrder = TIER_ORDER[plan.tier] ?? 0;
    if (targetOrder > currentOrder) return t("billing.cta.upgrade");
    if (targetOrder < currentOrder && hasProviderSub) return t("billing.cta.switch");
    if (isEntitled && !hasProviderSub) return t("billing.cta.subscribe");
    return t("billing.cta.upgrade");
  };

  const loadingPlans = plansQuery.isLoading;
  const loadingSub = subscriptionQuery.isLoading;

  const statusLabel = (() => {
    if (hasProviderSub) {
      return t(`billing.status.${currentSub?.status || "active"}`);
    }
    if (isTrialing) return t("billing.status.trialing") || "Trial";
    if (isEntitled && currentSub?.plan) return t("billing.status.active");
    return t("billing.status.pilot");
  })();

  const trialDays =
    currentSub?.plan?.trial_days && currentSub.plan.trial_days > 0
      ? currentSub.plan.trial_days
      : 14;

  const planName = currentSub?.plan
    ? translatePlanName(t, currentSub.plan)
    : t(`billing.tier.${currentTier.toLowerCase()}`);

  const statusDetail = (() => {
    if (hasProviderSub && currentSub?.current_period_end) {
      return currentSub.cancel_at_period_end
        ? t("billing.cancels_on", {
            date: formatDate(currentSub.current_period_end, locale),
          })
        : t("billing.renews_on", {
            date: formatDate(currentSub.current_period_end, locale),
          });
    }
    // Trial end date lives in the banner — don't repeat it here.
    if (isTrialing) return null;
    if (currentSub?.plan) {
      return t("billing.current_tier_blurb", { plan: planName });
    }
    return t("billing.pilot_blurb");
  })();

  return (
    <div className="space-y-4">
      {isTrialing && !loadingSub ? (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50 px-3.5 py-2.5 text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/35 dark:text-amber-100"
        >
          <CalendarClock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
          <p className="min-w-0 text-sm">
            <span className="font-semibold">
              {t("billing.trial.banner_title", { days: trialDays })}
            </span>
            <span className="text-amber-900/75 dark:text-amber-100/75">
              {" · "}
              {currentSub?.trial_ends_at
                ? t("billing.trial.banner_body", {
                    days: trialDays,
                    date: formatDate(currentSub.trial_ends_at, locale),
                  })
                : t("billing.trial.banner_body_nodate", { days: trialDays })}
            </span>
          </p>
        </div>
      ) : null}

      {/* Compact current status — keeps plan tiers near the top */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200/80 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        {loadingSub ? (
          <div className="flex w-full items-center gap-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : (
          <>
            <div className="min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <CreditCard className="h-4 w-4 text-slate-400" />
                {planName}
              </span>
              <Badge
                className={cn(
                  "text-[10px]",
                  hasProviderSub
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                    : "bg-amber-100 text-amber-800 hover:bg-amber-100",
                )}
              >
                {statusLabel}
              </Badge>
              {typeof staffUsed === "number" ? (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {maxStaff == null
                    ? t("billing.staff_usage_unlimited", { used: staffUsed })
                    : t("billing.staff_usage", {
                        used: staffUsed,
                        max: maxStaff,
                      })}
                </span>
              ) : null}
              {statusDetail ? (
                <span className="text-xs text-slate-500 dark:text-slate-400 sm:max-w-xs sm:truncate">
                  {statusDetail}
                </span>
              ) : null}
              {currentSub?.pending_plan ? (
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  {t("billing.pending_upgrade", {
                    name: translatePlanName(t, currentSub.pending_plan),
                    interval: currentSub.pending_billing_interval
                      ? t("billing.pending_interval_suffix", {
                          interval:
                            currentSub.pending_billing_interval === "year"
                              ? t("billing.yearly")
                              : t("billing.monthly"),
                        })
                      : "",
                  })}
                </span>
              ) : null}
            </div>
            {hasProviderSub ? (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-8"
                disabled={portalMutation.isPending}
                onClick={() => portalMutation.mutate()}
              >
                {portalMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                )}
                {t("billing.manage_billing")}
              </Button>
            ) : null}
          </>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t("billing.plans_title")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("billing.plans_desc")}
            </p>
          </div>

          <div className="inline-flex rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800 p-0.5 self-start">
            {(["month", "year"] as Interval[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setInterval(opt)}
                className={cn(
                  "relative px-3.5 py-1 text-xs font-medium rounded-full transition-all",
                  interval === opt
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                )}
              >
                {opt === "month" ? t("billing.monthly") : t("billing.yearly")}
                {opt === "year" && (
                  <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                    {t("billing.yearly_save")}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {loadingPlans ? (
          <div className="grid gap-4 md:grid-cols-3">
            <PlanCardSkeleton />
            <PlanCardSkeleton />
            <PlanCardSkeleton />
          </div>
        ) : plansQuery.isError ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-3 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">{t("billing.load_error")}</p>
              <Button
                size="sm"
                variant="link"
                className="mt-1 px-0 text-red-700 dark:text-red-300"
                onClick={() => plansQuery.refetch()}
              >
                {t("common.retry")}
              </Button>
            </div>
          </div>
        ) : sortedPlans.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("billing.no_plans")}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {sortedPlans.map((plan) => {
              const isCurrent = isPlanCurrent(plan);
              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  interval={interval}
                  isCurrent={isCurrent}
                  ctaLabel={ctaForPlan(plan)}
                  disabled={checkoutMutation.isPending}
                  checkoutPending={
                    checkoutMutation.isPending &&
                    checkoutMutation.variables?.slug === plan.slug
                  }
                  locale={locale}
                  onSelect={handleSelect}
                  t={t}
                  trialContext={{
                    status: currentSub?.status,
                    trialEndsAt: currentSub?.trial_ends_at,
                    hasProviderSub,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
