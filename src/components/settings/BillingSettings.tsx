import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Clock,
  Copy,
  FileText,
  Landmark,
  Loader2,
  MapPin,
  Package,
  PauseCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/components/onboarding/ModulePicker";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import { PRIVILEGED_ROLES } from "@/lib/operationalCommandRoles";
import { cn } from "@/lib/utils";
import type { BillingInvoiceRow, BillingOverview, BillingState } from "@/lib/types";

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

const STATE_TONE: Record<BillingState, string> = {
  trial: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100",
  trial_over: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100",
  active: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100",
  none: "border-border bg-card text-foreground",
  due: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100",
  overdue: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100",
  suspended: "border-red-300 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100",
};

export function useBillingOverview() {
  return useQuery({ queryKey: ["billing-overview"], queryFn: () => api.getBillingOverview() });
}

function usePrivileged() {
  const { user } = useAuth();
  return PRIVILEGED_ROLES.includes(String(user?.role || "").toUpperCase() as (typeof PRIVILEGED_ROLES)[number]);
}

/** The one-glance answer: where the account stands and what (if anything) to do now. */
function AccountHero({ data }: { data: BillingOverview }) {
  const { t } = useLanguage();
  const cur = data.current.currency;
  const nextDue = data.openInvoices[0];
  const Icon = { trial: Sparkles, trial_over: Clock, active: BadgeCheck, none: BadgeCheck, due: Clock, overdue: AlertTriangle, suspended: PauseCircle }[data.state];
  const headline = {
    trial: t("billing.hero.trial", { days: String(data.trialDaysLeft ?? 0) }),
    trial_over: t("billing.hero.trial_over"),
    active: t("billing.hero.active"),
    none: t("billing.hero.none"),
    due: t("billing.hero.due", { amount: formatMoney(data.balanceDue, cur), date: fmtDate(nextDue?.dueAt) }),
    overdue: t("billing.hero.overdue", { amount: formatMoney(data.balanceDue, cur) }),
    suspended: t("billing.hero.suspended", { amount: formatMoney(data.balanceDue, cur) }),
  }[data.state];
  const detail =
    data.state === "trial"
      ? t("billing.hero.trial_detail", { date: fmtDate(data.trialEndsAt), amount: formatMoney(data.current.totalTtc ?? data.current.total, cur) })
      : data.state === "active" && data.nextInvoiceAt
        ? t("billing.hero.next", { date: fmtDate(data.nextInvoiceAt), amount: formatMoney(data.current.totalTtc ?? data.current.total, cur) })
        : data.state === "due" || data.state === "overdue"
          ? t("billing.hero.pay_hint")
          : data.state === "suspended"
            ? t("billing.hero.suspended_detail")
            : data.state === "trial_over"
              ? t("billing.hero.trial_over_detail")
              : t("billing.hero.managed");
  return (
    <section className={cn("rounded-2xl border p-5 sm:p-6", STATE_TONE[data.state])}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Icon className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{t(`billing.state.${data.state}`)}</p>
            <h2 className="text-lg font-bold leading-snug sm:text-xl">{headline}</h2>
            <p className="text-sm opacity-80">{detail}</p>
          </div>
        </div>
        <div className="text-end">
          <p className="text-3xl font-bold tabular-nums tracking-tight">{formatMoney(data.monthly.monthlyTotal, cur)}</p>
          <p className="text-xs opacity-70">{t("billing.per_month_ht")}</p>
        </div>
      </div>
    </section>
  );
}

/** Line by line: platform, bundles (with what they save), modules, extra sites, then HT / tax / TTC. */
function WhatYouPay({ data }: { data: BillingOverview }) {
  const { t } = useLanguage();
  const privileged = usePrivileged();
  const qc = useQueryClient();
  const q = data.current;
  const cur = q.currency;
  const setInterval_ = useMutation({
    mutationFn: (interval: "month" | "year") => api.setBillingInterval(interval),
    onSuccess: (next) => {
      qc.setQueryData(["billing-overview"], next);
      toast.success(t("billing.interval_saved"));
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const per = q.interval === "year" ? t("billing.per_year") : t("billing.per_month");
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Package className="h-4 w-4 text-primary" aria-hidden />
            {t("billing.what_you_pay")}
          </h3>
          <p className="text-sm text-muted-foreground">{t("billing.what_you_pay_desc")}</p>
        </div>
        <div className="inline-flex rounded-lg border border-border p-0.5" role="radiogroup" aria-label={t("billing.interval")}>
          {(["month", "year"] as const).map((iv) => (
            <button
              key={iv}
              type="button"
              role="radio"
              aria-checked={q.interval === iv}
              disabled={!privileged || setInterval_.isPending}
              onClick={() => q.interval !== iv && setInterval_.mutate(iv)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed",
                q.interval === iv ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {iv === "month" ? t("billing.monthly") : t("billing.yearly")}
              {iv === "year" ? <span className="ms-1.5 text-[11px] font-bold opacity-80">{t("billing.two_months_free")}</span> : null}
            </button>
          ))}
        </div>
      </header>

      <ul className="divide-y divide-border rounded-xl border border-border">
        {q.lines.map((line) => (
          <li key={line.key} className="flex items-start justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                {line.key === "location" ? <MapPin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /> : null}
                {line.label}
              </p>
              {line.listMonthly && line.monthly !== undefined && line.listMonthly > line.monthly ? (
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  {t("billing.bundle_saves", { amount: formatMoney(line.listMonthly - line.monthly, cur) })}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 text-end">
              <p className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(line.amount, cur)}</p>
              {line.listMonthly && line.monthly !== undefined && line.listMonthly > line.monthly ? (
                <p className="text-[11px] tabular-nums text-muted-foreground line-through">
                  {formatMoney(q.interval === "year" ? line.listMonthly * 10 : line.listMonthly, cur)}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <dl className="ms-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <dt>{t("billing.subtotal_ht")}</dt>
          <dd className="tabular-nums">{formatMoney(q.total, cur)}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>{t("billing.tax", { label: data.paymentInstructions.taxLabel || "TVA", rate: String(q.taxRate ?? 0) })}</dt>
          <dd className="tabular-nums">{formatMoney(q.taxAmount ?? 0, cur)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-1 text-base font-bold text-foreground">
          <dt>{t("billing.total_ttc")}</dt>
          <dd className="tabular-nums">
            {formatMoney(q.totalTtc ?? q.total, cur)} <span className="text-xs font-normal text-muted-foreground">{per}</span>
          </dd>
        </div>
      </dl>

      {q.interval === "month" && q.yearlySavings > 0 ? (
        <p className="text-xs text-muted-foreground">{t("billing.yearly_saves", { amount: formatMoney(q.yearlySavings, cur) })}</p>
      ) : null}

      {data.bundleOffers.length ? (
        <div className="space-y-2">
          {data.bundleOffers.map((offer) => (
            <div key={offer.bundle} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm">
              <p className="text-foreground">
                <span className="font-semibold">{t("billing.offer_title", { bundle: offer.label })}</span>{" "}
                <span className="text-muted-foreground">
                  {t("billing.offer_desc", { modules: offer.missing.join(", "), amount: formatMoney(offer.extraMonthly, cur) })}
                </span>
              </p>
              <Button asChild size="sm" variant="outline">
                <Link to="/dashboard/settings?tab=modules">{t("billing.change_modules")}</Link>
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{t("billing.unlimited_staff", { n: String(data.locations) })}</span>
        <Link to="/dashboard/settings?tab=modules" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          {t("billing.change_modules")}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

function CopyValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm text-foreground">{value}</p>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Copy ${label}`}
        onClick={() => {
          void navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

function ReportPaymentDialog({ invoice, onClose }: { invoice: BillingInvoiceRow; onClose: () => void }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const report = useMutation({
    mutationFn: () => api.reportBillingPayment(invoice.id, reference.trim(), note.trim()),
    onSuccess: () => {
      toast.success(t("billing.report.sent"));
      void qc.invalidateQueries({ queryKey: ["billing-overview"] });
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("billing.report.title", { number: invoice.number })}</DialogTitle>
          <DialogDescription>{t("billing.report.desc", { amount: formatMoney(invoice.total, invoice.currency) })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pay-ref">{t("billing.report.reference")}</Label>
            <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t("billing.report.reference_ph")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-note">{t("billing.report.note")}</Label>
            <Textarea id="pay-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t("billing.cancel")}</Button>
          <Button onClick={() => report.mutate()} disabled={!reference.trim() || report.isPending}>
            {report.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            {t("billing.report.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceStatus({ inv }: { inv: BillingInvoiceRow }) {
  const { t } = useLanguage();
  const [key, tone] =
    inv.status === "paid"
      ? ["paid", "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"]
      : inv.status === "void"
        ? ["void", "bg-muted text-muted-foreground"]
        : inv.reportedAt
          ? ["reported", "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200"]
          : inv.overdue
            ? ["overdue", "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200"]
            : ["due", "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"];
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", tone)}>{t(`billing.inv_status.${key}`)}</span>;
}

/** Open invoices first, with everything needed to pay them by transfer. */
function ToPay({ data }: { data: BillingOverview }) {
  const { t } = useLanguage();
  const privileged = usePrivileged();
  const [reporting, setReporting] = useState<BillingInvoiceRow | null>(null);
  const pay = data.paymentInstructions;
  if (!data.openInvoices.length) return null;
  return (
    <section className="space-y-4 rounded-2xl border border-amber-200 bg-card p-5 dark:border-amber-900/40 sm:p-6" id="to-pay">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
          <Landmark className="h-4 w-4 text-amber-600" aria-hidden />
          {t("billing.to_pay", { amount: formatMoney(data.balanceDue, data.current.currency) })}
        </h3>
        <span className="text-xs text-muted-foreground">{t("billing.pay_by_transfer")}</span>
      </header>
      <ul className="space-y-2">
        {data.openInvoices.map((inv) => (
          <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                {inv.number} <InvoiceStatus inv={inv} />
              </p>
              <p className="text-xs text-muted-foreground">
                {inv.reportedAt
                  ? t("billing.reported_on", { date: fmtDate(inv.reportedAt), ref: inv.reportedReference })
                  : inv.overdue
                    ? t("billing.overdue_since", { date: fmtDate(inv.dueAt) })
                    : t("billing.due_on", { date: fmtDate(inv.dueAt) })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tabular-nums text-foreground">{formatMoney(inv.total, inv.currency)}</span>
              <Button asChild size="sm" variant="outline">
                <Link to={`/billing/invoices/${inv.id}`} target="_blank" rel="noreferrer">
                  <FileText className="me-1 h-3.5 w-3.5" aria-hidden />
                  {t("billing.view_invoice")}
                </Link>
              </Button>
              {privileged && !inv.reportedAt ? (
                <Button size="sm" onClick={() => setReporting(inv)}>
                  {t("billing.mark_paid")}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <div className="grid gap-2 sm:grid-cols-2">
        <CopyValue label={t("billing.pay.beneficiary")} value={pay.beneficiary} />
        <CopyValue label={t("billing.pay.bank")} value={pay.bankName} />
        <CopyValue label={t("billing.pay.rib")} value={pay.rib} />
        <CopyValue label={t("billing.pay.swift")} value={pay.swift} />
        <CopyValue label={t("billing.pay.reference")} value={data.openInvoices.map((i) => i.number).join(", ")} />
      </div>
      {pay.instructions ? <p className="text-sm text-muted-foreground">{pay.instructions}</p> : null}
      {!pay.rib ? <p className="text-sm text-muted-foreground">{t("billing.pay.contact", { email: pay.contactEmail || "billing@mizan.ai" })}</p> : null}
      <p className="text-xs text-muted-foreground">{t("billing.pay.after")}</p>
      {reporting ? <ReportPaymentDialog invoice={reporting} onClose={() => setReporting(null)} /> : null}
    </section>
  );
}

function History({ data }: { data: BillingOverview }) {
  const { t } = useLanguage();
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h3 className="text-base font-bold text-foreground">{t("billing.invoices")}</h3>
      {data.invoices.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-start text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2 text-start font-semibold">{t("billing.col.number")}</th>
                <th className="py-2 text-start font-semibold">{t("billing.col.issued")}</th>
                <th className="py-2 text-start font-semibold">{t("billing.col.for")}</th>
                <th className="py-2 text-end font-semibold">{t("billing.col.total")}</th>
                <th className="py-2 text-end font-semibold">{t("billing.col.status")}</th>
                <th className="py-2 text-end font-semibold"><span className="sr-only">{t("billing.view_invoice")}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="py-2.5">
                    <Link to={`/billing/invoices/${inv.id}`} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
                      {inv.number}
                    </Link>
                  </td>
                  <td className="py-2.5 text-muted-foreground">{fmtDate(inv.issuedAt)}</td>
                  <td className="py-2.5 text-muted-foreground">
                    {inv.kind === "custom"
                      ? inv.lines[0]?.label
                      : inv.kind === "proration"
                        ? t("billing.kind.proration")
                        : `${fmtDate(inv.periodStart)} → ${fmtDate(inv.periodEnd)}`}
                  </td>
                  <td className="py-2.5 text-end font-semibold tabular-nums">{formatMoney(inv.total, inv.currency)}</td>
                  <td className="py-2.5 text-end">
                    <InvoiceStatus inv={inv} />
                  </td>
                  <td className="py-2.5 text-end">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/billing/invoices/${inv.id}`} target="_blank" rel="noreferrer">
                        <FileText className="me-1 h-3.5 w-3.5" aria-hidden />
                        {t("billing.view_invoice")}
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {data.state === "trial" ? t("billing.no_invoices_trial") : t("billing.no_invoices")}
        </p>
      )}
    </section>
  );
}

/** Settings > Billing: where the account stands, what you pay for and why, what to pay and how, every invoice.
 * Bill-to identity is the business profile (name, address, email), not a separate form.
 * No online payment: Mizan issues the invoices, you pay by bank transfer and tell us, Mizan confirms. */
export default function BillingSettings() {
  const { t } = useLanguage();
  const overview = useBillingOverview();
  if (overview.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("billing.loading")}
      </div>
    );
  }
  if (overview.isError || !overview.data) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-6 text-sm">
        <span className="text-muted-foreground">{t("billing.load_error")}</span>
        <Button size="sm" variant="outline" onClick={() => overview.refetch()}>{t("billing.retry")}</Button>
      </div>
    );
  }
  const data = overview.data;
  return (
    <div className="space-y-4">
      <AccountHero data={data} />
      <ToPay data={data} />
      <WhatYouPay data={data} />
      <History data={data} />
    </div>
  );
}
