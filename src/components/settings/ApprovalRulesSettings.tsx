import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ApprovalKind, ApprovalRule, ApprovalRulesResponse, ApprovalStepSpec } from "@/lib/types";

const ROLES = ["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "SUPERVISOR"];
const MAX_STEPS = 3;

function encode(step: ApprovalStepSpec): string {
  if (step.kind === "role") return `role:${step.role}`;
  if (step.kind === "user") return `user:${step.user_id}`;
  return step.kind;
}

function decode(value: string): ApprovalStepSpec {
  if (value.startsWith("role:")) return { kind: "role", role: value.slice(5) };
  if (value.startsWith("user:")) return { kind: "user", user_id: value.slice(5) };
  return { kind: value === "manager" ? "manager" : "owner" };
}

type Staff = ApprovalRulesResponse["staff"];

function stepLabel(step: ApprovalStepSpec, staff: Staff, t: (k: string) => string) {
  if (step.kind === "owner") return t("approval_rules.step.owner");
  if (step.kind === "manager") return t("approval_rules.step.manager");
  if (step.kind === "role") return t(`approval_rules.role.${step.role}`);
  return staff.find((s) => s.id === step.user_id)?.name || "—";
}

function StepPicker({ value, onChange, staff, disabled }: { value: ApprovalStepSpec; onChange: (s: ApprovalStepSpec) => void; staff: Staff; disabled?: boolean }) {
  const { t } = useLanguage();
  return (
    <select
      className="h-9 min-w-[180px] rounded-md border border-input bg-background px-2 text-sm"
      value={encode(value)}
      disabled={disabled}
      onChange={(e) => onChange(decode(e.target.value))}
      aria-label={t("approval_rules.who")}
    >
      <option value="owner">{t("approval_rules.step.owner")}</option>
      <option value="manager">{t("approval_rules.step.manager")}</option>
      <optgroup label={t("approval_rules.by_role")}>
        {ROLES.map((r) => <option key={r} value={`role:${r}`}>{t(`approval_rules.role.${r}`)}</option>)}
      </optgroup>
      <optgroup label={t("approval_rules.by_person")}>
        {staff.map((s) => <option key={s.id} value={`user:${s.id}`}>{s.name}</option>)}
      </optgroup>
    </select>
  );
}

function Chain({ steps, onChange, staff, disabled }: { steps: ApprovalStepSpec[]; onChange: (s: ApprovalStepSpec[]) => void; staff: Staff; disabled?: boolean }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 ? <span className="px-1 text-xs text-muted-foreground">{t("approval_rules.then")}</span> : null}
          <StepPicker value={step} staff={staff} disabled={disabled} onChange={(s) => onChange(steps.map((x, j) => (j === i ? s : x)))} />
          {steps.length > 1 && !disabled ? (
            <Button type="button" size="icon" variant="ghost" aria-label={t("approval_rules.remove_step")} onClick={() => onChange(steps.filter((_, j) => j !== i))}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </span>
      ))}
      {steps.length < MAX_STEPS && !disabled ? (
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange([...steps, { kind: "role", role: "OWNER" }])}>
          <Plus className="me-1 h-3.5 w-3.5" />
          {t("approval_rules.add_step")}
        </Button>
      ) : null}
    </div>
  );
}

function summary(rule: ApprovalRule, staff: Staff, money: boolean, currency: string, t: (k: string, o?: Record<string, string | number>) => string) {
  if (!rule.enabled) return t("approval_rules.no_approval");
  const parts = rule.tiers.map((tier, i) => {
    const chain = tier.steps.map((s) => stepLabel(s, staff, t)).join(" → ");
    if (!money || rule.tiers.length === 1) return chain;
    const prev = i > 0 ? rule.tiers[i - 1].max_amount : null;
    return tier.max_amount
      ? `${t("approval_rules.up_to", { amount: `${tier.max_amount} ${currency}` })}: ${chain}`
      : `${t("approval_rules.above", { amount: `${prev ?? 0} ${currency}` })}: ${chain}`;
  });
  const auto = money && rule.auto_approve_below ? ` · ${t("approval_rules.auto_below", { amount: `${rule.auto_approve_below} ${currency}` })}` : "";
  return `${parts.join(" · ")}${auto} · ${t("approval_rules.remind_after", { count: rule.sla_hours })}`;
}

function RuleRow({
  ty,
  rule,
  expanded,
  canEdit,
  staff,
  currency,
  french,
  onToggle,
  onPatch,
  onSteps,
}: {
  ty: ApprovalRulesResponse["types"][number];
  rule: ApprovalRule;
  expanded: boolean;
  canEdit: boolean;
  staff: Staff;
  currency: string;
  french: boolean;
  onToggle: (key: string) => void;
  onPatch: (kind: string, patch: Partial<ApprovalRule>) => void;
  onSteps: (kind: string, index: number, steps: ApprovalStepSpec[]) => void;
}) {
  const { t } = useLanguage();
  const name = french ? ty.labelFr : ty.label;
  return (
    <li>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <Switch
          checked={rule.enabled}
          disabled={!canEdit}
          onCheckedChange={(v) => onPatch(ty.key, { enabled: v })}
          aria-label={t("approval_rules.needs_approval", { name })}
        />
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-start"
          onClick={() => onToggle(ty.key)}
          aria-expanded={expanded}
        >
          <span className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{summary(rule, staff, ty.money, currency, t)}</p>
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} aria-hidden />
        </button>
      </div>
      {expanded && rule.enabled ? (
        <div className="space-y-4 border-t border-border/60 bg-muted/20 px-4 py-4">
          {rule.tiers.map((tier, i) => (
            <div key={i} className="space-y-2">
              {ty.money ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{i === 0 ? t("approval_rules.amount_up_to") : t("approval_rules.then_up_to")}</span>
                  <Input
                    className="h-8 w-28"
                    inputMode="decimal"
                    disabled={!canEdit}
                    placeholder={t("approval_rules.any_amount")}
                    value={tier.max_amount ?? ""}
                    onChange={(e) =>
                      onPatch(ty.key, { tiers: rule.tiers.map((x, j) => (j === i ? { ...x, max_amount: e.target.value || null } : x)) })
                    }
                    aria-label={t("approval_rules.amount_up_to")}
                  />
                  <span>{currency}</span>
                  {rule.tiers.length > 1 && canEdit ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => onPatch(ty.key, { tiers: rule.tiers.filter((_, j) => j !== i) })}>
                      {t("approval_rules.remove_tier")}
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <Chain
                steps={tier.steps}
                staff={staff}
                disabled={!canEdit}
                onChange={(steps) => onSteps(ty.key, i, steps)}
              />
            </div>
          ))}
          {ty.money && rule.tiers.length < 5 && canEdit ? (
            <Button type="button" size="sm" variant="outline" onClick={() => onPatch(ty.key, {
              tiers: [...rule.tiers.map((x, j) => (j === rule.tiers.length - 1 && !x.max_amount ? { ...x, max_amount: "5000" } : x)),
                      { max_amount: null, steps: [{ kind: "role", role: "OWNER" }] }],
            })}>
              <Plus className="me-1 h-3.5 w-3.5" />
              {t("approval_rules.add_tier")}
            </Button>
          ) : null}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {ty.money ? (
              <label className="inline-flex items-center gap-2">
                {t("approval_rules.auto_label")}
                <Input className="h-8 w-24" inputMode="decimal" disabled={!canEdit} value={rule.auto_approve_below ?? ""}
                       onChange={(e) => onPatch(ty.key, { auto_approve_below: e.target.value || null })} />
                {currency}
              </label>
            ) : null}
            <label className="inline-flex items-center gap-2">
              {t("approval_rules.sla_label")}
              <Input className="h-8 w-16" type="number" min={1} max={168} disabled={!canEdit} value={rule.sla_hours}
                     onChange={(e) => onPatch(ty.key, { sla_hours: Number(e.target.value) || 1 })} />
              h
            </label>
            <label className="inline-flex items-center gap-2">
              {t("approval_rules.reminders_label")}
              <Input className="h-8 w-16" type="number" min={0} max={5} disabled={!canEdit} value={rule.max_reminders}
                     onChange={(e) => onPatch(ty.key, { max_reminders: Math.max(0, Number(e.target.value) || 0) })} />
            </label>
            <label className="inline-flex items-center gap-2" title={t("approval_rules.sign_hint")}>
              <Switch checked={!!rule.sign_on_approve} disabled={!canEdit}
                      onCheckedChange={(v) => onPatch(ty.key, { sign_on_approve: v })} />
              {t("approval_rules.sign_label")}
            </label>
          </div>
          {ty.ownerCategory ? <p className="text-[11px] text-muted-foreground">{t("approval_rules.owner_hint")}</p> : null}
        </div>
      ) : null}
      {expanded && !rule.enabled ? (
        <p className="border-t border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">{t("approval_rules.disabled_hint")}</p>
      ) : null}
    </li>
  );
}

/** Settings > Approval rules: who approves what, from which amount, and how fast it escalates. */
function ApprovalRulesSettings() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["approval-rules"], queryFn: () => api.getApprovalRules() });
  const [draft, setDraft] = useState<Record<string, ApprovalRule> | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    if (query.data && draft === null) setDraft(structuredClone(query.data.rules));
  }, [query.data, draft]);
  const save = useMutation({
    mutationFn: () => api.saveApprovalRules(draft as Record<ApprovalKind, ApprovalRule>),
    onSuccess: (res) => {
      queryClient.setQueryData(["approval-rules"], res);
      setDraft(structuredClone(res.rules));
      toast.success(t("approval_rules.saved"));
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const onPatch = useCallback((kind: string, patch: Partial<ApprovalRule>) => {
    setDraft((d) => (d ? { ...d, [kind]: { ...d[kind], ...patch } } : d));
  }, []);
  const onSteps = useCallback((kind: string, index: number, steps: ApprovalStepSpec[]) => {
    setDraft((d) => {
      if (!d) return d;
      const rule = d[kind];
      return {
        ...d,
        [kind]: { ...rule, tiers: rule.tiers.map((tier, i) => (i === index ? { ...tier, steps } : tier)) },
      };
    });
  }, []);
  const onToggle = useCallback((key: string) => {
    setOpen((current) => (current === key ? null : key));
  }, []);

  if (query.isLoading || !draft || !query.data) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  const { types, staff, canEdit } = query.data;
  const dirty = JSON.stringify(draft) !== JSON.stringify(query.data.rules);
  const currency = "MAD";
  const french = language.startsWith("fr");

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </span>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-foreground">{t("approval_rules.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("approval_rules.desc")}</p>
        </div>
      </header>

      <ul className="divide-y divide-border rounded-xl border border-border">
        {types.filter((ty) => ty.available).map((ty) => (
          <RuleRow
            key={ty.key}
            ty={ty}
            rule={draft[ty.key]}
            expanded={open === ty.key}
            canEdit={canEdit}
            staff={staff}
            currency={currency}
            french={french}
            onToggle={onToggle}
            onPatch={onPatch}
            onSteps={onSteps}
          />
        ))}
      </ul>

      {canEdit ? (
        <div className={cn("flex items-center justify-end gap-2 transition-opacity", dirty ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={!dirty}>
          <Button variant="ghost" size="sm" onClick={() => setDraft(structuredClone(query.data.rules))}>{t("approval_rules.discard")}</Button>
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            {t("approval_rules.save")}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("approval_rules.read_only")}</p>
      )}
    </section>
  );
}

export default ApprovalRulesSettings;
