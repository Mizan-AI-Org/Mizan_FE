import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search,
  ArrowLeft,
  Users,
  UserX,
  Clock,
  Eye,
  CalendarClock,
  MoreHorizontal,
  Radio,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenuSeparator,
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
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

type AttendanceRow = {
  staff: { id: string; name: string; role: string; avatar: string | null };
  shift: { start: string | null; end: string | null; status: string };
  shift_id: string | null;
  clock_in: string | null;
  clock_in_method?: string | null;
  is_manager_override?: boolean;
  override_reason?: string | null;
  status: string;
  late_minutes: number;
  location: string;
  timeline: Array<{ time: string; type: string }>;
  signals: string[];
};

export default function AttendanceReportsPage() {
  const { accessToken } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reportDate, setReportDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [searchTerm, setSearchTerm] = useState("");
  const [detailRow, setDetailRow] = useState<AttendanceRow | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["attendance-dashboard-report", reportDate, accessToken],
    queryFn: () => api.getAttendanceDashboard(reportDate),
    enabled: !!accessToken,
    staleTime: 15_000,
  });

  const rows = data?.attendance_list ?? [];
  const summary = data?.summary;

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = (r.staff?.name || "").toLowerCase();
      const role = (r.staff?.role || "").toLowerCase();
      const sig = (r.signals || []).join(" ").toLowerCase();
      return name.includes(q) || role.includes(q) || sig.includes(q);
    });
  }, [rows, searchTerm]);

  const markNoShowMutation = useMutation({
    mutationFn: (shiftId: string) => api.markShiftNoShow(shiftId),
    onSuccess: (res) => {
      toast.success(res.message || t("reporting.attendance_team.toast_no_show"));
      queryClient.invalidateQueries({ queryKey: ["attendance-dashboard-report", reportDate] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "absent" || s === "no_show")
      return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-900/50";
    if (s === "late")
      return "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border-amber-200 dark:border-amber-900/50";
    if (s === "on_time" || s === "present" || s === "clocked_out")
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50";
    if (s === "scheduled")
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    return "bg-slate-100 text-slate-700 dark:bg-slate-800";
  };

  const canMarkNoShow = (row: AttendanceRow) =>
    !!row.shift_id &&
    row.shift?.status !== "NO_SHOW" &&
    (row.status === "absent" || row.status === "late" || row.status === "scheduled");

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-500 dark:text-slate-400">
        {t("reporting.attendance_team.loading")}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center text-red-600 dark:text-red-400">
        {error instanceof Error ? error.message : t("reporting.attendance_team.error")}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white shrink-0">
            {t("reporting.attendance_team.title")}
          </h1>
          <div className="flex flex-col items-stretch sm:items-end gap-1.5 sm:shrink-0 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Label htmlFor="report-date" className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
                {t("reporting.attendance_team.date_label")}
              </Label>
              <Input
                id="report-date"
                type="date"
                value={reportDate}
                max={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => setReportDate(e.target.value)}
                className="h-9 w-[155px] bg-white dark:bg-slate-950"
              />
              <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => refetch()}>
                <Radio className="h-3.5 w-3.5" />
                {t("reporting.attendance_team.refresh")}
              </Button>
            </div>
            {data?.is_today === false ? (
              <p className="text-[11px] text-slate-500 sm:text-right">{t("reporting.attendance_team.historical_hint")}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
          <CardHeader className="px-4 py-2.5 pb-1.5 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              {t("reporting.attendance_team.kpi_present")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {summary?.present?.count ?? 0} / {summary?.present?.total ?? 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
              {summary?.present?.percentage ?? 0}% {t("reporting.attendance_team.kpi_present_sub")}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
          <CardHeader className="px-4 py-2.5 pb-1.5 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              {t("reporting.attendance_team.kpi_late")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{summary?.late?.count ?? 0}</div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
              {t("reporting.attendance_team.kpi_late_sub", {
                avg: summary?.late?.avg_minutes ?? 0,
              })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
          <CardHeader className="px-4 py-2.5 pb-1.5 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <UserX className="h-3.5 w-3.5 text-red-600 shrink-0" />
              {t("reporting.attendance_team.kpi_absent")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{summary?.absent?.count ?? 0}</div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{t("reporting.attendance_team.kpi_absent_sub")}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("reporting.attendance_team.search_placeholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("reporting.attendance_team.col_team")}</TableHead>
                  <TableHead>{t("reporting.attendance_team.col_shift")}</TableHead>
                  <TableHead className="text-right">{t("reporting.attendance_team.col_clock_in")}</TableHead>
                  <TableHead>{t("reporting.attendance_team.col_status")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("reporting.attendance_team.col_signals")}</TableHead>
                  <TableHead className="text-right w-[100px]">{t("reporting.attendance_team.col_actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                      {t("reporting.attendance_team.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row, idx) => (
                    <TableRow key={`${row.staff?.id}-${row.shift_id ?? "u"}-${idx}`}>
                      <TableCell>
                        <div className="font-medium text-slate-900 dark:text-white">{row.staff?.name}</div>
                        <div className="text-xs text-slate-500">{row.staff?.role}</div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {row.shift?.start && row.shift?.end
                          ? `${row.shift.start} – ${row.shift.end}`
                          : row.shift?.status === "UNSCHEDULED"
                            ? t("reporting.attendance_team.unscheduled")
                            : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {row.clock_in ?? "—"}
                        {row.is_manager_override ? (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            {t("reporting.attendance_team.manager_override")}
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("font-medium capitalize", statusBadge(row.status))}>
                          {row.status?.replace(/_/g, " ")}
                        </Badge>
                        {row.late_minutes > 0 ? (
                          <span className="text-xs text-amber-700 dark:text-amber-400 ml-2">+{row.late_minutes}m</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-slate-600 dark:text-slate-400 max-w-[220px]">
                        {(row.signals || []).join(" · ") || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <span className="sr-only">{t("reporting.attendance_team.actions_menu")}</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel>{t("reporting.attendance_team.actions_menu")}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDetailRow(row)}
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              {t("reporting.attendance_team.action_details")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => navigate("/dashboard/scheduling")}
                            >
                              <CalendarClock className="mr-2 h-4 w-4" />
                              {t("reporting.attendance_team.action_schedule")}
                            </DropdownMenuItem>
                            {canMarkNoShow(row) ? (
                              <DropdownMenuItem
                                className="cursor-pointer text-red-600 focus:text-red-600"
                                disabled={markNoShowMutation.isPending}
                                onClick={() => row.shift_id && markNoShowMutation.mutate(row.shift_id)}
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                {t("reporting.attendance_team.action_no_show")}
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {data?.recent_activity && data.recent_activity.length > 0 ? (
        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base">{t("reporting.attendance_team.recent_activity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.recent_activity.map((ev) => (
                <li key={ev.id} className="flex justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0">
                  <span className="text-slate-700 dark:text-slate-300">
                    <span className="font-medium">{ev.staff_name}</span> — {ev.event}
                  </span>
                  <span className="text-slate-500 shrink-0">{ev.time}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={!!detailRow} onOpenChange={(open) => !open && setDetailRow(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("reporting.attendance_team.detail_title")}</DialogTitle>
            <DialogDescription>
              {detailRow?.staff?.name} · {format(new Date(reportDate + "T12:00:00"), "PPP")}
            </DialogDescription>
          </DialogHeader>
          {detailRow && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-slate-500">{t("reporting.attendance_team.detail_role")}</div>
                <div className="font-medium">{detailRow.staff.role}</div>
                <div className="text-slate-500">{t("reporting.attendance_team.detail_shift")}</div>
                <div>
                  {detailRow.shift?.start && detailRow.shift?.end
                    ? `${detailRow.shift.start} – ${detailRow.shift.end}`
                    : "—"}
                </div>
                <div className="text-slate-500">{t("reporting.attendance_team.detail_clock_in")}</div>
                <div>{detailRow.clock_in ?? "—"}</div>
                <div className="text-slate-500">{t("reporting.attendance_team.detail_status")}</div>
                <div className="capitalize">{detailRow.status?.replace(/_/g, " ")}</div>
              </div>
              {detailRow.override_reason ? (
                <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                  {detailRow.override_reason}
                </p>
              ) : null}
              <div>
                <h4 className="text-sm font-semibold mb-2">{t("reporting.attendance_team.detail_timeline")}</h4>
                {detailRow.timeline?.length ? (
                  <ul className="space-y-1 text-sm border rounded-lg p-3 bg-slate-50 dark:bg-slate-900/50">
                    {detailRow.timeline.map((ev, i) => (
                      <li key={i} className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">{ev.type}</span>
                        <span className="font-mono">{ev.time}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">{t("reporting.attendance_team.no_timeline")}</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            {detailRow && canMarkNoShow(detailRow) && detailRow.shift_id ? (
              <Button
                variant="destructive"
                disabled={markNoShowMutation.isPending}
                onClick={() => {
                  markNoShowMutation.mutate(detailRow.shift_id!);
                  setDetailRow(null);
                }}
              >
                {t("reporting.attendance_team.action_no_show")}
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setDetailRow(null)}>
              {t("reporting.attendance_team.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
