import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/components/onboarding/ModulePicker";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

/** A Mizan invoice as a printable document (Print / Save as PDF from the browser). Always light, A4-friendly. */
export default function BillingInvoicePage() {
  const { id = "" } = useParams();
  const { t } = useLanguage();
  const query = useQuery({ queryKey: ["billing-invoice", id], queryFn: () => api.getBillingInvoice(id), enabled: !!id });
  const number = query.data?.number;
  useEffect(() => {
    // "Save as PDF" names the file after the page title.
    if (!number) return;
    const previous = document.title;
    document.title = `${number} - Mizan AI`;
    return () => {
      document.title = previous;
    };
  }, [number]);

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return <div className="flex min-h-screen items-center justify-center bg-white p-6 text-slate-600">{t("billing.doc.not_found")}</div>;
  }
  const inv = query.data;
  const seller = inv.seller;
  const cur = inv.currency;
  const billTo = inv.billTo || {};
  const statusText =
    inv.status === "paid"
      ? t("billing.doc.paid_on", { date: fmtDate(inv.paidAt) })
      : inv.status === "void"
        ? t("billing.inv_status.void")
        : inv.overdue
          ? t("billing.overdue_since", { date: fmtDate(inv.dueAt) })
          : t("billing.due_on", { date: fmtDate(inv.dueAt) });

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0" style={{ colorScheme: "light" }}>
      <div className="mx-auto mb-4 flex max-w-3xl justify-end px-4 print:hidden">
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" aria-hidden />
          {t("billing.doc.print")}
        </Button>
      </div>
      <article className="mx-auto max-w-3xl bg-white px-6 py-10 text-slate-900 shadow-sm sm:px-12 print:max-w-none print:px-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            {/* Master artwork as an <img>: prints exactly (CSS-mask logos vanish when "background graphics" is off). */}
            <img
              src="/mizan-logo.png"
              alt="Mizan AI"
              width={392}
              height={108}
              className="mb-3 h-11 w-auto print:h-10"
              style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
            />
            <p className="text-sm font-semibold">{seller.legalName || seller.beneficiary || "Mizan AI"}</p>
            {seller.address ? <p className="whitespace-pre-line text-xs text-slate-600">{seller.address}</p> : null}
            <p className="text-xs text-slate-600">
              {[seller.ice && `ICE ${seller.ice}`, seller.rc && `RC ${seller.rc}`, seller.taxId && `IF ${seller.taxId}`].filter(Boolean).join(" · ")}
            </p>
            {seller.contactEmail ? <p className="text-xs text-slate-600">{seller.contactEmail}</p> : null}
          </div>
          <div className="space-y-1 text-end">
            <p className="text-3xl font-bold uppercase tracking-wide text-slate-800">{t("billing.doc.invoice")}</p>
            <p className="font-mono text-sm">{inv.number}</p>
            <p className="text-xs text-slate-600">{t("billing.doc.issued", { date: fmtDate(inv.issuedAt) })}</p>
            <p className={`text-xs font-semibold ${inv.status === "paid" ? "text-emerald-700" : inv.overdue ? "text-red-700" : "text-slate-700"}`}>
              {statusText}
            </p>
          </div>
        </header>

        <section className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("billing.doc.bill_to")}</p>
            <p className="mt-1 font-semibold">{billTo.legalName || inv.restaurantName}</p>
            {billTo.address ? <p className="whitespace-pre-line text-sm text-slate-600">{billTo.address}</p> : null}
            {billTo.ice ? <p className="text-sm text-slate-600">ICE {billTo.ice}</p> : null}
            {billTo.email ? <p className="text-sm text-slate-600">{billTo.email}</p> : null}
          </div>
          <div className="sm:text-end">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("billing.doc.period")}</p>
            <p className="mt-1 text-sm">
              {inv.kind === "custom" ? fmtDate(inv.issuedAt) : `${fmtDate(inv.periodStart)} → ${fmtDate(inv.periodEnd)}`}
            </p>
            {inv.kind === "cycle" ? (
              <p className="text-sm text-slate-600">{inv.interval === "year" ? t("billing.yearly") : t("billing.monthly")}</p>
            ) : null}
          </div>
        </section>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
              <th className="py-2 text-start font-semibold">{t("billing.doc.description")}</th>
              <th className="whitespace-nowrap py-2 text-end font-semibold">{t("billing.doc.amount_ht")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {inv.lines.map((line, i) => (
              <tr key={`${line.key}-${i}`}>
                <td className="py-2.5 pe-4">
                  <p>{line.label}</p>
                  {line.quantity && line.unitPrice !== undefined && line.quantity !== 1 ? (
                    <p className="text-xs text-slate-500">{line.quantity} × {formatMoney(line.unitPrice, cur)}</p>
                  ) : null}
                  {line.note ? <p className="text-xs text-slate-500">{line.note}</p> : null}
                </td>
                <td className="py-2.5 text-end tabular-nums">{formatMoney(line.amount, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ms-auto mt-4 w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">{t("billing.subtotal_ht")}</dt>
            <dd className="tabular-nums">{formatMoney(inv.subtotal, cur)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">{t("billing.tax", { label: seller.taxLabel || "TVA", rate: String(inv.taxRate) })}</dt>
            <dd className="tabular-nums">{formatMoney(inv.taxAmount, cur)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold">
            <dt>{t("billing.total_ttc")}</dt>
            <dd className="tabular-nums">{formatMoney(inv.total, cur)}</dd>
          </div>
        </dl>

        {inv.status !== "paid" && inv.status !== "void" ? (
          <section className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm print:bg-white">
            <p className="font-semibold">{t("billing.doc.how_to_pay")}</p>
            <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {[
                [t("billing.pay.beneficiary"), seller.beneficiary],
                [t("billing.pay.bank"), seller.bankName],
                [t("billing.pay.rib"), seller.rib],
                [t("billing.pay.swift"), seller.swift],
                [t("billing.pay.reference"), inv.number],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11px] uppercase tracking-wider text-slate-500">{k}</dt>
                    <dd className="font-mono">{v}</dd>
                  </div>
                ))}
            </dl>
            {seller.instructions ? <p className="mt-2 text-slate-600">{seller.instructions}</p> : null}
          </section>
        ) : inv.status === "paid" ? (
          <p className="mt-8 text-sm text-emerald-700">
            {t("billing.doc.paid_by", { date: fmtDate(inv.paidAt), ref: inv.paymentReference || "—" })}
          </p>
        ) : null}

        {inv.notes ? <p className="mt-6 whitespace-pre-line text-xs text-slate-500">{inv.notes}</p> : null}
        <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-500">
          {t("billing.doc.footer")}
        </footer>
      </article>
    </div>
  );
}
