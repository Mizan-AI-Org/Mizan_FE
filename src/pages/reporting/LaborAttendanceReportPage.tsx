import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { API_BASE } from "@/lib/api";
import { AlertTriangle, Clock, FileCheck, FileDown, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 15;

const LaborAttendanceReportPage: React.FC = () => {
  const { t } = useLanguage();
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfWeek(today), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfWeek(today), "yyyy-MM-dd"));
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("excel");
  const [exporting, setExporting] = useState(false);
  const [staffPage, setStaffPage] = useState(1);

  useEffect(() => {
    setStaffPage(1);
  }, [startDate, endDate]);

  const downloadAttendanceForHR = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      toast.error(t("reporting.labor.export_login"));
      return;
    }
    setExporting(true);
    try {
      const fmt = exportFormat === "pdf" ? "pdf" : "excel";
      const url = `${API_BASE}/reporting/attendance/export/?format=${fmt}&start_date=${startDate}&end_date=${endDate}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || res.statusText || "Export failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^";]+)"?/);
      const filename = match ? match[1] : `staff_attendance_report_${startDate}_${endDate}.${fmt === "pdf" ? "pdf" : "xlsx"}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      toast.success(t("reporting.labor.export_success", { format: fmt.toUpperCase() }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("reporting.labor.export_failed"));
    } finally {
      setExporting(false);
    }
  };

  const { data: plannedVsActual, isLoading: loadingPvA } = useQuery({
    queryKey: ["labor-planned-vs-actual", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/reporting/labor/planned-vs-actual/?start_date=${startDate}&end_date=${endDate}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } }
      );
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: compliance, isLoading: loadingCompliance } = useQuery({
    queryKey: ["labor-compliance", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/reporting/labor/compliance/?start_date=${startDate}&end_date=${endDate}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } }
      );
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: certsExpiring, isLoading: loadingCerts } = useQuery({
    queryKey: ["labor-certifications-expiring", 30],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/reporting/labor/certifications-expiring/?within_days=30`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } }
      );
      if (!res.ok) return null;
      return res.json();
    },
  });

  const summary = plannedVsActual?.summary;
  const byStaffRaw = plannedVsActual?.by_staff ?? [];
  const byStaff = useMemo(() => [...byStaffRaw].sort((a: { staff_name: string }, b: { staff_name: string }) => (a.staff_name || "").localeCompare(b.staff_name || "")), [byStaffRaw]);
  const staffTotalPages = Math.max(1, Math.ceil(byStaff.length / PAGE_SIZE));
  const staffPaginated = useMemo(() => {
    const start = (staffPage - 1) * PAGE_SIZE;
    return byStaff.slice(start, start + PAGE_SIZE);
  }, [byStaff, staffPage]);
  const overtimeIncidents = compliance?.overtime_incidents ?? [];
  const certs = certsExpiring?.certifications_expiring ?? [];

  const varianceNum = typeof summary?.total_variance === "number" ? summary.total_variance : parseFloat(String(summary?.total_variance ?? 0));

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Page header */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t("reporting.labor.page_title")}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
              {t("reporting.labor.page_subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
              <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">{t("reporting.labor.from")}</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-32 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
              <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">{t("reporting.labor.to")}</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 w-32 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
              />
            </div>
            <Select value={exportFormat} onValueChange={(v: "pdf" | "excel") => setExportFormat(v)}>
              <SelectTrigger className="w-28 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={downloadAttendanceForHR}
              disabled={exporting}
              size="sm"
              className="h-9 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {exporting ? t("reporting.labor.generating") : t("reporting.labor.download")}
            </Button>
          </div>
        </div>

        {/* Planned vs Actual Hours */}
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingPvA ? (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 p-4">
                      <Skeleton className="h-3 w-24 mb-2" />
                      <Skeleton className="h-7 w-16" />
                    </div>
                  ))}
                </div>
                <TableSkeleton rowCount={5} colCount={6} />
              </div>
            ) : summary ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {[
                    { label: t("reporting.labor.total_planned_h"), value: summary.total_planned_hours, className: "" },
                    { label: t("reporting.labor.total_actual_h"), value: summary.total_actual_hours, className: "" },
                    {
                      label: t("reporting.labor.variance"),
                      value: summary.total_variance,
                      className: varianceNum < 0 ? "text-red-600 dark:text-red-400" : varianceNum > 0 ? "text-emerald-600 dark:text-emerald-400" : "",
                    },
                    { label: t("common.late_arrivals"), value: summary.late_arrivals, className: "text-amber-600 dark:text-amber-400" },
                    { label: t("reporting.labor.no_shows"), value: summary.no_shows, className: "text-red-600 dark:text-red-400" },
                  ].map(({ label, value, className }) => (
                    <div
                      key={label}
                      className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 p-4"
                    >
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                      <p className={`mt-1 text-xl font-semibold tabular-nums ${className}`}>{value}</p>
                    </div>
                  ))}
                </div>
                {byStaff.length > 0 && (
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
                    <div className="px-4 py-2 border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30 text-sm text-muted-foreground">
                      {t("reporting.labor.active_staff_count", { count: byStaff.length })}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300">{t("reporting.labor.staff")}</TableHead>
                          <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">{t("reporting.labor.planned_h")}</TableHead>
                          <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">{t("reporting.labor.actual_h")}</TableHead>
                          <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">{t("reporting.labor.variance")}</TableHead>
                          <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">{t("reporting.labor.lates")}</TableHead>
                          <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">{t("reporting.labor.no_shows")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staffPaginated.map((row: {
                          staff_name: string;
                          planned_hours: number;
                          actual_hours: number;
                          variance: number;
                          late_count: number;
                          no_show_count: number;
                        }, i: number) => (
                          <TableRow
                            key={row.staff_name}
                            className="border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                          >
                            <TableCell className="font-medium py-3">{row.staff_name}</TableCell>
                            <TableCell className="text-right tabular-nums py-3">{row.planned_hours}</TableCell>
                            <TableCell className="text-right tabular-nums py-3">{row.actual_hours}</TableCell>
                            <TableCell
                              className={`text-right tabular-nums py-3 ${
                                Number(row.variance) < 0 ? "text-red-600 dark:text-red-400" : Number(row.variance) > 0 ? "text-emerald-600 dark:text-emerald-400" : ""
                              }`}
                            >
                              {row.variance}
                            </TableCell>
                            <TableCell className="text-right tabular-nums py-3 text-amber-600 dark:text-amber-400">{row.late_count}</TableCell>
                            <TableCell className="text-right tabular-nums py-3 text-red-600 dark:text-red-400">{row.no_show_count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {staffTotalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30">
                        <span className="text-sm text-muted-foreground">
                          {t("reporting.labor.pagination_page", { current: staffPage, total: staffTotalPages })}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={staffPage <= 1}
                            onClick={() => setStaffPage((p) => Math.max(1, p - 1))}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            {t("reporting.labor.pagination_prev")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={staffPage >= staffTotalPages}
                            onClick={() => setStaffPage((p) => Math.min(staffTotalPages, p + 1))}
                          >
                            {t("reporting.labor.pagination_next")}
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("reporting.labor.no_data")}</p>
            )}
          </CardContent>
        </Card>

        {/* Overtime */}
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </span>
              {t("reporting.labor.overtime_title")}
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {t("reporting.labor.overtime_desc", { hours: compliance?.overtime_threshold_hours_per_week ?? 40 })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCompliance ? (
              <TableSkeleton rowCount={4} colCount={4} />
            ) : overtimeIncidents.length > 0 ? (
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">{t("reporting.labor.staff")}</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">{t("reporting.labor.week")}</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">{t("reporting.labor.hours")}</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">{t("reporting.labor.threshold")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overtimeIncidents.map((inc: { staff_name: string; week: number; hours: number; threshold: number }, i: number) => (
                      <TableRow
                        key={i}
                        className="border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                      >
                        <TableCell className="font-medium py-3">{inc.staff_name}</TableCell>
                        <TableCell className="py-3">{t("reporting.labor.week_num", { num: inc.week })}</TableCell>
                        <TableCell className="text-right tabular-nums py-3">{inc.hours}</TableCell>
                        <TableCell className="text-right tabular-nums py-3">{inc.threshold}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("reporting.labor.no_overtime")}</p>
            )}
          </CardContent>
        </Card>

        {/* Certifications Expiring */}
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <FileCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </span>
              {t("reporting.labor.certs_title")}
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {t("reporting.labor.certs_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCerts ? (
              <TableSkeleton rowCount={4} colCount={3} />
            ) : certs.length > 0 ? (
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">{t("reporting.labor.staff")}</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">{t("reporting.labor.certification")}</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">{t("common.expiry_date")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certs.map((c: { staff_name: string; certification_name: string; expiry_date: string }, i: number) => (
                      <TableRow
                        key={i}
                        className="border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                      >
                        <TableCell className="font-medium py-3">{c.staff_name}</TableCell>
                        <TableCell className="py-3">{c.certification_name}</TableCell>
                        <TableCell className="py-3 tabular-nums">{c.expiry_date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("reporting.labor.no_certs_expiring")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LaborAttendanceReportPage;
