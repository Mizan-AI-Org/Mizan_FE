import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { arSA, enUS, fr } from "date-fns/locale";
import {
  ArrowUpDown,
  DollarSign,
  Eye,
  Loader2,
  MoreHorizontal,
  Search,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { IntelligenceShell } from "@/pages/intelligence/IntelligenceShell";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/use-language";
import { DailySalesReport } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";

export default function IntelligenceForecastsPage() {
  const { t, language } = useLanguage();
  const dateLocale = language === "fr" ? fr : language === "ar" ? arSA : enUS;
  const { accessToken } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof DailySalesReport>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedReport, setSelectedReport] = useState<DailySalesReport | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: reports, isLoading, isError } = useQuery<DailySalesReport[]>({
    queryKey: ["dailySalesReports", accessToken],
    queryFn: () => api.getDailySalesReports(accessToken!),
    enabled: !!accessToken,
  });

  const sortedAndFilteredReports = useMemo(() => {
    return (reports || [])
      .filter(
        (report) =>
          format(new Date(report.date), "PPP", { locale: dateLocale }).toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.total_revenue.toString().includes(searchTerm),
      )
      .sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        }
        return 0;
      });
  }, [reports, searchTerm, sortColumn, sortDirection, dateLocale]);

  const summary = useMemo(() => {
    const rows = reports || [];
    const revenue = rows.reduce((s, r) => s + r.total_revenue, 0);
    const orders = rows.reduce((s, r) => s + r.total_orders, 0);
    return {
      days: rows.length,
      revenue,
      orders,
      avgTicket: orders > 0 ? revenue / orders : 0,
    };
  }, [reports]);

  const handleSort = (column: keyof DailySalesReport) => {
    if (sortColumn === column) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  return (
    <IntelligenceShell
      title={t("intelligence.forecasts.title")}
      description={t("intelligence.forecasts.description")}
      askPrompt={t("intelligence.forecasts.ask")}
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("intelligence.forecasts.load_error")}</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link to="/dashboard/settings?tab=integrations#pos-integration">{t("intelligence.forecasts.connect_pos")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase text-muted-foreground">{t("intelligence.forecasts.total_revenue")}</p>
                <DollarSign className="h-4 w-4 text-primary/70" />
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">${summary.revenue.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">{t("intelligence.forecasts.days_tracked", { count: summary.days })}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase text-muted-foreground">{t("intelligence.forecasts.orders")}</p>
                <ShoppingBag className="h-4 w-4 text-primary/70" />
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{summary.orders}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase text-muted-foreground">{t("intelligence.forecasts.avg_ticket")}</p>
                <TrendingUp className="h-4 w-4 text-primary/70" />
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">${summary.avgTicket.toFixed(2)}</p>
            </div>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="relative mb-4 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("intelligence.forecasts.search")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>
                        <span className="inline-flex items-center">
                          {t("common.date")} <ArrowUpDown className="ml-2 h-4 w-4" />
                        </span>
                      </TableHead>
                      <TableHead className="cursor-pointer text-right" onClick={() => handleSort("total_revenue")}>
                        <span className="inline-flex items-center justify-end">
                          {t("intelligence.forecasts.revenue")} <ArrowUpDown className="ml-2 h-4 w-4" />
                        </span>
                      </TableHead>
                      <TableHead className="cursor-pointer text-right" onClick={() => handleSort("total_orders")}>
                        {t("intelligence.forecasts.orders")}
                      </TableHead>
                      <TableHead className="cursor-pointer text-right" onClick={() => handleSort("avg_order_value")}>
                        {t("intelligence.forecasts.avg_order")}
                      </TableHead>
                      <TableHead className="text-right">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAndFilteredReports.length ? (
                      sortedAndFilteredReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{format(new Date(report.date), "PPP", { locale: dateLocale })}</TableCell>
                          <TableCell className="text-right tabular-nums">${report.total_revenue.toFixed(2)}</TableCell>
                          <TableCell className="text-right tabular-nums">{report.total_orders}</TableCell>
                          <TableCell className="text-right tabular-nums">${report.avg_order_value.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedReport(report);
                                    setDetailsOpen(true);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" /> {t("intelligence.forecasts.view_details")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                          {t("intelligence.forecasts.empty_before")}{" "}
                          <Link to="/dashboard/settings?tab=integrations#pos-integration" className="font-medium text-primary underline-offset-2 hover:underline">
                            {t("intelligence.forecasts.connect_pos")}
                          </Link>{" "}
                          {t("intelligence.forecasts.empty_after")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t("intelligence.forecasts.detail_title")}</DialogTitle>
            <DialogDescription>
              {selectedReport ? format(new Date(selectedReport.date), "PPP", { locale: dateLocale }) : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedReport ? (
            <div className="grid gap-3 py-2 text-sm">
              <div className="flex justify-between">
                <Label>{t("intelligence.forecasts.total_revenue")}</Label>
                <span className="font-medium tabular-nums">${selectedReport.total_revenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <Label>{t("intelligence.forecasts.orders")}</Label>
                <span className="font-medium">{selectedReport.total_orders}</span>
              </div>
              <div className="flex justify-between">
                <Label>{t("intelligence.forecasts.avg_order")}</Label>
                <span className="font-medium tabular-nums">${selectedReport.avg_order_value.toFixed(2)}</span>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </IntelligenceShell>
  );
}
