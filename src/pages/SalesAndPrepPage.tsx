import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { POS_INTEGRATIONS_HREF } from "@/lib/mizan-domains";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  BarChart3,
  CreditCard,
  Banknote,
  Receipt,
} from "lucide-react";
import { api } from "../lib/api";
import { useLanguage } from "../hooks/use-language";
import { format } from "date-fns";
import { PAGE_SHELL } from "@/lib/page-shell";

const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: "Dine In",
  TAKEOUT: "Takeout",
  DELIVERY: "Delivery",
  CATERING: "Catering",
};

type SalesAndPrepPageProps = {
  /** When true, omit page shell and title (used inside Sales hub tabs). */
  embedded?: boolean;
};

export default function SalesAndPrepPage({ embedded = false }: SalesAndPrepPageProps = {}) {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { t } = useLanguage();

  const [salesDate, setSalesDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const { data: todaySales, isLoading: salesLoading, isError: salesError } = useQuery({
    queryKey: ["pos-sales-today", accessToken, salesDate],
    queryFn: () => api.getTodaySales(accessToken!, salesDate),
    enabled: !!accessToken,
  });

  const cardBase =
    "relative border border-slate-200/60 dark:border-slate-800/80 bg-card rounded-2xl ring-1 ring-slate-900/[0.03] dark:ring-white/[0.04] overflow-hidden shadow-[0_1px_2px_0_rgb(15_23_42_/_0.04),0_2px_8px_-2px_rgb(15_23_42_/_0.06)] transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300/70 dark:hover:border-slate-700 hover:shadow-[0_12px_32px_-12px_rgb(15_23_42_/_0.18),0_4px_12px_-4px_rgb(15_23_42_/_0.08)]";

  const content = (
    <Card className={`${cardBase} flex flex-col`}>
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-50/80 to-transparent dark:from-emerald-950/20 dark:to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
              {t("dashboard.sales.title") || "Sales Analysis"}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={salesDate}
              onChange={(e) => setSalesDate(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-surface-raised text-slate-700 dark:text-slate-300"
            />
            <Badge
              variant="outline"
              className={
                todaySales?.connected
                  ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                  : "text-slate-500"
              }
            >
              {todaySales?.connected ? "LIVE" : "POS"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-8 px-6 md:px-8">
        {salesLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-10 h-10 border-2 border-emerald-200 dark:border-emerald-800 border-t-emerald-500 rounded-full animate-spin" />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {t("dashboard.sales.loading") || "Loading…"}
            </span>
          </div>
        ) : salesError ? (
          <div className="py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
              {t("dashboard.sales.error") || "Could not load sales. Try again later."}
            </p>
            <Button variant="outline" size="default" onClick={() => navigate(POS_INTEGRATIONS_HREF)}>
              {t("common.settings") || "Settings"}
            </Button>
          </div>
        ) : !todaySales?.connected ? (
          <div className="py-10 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 flex items-center justify-center mx-auto mb-5 border border-emerald-100/50 dark:border-emerald-800/30">
              <DollarSign className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-[260px] mx-auto leading-relaxed">
              {todaySales?.error ||
                (t("dashboard.sales.connect_pos") || "Connect your POS in Settings to see sales.")}
            </p>
            <Button
              size="default"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => navigate(POS_INTEGRATIONS_HREF)}
            >
              {t("dashboard.sales.connect_pos_cta") || "Connect POS"}
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
                {t("dashboard.sales.total") || "Total revenue"}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {todaySales?.currency || ""}{" "}
                {(todaySales?.total_sales ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("dashboard.sales.orders") || "Orders"}</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{todaySales?.order_count ?? 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("dashboard.sales.avg_ticket") || "Avg ticket"}
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {todaySales?.currency || ""} {(todaySales?.avg_ticket ?? 0).toFixed(2)}
                </p>
              </div>
            </div>

            {(todaySales?.tips ?? 0) > 0 ||
            (todaySales?.cash_total ?? 0) > 0 ||
            (todaySales?.card_total ?? 0) > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Payment breakdown
                </p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {(todaySales?.cash_total ?? 0) > 0 && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <span className="text-slate-700 dark:text-slate-300">Cash</span>
                      <span className="font-medium ml-auto">
                        {todaySales?.currency} {(todaySales?.cash_total ?? 0).toFixed(0)}
                      </span>
                    </div>
                  )}
                  {(todaySales?.card_total ?? 0) > 0 && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span className="text-slate-700 dark:text-slate-300">Card</span>
                      <span className="font-medium ml-auto">
                        {todaySales?.currency} {(todaySales?.card_total ?? 0).toFixed(0)}
                      </span>
                    </div>
                  )}
                  {(todaySales?.tips ?? 0) > 0 && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <Receipt className="w-4 h-4 text-amber-600" />
                      <span className="text-slate-700 dark:text-slate-300">Tips</span>
                      <span className="font-medium ml-auto">
                        {todaySales?.currency} {(todaySales?.tips ?? 0).toFixed(0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {((todaySales?.total_tax ?? 0) > 0 || (todaySales?.total_discount ?? 0) > 0) && (
              <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                {(todaySales?.total_tax ?? 0) > 0 && (
                  <span>
                    Tax: {todaySales?.currency} {(todaySales?.total_tax ?? 0).toFixed(2)}
                  </span>
                )}
                {(todaySales?.total_discount ?? 0) > 0 && (
                  <span>
                    Discount: {todaySales?.currency} {(todaySales?.total_discount ?? 0).toFixed(2)}
                  </span>
                )}
              </div>
            )}

            {todaySales?.by_order_type && Object.keys(todaySales.by_order_type).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  By order type
                </p>
                <div className="space-y-1">
                  {Object.entries(todaySales.by_order_type).map(([type, data]) => (
                    <div
                      key={type}
                      className="flex justify-between text-sm py-1 border-b border-slate-50 dark:border-slate-800/50 last:border-0"
                    >
                      <span className="text-slate-700 dark:text-slate-300">{ORDER_TYPE_LABELS[type] || type}</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {data.count} orders · {todaySales?.currency} {data.total.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate("/dashboard/reports/sales/daily")}
            >
              {t("dashboard.sales.view_reports") || "View full reports"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (embedded) {
    return <div className="space-y-6">{content}</div>;
  }

  return (
    <div className="min-h-screen">
      <div className={`${PAGE_SHELL} py-6 md:py-8 space-y-6`}>
        <header className="space-y-1">
          <h1 className="text-2xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t("dashboard.sales.page_title") || "Sales Analysis"}
          </h1>
        </header>
        {content}
      </div>
    </div>
  );
}
