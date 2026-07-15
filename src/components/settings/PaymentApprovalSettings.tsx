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
import { SettingsSection } from "@/components/settings/SettingsSection";
import { api } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";
import {
  CheckCircle2,
  GitBranch,
  Loader2,
  Plus,
  Receipt,
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

const COMMON_CURRENCIES = ["MAD", "EUR", "USD", "GBP", "AED", "SAR", "CAD", "CHF"] as const;

type PendingApproval = {
  id: string;
  tier_name: string;
  current_step_index: number;
  reminder_count: number;
  requested_by_name?: string | null;
  invoice: {
    id: string;
    vendor_name: string;
    amount: string;
    currency: string;
    invoice_number?: string;
  };
  steps: Array<{
    id: string;
    label: string;
    status: string;
    is_current?: boolean;
  }>;
};

type StaffOption = { id: string; label: string; role: string };

const ACCENT_DOT: Record<string, string> = {
  teal: "bg-teal-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
};

const ACCENT_RING: Record<string, string> = {
  teal: "border-teal-300 dark:border-teal-700 bg-teal-50/80 dark:bg-teal-950/30",
  amber: "border-amber-300 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-950/30",
  rose: "border-rose-300 dark:border-rose-700 bg-rose-50/80 dark:bg-rose-950/30",
  sky: "border-sky-300 dark:border-sky-700 bg-sky-50/80 dark:bg-sky-950/30",
};

const ACCENT_LINE: Record<string, string> = {
  teal: "bg-teal-400/70 dark:bg-teal-600/60",
  amber: "bg-amber-400/70 dark:bg-amber-600/60",
  rose: "bg-rose-400/70 dark:bg-rose-600/60",
  sky: "bg-sky-400/70 dark:bg-sky-600/60",
};

const ROLES = [
  { id: "MANAGER", label: "Manager" },
  { id: "SUPERVISOR", label: "Supervisor" },
  { id: "ADMIN", label: "Admin" },
  { id: "OWNER", label: "Owner" },
];

const ACCENT_CYCLE = ["teal", "amber", "rose", "sky"] as const;

function newTier(currency = "MAD"): Tier[] {
  return [
    {
      id: `${currency.toLowerCase()}_everyday`,
      name: "Everyday spends",
      currency,
      max_amount: "5000",
      accent: "teal",
      steps: [{ role: "MANAGER", user_id: "", label: "Manager" }],
    },
    {
      id: `${currency.toLowerCase()}_significant`,
      name: "Significant bills",
      currency,
      max_amount: "50000",
      accent: "amber",
      steps: [
        { role: "MANAGER", user_id: "", label: "Ops manager" },
        { role: "OWNER", user_id: "", label: "Owner" },
      ],
    },
    {
      id: `${currency.toLowerCase()}_major`,
      name: "Major commitments",
      currency,
      max_amount: null,
      accent: "rose",
      steps: [
        { role: "MANAGER", user_id: "", label: "Ops manager" },
        { role: "OWNER", user_id: "", label: "Owner" },
        { role: "ADMIN", user_id: "", label: "Co-signer" },
      ],
    },
  ];
}

function normalizePolicy(p: Partial<Policy> | null | undefined): Policy {
  const currency = String(p?.currency || "MAD").toUpperCase().slice(0, 8) || "MAD";
  let currencies = Array.isArray(p?.currencies)
    ? p!.currencies!.map((c) => String(c || "").toUpperCase().slice(0, 8)).filter(Boolean)
    : [];
  if (!currencies.length) currencies = [currency];
  if (!currencies.includes(currency)) currencies = [currency, ...currencies];
  const tiersRaw = Array.isArray(p?.tiers) && p!.tiers!.length ? p!.tiers! : newTier(currency);
  const tiers = tiersRaw.map((tier, i) => ({
    ...tier,
    currency: String(tier.currency || currency).toUpperCase().slice(0, 8) || currency,
    steps: Array.isArray(tier.steps) ? tier.steps : [],
    id: tier.id || `tier_${i}`,
  }));
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

export default function PaymentApprovalSettings() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<Policy>(() => normalizePolicy(null));
  const [focusCurrency, setFocusCurrency] = useState("MAD");
  const [customCurrency, setCustomCurrency] = useState("");
  const [pending, setPending] = useState<PendingApproval[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [polRes, pendRes, staffRes] = await Promise.all([
        api.get("/finance/payment-approval/policy/"),
        api.get("/finance/payment-approval/pending/").catch(() => ({ data: { approvals: [] } })),
        api.get("/staff/?page_size=200").catch(() => ({ data: [] })),
      ]);
      const p = polRes.data?.policy;
      if (p) {
        const next = normalizePolicy(p);
        setPolicy(next);
        setFocusCurrency(next.currency || next.currencies[0] || "MAD");
      }
      setPending(Array.isArray(pendRes.data?.approvals) ? pendRes.data.approvals : []);
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

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/finance/payment-approval/policy/", { policy });
      toast.success(t("settings.payguard.saved"));
      await load();
    } catch {
      toast.error(t("settings.payguard.save_error"));
    } finally {
      setSaving(false);
    }
  };

  const act = async (invoiceId: string, action: "approve" | "reject") => {
    try {
      const res = await api.post("/finance/payment-approval/act/", {
        invoice_id: invoiceId,
        action,
      });
      toast.success(res.data?.message_for_user || t("settings.payguard.acted"));
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message_for_user?: string } } })?.response?.data
          ?.message_for_user || t("settings.payguard.act_error");
      toast.error(msg);
    }
  };

  const updateTier = (tierId: string, patch: Partial<Tier>) => {
    setPolicy((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier) => (tier.id === tierId ? { ...tier, ...patch } : tier)),
    }));
  };

  const updateStep = (tierId: string, stepIdx: number, patch: Partial<Step>) => {
    setPolicy((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier) => {
        if (tier.id !== tierId) return tier;
        const steps = [...tier.steps];
        steps[stepIdx] = { ...steps[stepIdx], ...patch };
        return { ...tier, steps };
      }),
    }));
  };

  const activeCurrency = useMemo(() => {
    if (policy.currencies.includes(focusCurrency)) return focusCurrency;
    return policy.currencies[0] || policy.currency || "MAD";
  }, [focusCurrency, policy.currencies, policy.currency]);

  const ladderPreview = useMemo(() => {
    return policy.tiers
      .filter((tier) => (tier.currency || policy.currency) === activeCurrency)
      .sort((a, b) => {
        const am = a.max_amount == null ? Infinity : Number(a.max_amount);
        const bm = b.max_amount == null ? Infinity : Number(b.max_amount);
        return am - bm;
      });
  }, [policy.tiers, policy.currency, activeCurrency]);

  const rangeLabel = (tier: Tier, prevMax: number | null) => {
    const cur = tier.currency || activeCurrency;
    if (tier.max_amount == null || tier.max_amount === "") {
      if (prevMax != null && Number.isFinite(prevMax)) {
        return t("settings.payguard.range_above", {
          amount: formatAmount(prevMax, cur),
        });
      }
      return t("settings.payguard.unlimited");
    }
    const max = Number(tier.max_amount);
    if (prevMax == null || !Number.isFinite(prevMax)) {
      return t("settings.payguard.range_up_to", {
        amount: formatAmount(max, cur),
      });
    }
    return t("settings.payguard.range_between", {
      from: formatAmount(prevMax, cur),
      to: formatAmount(max, cur),
    });
  };

  const addCurrency = (code: string) => {
    const c = code.trim().toUpperCase().slice(0, 8);
    if (!c) return;
    setPolicy((p) => {
      if (p.currencies.includes(c)) return p;
      const hasBands = p.tiers.some((tier) => (tier.currency || p.currency) === c);
      return {
        ...p,
        currencies: [...p.currencies, c],
        currency: p.currency || c,
        tiers: hasBands ? p.tiers : [...p.tiers, ...newTier(c)],
      };
    });
    setFocusCurrency(c);
    setCustomCurrency("");
  };

  const removeCurrency = (code: string) => {
    setPolicy((p) => {
      if (p.currencies.length <= 1) return p;
      const nextCurrencies = p.currencies.filter((c) => c !== code);
      const nextDefault = nextCurrencies.includes(p.currency)
        ? p.currency
        : nextCurrencies[0];
      return {
        ...p,
        currencies: nextCurrencies,
        currency: nextDefault,
        tiers: p.tiers.filter((tier) => (tier.currency || p.currency) !== code),
      };
    });
    setFocusCurrency((prev) => (prev === code ? policy.currencies.find((c) => c !== code) || "MAD" : prev));
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
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">
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
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("settings.payguard.stuck_hours")}</Label>
              <Input
                type="number"
                min={1}
                max={72}
                value={policy.stuck_hours}
                onChange={(e) =>
                  setPolicy((p) => ({ ...p, stuck_hours: Number(e.target.value) || 4 }))
                }
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.payguard.max_reminders")}</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={policy.max_reminders}
                onChange={(e) =>
                  setPolicy((p) => ({ ...p, max_reminders: Number(e.target.value) || 3 }))
                }
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("settings.payguard.currencies")}</Label>
            <div className="flex flex-wrap items-center gap-2">
              {policy.currencies.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setFocusCurrency(code);
                    setPolicy((p) => ({ ...p, currency: code }));
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    activeCurrency === code
                      ? "border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200"
                      : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 dark:border-slate-700 dark:bg-slate-900",
                  )}
                >
                  {code}
                  {policy.currencies.length > 1 && (
                    <span
                      role="button"
                      tabIndex={0}
                      className="ml-0.5 text-slate-400 hover:text-rose-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCurrency(code);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          removeCurrency(code);
                        }
                      }}
                      aria-label={t("settings.payguard.remove_currency", { code })}
                    >
                      ×
                    </span>
                  )}
                </button>
              ))}
              {COMMON_CURRENCIES.filter((c) => !policy.currencies.includes(c)).map((code) => (
                <Button
                  key={code}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full border border-dashed border-slate-300 px-2.5 text-xs text-slate-500"
                  onClick={() => addCurrency(code)}
                >
                  + {code}
                </Button>
              ))}
              <div className="flex items-center gap-1.5">
                <Input
                  value={customCurrency}
                  onChange={(e) => setCustomCurrency(e.target.value.toUpperCase().slice(0, 8))}
                  placeholder={t("settings.payguard.currency_placeholder")}
                  className="h-8 w-20 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customCurrency.trim()) {
                      e.preventDefault();
                      addCurrency(customCurrency);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={!customCurrency.trim()}
                  onClick={() => addCurrency(customCurrency)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Decision tree */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-teal-600" />
                {t("settings.payguard.ladder_title")}
                <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                  {activeCurrency}
                </span>
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setPolicy((p) => ({
                    ...p,
                    tiers: [
                      ...p.tiers,
                      {
                        id: `tier_${Date.now()}`,
                        name: "New band",
                        currency: activeCurrency,
                        max_amount: null,
                        accent: ACCENT_CYCLE[p.tiers.length % ACCENT_CYCLE.length],
                        steps: [{ role: "OWNER", user_id: "", label: "Owner" }],
                      },
                    ],
                  }))
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t("settings.payguard.add_band")}
              </Button>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-[radial-gradient(ellipse_at_top,_rgba(13,148,136,0.08),_transparent_55%),linear-gradient(180deg,#f8fafc_0%,#ffffff_45%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(13,148,136,0.12),_transparent_50%),linear-gradient(180deg,#0f172a_0%,#020617_50%)] px-3 py-6 sm:px-5">
              {/* Root */}
              <div className="flex flex-col items-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/70 bg-white/90 dark:bg-slate-900/90 dark:border-teal-700 px-4 py-2 shadow-sm">
                  <Receipt className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {t("settings.payguard.tree_root")}
                  </span>
                </div>
                <div className="mt-3 h-5 w-px bg-teal-400/70 dark:bg-teal-600/60" />

                {policy.currencies.length > 1 && (
                  <>
                    <div className="flex flex-wrap justify-center gap-2">
                      {policy.currencies.map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => {
                            setFocusCurrency(code);
                            setPolicy((p) => ({ ...p, currency: code }));
                          }}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-xs font-bold shadow-sm transition-colors",
                            activeCurrency === code
                              ? "border-teal-500 bg-teal-600 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 dark:border-slate-700 dark:bg-slate-900",
                          )}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 h-5 w-px bg-teal-400/70 dark:bg-teal-600/60" />
                  </>
                )}
              </div>

              {/* Horizontal rail + branches */}
              <div className="relative">
                {ladderPreview.length > 1 && (
                  <div
                    className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-0 hidden h-px bg-teal-400/60 dark:bg-teal-600/50 md:block"
                    aria-hidden
                  />
                )}

                <div
                  className={cn(
                    "grid gap-6 md:gap-4",
                    ladderPreview.length === 1 && "md:grid-cols-1 max-w-md mx-auto",
                    ladderPreview.length === 2 && "md:grid-cols-2",
                    ladderPreview.length >= 3 && "md:grid-cols-3",
                  )}
                >
                  {ladderPreview.map((tier, idx) => {
                    const accent = tier.accent in ACCENT_DOT ? tier.accent : "teal";
                    const prevMax =
                      idx === 0
                        ? null
                        : ladderPreview[idx - 1].max_amount == null
                          ? null
                          : Number(ladderPreview[idx - 1].max_amount);
                    const range = rangeLabel(tier, prevMax);

                    return (
                      <div key={tier.id} className="relative flex flex-col items-center min-w-0">
                        {/* Drop from horizontal rail */}
                        <div
                          className={cn(
                            "hidden md:block h-4 w-px",
                            ACCENT_LINE[accent] || ACCENT_LINE.teal,
                          )}
                          aria-hidden
                        />
                        {/* Mobile: show branch connector from root */}
                        <div
                          className={cn(
                            "md:hidden h-4 w-px",
                            ACCENT_LINE[accent] || ACCENT_LINE.teal,
                          )}
                          aria-hidden
                        />

                        {/* Amount band node */}
                        <div
                          className={cn(
                            "w-full rounded-xl border px-3 py-3 shadow-sm",
                            ACCENT_RING[accent] || ACCENT_RING.teal,
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={cn(
                                "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                                ACCENT_DOT[accent] || ACCENT_DOT.teal,
                              )}
                            />
                            <div className="min-w-0 flex-1 space-y-2">
                              <Input
                                value={tier.name}
                                onChange={(e) => updateTier(tier.id, { name: e.target.value })}
                                className="h-8 bg-white/80 dark:bg-slate-950/40 text-sm font-semibold"
                                aria-label={t("settings.payguard.band_name")}
                              />
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                                {range}
                              </p>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder={t("settings.payguard.max_placeholder")}
                                  value={tier.max_amount ?? ""}
                                  onChange={(e) =>
                                    updateTier(tier.id, {
                                      max_amount: e.target.value === "" ? null : e.target.value,
                                    })
                                  }
                                  className="h-8 bg-white/80 dark:bg-slate-950/40 text-xs"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 text-slate-500 hover:text-rose-600"
                                  onClick={() =>
                                    setPolicy((p) => ({
                                      ...p,
                                      tiers: p.tiers.filter((x) => x.id !== tier.id),
                                    }))
                                  }
                                  aria-label={t("settings.payguard.remove_band")}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Vertical approval chain */}
                        <div className="mt-0 flex w-full flex-col items-center">
                          {tier.steps.map((step, sIdx) => (
                            <div key={sIdx} className="flex w-full flex-col items-center">
                              <div
                                className={cn(
                                  "h-5 w-px",
                                  ACCENT_LINE[accent] || ACCENT_LINE.teal,
                                )}
                                aria-hidden
                              />
                              <div className="relative w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 shadow-sm">
                                <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 -translate-x-full hidden sm:flex items-center">
                                  <span className="mr-1 text-[10px] font-bold tabular-nums text-slate-400">
                                    {sIdx + 1}
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="sm:hidden text-[10px] font-bold tabular-nums text-slate-400 w-3">
                                      {sIdx + 1}
                                    </span>
                                    <Input
                                      value={step.label}
                                      onChange={(e) =>
                                        updateStep(tier.id, sIdx, { label: e.target.value })
                                      }
                                      placeholder={t("settings.payguard.step_label")}
                                      className="h-7 flex-1 text-xs font-medium"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 shrink-0 text-slate-400 hover:text-rose-600"
                                      onClick={() =>
                                        setPolicy((p) => ({
                                          ...p,
                                          tiers: p.tiers.map((x) =>
                                            x.id === tier.id
                                              ? {
                                                  ...x,
                                                  steps: x.steps.filter((_, i) => i !== sIdx),
                                                }
                                              : x,
                                          ),
                                        }))
                                      }
                                      aria-label={t("settings.payguard.remove_rung")}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-1 gap-1.5">
                                    <Select
                                      value={step.role || "MANAGER"}
                                      onValueChange={(role) =>
                                        updateStep(tier.id, sIdx, { role, user_id: "" })
                                      }
                                    >
                                      <SelectTrigger className="h-7 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ROLES.map((r) => (
                                          <SelectItem key={r.id} value={r.id}>
                                            {r.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Select
                                      value={step.user_id || "__role__"}
                                      onValueChange={(v) =>
                                        updateStep(tier.id, sIdx, {
                                          user_id: v === "__role__" ? "" : v,
                                        })
                                      }
                                    >
                                      <SelectTrigger className="h-7 text-xs">
                                        <SelectValue
                                          placeholder={t("settings.payguard.any_role")}
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__role__">
                                          {t("settings.payguard.any_role")}
                                        </SelectItem>
                                        {staff.map((s) => (
                                          <SelectItem key={s.id} value={s.id}>
                                            {s.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                          <div
                            className={cn(
                              "h-5 w-px",
                              ACCENT_LINE[accent] || ACCENT_LINE.teal,
                            )}
                            aria-hidden
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-slate-600 dark:text-slate-300"
                            onClick={() =>
                              setPolicy((p) => ({
                                ...p,
                                tiers: p.tiers.map((x) =>
                                  x.id === tier.id
                                    ? {
                                        ...x,
                                        steps: [
                                          ...x.steps,
                                          { role: "OWNER", user_id: "", label: "Approver" },
                                        ],
                                      }
                                    : x,
                                ),
                              }))
                            }
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {t("settings.payguard.add_rung")}
                          </Button>
                          <div
                            className={cn(
                              "h-4 w-px",
                              ACCENT_LINE[accent] || ACCENT_LINE.teal,
                            )}
                            aria-hidden
                          />
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t("settings.payguard.tree_pay")}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {ladderPreview.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-8">
                  {t("settings.payguard.tree_empty_currency", { currency: activeCurrency })}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => void load()} disabled={saving}>
              {t("settings.payguard.reset")}
            </Button>
            <Button
              type="button"
              className="premium-button"
              onClick={() => void save()}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t("settings.payguard.save")}
            </Button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={<CheckCircle2 className="h-4 w-4" />}
        iconClassName="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
        title={t("settings.payguard.queue_title")}
      >
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            {t("settings.payguard.queue_empty")}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {pending.map((a) => {
              const current = a.steps.find((s) => s.is_current) || a.steps[a.current_step_index];
              return (
                <li
                  key={a.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {a.invoice.vendor_name}
                      {a.invoice.invoice_number ? ` · #${a.invoice.invoice_number}` : ""}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {Number(a.invoice.amount).toLocaleString()} {a.invoice.currency}
                      {" · "}
                      {a.tier_name}
                      {" · "}
                      {t("settings.payguard.waiting_on", {
                        label: current?.label || t("settings.payguard.approver"),
                      })}
                      {a.requested_by_name
                        ? ` · ${t("settings.payguard.requested_by", { name: a.requested_by_name })}`
                        : ""}
                      {a.reminder_count > 0
                        ? ` · ${t("settings.payguard.reminders_sent", { n: a.reminder_count })}`
                        : ""}
                    </p>
                    {/* Mini path progress */}
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {a.steps.map((s, i) => (
                        <div key={s.id || i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-slate-300 text-[10px]">→</span>}
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                              s.status === "APPROVED" &&
                                "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
                              s.is_current &&
                                "bg-amber-100 text-amber-900 ring-1 ring-amber-300 dark:bg-amber-950 dark:text-amber-100",
                              !s.is_current &&
                                s.status !== "APPROVED" &&
                                "bg-slate-100 text-slate-500 dark:bg-slate-800",
                            )}
                          >
                            {s.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void act(a.invoice.id, "reject")}
                    >
                      {t("settings.payguard.reject")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="premium-button"
                      onClick={() => void act(a.invoice.id, "approve")}
                    >
                      {t("settings.payguard.approve")}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SettingsSection>
    </div>
  );
}
