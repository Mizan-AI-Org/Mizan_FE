/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, BarChart2, Users, Package, Clock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { API_BASE, unwrapDrfListResponse } from "@/lib/api";
import { unwrapEnvelope } from "@/lib/envelope";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";
import { EmptyOpsState, SectionHeader } from "@/components/os";

interface Report {
  id: string;
  report_type: string;
  generated_at: string;
  data: any;
  generated_by_info: { first_name: string; last_name: string };
}

const ReportTypes = [
  { value: "SALES_SUMMARY", labelKey: "reports.type.sales_summary" },
  { value: "ATTENDANCE_OVERVIEW", labelKey: "reports.type.attendance_overview" },
  { value: "INVENTORY_STATUS", labelKey: "reports.type.inventory_status" },
  { value: "SHIFT_PERFORMANCE", labelKey: "reports.type.shift_performance" },
];

export function ReportsWorkspace({ variant = "standalone" }: { variant?: "standalone" | "intelligence" }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedReportType, setSelectedReportType] = useState<string>(ReportTypes[0].value);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [viewingReport, setViewingReport] = useState<Report | null>(null);

  const { data: reports = [], isLoading, error } = useQuery<Report[]>({
    queryKey: ["reports", user?.restaurant?.id],
    queryFn: async () => {
      if (!user?.restaurant?.id) return [];
      const response = await fetch(`${API_BASE}/reporting/reports/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (!response.ok) return [];
      return unwrapDrfListResponse<Report>(unwrapEnvelope(await response.json()));
    },
    enabled:
      !!user?.restaurant?.id &&
      (user.role === "SUPER_ADMIN" ||
        user.role === "ADMIN" ||
        user.role === "MANAGER" ||
        user.role === "OWNER"),
  });

  const generateReportMutation = useMutation({
    mutationFn: async (data: { report_type: string; start_date: string; end_date: string }) => {
      const response = await fetch(`${API_BASE}/reporting/reports/generate/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate report");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success(t("generic.toast.report_generated_successfully"));
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to generate report.");
    },
  });

  const renderReportData = (report: Report) => {
    switch (report.report_type) {
      case "SALES_SUMMARY":
        return (
          <div className="space-y-2 text-body">
            <p>
              <span className="font-medium">Total Sales:</span> ${report.data.total_sales}
            </p>
            <p>
              <span className="font-medium">Orders:</span> {report.data.total_orders}
            </p>
          </div>
        );
      default:
        return (
          <pre className="overflow-auto rounded-control bg-muted p-3 text-caption text-foreground">
            {JSON.stringify(report.data, null, 2)}
          </pre>
        );
    }
  };

  const wrap = (node: React.ReactNode) =>
    variant === "intelligence" ? <>{node}</> : <div className={PAGE_SHELL_PADDED}>{node}</div>;

  if (isLoading) {
    return wrap(<EmptyOpsState title="Loading reports…" />);
  }

  if (error) {
    return wrap(<EmptyOpsState title="Couldn't load reports" description={(error as Error).message} />);
  }

  if (!user || !["SUPER_ADMIN", "ADMIN", "MANAGER", "OWNER"].includes(user.role)) {
    return wrap(<EmptyOpsState title="No access" description="You do not have permission to view this page." />);
  }

  const hubLinks = [
    {
      to: "/dashboard/reports/sales/daily",
      titleKey: "reporting.sections.daily.title",
      descKey: "reporting.sections.daily.description",
      icon: BarChart2,
    },
    {
      to: "/dashboard/reports/attendance",
      titleKey: "reporting.sections.attendance.title",
      descKey: "reporting.sections.attendance.description",
      icon: Users,
    },
    {
      to: "/dashboard/reports/inventory",
      titleKey: "reporting.sections.inventory.title",
      descKey: "reporting.sections.inventory.description",
      icon: Package,
    },
    {
      to: "/dashboard/reports/labor-attendance",
      titleKey: "reporting.sections.laborAttendance.title",
      descKey: "reporting.sections.laborAttendance.description",
      icon: Clock,
    },
  ];

  return wrap(
    <div className="space-y-8">
      {variant === "standalone" ? (
        <SectionHeader
          as="h1"
          title={t("reporting.title")}
          description={t("reporting.description")}
          titleClassName="text-page-title"
        />
      ) : null}

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("reportsPage.hub_section")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {hubLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <item.icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold flex items-center gap-1.5">
                  {t(item.titleKey)}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{t(item.descKey)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold">{t("reportsPage.generate_title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("reportsPage.generate_desc")}</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="report-type">{t("reportsPage.report_type")}</Label>
              <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                <SelectTrigger id="report-type">
                  <SelectValue placeholder="Select a report type" />
                </SelectTrigger>
                <SelectContent>
                  {ReportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {t(type.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start-date">{t("reportsPage.start_date")}</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-date">{t("reportsPage.end_date")}</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <Button
            className="w-full sm:w-auto"
            onClick={() =>
              generateReportMutation.mutate({
                report_type: selectedReportType,
                start_date: startDate,
                end_date: endDate,
              })
            }
            disabled={generateReportMutation.isPending}
          >
            {generateReportMutation.isPending
              ? t("reportsPage.generating")
              : t("reportsPage.generate_cta")}
          </Button>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold">{t("reportsPage.generated_list_title")}</h2>
          {reports.length === 0 ? (
            <EmptyOpsState
              title={t("reportsPage.empty")}
              description="Generate a report when you need a decision-ready summary."
            />
          ) : (
            <ul className="max-h-[420px] space-y-2 overflow-y-auto">
              {reports.map((report) => (
                <li
                  key={report.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {(() => {
                        const key = ReportTypes.find((type) => type.value === report.report_type)?.labelKey;
                        return key ? t(key) : report.report_type;
                      })()}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {format(new Date(report.generated_at), "PPP p")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setViewingReport(report)}>
                    <FileText className="h-4 w-4" aria-hidden />
                    {t("reportsPage.view_details")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className="z-[3100] max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>
              {(() => {
                const key = ReportTypes.find((type) => type.value === viewingReport?.report_type)?.labelKey;
                return (key ? t(key) : viewingReport?.report_type) + " - " + t("reportsPage.detail_title_suffix");
              })()}
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-control border border-border bg-muted/40 p-4">
            {viewingReport ? renderReportData(viewingReport) : <p>{t("reportsPage.select_report")}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingReport(null)}>
              {t("reportsPage.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>,
  );
};

const ReportsPage: React.FC = () => <ReportsWorkspace variant="standalone" />;

export default ReportsPage;
