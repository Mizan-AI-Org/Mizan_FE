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
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type {
  CurrentSubscription,
  SubscriptionPlan,
  SubscriptionTier,
} from "@/lib/types";
import { useLanguage } from "@/hooks/use-language";

type Interval = "month" | "year";

const TIER_ORDER: Record<SubscriptionTier, number> = {
  FREE: 0,
  STARTER: 1,
  GROWTH: 2,
  ENTERPRISE: 3,
};

const formatCurrency = (
  value: string | null | undefined,
  currency: string,
  locale: string,
) => {
  if (!value) return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: n % 1 === 0 ? 0 : 2,
    }).format(n);
  } catch {
    return `${currency} ${n}`;
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
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  );
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
}: PlanCardProps) {
  const monthlyPrice = plan.price_monthly ?? plan.price;
  const yearlyPrice = plan.price_yearly ?? (monthlyPrice ? String(Number(monthlyPrice) * 10) : null);
  const displayPrice = interval === "month" ? monthlyPrice : yearlyPrice;
  const monthlyEquivalent =
    interval === "year" && yearlyPrice
      ? String((Number(yearlyPrice) / 12).toFixed(0))
      : null;

  const canAct = !isCurrent; // plan_id queue works even without Stripe price IDs

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-6 transition-shadow",
        plan.highlight
          ? "border-emerald-400 shadow-lg shadow-emerald-500/10 dark:border-emerald-500/60"
          : "border-slate-200 dark:border-slate-800",
        isCurrent && "ring-2 ring-emerald-500/40",
      )}
    >
      {plan.badge && (
        <span
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
            plan.highlight
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow"
              : "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
          )}
        >
          {plan.badge}
        </span>
      )}

      <div className="mb-5">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {plan.name}
          </h3>
          {isCurrent && (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              Active
            </Badge>
          )}
        </div>
        {plan.description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {plan.description}
          </p>
        )}
      </div>

      <div className="mb-5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {formatCurrency(displayPrice, plan.currency, locale)}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            /{interval === "year" ? "yr" : "mo"}
          </span>
        </div>
        {monthlyEquivalent && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            ≈ {formatCurrency(monthlyEquivalent, plan.currency, locale)} / month,
            billed annually
          </p>
        )}
        {plan.trial_days > 0 && !isCurrent && (
          <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {plan.trial_days}-day free trial available on signup
          </p>
        )}
      </div>

      <ul className="mb-6 space-y-2.5 text-sm">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span className="text-slate-700 dark:text-slate-300">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        <Button
          className={cn(
            "w-full h-11 rounded-xl font-semibold",
            plan.highlight
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25"
              : "",
          )}
          variant={plan.highlight ? "default" : "outline"}
          disabled={disabled || isCurrent || checkoutPending || !canAct}
          onClick={() => onSelect(plan)}
        >
          {checkoutPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {ctaLabel}
          {!isCurrent && (
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

  const plansQuery = useQuery<SubscriptionPlan[]>({
    queryKey: ["subscription-plans"],
    queryFn: () => api.listSubscriptionPlans(),
    staleTime: 5 * 60 * 1000,
  });

  const subscriptionQuery = useQuery<CurrentSubscription>({
    queryKey: ["current-subscription"],
    queryFn: () => api.getCurrentSubscription(),
    retry: false,
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
  const currentTier: SubscriptionTier = currentSub?.tier ?? "FREE";
  const isEntitled = Boolean(currentSub?.is_paid);
  const hasProviderSub = Boolean(currentSub?.has_provider_subscription);
  const providerReady = Boolean(currentSub?.payment_provider?.configured);

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
      toast.success("Subscription updated. Thank you!");
      void queryClient.invalidateQueries({ queryKey: ["current-subscription"] });
      void queryClient.invalidateQueries({ queryKey: ["billing-entitlements"] });
    } else if (billing === "cancelled") {
      toast.message("Checkout cancelled — no charges were made.");
    }
  }, [queryClient]);

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
        toast.success(r.message || "Plan updated.");
        void queryClient.invalidateQueries({ queryKey: ["current-subscription"] });
        void queryClient.invalidateQueries({ queryKey: ["billing-entitlements"] });
        return;
      }
      if (r.action === "queued") {
        toast.message(
          r.message ||
            "Upgrade request saved. We'll finish billing when your payment wall is ready.",
        );
        void queryClient.invalidateQueries({ queryKey: ["current-subscription"] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not start upgrade. Please try again.");
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
      toast.message(result?.message || "Billing portal is not available yet for your location.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not open the billing portal.");
    },
  });

  const handleSelect = (plan: SubscriptionPlan) => {
    void checkoutMutation.mutate(plan);
  };

  const ctaForPlan = (plan: SubscriptionPlan): string => {
    const priceId = priceIdFor(plan, interval);
    const samePlan =
      currentSub?.plan?.slug === plan.slug &&
      (currentSub.billing_interval === interval || !currentSub.billing_interval);

    if (hasProviderSub && samePlan) return "Current plan";

    const currentOrder = TIER_ORDER[currentTier] ?? 0;
    const targetOrder = TIER_ORDER[plan.tier] ?? 0;
    if (!priceId && !providerReady) return "Request upgrade";
    if (targetOrder > currentOrder) return "Upgrade";
    if (targetOrder < currentOrder && hasProviderSub) return "Switch plan";
    if (isEntitled && !hasProviderSub) return "Subscribe";
    if (plan.contact_sales && !priceId) return "Request upgrade";
    return "Choose plan";
  };

  const loadingPlans = plansQuery.isLoading;
  const loadingSub = subscriptionQuery.isLoading;

  const statusLabel = (() => {
    if (hasProviderSub) {
      return t(`billing.status.${currentSub?.status || "active"}`);
    }
    if (currentSub?.status === "trialing") return t("billing.status.trialing") || "Trial";
    return t("billing.status.pilot");
  })();

  return (
    <div className="space-y-6">
      <Card className="shadow-soft border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
        <CardHeader className="pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t("billing.current_plan")}
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                {t("billing.current_plan_desc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSub ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                  <Sparkles className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {currentSub?.plan?.name || t(`billing.tier.${currentTier.toLowerCase()}`)}
                    </h4>
                    <Badge
                      className={cn(
                        hasProviderSub
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          : "bg-amber-100 text-amber-800 hover:bg-amber-100",
                      )}
                    >
                      {statusLabel}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                    {hasProviderSub && currentSub?.current_period_end ? (
                      <>
                        <CalendarClock className="inline-block w-4 h-4 mr-1 -mt-0.5" />
                        {currentSub.cancel_at_period_end
                          ? t("billing.cancels_on", {
                              date: formatDate(currentSub.current_period_end, locale),
                            })
                          : t("billing.renews_on", {
                              date: formatDate(currentSub.current_period_end, locale),
                            })}
                      </>
                    ) : currentSub?.trial_ends_at ? (
                      <>
                        <CalendarClock className="inline-block w-4 h-4 mr-1 -mt-0.5" />
                        Trial ends {formatDate(currentSub.trial_ends_at, locale)}. Choose a plan
                        below to upgrade.
                      </>
                    ) : (
                      t("billing.pilot_blurb")
                    )}
                  </p>
                  {currentSub?.pending_plan ? (
                    <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                      Upgrade requested: {currentSub.pending_plan.name}
                      {currentSub.pending_billing_interval
                        ? ` (${currentSub.pending_billing_interval}ly)`
                        : ""}
                      . Waiting on payment wall for your country.
                    </p>
                  ) : null}
                  {!providerReady && !hasProviderSub ? (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Payment for your location will use the provider configured for your
                      country. You can still request an upgrade below.
                    </p>
                  ) : null}
                </div>
              </div>
              {hasProviderSub && (
                <Button
                  variant="outline"
                  className="shrink-0"
                  disabled={portalMutation.isPending}
                  onClick={() => portalMutation.mutate()}
                >
                  {portalMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="mr-2 h-4 w-4" />
                  )}
                  {t("billing.manage_billing")}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-soft border-0 bg-white dark:bg-slate-900">
        <CardHeader className="pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t("billing.plans_title")}
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                {t("billing.plans_desc")}
              </CardDescription>
            </div>

            <div className="inline-flex rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800 p-1 self-start">
              {(["month", "year"] as Interval[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setInterval(opt)}
                  className={cn(
                    "relative px-4 py-1.5 text-sm font-medium rounded-full transition-all",
                    interval === opt
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                  )}
                >
                  {opt === "month" ? t("billing.monthly") : t("billing.yearly")}
                  {opt === "year" && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                      -17%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loadingPlans ? (
            <div className="grid gap-6 md:grid-cols-3">
              <PlanCardSkeleton />
              <PlanCardSkeleton />
              <PlanCardSkeleton />
            </div>
          ) : plansQuery.isError ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
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
            <div className="grid gap-6 md:grid-cols-3 pt-4">
              {sortedPlans.map((plan) => {
                const samePlan =
                  currentSub?.plan?.slug === plan.slug &&
                  (currentSub.billing_interval === interval || !currentSub.billing_interval);
                const isCurrent = hasProviderSub && samePlan;
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
                  />
                );
              })}
            </div>
          )}

          <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
            {t("billing.footnote")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
