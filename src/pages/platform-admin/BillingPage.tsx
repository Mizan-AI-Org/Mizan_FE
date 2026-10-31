import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { platformApi } from "@/lib/platformApi";
import { formatMoney } from "@/components/onboarding/ModulePicker";
import { Loader2 } from "lucide-react";
import OpsPagination from "@/components/platform-admin/OpsPagination";
import type { BillingInvoiceRow, BillingPaymentInstructions } from "@/lib/types";
import {
  opsBadgeDanger,
  opsBtnGhost,
  opsBtnPrimary,
  opsCard,
  opsBadgeOk,
  opsBadgeWarn,
  opsInput,
  opsLink,
  opsMuted,
  opsPage,
  opsRow,
  opsSubtitle,
  opsTableWrap,
  opsTd,
  opsTh,
  opsTitle,
} from "@/components/platform-admin/opsStyles";

const PAGE_SIZE = 20;

const MODULE_LABELS: Record<string, string> = {
  platform: "Platform fee",
  location: "Each additional location",
  geo_clock: "Geolocation clock-in",
  attendance: "Attendance & timesheets",
  scheduling: "Scheduling & shifts",
  hr: "HR & staff files",
  checklists: "Processes & checklists",
  accountability: "Accountability",
  incidents: "Staff incident reporting",
  sales: "Sales & POS",
  reservations: "Reservations & orders",
  inventory: "Procurement",
  finance: "Finance",
  bundle_workforce: "Workforce bundle",
  bundle_execution: "Execution bundle",
  bundle_business: "Business bundle",
};

const money = formatMoney;

function InvoiceStatus({ inv }: { inv: BillingInvoiceRow }) {
  if (inv.status === "paid") return <span className={opsBadgeOk}>paid</span>;
  if (inv.status === "void") return <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">void</span>;
  if (inv.reportedAt) return <span className={opsBadgeWarn}>payment reported</span>;
  return <span className={inv.overdue ? opsBadgeDanger : opsBadgeWarn}>{inv.overdue ? "overdue" : "open"}</span>;
}

function InvoicesTab() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("open");
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState<BillingInvoiceRow | null>(null);
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["platform-invoices", status, page],
    queryFn: () => platformApi.invoices({ ...(status ? { status } : {}), page: String(page), page_size: String(PAGE_SIZE) }),
  });
  const act = useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: "mark-paid" | "void"; body?: Record<string, unknown> }) =>
      platformApi.invoiceAction(id, action, body),
    onSuccess: () => {
      setPaying(null);
      setReference("");
      void queryClient.invalidateQueries({ queryKey: ["platform-invoices"] });
    },
  });
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className={opsSubtitle}>
          Mark invoices paid when transfers arrive. 7+ days overdue pauses paid modules.
        </p>
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className={opsInput} aria-label="Filter invoices">
          <option value="open">Open</option>
          <option value="reported">Payment reported</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
          <option value="void">Void</option>
          <option value="">All</option>
        </select>
      </div>
      {act.error ? <p className="text-sm text-rose-600">{(act.error as Error).message}</p> : null}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#00C853]" /></div>
      ) : error ? (
        <p className="text-rose-600 dark:text-rose-400">{(error as Error).message}</p>
      ) : (
        <div className={opsTableWrap}>
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className={opsTh}>Invoice</th>
                <th className={opsTh}>Tenant</th>
                <th className={opsTh}>Period</th>
                <th className={opsTh}>Total</th>
                <th className={opsTh}>Due</th>
                <th className={opsTh}>Status</th>
                <th className={opsTh} />
              </tr>
            </thead>
            <tbody className={isFetching ? "opacity-60" : ""}>
              {(data?.results || []).map((inv) => (
                <tr key={inv.id} className={opsRow}>
                  <td className={`${opsTd} font-mono text-xs`}>
                    {inv.number}
                    {inv.kind === "proration" ? <span className={`${opsMuted} ms-1`}>(prorated)</span> : null}
                    {inv.kind === "custom" ? <span className={`${opsMuted} ms-1`}>(custom)</span> : null}
                  </td>
                  <td className={opsTd}>
                    <Link to={`/admin/tenants/${inv.restaurantId}`} className={opsLink}>{inv.restaurantName}</Link>
                  </td>
                  <td className={`${opsTd} text-xs`}>
                    {inv.kind === "custom"
                      ? inv.lines[0]?.label
                      : `${new Date(inv.periodStart).toLocaleDateString()} → ${new Date(inv.periodEnd).toLocaleDateString()}`}
                  </td>
                  <td className={`${opsTd} font-semibold tabular-nums`}>{money(inv.total, inv.currency)} <span className={`${opsMuted} text-[10px] font-normal`}>TTC</span></td>
                  <td className={`${opsTd} text-xs`}>{new Date(inv.dueAt).toLocaleDateString()}</td>
                  <td className={opsTd}>
                    <InvoiceStatus inv={inv} />
                    {inv.paymentReference || inv.reportedReference ? (
                      <span className={`${opsMuted} ms-1 text-[11px]`}>{inv.paymentReference || inv.reportedReference}</span>
                    ) : null}
                  </td>
                  <td className={`${opsTd} whitespace-nowrap text-end`}>
                    {inv.status === "open" ? (
                      <>
                        <button type="button" className={opsBtnPrimary} onClick={() => { setPaying(inv); setReference(inv.reportedReference || ""); }}>Mark paid</button>{" "}
                        <button
                          type="button"
                          className={opsBtnGhost}
                          disabled={act.isPending}
                          onClick={() => {
                            const note = window.prompt(`Void ${inv.number}? Reason:`);
                            if (note !== null) act.mutate({ id: inv.id, action: "void", body: { note } });
                          }}
                        >
                          Void
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
              {(data?.results || []).length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No invoices</td></tr>
              ) : null}
            </tbody>
          </table>
          <OpsPagination page={page} pageSize={PAGE_SIZE} total={data?.count ?? 0} onPageChange={setPage} />
        </div>
      )}

      {paying ? (
        <div className={`${opsCard} space-y-3`} role="dialog" aria-label={`Mark ${paying.number} paid`}>
          <p className="font-semibold">
            Record payment for {paying.number} · {paying.restaurantName} · {money(paying.total, paying.currency)}
          </p>
          <div className="flex flex-wrap gap-2">
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={opsInput} aria-label="Payment method">
              <option value="bank_transfer">Bank transfer</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="card">Card</option>
            </select>
            <input
              className={`${opsInput} min-w-[220px]`}
              placeholder="Bank / transfer reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <button
              type="button"
              className={opsBtnPrimary}
              disabled={act.isPending}
              onClick={() => act.mutate({ id: paying.id, action: "mark-paid", body: { method, reference } })}
            >
              {act.isPending ? "Saving…" : "Confirm payment"}
            </button>
            <button type="button" className={opsBtnGhost} onClick={() => setPaying(null)}>Cancel</button>
          </div>
          <p className={`${opsMuted} text-xs`}>Paid modules come back on for this tenant if nothing else is overdue.</p>
        </div>
      ) : null}
    </div>
  );
}

const PRICE_GROUPS: { label: string; keys: string[] }[] = [
  { label: "Core", keys: ["platform", "location"] },
  {
    label: "Modules",
    keys: [
      "geo_clock",
      "attendance",
      "scheduling",
      "hr",
      "checklists",
      "accountability",
      "incidents",
      "sales",
      "reservations",
      "inventory",
      "finance",
    ],
  },
  { label: "Bundles", keys: ["bundle_workforce", "bundle_execution", "bundle_business"] },
];

function PricesTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["platform-module-prices"], queryFn: () => platformApi.modulePrices() });
  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => {
    if (data) setDraft(Object.fromEntries(Object.entries(data.prices).map(([k, v]) => [k, String(v)])));
  }, [data]);
  const save = useMutation({
    mutationFn: () => platformApi.updateModulePrices(Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, Number(v) || 0]))),
    onSuccess: (res) => queryClient.setQueryData(["platform-module-prices"], res),
  });
  if (isLoading || !data) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#00C853]" />
      </div>
    );
  }
  const total = ["platform", "bundle_workforce", "bundle_execution", "bundle_business"].reduce(
    (sum, k) => sum + (Number(draft[k]) || 0),
    0,
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={opsSubtitle}>Monthly {data.currency} HT. Applies to future invoices.</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`${opsMuted} text-xs`}>
            Full stack, 1 location: {money(total, data.currency)}/mo
          </span>
          <button type="button" className={opsBtnPrimary} disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save prices"}
          </button>
        </div>
      </div>
      {save.isSuccess ? <p className="text-xs text-emerald-600">Saved.</p> : null}
      {save.error ? <p className="text-xs text-rose-600">{(save.error as Error).message}</p> : null}
      <div className={opsTableWrap}>
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className={opsTh}>Item</th>
              <th className={`${opsTh} w-40 text-end`}>Monthly HT</th>
            </tr>
          </thead>
          <tbody>
            {PRICE_GROUPS.map((group) => (
              <React.Fragment key={group.label}>
                <tr>
                  <td colSpan={2} className={`${opsTd} bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-950/80 dark:text-slate-400`}>
                    {group.label}
                  </td>
                </tr>
                {group.keys.filter((key) => key in draft).map((key) => (
                  <tr key={key} className={opsRow}>
                    <td className={opsTd}>
                      <label htmlFor={`price-${key}`}>{MODULE_LABELS[key]}</label>
                    </td>
                    <td className={`${opsTd} text-end`}>
                      <input
                        id={`price-${key}`}
                        type="number"
                        min={0}
                        step={10}
                        value={draft[key]}
                        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                        className={`${opsInput} ms-auto w-28 text-end tabular-nums`}
                      />
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PROFILE_SECTIONS: {
  title: string;
  fields: { key: keyof BillingPaymentInstructions; label: string; multiline?: boolean; numeric?: boolean; span?: 2 }[];
}[] = [
  {
    title: "Company",
    fields: [
      { key: "legalName", label: "Legal name", span: 2 },
      { key: "address", label: "Address", multiline: true, span: 2 },
      { key: "ice", label: "ICE" },
      { key: "rc", label: "RC" },
      { key: "taxId", label: "IF" },
      { key: "contactEmail", label: "Contact email" },
    ],
  },
  {
    title: "Tax",
    fields: [
      { key: "taxLabel", label: "Tax label" },
      { key: "taxRate", label: "Tax rate %", numeric: true },
    ],
  },
  {
    title: "Bank",
    fields: [
      { key: "beneficiary", label: "Beneficiary" },
      { key: "bankName", label: "Bank" },
      { key: "rib", label: "RIB" },
      { key: "swift", label: "SWIFT / BIC" },
      { key: "instructions", label: "Tenant instructions", multiline: true, span: 2 },
    ],
  },
];

function PaymentDetailsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["platform-billing-profile"], queryFn: () => platformApi.billingProfile() });
  const [draft, setDraft] = useState<BillingPaymentInstructions | null>(null);
  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);
  const save = useMutation({ mutationFn: () => platformApi.updateBillingProfile(draft!) });
  if (isLoading || !draft) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#00C853]" />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={opsSubtitle}>Printed on invoices and shown with each open invoice.</p>
        <button type="button" className={opsBtnPrimary} disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save details"}
        </button>
      </div>
      {save.isSuccess ? <p className="text-xs text-emerald-600">Saved.</p> : null}
      {save.error ? <p className="text-xs text-rose-600">{(save.error as Error).message}</p> : null}
      {PROFILE_SECTIONS.map((section) => (
        <section key={section.title} className={`${opsCard} p-5`}>
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">{section.title}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {section.fields.map((f) => (
              <label
                key={f.key}
                className={`space-y-1.5 text-sm text-slate-700 dark:text-slate-200 ${f.span === 2 ? "sm:col-span-2" : ""}`}
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {f.label}
                </span>
                {f.multiline ? (
                  <textarea
                    className={`${opsInput} min-h-[88px] w-full py-2`}
                    value={String(draft[f.key] ?? "")}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  />
                ) : (
                  <input
                    className={`${opsInput} w-full`}
                    type={f.numeric ? "number" : "text"}
                    min={f.numeric ? 0 : undefined}
                    max={f.numeric ? 100 : undefined}
                    value={String(draft[f.key] ?? "")}
                    onChange={(e) =>
                      setDraft({ ...draft, [f.key]: f.numeric ? Number(e.target.value) : e.target.value })
                    }
                  />
                )}
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const TABS = [
  { id: "invoices", label: "Invoices" },
  { id: "prices", label: "Prices" },
  { id: "payment", label: "Company & payment details" },
] as const;

export default function BillingPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("invoices");
  return (
    <div className={opsPage}>
      <header className="space-y-3">
        <div>
          <h2 className={opsTitle}>Billing</h2>
          <p className={opsSubtitle}>Platform fee plus modules. Paid by transfer.</p>
        </div>
        <nav className="flex flex-wrap gap-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={tab === t.id ? opsBtnPrimary : opsBtnGhost}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      {tab === "invoices" ? <InvoicesTab /> : null}
      {tab === "prices" ? <PricesTab /> : null}
      {tab === "payment" ? <PaymentDetailsTab /> : null}
    </div>
  );
}
