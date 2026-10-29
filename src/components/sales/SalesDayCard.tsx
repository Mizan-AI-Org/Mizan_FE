import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { POS_INTEGRATIONS_HREF } from "@/lib/mizan-domains";
import { getSalesDay } from "@/lib/salesApi";
import { useLanguage } from "@/hooks/use-language";

const money = (value: number, currency: string, digits = 0) =>
  `${value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${currency}`;

/** The business day's sales: net before tax first, then orders, average ticket and the same day last week. */
export function SalesDayCard({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const { data, isLoading, isError } = useQuery({
    queryKey: ["sales-day", date],
    queryFn: () => getSalesDay(date),
  });

  const empty = data && !data.orders && !data.netSales;
  const pct = data?.compare.vsLastWeekPct;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <CardTitle className="text-base font-semibold">{t("sales.day.title")}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            aria-label={t("sales.day.pick_date")}
            onChange={(e) => setDate(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-md border bg-surface-raised"
          />
          {data?.completeness.posConnected && (
            <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 border-emerald-300">
              {t("sales.day.pos_live")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-5 space-y-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("dashboard.sales.loading")}</p>
        ) : isError || !data ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("dashboard.sales.error")}</p>
        ) : empty && !data.completeness.posConnected ? (
          <div className="py-8 text-center space-y-4">
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t("sales.day.no_pos")}</p>
            <Button onClick={() => navigate(POS_INTEGRATIONS_HREF)}>{t("dashboard.sales.connect_pos_cta")}</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("sales.day.net")}
                </p>
                <p className="text-3xl font-bold tabular-nums">{money(data.netSales, data.currency)}</p>
              </div>
              {pct != null && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 pb-1">
                  {pct >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" aria-hidden />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-rose-600" aria-hidden />
                  )}
                  <span className="font-medium text-foreground">{`${pct > 0 ? "+" : ""}${pct}%`}</span>
                  {t(data.compare.sameTimeOnly ? "sales.day.vs_last_week_so_far" : "sales.day.vs_last_week", {
                    amount: money(data.compare.sameDayLastWeek, data.currency),
                  })}
                </p>
              )}
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                [t("dashboard.sales.orders"), String(data.orders)],
                [t("dashboard.sales.avg_ticket"), money(data.averageTicket, data.currency)],
                [t("sales.day.with_tax"), money(data.totalWithTax, data.currency)],
                [t("sales.day.refunds"), money(data.refunds, data.currency)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-muted/50 p-3">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-base font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            {data.topItems.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  {t("sales.day.top_items")}
                </p>
                <ul className="divide-y">
                  {data.topItems.slice(0, 6).map((item) => (
                    <li key={item.name} className="flex items-center justify-between py-1.5 text-sm">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{item.name}</span>
                        {!item.linked && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {t("sales.day.not_linked")}
                          </Badge>
                        )}
                      </span>
                      <span className="tabular-nums text-muted-foreground shrink-0">
                        ×{item.quantity} · {money(item.revenue, data.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(data.completeness.stale || data.completeness.dayOpen) && (
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" aria-hidden />
                {data.completeness.stale ? t("sales.day.stale") : t("sales.day.open_day")}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
