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
import { API_BASE } from "@/lib/api";
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

const ReportsPage: React.FC = () => {
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
      if (!response.ok) throw new Error("Failed to fetch reports");
      return response.json();
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

  if (isLoading) {
    return (
      <div className={PAGE_SHELL_PADDED}>
        <EmptyOpsState title="Loading reports…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={PAGE_SHELL_PADDED}>
        <EmptyOpsState title="Couldn't load reports" description={(error as Error).message} />
      </div>
    );
  }

  if (!user || !["SUPER_ADMIN", "ADMIN", "MANAGER", "OWNER"].includes(user.role)) {
    return (
      <div className={PAGE_SHELL_PADDED}>
        <EmptyOpsState title="No access" description="You do not have permission to view this page." />
      </div>
    );
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

  return (
    <div className={PAGE_SHELL_PADDED}>
      <div className="space-y-section">
        <SectionHeader
          as="h1"
          eyebrow="Business"
          title={t("reporting.title")}
          description={t("reporting.description")}
          titleClassName="text-page-title"
        />

        <section className="os-section">
          <SectionHeader title={t("reportsPage.hub_section")} />
          <ul className="divide-y divide-border border-y border-border">
            {hubLinks.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="flex items-start gap-3 py-4 transition-colors hover:bg-muted/50"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-muted text-foreground">
                    <item.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-card-title flex items-center gap-1.5">
                      {t(item.titleKey)}
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    </p>
                    <p className="mt-1 text-body text-foreground/80">{t(item.descKey)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="os-section space-y-4">
          <SectionHeader
            title={t("reportsPage.generate_title")}
            description={t("reportsPage.generate_desc")}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

        <section className="os-section">
          <SectionHeader title={t("reportsPage.generated_list_title")} />
          {reports.length === 0 ? (
            <EmptyOpsState
              title={t("reportsPage.empty")}
              description="Generate a report above when you need a decision-ready summary."
            />
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {reports.map((report) => (
                <li
                  key={report.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className="text-card-title">
                      {(() => {
                        const key = ReportTypes.find((type) => type.value === report.report_type)?.labelKey;
                        return key ? t(key) : report.report_type;
                      })()}
                    </p>
                    <p className="mt-1 type-secondary">
                      {t("reportsPage.generated_by")} {report.generated_by_info.first_name}{" "}
                      {report.generated_by_info.last_name} ·{" "}
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
    </div>
  );
};

export default ReportsPage;
