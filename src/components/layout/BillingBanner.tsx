import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useModules } from "@/hooks/use-modules";
import { formatMoney } from "@/components/onboarding/ModulePicker";
import { api } from "@/lib/api";

const DAY = 24 * 60 * 60 * 1000;

/** One line at the top of the app when the bill needs attention: paused modules, an invoice due, a trial ending. */
export function BillingBanner() {
  const { t } = useLanguage();
  const { suspended, canEdit, ready } = useModules();
  const overview = useQuery({
    queryKey: ["billing-overview"],
    queryFn: () => api.getBillingOverview(),
    enabled: ready && canEdit,
    staleTime: 5 * 60_000,
  });
  const data = overview.data;
  const link = canEdit ? (
    <Link to="/dashboard/settings?tab=billing" className="font-semibold underline underline-offset-2">
      {t("billing.view_billing")}
    </Link>
  ) : null;

  if (suspended) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        <span>{canEdit ? t("billing.banner_suspended_owner") : t("billing.banner_suspended_staff")}</span>
        {link}
      </div>
    );
  }
  if (!data?.moduleBilling) return null;
  const due = data.openInvoices[0];
  if (due) {
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        <Clock className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          {t(due.overdue ? "billing.banner_overdue" : "billing.banner_due", {
            amount: formatMoney(data.balanceDue, due.currency),
            date: new Date(due.dueAt).toLocaleDateString(),
          })}
        </span>
        {link}
      </div>
    );
  }
  if (data.status === "trialing" && data.trialEndsAt) {
    const days = Math.ceil((new Date(data.trialEndsAt).getTime() - Date.now()) / DAY);
    if (days <= 3) {
      return (
        <div className="flex flex-wrap items-center gap-2 border-b border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200">
          <Clock className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            {t("billing.banner_trial", {
              count: Math.max(days, 0),
              amount: formatMoney(data.current.total, data.current.currency),
            })}
          </span>
          {link}
        </div>
      );
    }
  }
  return null;
}
