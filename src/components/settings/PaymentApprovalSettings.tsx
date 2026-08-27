import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SettingsSection,
  SettingsStickyActions,
} from "@/components/settings/SettingsSection";
import { api } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";
import {
  ArrowDown,
  Bell,
  Loader2,
  MessageCircle,
  Plus,
  Shield,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Step = { role: string; user_id: string; label: string };
type Tier = {
  id: string;
  name: string;
  currency: string;
  max_amount: string | null;
  accent: string;
  steps: Step[];
};
type Policy = {
  enabled: boolean;
  currency: string;
  currencies: string[];
  stuck_hours: number;
  max_reminders: number;
  tiers: Tier[];
};

type StaffOption = { id: string; label: string; role: string };

const COMMON_CURRENCIES = ["MAD", "EUR", "USD", "GBP", "AED", "SAR"] as const;

const ROLES = [
  { id: "MANAGER", labelKey: "settings.payguard.role_manager", fallback: "Manager" },
  { id: "OWNER", labelKey: "settings.payguard.role_owner", fallback: "Owner" },
  { id: "ADMIN", labelKey: "settings.payguard.role_admin", fallback: "Admin" },
  { id: "SUPERVISOR", labelKey: "settings.payguard.role_supervisor", fallback: "Supervisor" },
] as const;

const TIER_ACCENTS = [
  {
    ring: "border-teal-200 dark:border-teal-800",
    badge: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200",
  },
  {
    ring: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
  },
  {
    ring: "border-rose-200 dark:border-rose-800",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200",
  },
  {
    ring: "border-sky-200 dark:border-sky-800",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
  },
] as const;

function roleLabel(
  roleId: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const found = ROLES.find((r) => r.id === roleId);
  if (found) return t(found.labelKey, { defaultValue: found.fallback });
  return roleId;
}

function defaultTiers(currency = "MAD"): Tier[] {
  return [
    {
      id: `${currency.toLowerCase()}_small`,
      name: "Small bills",
      currency,
      max_amount: "5000",
      accent: "teal",
      steps: [{ role: "MANAGER", user_id: "", label: "Manager" }],
    },
    {
      id: `${currency.toLowerCase()}_medium`,
      name: "Medium bills",
      currency,
      max_amount: "50000",
      accent: "amber",
      steps: [{ role: "OWNER", user_id: "", label: "Owner" }],
    },
    {
      id: `${currency.toLowerCase()}_large`,
      name: "Large bills",
      currency,
      max_amount: null,
      accent: "rose",
      steps: [{ role: "OWNER", user_id: "", label: "Owner" }],
    },
  ];
}

function tiersForCurrency(tiers: Tier[], currency: string): Tier[] {
  return tiers
    .filter((tier) => (tier.currency || currency).toUpperCase() === currency.toUpperCase())
    .sort((a, b) => {
      const am = a.max_amount == null || a.max_amount === "" ? Infinity : Number(a.max_amount);
      const bm = b.max_amount == null || b.max_amount === "" ? Infinity : Number(b.max_amount);
      return am - bm;
    });
}

/** Single open-ended tier is confusing - use the recommended ladder instead. */
function needsDefaultLadder(currencyTiers: Tier[]): boolean {
  if (currencyTiers.length === 0) return true;
  if (currencyTiers.length === 1) {
    const only = currencyTiers[0];
    return only.max_amount == null || only.max_amount === "";
  }
  const withLimits = currencyTiers.filter(
    (t) => t.max_amount != null && t.max_amount !== "" && Number.isFinite(Number(t.max_amount)),
  );
  return withLimits.length === 0;
}

function normalizePolicy(p: Partial<Policy> | null | undefined): Policy {
  const currency = String(p?.currency || "MAD").toUpperCase().slice(0, 8) || "MAD";
  let currencies = Array.isArray(p?.currencies)
    ? p!.currencies!.map((c) => String(c || "").toUpperCase().slice(0, 8)).filter(Boolean)
    : [];
  if (!currencies.length) currencies = [currency];
  if (!currencies.includes(currency)) currencies = [currency, ...currencies];

  let tiersRaw = Array.isArray(p?.tiers) && p!.tiers!.length ? p!.tiers! : defaultTiers(currency);
  const currencyTiers = tiersForCurrency(
    tiersRaw.map((tier, i) => ({
      ...tier,
      currency: String(tier.currency || currency).toUpperCase().slice(0, 8) || currency,
      id: tier.id || `tier_${i}`,
    })),
    currency,
  );

  if (needsDefaultLadder(currencyTiers)) {
    tiersRaw = [
      ...tiersRaw.filter((t) => String(t.currency || currency).toUpperCase() !== currency),
      ...defaultTiers(currency),
    ];
  }

  const tiers = tiersRaw.map((tier, i) => {
    const first = Array.isArray(tier.steps) && tier.steps.length ? tier.steps[0] : null;
    return {
      ...tier,
      currency: String(tier.currency || currency).toUpperCase().slice(0, 8) || currency,
      steps: [
        {
          role: (first?.role || "MANAGER").toUpperCase(),
          user_id: first?.user_id || "",
          label: first?.label || first?.role || "Manager",
        },
      ],
      id: tier.id || `tier_${i}`,
    };
  });

  for (const tier of tiers) {
    if (tier.currency && !currencies.includes(tier.currency)) {
      currencies.push(tier.currency);
    }
  }

  return {
    enabled: !!p?.enabled,
    currency,
    currencies,
    stuck_hours: Number(p?.stuck_hours) || 4,
    max_reminders: Number(p?.max_reminders) || 3,
    tiers,
  };
}

function formatAmount(value: string | number, currency: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `${n.toLocaleString()} ${currency}`;
}

function whoValue(step: Step): string {
  if (step.user_id) return `user:${step.user_id}`;
  return `role:${(step.role || "MANAGER").toUpperCase()}`;
}

function approverLabel(
  step: Step,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (step.user_id) return step.label || roleLabel(step.role, t);
  return t("settings.payguard.any_with_role", {
    defaultValue: `Any ${step.role}`,
    role: roleLabel(step.role || "MANAGER", t),
  });
}

function pickTierForAmount(rules: Tier[], amount: number): Tier | null {
  for (const tier of rules) {
    const max =
      tier.max_amount == null || tier.max_amount === ""
        ? Infinity
        : Number(tier.max_amount);
    if (Number.isFinite(max) && amount <= max) return tier;
    if (!Number.isFinite(max)) return tier;
  }
  return rules[rules.length - 1] ?? null;
}

export default function PaymentApprovalSettings() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<Policy>(() => normalizePolicy(null));
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [previewAmount, setPreviewAmount] = useState("12000");
  const [newCurrencyCode, setNewCurrencyCode] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [polRes, staffRes] = await Promise.all([
        api.get("/finance/payment-approval/policy/"),
        api.get("/staff/?page_size=200").catch(() => ({ data: [] })),
      ]);
      const p = polRes.data?.policy;
      if (p) setPolicy(normalizePolicy(p));
      const list = Array.isArray(staffRes.data)
        ? staffRes.data
        : staffRes.data?.results || [];
      setStaff(
        list
          .filter((u: { role?: string }) =>
            ["MANAGER", "ADMIN", "OWNER", "SUPER_ADMIN", "SUPERVISOR"].includes(
              (u.role || "").toUpperCase(),
            ),
          )
          .map((u: { id: string; first_name?: string; last_name?: string; email?: string; role?: string }) => ({
            id: u.id,
            role: (u.role || "").toUpperCase(),
            label:
              `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
              u.email ||
              u.id.slice(0, 8),
          })),
      );
    } catch {
      toast.error(t("settings.payguard.load_error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const currency = policy.currency || "MAD";

  const rules = useMemo(
    () => tiersForCurrency(policy.tiers, currency),
    [policy.tiers, currency],
  );

  const previewTier = useMemo(() => {
    const amt = Number(previewAmount);
    if (!Number.isFinite(amt) || amt <= 0) return null;
    return pickTierForAmount(rules, amt);
  }, [previewAmount, rules]);

  const save = async () => {
    setSaving(true);
    try {
      const cleaned: Policy = {
        ...policy,
        currencies: [...policy.currencies],
        currency: policy.currency,
        tiers: policy.tiers.map((tier) => {
          const step = tier.steps[0] || { role: "MANAGER", user_id: "", label: "Manager" };
          const tierCurrency = String(tier.currency || policy.currency).toUpperCase();
          return {
            ...tier,
            currency: tierCurrency,
            steps: [
              {
                role: (step.role || "MANAGER").toUpperCase(),
                user_id: step.user_id || "",
                label: step.label || roleLabel(step.role || "MANAGER", t),
              },
            ],
          };
        }),
      };
      await api.put("/finance/payment-approval/policy/", { policy: cleaned });
      toast.success(t("settings.payguard.saved"));
      await load();
    } catch {
      toast.error(t("settings.payguard.save_error"));
    } finally {
      setSaving(false);
    }
  };

  const setRuleApprover = (tierId: string, value: string) => {
    setPolicy((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier) => {
        if (tier.id !== tierId) return tier;
        if (value.startsWith("user:")) {
          const userId = value.slice(5);
          const person = staff.find((s) => s.id === userId);
          const role = person?.role || tier.steps[0]?.role || "MANAGER";
          return {
            ...tier,
            steps: [
              {
                role,
                user_id: userId,
                label: person?.label || roleLabel(role, t),
              },
            ],
          };
        }
        const role = value.replace(/^role:/, "").toUpperCase() || "MANAGER";
        return {
          ...tier,
          steps: [{ role, user_id: "", label: roleLabel(role, t) }],
        };
      }),
    }));
  };

  const setRuleMax = (tierId: string, raw: string) => {
    setPolicy((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier) =>
        tier.id === tierId
          ? { ...tier, max_amount: raw.trim() === "" ? null : raw }
          : tier,
      ),
    }));
  };

  const addRule = () => {
    setPolicy((prev) => {
      const finite = rules
        .map((r) => (r.max_amount == null || r.max_amount === "" ? null : Number(r.max_amount)))
        .filter((n): n is number => n != null && Number.isFinite(n));
      const nextMax = finite.length ? String(Math.max(...finite) * 2) : "10000";
      return {
        ...prev,
        tiers: [
          ...prev.tiers.filter((tier) => (tier.currency || prev.currency) !== currency),
          ...rules.map((r) =>
            r.max_amount == null || r.max_amount === ""
              ? { ...r, max_amount: nextMax }
              : r,
          ),
          {
            id: `tier_${Date.now()}`,
            name: t("settings.payguard.rule_new", { defaultValue: "New level" }),
            currency,
            max_amount: null,
            accent: "sky",
            steps: [{ role: "OWNER", user_id: "", label: roleLabel("OWNER", t) }],
          },
        ],
      };
    });
  };

  const removeRule = (tierId: string) => {
    if (rules.length <= 1) return;
    setPolicy((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((tier) => tier.id !== tierId),
    }));
  };

  const changeCurrency = (code: string) => {
    const c = code.toUpperCase().slice(0, 8);
    setPolicy((prev) => {
      const hasBands = prev.tiers.some((tier) => (tier.currency || prev.currency) === c);
      const currencies = prev.currencies.includes(c)
        ? prev.currencies
        : [...prev.currencies, c];
      return {
        ...prev,
        currency: c,
        currencies,
        tiers: hasBands ? prev.tiers : [...prev.tiers, ...defaultTiers(c)],
      };
    });
  };

  const addCurrency = () => {
    const c = newCurrencyCode.trim().toUpperCase().slice(0, 8);
    if (!c || c.length < 3) return;
    setNewCurrencyCode("");
    changeCurrency(c);
  };

  const removeCurrency = (code: string) => {
    const c = code.toUpperCase().slice(0, 8);
    setPolicy((prev) => {
      if (prev.currencies.length <= 1) return prev;
      const currencies = prev.currencies.filter((x) => x !== c);
      const nextActive = prev.currency === c ? currencies[0] : prev.currency;
      return {
        ...prev,
        currency: nextActive,
        currencies,
        tiers: prev.tiers.filter((tier) => (tier.currency || prev.currency) !== c),
      };
    });
  };

  const resetToRecommended = () => {
    setPolicy((prev) => ({
      ...prev,
      tiers: [
        ...prev.tiers.filter((tier) => (tier.currency || prev.currency) !== currency),
        ...defaultTiers(currency),
      ],
    }));
    toast.message(t("settings.payguard.recommended_applied"));
  };

  const tierRangeText = (tier: Tier, idx: number) => {
    const isLast = idx === rules.length - 1;
    const prevMax =
      idx === 0
        ? null
        : rules[idx - 1].max_amount == null || rules[idx - 1].max_amount === ""
          ? null
          : Number(rules[idx - 1].max_amount);

    if (isLast) {
      if (prevMax != null && Number.isFinite(prevMax)) {
        return t("settings.payguard.range_above", {
          amount: formatAmount(prevMax, currency),
        });
      }
      return t("settings.payguard.any_amount", { defaultValue: "Any amount" });
    }

    const max = tier.max_amount == null || tier.max_amount === "" ? null : Number(tier.max_amount);
    if (prevMax != null && Number.isFinite(prevMax) && max != null && Number.isFinite(max)) {
      return t("settings.payguard.range_between", {
        from: formatAmount(prevMax + 1, currency),
        to: formatAmount(max, currency),
      });
    }
    if (max != null && Number.isFinite(max)) {
      return t("settings.payguard.range_up_to", { amount: formatAmount(max, currency) });
    }
    return t("settings.payguard.any_amount", { defaultValue: "Any amount" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("settings.payguard.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SettingsSection
        icon={<Shield className="h-4 w-4" />}
        iconClassName="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
        title={t("settings.payguard.title")}
        description={t("settings.payguard.description")}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">
              {policy.enabled ? t("settings.payguard.on") : t("settings.payguard.off")}
            </span>
            <Switch
              checked={policy.enabled}
              onCheckedChange={(enabled) => setPolicy((p) => ({ ...p, enabled }))}
              aria-label={t("settings.payguard.enable")}
            />
          </div>
        }
      >
        <div className="space-y-6">
          {!policy.enabled ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-6 dark:border-slate-700 dark:bg-slate-900/40">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {t("settings.payguard.disabled_hint")}
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    1
                  </span>
                  {t("settings.payguard.step_submit")}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    2
                  </span>
                  {t("settings.payguard.step_notify")}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    3
                  </span>
                  {t("settings.payguard.step_pay")}
                </li>
              </ul>
            </div>
          ) : (
            <>
              {/* How it works */}
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { n: 1, text: t("settings.payguard.step_submit") },
                  { n: 2, text: t("settings.payguard.step_notify"), icon: MessageCircle },
                  { n: 3, text: t("settings.payguard.step_pay") },
                ].map(({ n, text, icon: Icon }) => (
                  <div
                    key={n}
                    className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/40"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                      {n}
                    </span>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {Icon ? (
                        <span className="inline-flex items-center gap-1">
                          <Icon className="h-3 w-3 text-emerald-600" />
                          {text}
                        </span>
                      ) : (
                        text
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div>
                  <Label>{t("settings.payguard.currencies")}</Label>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("settings.payguard.currencies_hint")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {policy.currencies.map((code) => {
                    const active = code === currency;
                    return (
                      <div key={code} className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => changeCurrency(code)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                            active
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-200 bg-card text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:text-slate-200",
                          )}
                        >
                          {code}
                        </button>
                        {policy.currencies.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeCurrency(code)}
                            className="rounded-full p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                            aria-label={t("settings.payguard.remove_currency", { code })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-full max-w-[120px] space-y-1">
                    <Label htmlFor="payguard-new-currency" className="text-xs text-slate-500">
                      {t("settings.payguard.currency_placeholder")}
                    </Label>
                    <Input
                      id="payguard-new-currency"
                      value={newCurrencyCode}
                      onChange={(e) => setNewCurrencyCode(e.target.value.toUpperCase())}
                      placeholder="MAD"
                      maxLength={8}
                      className="h-10 uppercase"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCurrency();
                        }
                      }}
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-10" onClick={addCurrency}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {t("settings.payguard.add_currency")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-10" onClick={resetToRecommended}>
                    {t("settings.payguard.use_recommended")}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {COMMON_CURRENCIES.filter((code) => !policy.currencies.includes(code)).map(
                    (code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => changeCurrency(code)}
                        className="rounded-md border border-dashed border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:hover:border-emerald-800"
                      >
                        + {code}
                      </button>
                    ),
                  )}
                </div>

                <p className="text-xs text-slate-500">
                  {t("settings.payguard.currency_branch_hint", { currency })}
                </p>
              </div>

              {/* Approval ladder */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {t("settings.payguard.ladder_title")}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">{t("settings.payguard.ladder_hint")}</p>
                </div>

                <div className="space-y-0">
                  {rules.map((tier, idx) => {
                    const step = tier.steps[0] || {
                      role: "MANAGER",
                      user_id: "",
                      label: "Manager",
                    };
                    const isLast = idx === rules.length - 1;
                    const accent = TIER_ACCENTS[idx % TIER_ACCENTS.length];

                    return (
                      <div key={tier.id}>
                        <div
                          className={cn(
                            "rounded-xl border bg-surface-sunken p-4 shadow-sm",
                            accent.ring,
                          )}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                    accent.badge,
                                  )}
                                >
                                  {t("settings.payguard.level_label", { n: idx + 1 })}
                                </span>
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                  {tierRangeText(tier, idx)}
                                </span>
                              </div>

                              {!isLast ? (
                                <div className="flex items-center gap-2">
                                  <Label className="sr-only">{t("settings.payguard.band_name")}</Label>
                                  <span className="shrink-0 text-xs text-slate-500">
                                    {t("settings.payguard.up_to")}
                                  </span>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={tier.max_amount ?? ""}
                                    onChange={(e) => setRuleMax(tier.id, e.target.value)}
                                    className="h-9 max-w-[120px]"
                                  />
                                  <span className="text-xs font-medium text-slate-500">{currency}</span>
                                </div>
                              ) : null}
                            </div>

                            <div className="flex w-full items-center gap-2 sm:w-auto sm:min-w-[220px]">
                              <Select
                                value={whoValue(step)}
                                onValueChange={(v) => setRuleApprover(tier.id, v)}
                              >
                                <SelectTrigger className="h-10 flex-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLES.map((r) => (
                                    <SelectItem key={r.id} value={`role:${r.id}`}>
                                      {t("settings.payguard.any_with_role", {
                                        role: t(r.labelKey, { defaultValue: r.fallback }),
                                      })}
                                    </SelectItem>
                                  ))}
                                  {staff.map((s) => (
                                    <SelectItem key={s.id} value={`user:${s.id}`}>
                                      {s.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 shrink-0 text-slate-400 hover:text-rose-600"
                                disabled={rules.length <= 1}
                                onClick={() => removeRule(tier.id)}
                                aria-label={t("settings.payguard.remove_band")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {!isLast ? (
                          <div className="flex justify-center py-1">
                            <ArrowDown className="h-4 w-4 text-slate-300 dark:text-slate-600" aria-hidden />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <Button type="button" variant="outline" size="sm" onClick={addRule}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {t("settings.payguard.add_band")}
                </Button>
              </div>

              {/* Live preview */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                  {t("settings.payguard.preview_title")}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={previewAmount}
                    onChange={(e) => setPreviewAmount(e.target.value)}
                    className="h-9 w-[120px] bg-background"
                    aria-label={t("settings.payguard.preview_amount")}
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-300">{currency}</span>
                  <span className="text-sm text-slate-400">→</span>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {previewTier
                      ? t("settings.payguard.preview_result", {
                          approver: approverLabel(previewTier.steps[0], t),
                        })
                      : t("settings.payguard.preview_invalid")}
                  </span>
                </div>
              </div>

              {/* Reminders - always visible, compact */}
              <div className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <Bell className="h-4 w-4 text-slate-400" />
                  {t("settings.payguard.reminders_title")}
                </div>
                <p className="mt-1 text-xs text-slate-500">{t("settings.payguard.stuck_hours_hint")}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="stuck-hours" className="text-xs text-slate-500 whitespace-nowrap">
                      {t("settings.payguard.stuck_hours")}
                    </Label>
                    <Input
                      id="stuck-hours"
                      type="number"
                      min={1}
                      max={72}
                      value={policy.stuck_hours}
                      onChange={(e) =>
                        setPolicy((p) => ({
                          ...p,
                          stuck_hours: Number(e.target.value) || 4,
                        }))
                      }
                      className="h-9 w-16"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="max-reminders" className="text-xs text-slate-500 whitespace-nowrap">
                      {t("settings.payguard.max_reminders")}
                    </Label>
                    <Input
                      id="max-reminders"
                      type="number"
                      min={1}
                      max={10}
                      value={policy.max_reminders}
                      onChange={(e) =>
                        setPolicy((p) => ({
                          ...p,
                          max_reminders: Number(e.target.value) || 3,
                        }))
                      }
                      className="h-9 w-16"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <SettingsStickyActions hint={t("settings.payguard.save_hint")}>
            <Button type="button" variant="outline" onClick={() => void load()} disabled={saving}>
              {t("settings.payguard.reset")}
            </Button>
            <Button
              type="button"
              className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5"
              onClick={() => void save()}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("settings.payguard.save")}
            </Button>
          </SettingsStickyActions>
        </div>
      </SettingsSection>
    </div>
  );
}
