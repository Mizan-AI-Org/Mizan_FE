import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { AlertTriangle, Clock, FileCheck, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

const LaborAttendanceReportPage: React.FC = () => {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfWeek(today), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfWeek(today), "yyyy-MM-dd"));
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("excel");
  const [exporting, setExporting] = useState(false);

  const downloadAttendanceForHR = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      toast.error("Please log in to download the report.");
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
      toast.success(`Report downloaded as ${fmt.toUpperCase()}. You can send it to HR for payroll.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to download report");
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
  const byStaff = plannedVsActual?.by_staff ?? [];
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
              Labor & Attendance Report
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
              Planned vs actual hours, attendance quality, overtime, and certifications expiring.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
              <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">From</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-32 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
              <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">To</label>
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
              {exporting ? "Generating…" : "Download"}
            </Button>
          </div>
        </div>

        {/* Planned vs Actual Hours */}
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingPvA ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading…</span>
              </div>
            ) : summary ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {[
                    { label: "Total planned (h)", value: summary.total_planned_hours, className: "" },
                    { label: "Total actual (h)", value: summary.total_actual_hours, className: "" },
                    {
                      label: "Variance",
                      value: summary.total_variance,
                      className: varianceNum < 0 ? "text-red-600 dark:text-red-400" : varianceNum > 0 ? "text-emerald-600 dark:text-emerald-400" : "",
                    },
                    { label: "Late arrivals", value: summary.late_arrivals, className: "text-amber-600 dark:text-amber-400" },
                    { label: "No-shows", value: summary.no_shows, className: "text-red-600 dark:text-red-400" },
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
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Staff</TableHead>
                          <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Planned (h)</TableHead>
                          <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Actual (h)</TableHead>
                          <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Variance</TableHead>
                          <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Lates</TableHead>
                          <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">No-shows</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byStaff.map((row: {
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
                  </div>
                )}
              </>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No data for this period.</p>
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
              Overtime (Labor Compliance)
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Staff exceeding {compliance?.overtime_threshold_hours_per_week ?? 40} hours per week in this period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCompliance ? (
              <div className="flex items-center gap-2 py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading…</span>
              </div>
            ) : overtimeIncidents.length > 0 ? (
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Staff</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Week</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Hours</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Threshold</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overtimeIncidents.map((inc: { staff_name: string; week: number; hours: number; threshold: number }, i: number) => (
                      <TableRow
                        key={i}
                        className="border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                      >
                        <TableCell className="font-medium py-3">{inc.staff_name}</TableCell>
                        <TableCell className="py-3">Week {inc.week}</TableCell>
                        <TableCell className="text-right tabular-nums py-3">{inc.hours}</TableCell>
                        <TableCell className="text-right tabular-nums py-3">{inc.threshold}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No overtime incidents in this period.</p>
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
              Certifications Expiring (Next 30 Days)
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Staff with certifications expiring soon. Update StaffProfile.certifications with expiry dates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCerts ? (
              <div className="flex items-center gap-2 py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading…</span>
              </div>
            ) : certs.length > 0 ? (
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Staff</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Certification</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Expiry date</TableHead>
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
              <p className="py-6 text-center text-sm text-muted-foreground">No certifications expiring in the next 30 days.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LaborAttendanceReportPage;
