import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";
import { SectionHeader, EmptyOpsState } from "@/components/os";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatMoney,
  resolveFinancialSnapshot7d,
} from "@/lib/financial-snapshot";

export default function FinancialPnLPage() {
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
        <EmptyOpsState title={t("financials.pnl.loading")} />
      </div>
    );
  }

  if (isError || !snap) {
    return (
      <div className={PAGE_SHELL_PADDED}>
        <EmptyOpsState
          title={t("financials.pnl.empty_title")}
          description={t("financials.pnl.empty_desc")}
        />
      </div>
    );
  }

  const fmt = (n: number) => formatMoney(n, snap.currency);

  const lines: Array<{
    key: string;
    label: string;
    amount: number;
    emphasis?: "total" | "subtotal";
    indent?: boolean;
  }> = [
    { key: "revenue", label: t("financials.pnl.line_revenue"), amount: snap.revenue },
    {
      key: "food",
      label: t("financials.pnl.line_food_cost"),
      amount: -snap.food_cost,
      indent: true,
    },
    {
      key: "gross",
      label: t("financials.pnl.line_gross_profit"),
      amount: snap.gross_profit,
      emphasis: "subtotal",
    },
    {
      key: "labor",
      label: t("financials.pnl.line_labor_cost"),
      amount: -snap.labor_cost,
      indent: true,
    },
    {
      key: "net",
      label: t("financials.pnl.line_net_profit"),
      amount: snap.net_profit,
      emphasis: "total",
    },
  ];

  return (
    <div className={`${PAGE_SHELL_PADDED} space-y-8`}>
      <SectionHeader
        as="h1"
        title={t("financials.pnl.title")}
        description={t("financials.pnl.subtitle")}
        titleClassName="text-page-title"
      />

      <p className="text-sm text-muted-foreground">{t("financials.pnl.period_7d")}</p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("financials.pnl.statement_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("financials.pnl.col_line")}</TableHead>
                <TableHead className="text-right">{t("financials.pnl.col_amount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow
                  key={line.key}
                  className={
                    line.emphasis === "total"
                      ? "border-t-2 font-semibold bg-muted/30"
                      : line.emphasis === "subtotal"
                        ? "font-medium"
                        : undefined
                  }
                >
                  <TableCell className={line.indent ? "pl-8 text-muted-foreground" : undefined}>
                    {line.label}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${
                      line.amount < 0 ? "text-rose-600 dark:text-rose-400" : ""
                    }`}
                  >
                    {line.amount < 0 ? `(${fmt(-line.amount)})` : fmt(line.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground max-w-2xl">{t("financials.pnl.footnote")}</p>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link to="/dashboard/financials/margins">{t("nav.financials.margins")}</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/dashboard/reports/sales/daily">{t("financials.pnl.link_reports")}</Link>
        </Button>
      </div>
    </div>
  );
}
