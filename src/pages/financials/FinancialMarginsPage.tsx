import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";
import { SectionHeader, EmptyOpsState } from "@/components/os";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatMoney,
  resolveFinancialSnapshot7d,
} from "@/lib/financial-snapshot";

export default function FinancialMarginsPage() {
  const { t } = useLanguage();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["domain-world", "financials"],
    queryFn: () => api.getDomainWorld("financials"),
    staleTime: 60_000,
  });

  const snap = resolveFinancialSnapshot7d(data);

  if (isLoading) {
    return (
      <div className={PAGE_SHELL_PADDED}>
        <EmptyOpsState title={t("financials.margins.loading")} />
      </div>
    );
  }

  if (isError || !snap) {
    return (
      <div className={PAGE_SHELL_PADDED}>
        <EmptyOpsState
          title={t("financials.margins.empty_title")}
          description={t("financials.margins.empty_desc")}
        />
      </div>
    );
  }

  const marginCards = [
    {
      label: t("financials.margins.gross_margin"),
      value: `${snap.gross_margin_pct.toFixed(1)}%`,
      hint: t("financials.margins.gross_hint"),
    },
    {
      label: t("financials.margins.net_margin"),
      value: `${snap.net_margin_pct.toFixed(1)}%`,
      hint: t("financials.margins.net_hint"),
    },
    {
      label: t("financials.margins.food_cost_ratio"),
      value: `${snap.food_cost_pct.toFixed(1)}%`,
      hint: t("financials.margins.food_hint"),
      href: "/dashboard/financials/costs",
    },
    {
      label: t("financials.margins.labor_cost_ratio"),
      value: `${snap.labor_cost_pct.toFixed(1)}%`,
      hint: t("financials.margins.labor_hint"),
      href: "/dashboard/employees",
    },
  ];

  return (
    <div className={`${PAGE_SHELL_PADDED} space-y-8`}>
      <SectionHeader
        as="h1"
        title={t("financials.margins.title")}
        description={t("financials.margins.subtitle")}
        titleClassName="text-page-title"
      />

      <p className="text-sm text-muted-foreground">{t("financials.margins.period_7d")}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {marginCards.map((card) => (
          <Card key={card.label} className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-2xl font-bold tabular-nums">{card.value}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{card.hint}</p>
              {card.href ? (
                <Link
                  to={card.href}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {t("financials.margins.drill_down")}
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
            <CardTitle className="text-base">{t("financials.margins.revenue_context")}</CardTitle>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/financials/revenue">{t("nav.financials.revenue")}</Link>
          </Button>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t("financials.margins.revenue_context_desc", {
            amount: formatMoney(snap.revenue, snap.currency),
          })}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link to="/dashboard/financials/pnl">{t("nav.financials.pnl")}</Link>
        </Button>
      </div>
    </div>
  );
}
