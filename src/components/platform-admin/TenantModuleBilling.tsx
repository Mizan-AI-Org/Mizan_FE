import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { platformApi } from "@/lib/platformApi";
import { formatMoney } from "@/components/onboarding/ModulePicker";
import {
  opsBadgeDanger,
  opsBadgeOk,
  opsBadgeWarn,
  opsBtnGhost,
  opsBtnPrimary,
  opsCard,
  opsInput,
  opsLink,
  opsMuted,
} from "@/components/platform-admin/opsStyles";
import type { BillingInvoiceRow, BillingOverview } from "@/lib/types";

const money = formatMoney;
const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "-";

type DraftLine = { label: string; quantity: string; unitPrice: string };

const STATE_BADGE: Record<string, string> = {
  trial: opsBadgeWarn, trial_over: opsBadgeWarn, active: opsBadgeOk, none: opsBadgeOk,
  due: opsBadgeWarn, overdue: opsBadgeDanger, suspended: opsBadgeDanger,
};

/** Mizan admin: compose an invoice outside the subscription (setup, training, extra services). Amounts HT. */
function CustomInvoiceForm({ restaurantId, onDone }: { restaurantId: string; onDone: (next: BillingOverview) => void }) {
  const [lines, setLines] = useState<DraftLine[]>([{ label: "", quantity: "1", unitPrice: "" }]);
  const [dueDays, setDueDays] = useState("7");
  const [notes, setNotes] = useState("");
  const create = useMutation({
    mutationFn: () =>
      platformApi.customTenantInvoice(restaurantId, {
        lines: lines
          .filter((l) => l.label.trim() && Number(l.unitPrice) > 0)
          .map((l) => ({ label: l.label.trim(), quantity: Number(l.quantity) || 1, unitPrice: Number(l.unitPrice) })),
        due_days: Number(dueDays) || 0,
        notes: notes.trim(),
      }),
    onSuccess: onDone,
  });
  const subtotal = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
  const set = (i: number, patch: Partial<DraftLine>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">New invoice</p>
      {lines.map((line, i) => (
        <div key={i} className="grid grid-cols-[1fr_70px_110px_auto] items-center gap-2">
          <input className={opsInput} placeholder="Description (e.g. Onboarding & training)" value={line.label}
                 onChange={(e) => set(i, { label: e.target.value })} aria-label="Description" />
          <input className={opsInput} type="number" min={1} value={line.quantity}
                 onChange={(e) => set(i, { quantity: e.target.value })} aria-label="Quantity" />
          <input className={opsInput} type="number" min={0} placeholder="Unit HT" value={line.unitPrice}
                 onChange={(e) => set(i, { unitPrice: e.target.value })} aria-label="Unit price HT" />
          <button type="button" className={opsBtnGhost} aria-label="Remove line" disabled={lines.length === 1}
                  onClick={() => setLines(lines.filter((_, j) => j !== i))}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" className={`${opsBtnGhost} text-xs`} onClick={() => setLines([...lines, { label: "", quantity: "1", unitPrice: "" }])}>
        <Plus className="me-1 h-3.5 w-3.5" /> Add line
      </button>
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs">
          <span className="block font-semibold">Due in (days)</span>
          <input className={`${opsInput} w-24`} type="number" min={0} max={90} value={dueDays} onChange={(e) => setDueDays(e.target.value)} />
        </label>
        <label className="min-w-[200px] flex-1 space-y-1 text-xs">
          <span className="block font-semibold">Note on the invoice (optional)</span>
          <input className={`${opsInput} w-full`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <p className="text-sm font-semibold tabular-nums">{money(subtotal)} HT</p>
        <button type="button" className={opsBtnPrimary} disabled={create.isPending || subtotal <= 0} onClick={() => create.mutate()}>
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Issue and send
        </button>
      </div>
      <p className={`text-[11px] ${opsMuted}`}>Tax from the billing profile is added on top. The owner gets a WhatsApp/in-app notice.</p>
      {create.error ? <p className="text-xs text-rose-600">{(create.error as Error).message}</p> : null}
    </div>
  );
}

function InvoiceLine({ inv, restaurantId }: { inv: BillingInvoiceRow; restaurantId: string }) {
  const qc = useQueryClient();
  const [reference, setReference] = useState(inv.reportedReference || "");
  const act = useMutation({
    mutationFn: (action: "mark-paid" | "void") => platformApi.invoiceAction(inv.id, action, action === "mark-paid" ? { reference } : {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-tenant-billing", restaurantId] });
      void qc.invalidateQueries({ queryKey: ["platform-invoices"] });
    },
  });
  const badge = inv.status === "paid" ? opsBadgeOk : inv.status === "void" ? opsBadgeWarn : inv.overdue ? opsBadgeDanger : opsBadgeWarn;
  return (
    <li className="space-y-2 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-mono">{inv.number}</span>
        <span className={opsMuted}>{inv.kind === "custom" ? inv.lines[0]?.label : `${fmtDate(inv.periodStart)} → ${fmtDate(inv.periodEnd)}`}</span>
        <span className="font-semibold tabular-nums">{money(inv.total, inv.currency)} TTC</span>
        <span className={badge}>{inv.status === "open" ? (inv.reportedAt ? "payment reported" : inv.overdue ? "overdue" : "open") : inv.status}</span>
      </div>
      {inv.status === "open" ? (
        <div className="flex flex-wrap items-center gap-2">
          {inv.reportedAt ? (
            <span className="text-xs text-sky-700 dark:text-sky-300">
              Tenant reported a transfer on {fmtDate(inv.reportedAt)}{inv.reportedNote ? `: ${inv.reportedNote}` : ""}. Check the bank.
            </span>
          ) : null}
          <input className={`${opsInput} w-44 text-xs`} placeholder="Bank reference" value={reference}
                 onChange={(e) => setReference(e.target.value)} aria-label="Bank reference" />
          <button type="button" className={`${opsBtnPrimary} text-xs`} disabled={act.isPending} onClick={() => act.mutate("mark-paid")}>
            Mark paid
          </button>
          <button type="button" className={`${opsBtnGhost} text-xs`} disabled={act.isPending} onClick={() => act.mutate("void")}>
            Void
          </button>
          {act.error ? <span className="text-xs text-rose-600">{(act.error as Error).message}</span> : null}
        </div>
      ) : null}
    </li>
  );
}

/** Platform admin: what a tenant pays, their invoices, and issuing new ones (no online payment: bank transfer). */
export default function TenantModuleBilling({ restaurantId }: { restaurantId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform-tenant-billing", restaurantId],
    queryFn: () => platformApi.tenantBilling(restaurantId),
    enabled: !!restaurantId,
  });
  const [trialDays, setTrialDays] = useState("0");
  const [composing, setComposing] = useState(false);
  const store = (res: BillingOverview) => queryClient.setQueryData(["platform-tenant-billing", restaurantId], res);
  const enable = useMutation({ mutationFn: () => platformApi.enableModuleBilling(restaurantId, Number(trialDays) || 0), onSuccess: store });
  const issue = useMutation({ mutationFn: () => platformApi.issueTenantInvoice(restaurantId), onSuccess: store });

  return (
    <section className={`${opsCard} p-5 space-y-4`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Billing</h3>
          <p className={`mt-0.5 text-xs ${opsMuted}`}>Platform fee + modules + extra locations, HT. Invoices are paid by bank transfer.</p>
        </div>
        <Link to="/admin/billing" className={`text-xs ${opsLink}`}>All invoices →</Link>
      </div>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-[#00C853]" /> : null}
      {error ? <p className="text-sm text-rose-600">{(error as Error).message}</p> : null}
      {data ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={STATE_BADGE[data.state] || opsBadgeWarn}>{data.state.replace("_", " ")}</span>
            {!data.moduleBilling ? <span className={opsBadgeWarn}>invoiced manually</span> : null}
            <span className="font-semibold tabular-nums">
              {money(data.monthly.monthlyTotal, data.current.currency)} HT / month
            </span>
            <span className={`tabular-nums ${opsMuted}`}>
              ({money(data.current.totalTtc ?? data.current.total, data.current.currency)} TTC per {data.interval === "year" ? "year" : "month"})
            </span>
            {data.balanceDue ? <span className={opsBadgeDanger}>{money(data.balanceDue)} due</span> : null}
            {data.trialDaysLeft !== null ? <span className={opsMuted}>trial: {data.trialDaysLeft} days left</span> : null}
          </div>
          <ul className={`text-xs ${opsMuted} space-y-0.5`}>
            {data.current.lines.map((l) => (
              <li key={l.key} className="flex justify-between gap-3">
                <span>{l.label}</span>
                <span className="tabular-nums">{money(l.amount, data.current.currency)}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
            <button type="button" className={opsBtnPrimary} disabled={issue.isPending} onClick={() => issue.mutate()}>
              {issue.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Issue subscription invoice now
            </button>
            <button type="button" className={opsBtnGhost} onClick={() => setComposing((v) => !v)}>
              {composing ? "Close" : "New custom invoice"}
            </button>
            {issue.error ? <p className="w-full text-xs text-rose-600">{(issue.error as Error).message}</p> : null}
          </div>
          {composing ? (
            <CustomInvoiceForm restaurantId={restaurantId} onDone={(next) => { store(next); setComposing(false); }} />
          ) : null}

          {data.invoices.length ? (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {data.invoices.map((inv) => <InvoiceLine key={inv.id} inv={inv} restaurantId={restaurantId} />)}
            </ul>
          ) : (
            <p className={`text-xs ${opsMuted}`}>No invoices yet.</p>
          )}

          {!data.moduleBilling ? (
            <div className="flex flex-wrap items-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
              <label className="space-y-1 text-xs">
                <span className="block font-semibold">Trial days before the first automatic invoice</span>
                <input type="number" min={0} className={`${opsInput} w-24`} value={trialDays} onChange={(e) => setTrialDays(e.target.value)} />
              </label>
              <button type="button" className={opsBtnGhost} disabled={enable.isPending} onClick={() => enable.mutate()}>
                {enable.isPending ? "Switching…" : Number(trialDays) > 0 ? "Turn on automatic invoicing" : "Turn on automatic invoicing (first invoice now)"}
              </button>
              <p className={`w-full text-[11px] ${opsMuted}`}>
                Until then this tenant is only invoiced when you issue one. Check their modules first: tenants from before
                modules have everything on, and the bill follows their modules.
              </p>
              {enable.error ? <p className="w-full text-xs text-rose-600">{(enable.error as Error).message}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
