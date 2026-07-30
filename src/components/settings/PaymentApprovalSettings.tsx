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
import { CheckCircle2, ChevronDown, Loader2, Plus, Shield, Trash2 } from "lucide-react";
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

const COMMON_CURRENCIES = ["MAD", "EUR", "USD", "GBP", "AED", "SAR"] as const;

const ROLES = [
  { id: "MANAGER", labelKey: "settings.payguard.role_manager", fallback: "Manager" },
  { id: "OWNER", labelKey: "settings.payguard.role_owner", fallback: "Owner" },
  { id: "ADMIN", labelKey: "settings.payguard.role_admin", fallback: "Admin" },
  { id: "SUPERVISOR", labelKey: "settings.payguard.role_supervisor", fallback: "Supervisor" },
] as const;

const ACCENT_CYCLE = ["teal", "amber", "rose", "sky"] as const;

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

function normalizePolicy(p: Partial<Policy> | null | undefined): Policy {
  const currency = String(p?.currency || "MAD").toUpperCase().slice(0, 8) || "MAD";
  let currencies = Array.isArray(p?.currencies)
    ? p!.currencies!.map((c) => String(c || "").toUpperCase().slice(0, 8)).filter(Boolean)
    : [];
  if (!currencies.length) currencies = [currency];
  if (!currencies.includes(currency)) currencies = [currency, ...currencies];
  const tiersRaw = Array.isArray(p?.tiers) && p!.tiers!.length ? p!.tiers! : defaultTiers(currency);
  const tiers = tiersRaw.map((tier, i) => {
    const first = Array.isArray(tier.steps) && tier.steps.length ? tier.steps[0] : null;
    return {
      ...tier,
      currency: String(tier.currency || currency).toUpperCase().slice(0, 8) || currency,
      // Simple UI: one approver per amount band.
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

export default function PaymentApprovalSettings() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<Policy>(() => normalizePolicy(null));
  const [pending, setPending] = useState<PendingApproval[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [showMore, setShowMore] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [polRes, pendRes, staffRes] = await Promise.all([
        api.get("/finance/payment-approval/policy/"),
        api.get("/finance/payment-approval/pending/").catch(() => ({ data: { approvals: [] } })),
        api.get("/staff/?page_size=200").catch(() => ({ data: [] })),
      ]);
      const p = polRes.data?.policy;
      if (p) setPolicy(normalizePolicy(p));
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

  const currency = policy.currency || "MAD";

  const rules = useMemo(() => {
    return policy.tiers
      .filter((tier) => (tier.currency || policy.currency) === currency)
      .sort((a, b) => {
        const am = a.max_amount == null || a.max_amount === "" ? Infinity : Number(a.max_amount);
        const bm = b.max_amount == null || b.max_amount === "" ? Infinity : Number(b.max_amount);
        return am - bm;
      });
  }, [policy.tiers, policy.currency, currency]);

  const save = async () => {
    setSaving(true);
    try {
      // Keep one currency in sync; strip extra multi-step history to one approver.
      const cleaned: Policy = {
        ...policy,
        currencies: [currency],
        currency,
        tiers: policy.tiers
          .filter((tier) => (tier.currency || policy.currency) === currency)
          .map((tier) => {
            const step = tier.steps[0] || { role: "MANAGER", user_id: "", label: "Manager" };
            return {
              ...tier,
              currency,
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
            name: t("settings.payguard.rule_new", { defaultValue: "New rule" }),
            currency,
            max_amount: null,
            accent: ACCENT_CYCLE[rules.length % ACCENT_CYCLE.length],
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
      return {
        ...prev,
        currency: c,
        currencies: [c],
        tiers: hasBands
          ? prev.tiers.map((tier) =>
              (tier.currency || prev.currency) === c ? { ...tier, currency: c } : tier,
            )
          : [...prev.tiers.filter((tier) => (tier.currency || prev.currency) !== prev.currency), ...defaultTiers(c)],
      };
    });
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
        <div className="space-y-5">
          {!policy.enabled ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
              {t(
                "settings.payguard.disabled_hint",
                "Turn this on to require approval before an invoice can be paid.",
              )}
            </p>
          ) : (
            <>
              <div className="max-w-xs space-y-1.5">
                <Label>{t("settings.payguard.currency")}</Label>
                <Select value={currency} onValueChange={changeCurrency}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(
                      new Set([...COMMON_CURRENCIES, currency, ...policy.currencies]),
                    ).map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {t("settings.payguard.rules_title", "Who must approve?")}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t(
                      "settings.payguard.rules_hint",
                      "Pick an amount limit and who says yes. Bigger bills use the next rule.",
                    )}
                  </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="hidden grid-cols-[1fr_1fr_auto] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 sm:grid">
                    <span>{t("settings.payguard.col_amount", "If the bill is…")}</span>
                    <span>{t("settings.payguard.col_who", "Then ask…")}</span>
                    <span className="w-9" />
                  </div>

                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rules.map((tier, idx) => {
                      const step = tier.steps[0] || {
                        role: "MANAGER",
                        user_id: "",
                        label: "Manager",
                      };
                      const isLast = idx === rules.length - 1;
                      const prevMax =
                        idx === 0
                          ? null
                          : rules[idx - 1].max_amount == null || rules[idx - 1].max_amount === ""
                            ? null
                            : Number(rules[idx - 1].max_amount);

                      return (
                        <li
                          key={tier.id}
                          className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center"
                        >
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-slate-500 sm:hidden">
                              {t("settings.payguard.col_amount", "If the bill is…")}
                            </p>
                            {isLast ? (
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                {prevMax != null && Number.isFinite(prevMax)
                                  ? t("settings.payguard.range_above", {
                                      amount: formatAmount(prevMax, currency),
                                    })
                                  : t("settings.payguard.any_amount", {
                                      defaultValue: "Any amount",
                                    })}
                              </p>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="shrink-0 text-sm text-slate-600 dark:text-slate-300">
                                  {t("settings.payguard.up_to", { defaultValue: "Up to" })}
                                </span>
                                <Input
                                  type="number"
                                  min={0}
                                  value={tier.max_amount ?? ""}
                                  onChange={(e) => setRuleMax(tier.id, e.target.value)}
                                  className="h-10 max-w-[140px]"
                                  aria-label={t("settings.payguard.band_name")}
                                />
                                <span className="shrink-0 text-sm font-medium text-slate-500">
                                  {currency}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-slate-500 sm:hidden">
                              {t("settings.payguard.col_who", "Then ask…")}
                            </p>
                            <Select
                              value={whoValue(step)}
                              onValueChange={(v) => setRuleApprover(tier.id, v)}
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map((r) => (
                                  <SelectItem key={r.id} value={`role:${r.id}`}>
                                    {t("settings.payguard.any_with_role", {
                                      defaultValue: `Any ${r.fallback}`,
                                      role: t(r.labelKey, { defaultValue: r.fallback }),
                                    })}
                                  </SelectItem>
                                ))}
                                {staff.map((s) => (
                                  <SelectItem key={s.id} value={`user:${s.id}`}>
                                    {s.label} ({roleLabel(s.role, t)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-slate-400 hover:text-rose-600"
                              disabled={rules.length <= 1}
                              onClick={() => removeRule(tier.id)}
                              aria-label={t("settings.payguard.remove_band")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <Button type="button" variant="outline" size="sm" onClick={addRule}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {t("settings.payguard.add_band")}
                </Button>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200"
                  onClick={() => setShowMore((v) => !v)}
                >
                  {t("settings.payguard.more_options", "Reminder options")}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-slate-400 transition-transform",
                      showMore && "rotate-180",
                    )}
                  />
                </button>
                {showMore ? (
                  <div className="grid gap-3 border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-800 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>{t("settings.payguard.stuck_hours")}</Label>
                      <Input
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
                        className="h-10"
                      />
                      <p className="text-[11px] text-slate-400">
                        {t(
                          "settings.payguard.stuck_hours_hint",
                          "Miya nudges the approver on WhatsApp if they wait too long.",
                        )}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("settings.payguard.max_reminders")}</Label>
                      <Input
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
                        className="h-10"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}

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
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("settings.payguard.save")}
            </Button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={<CheckCircle2 className="h-4 w-4" />}
        iconClassName="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
        title={t("settings.payguard.queue_title")}
        description={t("settings.payguard.queue_desc")}
      >
        {pending.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {t("settings.payguard.queue_empty")}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {pending.map((a) => {
              const current = a.steps.find((s) => s.is_current) || a.steps[a.current_step_index];
              return (
                <li
                  key={a.id}
                  className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {a.invoice.vendor_name}
                      {a.invoice.invoice_number ? ` · #${a.invoice.invoice_number}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {Number(a.invoice.amount).toLocaleString()} {a.invoice.currency}
                      {" · "}
                      {t("settings.payguard.waiting_on", {
                        label: current?.label || t("settings.payguard.approver"),
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
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
