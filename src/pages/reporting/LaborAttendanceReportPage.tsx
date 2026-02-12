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
import { AlertTriangle, Clock, UserCheck, FileCheck, FileDown, Loader2 } from "lucide-react";
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Title and download adjacent: one row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Labor & Attendance Report</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Planned vs actual hours, attendance quality, overtime, and certifications expiring
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-36"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-36"
          />
          <Select value={exportFormat} onValueChange={(v: "pdf" | "excel") => setExportFormat(v)}>
            <SelectTrigger className="w-28">
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
            className="gap-1.5"
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

      {/* Planned vs Actual Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Planned vs Actual Hours
          </CardTitle>
          <CardDescription>
            Scheduled hours vs clocked hours. Lates and no-shows from shift start vs first clock-in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingPvA ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : summary ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total planned hours</p>
                  <p className="text-2xl font-semibold">{summary.total_planned_hours}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total actual hours</p>
                  <p className="text-2xl font-semibold">{summary.total_actual_hours}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Variance</p>
                  <p className="text-2xl font-semibold">{summary.total_variance}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Late arrivals</p>
                  <p className="text-2xl font-semibold text-amber-600">{summary.late_arrivals}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">No-shows</p>
                  <p className="text-2xl font-semibold text-red-600">{summary.no_shows}</p>
                </div>
              </div>
              {byStaff.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff</TableHead>
                        <TableHead className="text-right">Planned (h)</TableHead>
                        <TableHead className="text-right">Actual (h)</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                        <TableHead className="text-right">Lates</TableHead>
                        <TableHead className="text-right">No-shows</TableHead>
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
                      }) => (
                        <TableRow key={row.staff_name}>
                          <TableCell className="font-medium">{row.staff_name}</TableCell>
                          <TableCell className="text-right">{row.planned_hours}</TableCell>
                          <TableCell className="text-right">{row.actual_hours}</TableCell>
                          <TableCell className="text-right">{row.variance}</TableCell>
                          <TableCell className="text-right">{row.late_count}</TableCell>
                          <TableCell className="text-right">{row.no_show_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No data for this period.</p>
          )}
        </CardContent>
      </Card>

      {/* Labor Compliance – Overtime */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Overtime (Labor Compliance)
          </CardTitle>
          <CardDescription>
            Staff exceeding {compliance?.overtime_threshold_hours_per_week ?? 40} hours per week in this period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCompliance ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : overtimeIncidents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Week</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Threshold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overtimeIncidents.map((inc: { staff_name: string; week: number; hours: number; threshold: number }, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{inc.staff_name}</TableCell>
                    <TableCell>Week {inc.week}</TableCell>
                    <TableCell className="text-right">{inc.hours}</TableCell>
                    <TableCell className="text-right">{inc.threshold}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No overtime incidents in this period.</p>
          )}
        </CardContent>
      </Card>

      {/* Certifications Expiring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Certifications Expiring (Next 30 Days)
          </CardTitle>
          <CardDescription>
            Staff with certifications expiring soon. Update StaffProfile.certifications with expiry dates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCerts ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : certs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Certification</TableHead>
                  <TableHead>Expiry date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certs.map((c: { staff_name: string; certification_name: string; expiry_date: string }, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{c.staff_name}</TableCell>
                    <TableCell>{c.certification_name}</TableCell>
                    <TableCell>{c.expiry_date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No certifications expiring in the next 30 days.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LaborAttendanceReportPage;
