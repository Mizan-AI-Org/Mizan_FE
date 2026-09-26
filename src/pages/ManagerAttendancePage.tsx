import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  Users,
  UserCheck,
  Clock,
  Coffee,
  Calendar,
  Activity,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";
import { cn } from "@/lib/utils";

type AttendanceDashboardSummary = {
  present: { count: number; percentage: number; total: number };
  late: { count: number; avg_minutes: number };
  absent: { count: number; reason: string };
  on_leave: { count: number; subtitle: string };
};

type AttendanceListItem = {
  staff: { id: string; name: string; role?: string | null; avatar?: string | null };
  shift: { start?: string | null; end?: string | null; status?: string };
  shift_id?: string | null;
  clock_in?: string | null;
  clock_out?: string | null;
  status: string;
  late_minutes?: number;
  signals?: string[];
};

function isClockedInRow(item: AttendanceListItem): boolean {
  return Boolean(item.clock_in);
}

function isFloorRelevant(item: AttendanceListItem): boolean {
  if (item.clock_in) return true;
  return ["on_time", "late", "present", "absent", "scheduled", "on_leave", "clocked_out"].includes(
    item.status,
  );
}

type AttendanceActivityEvent = {
  id: string;
  time: string;
  staff_name: string;
  event: string;
};

type AttendanceDashboardData = {
  summary?: AttendanceDashboardSummary;
  attendance_list?: AttendanceListItem[];
  recent_activity?: AttendanceActivityEvent[];
};

function PaginationControls({
  currentPage,
  count,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  count: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useLanguage();
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  if (totalPages <= 1) return null;
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card px-1 py-0.5">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label={t("common.previous_page")}
        className="p-1.5 text-slate-400 hover:text-emerald-600 disabled:opacity-30 transition-colors rounded-md"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="px-2 text-xs font-semibold tabular-nums text-slate-500">
        {currentPage} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label={t("common.next_page")}
        className="p-1.5 text-slate-400 hover:text-emerald-600 disabled:opacity-30 transition-colors rounded-md"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function ManagerAttendanceBoard() {
    const { t } = useLanguage();
    const { logout } = useAuth();
    const [liveSearch, setLiveSearch] = useState("");
    const [livePage, setLivePage] = useState(1);
    const [livePageSize, setLivePageSize] = useState(25);
    const [showFullRoster, setShowFullRoster] = useState(false);
    const { data: dashboardData, isLoading } = useQuery<AttendanceDashboardData>({
        queryKey: ["attendance-dashboard"],
        queryFn: async () => {
            try {
                return await api.getAttendanceDashboard();
            } catch (err) {
                const message = err instanceof Error ? err.message : "";
                if (/401|unauthor/i.test(message)) logout();
                throw err;
            }
        },
        refetchInterval: 60_000,
    });

    const summary: AttendanceDashboardSummary = dashboardData?.summary || {
        present: { count: 0, percentage: 0, total: 0 }, // added total to avoid NaN
        late: { count: 0, avg_minutes: 0 },
        absent: { count: 0, reason: '' },
        on_leave: { count: 0, subtitle: '' }
    };

    const attendanceList: AttendanceListItem[] = dashboardData?.attendance_list || [];
    const recentActivity: AttendanceActivityEvent[] = dashboardData?.recent_activity || [];

    // Live list: filter by search, then paginate (ready for 100+ staff)
    const liveSearchLower = (liveSearch || "").trim().toLowerCase();
    const rosterScoped = showFullRoster ? attendanceList : attendanceList.filter(isFloorRelevant);
    const filteredLiveList = liveSearchLower
        ? rosterScoped.filter(
            (item) =>
                item.staff.name?.toLowerCase().includes(liveSearchLower) ||
                (item.staff.role && item.staff.role.replace(/_/g, " ").toLowerCase().includes(liveSearchLower))
        )
        : rosterScoped;
    const totalLive = filteredLiveList.length;
    const liveFrom = (livePage - 1) * livePageSize;
    const liveTo = Math.min(liveFrom + livePageSize, totalLive);
    const paginatedLiveList = filteredLiveList.slice(liveFrom, liveTo);

    return (
        <div className="space-y-8">
            {/* 1. Top Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-100 dark:border-slate-800 bg-card shadow-sm">
                    <CardContent className="pt-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <UserCheck className="w-24 h-24 text-emerald-600" />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                                <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {summary.present.count} <span className="text-lg text-slate-400 font-medium">/ {summary.present.total}</span>
                                </div>
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">
                                    {summary.present.percentage}{t("staff.attendance.pct_attendance")}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-100 dark:border-slate-800 bg-card shadow-sm">
                    <CardContent className="pt-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Clock className="w-24 h-24 text-amber-500" />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {summary.late.count} <span className="text-lg text-slate-400 font-medium">{t("staff.attendance.late")}</span>
                                </div>
                                <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mt-1">
                                    {t("staff.attendance.avg_min", { count: summary.late.avg_minutes })}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-100 dark:border-slate-800 bg-card shadow-sm">
                    <CardContent className="pt-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <XCircle className="w-24 h-24 text-red-500" />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {summary.absent.count} <span className="text-lg text-slate-400 font-medium">{t("staff.attendance.absent")}</span>
                                </div>
                                <p className="text-xs font-bold text-red-600 uppercase tracking-widest mt-1">
                                    {summary.absent.reason}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-100 dark:border-slate-800 bg-card shadow-sm">
                    <CardContent className="pt-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Coffee className="w-24 h-24 text-blue-500" />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                <Coffee className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {summary.on_leave.count} <span className="text-lg text-slate-400 font-medium">{t("staff.attendance.on_leave")}</span>
                                </div>
                                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">
                                    {summary.on_leave.subtitle}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card className="border-border/80 shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Users className="h-5 w-5 text-muted-foreground" aria-hidden />
                                    {t("staff.attendance.live_list")}
                                </CardTitle>
                                <CardDescription>
                                    {showFullRoster
                                        ? t("staff.attendance.roster_full_hint", { defaultValue: "Full team roster for today." })
                                        : t("staff.attendance.roster_floor_hint", {
                                            defaultValue: "Scheduled staff, absences, and anyone who punched in.",
                                          })}
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={showFullRoster ? "outline" : "default"}
                                    onClick={() => { setShowFullRoster(false); setLivePage(1); }}
                                >
                                    {t("staff.attendance.today_floor", { defaultValue: "On floor today" })}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={showFullRoster ? "default" : "outline"}
                                    onClick={() => { setShowFullRoster(true); setLivePage(1); }}
                                >
                                    {t("staff.attendance.full_roster", { defaultValue: "Full roster" })}
                                </Button>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder={t("staff.attendance.search_placeholder")}
                                    value={liveSearch}
                                    onChange={(e) => { setLiveSearch(e.target.value); setLivePage(1); }}
                                    className="pl-9 h-10"
                                />
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{t("staff.attendance.showing", { from: totalLive === 0 ? 0 : liveFrom + 1, to: liveTo, total: totalLive })}</span>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="live-page-size" className="whitespace-nowrap">{t("staff.attendance.page_size")}</Label>
                                    <select
                                        id="live-page-size"
                                        value={livePageSize}
                                        onChange={(e) => { setLivePageSize(Number(e.target.value)); setLivePage(1); }}
                                        className="h-9 rounded-md border border-input bg-background text-foreground text-xs px-2"
                                    >
                                        {[25, 50, 100].map((n) => (
                                            <option key={n} value={n}>{n}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto max-h-[min(72vh,780px)] overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                                <TableRow>
                                    <TableHead className="min-w-[200px]">{t("staff.page.title")}</TableHead>
                                    <TableHead className="hidden sm:table-cell">{t("staff.invite.role")}</TableHead>
                                    <TableHead>{t("staff.attendance.shift")}</TableHead>
                                    <TableHead>{t("staff.attendance.clock_in")}</TableHead>
                                    <TableHead>{t("staff.attendance.clock_out")}</TableHead>
                                    <TableHead className="min-w-[128px]">{t("staff.attendance.status")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <>
                                        {Array.from({ length: 6 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                                <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                            </TableRow>
                                        ))}
                                    </>
                                ) : attendanceList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                                <Calendar className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <p className="text-lg font-bold text-slate-900 dark:text-white">{t("staff.attendance.no_team")}</p>
                                            <p className="text-slate-500 text-sm">{t("staff.attendance.free_day")}</p>
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedLiveList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                            {t("staff.attendance.search_placeholder")} - no match.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedLiveList.map((item) => {
                                        const clockedIn = isClockedInRow(item);
                                        const onFloor = clockedIn && !item.clock_out;
                                        return (
                                        <TableRow
                                            key={item.staff.id}
                                            className={cn(
                                                "group transition-colors",
                                                onFloor &&
                                                    "bg-emerald-500/[0.14] hover:bg-emerald-500/[0.2] dark:bg-emerald-400/[0.12] dark:hover:bg-emerald-400/[0.18] shadow-[inset_3px_0_0_0] shadow-emerald-500",
                                                clockedIn &&
                                                    !onFloor &&
                                                    "bg-emerald-500/[0.08] dark:bg-emerald-400/[0.08]",
                                                !clockedIn && "hover:bg-muted/40",
                                            )}
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-9 h-9 border border-slate-100">
                                                        {item.staff.avatar ? (
                                                            <AvatarImage src={item.staff.avatar} />
                                                        ) : null}
                                                        <AvatarFallback>{item.staff.name.substring(0, 2)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white text-sm">{item.staff.name}</p>
                                                        {/* Inline Signals */}
                                                        {item.signals?.[0] ? (
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">{item.signals[0]}</p>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide">
                                                    {item.staff.role?.replace(/_/g, " ") || "—"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm whitespace-nowrap">
                                                {item.shift.start ? (
                                                    <span className="font-medium tabular-nums">
                                                        {item.shift.start} – {item.shift.end}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                                        {t("staff.attendance.col_no_shift")}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className={cn(
                                                "text-sm font-semibold tabular-nums",
                                                clockedIn ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground",
                                            )}>
                                                {item.clock_in || <span className="text-slate-300">-</span>}
                                            </TableCell>
                                            <TableCell className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                                                {item.clock_out || <span className="text-slate-300">-</span>}
                                            </TableCell>
                                            <TableCell>
                                                {/* Status Badges */}
                                                {item.status === 'on_time' && (
                                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none px-2 py-1 gap-1.5 flex w-fit">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        {t("staff.attendance.on_time")}
                                                    </Badge>
                                                )}
                                                {item.status === 'late' && (
                                                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none px-2 py-1 gap-1.5 flex w-fit">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                        {t("staff.attendance.late")} ({item.late_minutes}m)
                                                    </Badge>
                                                )}
                                                {item.status === 'absent' && (
                                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none px-2 py-1 gap-1.5 flex w-fit">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                        {t("staff.attendance.absent")}
                                                    </Badge>
                                                )}
                                                {(item.status === 'present' || item.status === 'scheduled') && (
                                                    <Badge variant="outline" className="text-slate-500 border-slate-300">
                                                        {item.status === 'scheduled' ? t("staff.attendance.scheduled") : t("staff.attendance.present")}
                                                    </Badge>
                                                )}
                                                {item.status === 'unscheduled' && (
                                                    <Badge variant="outline" className="text-slate-400 border-slate-200">
                                                        {t("staff.attendance.unscheduled")}
                                                    </Badge>
                                                )}
                                                {item.status === 'on_leave' && (
                                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none px-2 py-1 gap-1.5 flex w-fit">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                        {t("staff.attendance.on_leave")}
                                                    </Badge>
                                                )}
                                                {(item.status === 'clocked_out') && (
                                                    <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 border-none px-2 py-1 gap-1.5 flex w-fit">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                                        {t("staff.attendance.shift_over")}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                    })
                                )}
                            </TableBody>
                        </Table>
                        </div>
                        {totalLive > livePageSize ? (
                            <div className="border-t border-border p-3 flex justify-center">
                                <PaginationControls
                                    currentPage={livePage}
                                    count={totalLive}
                                    pageSize={livePageSize}
                                    onPageChange={setLivePage}
                                />
                            </div>
                        ) : null}
                    </CardContent>
                </Card>

                <Card className="border-border/80 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-4 w-4 text-muted-foreground" aria-hidden />
                            {t("staff.attendance.events")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="max-h-64 overflow-y-auto space-y-0">
                            {recentActivity.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-slate-400 text-sm">{t("staff.attendance.no_events")}</p>
                                </div>
                            ) : (
                                recentActivity.map((event, i: number) => (
                                    <div key={event.id} className="relative pl-6 pb-6 last:pb-0 border-l border-slate-100 dark:border-slate-800">
                                        <div className={cn(
                                            "absolute -left-1.5 top-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900",
                                            event.event.includes("In") ? "bg-emerald-500" :
                                                event.event.includes("Out") ? "bg-slate-400" : "bg-blue-400"
                                        )} />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-400 mb-0.5">{event.time}</span>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                <span className="font-bold">{event.staff_name}</span> {event.event.toLowerCase()}
                                            </p>
                                            {event.event.includes("Late") && (
                                                <span className="text-[10px] text-amber-600 font-bold mt-1">{t("staff.attendance.late_arrival")}</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};


export default function ManagerAttendancePage() {
  const { t } = useLanguage();
  return (
    <div className={`${PAGE_SHELL_PADDED} space-y-6 min-w-0`}>
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {t("staff.attendance.title")}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          {t("staff.attendance.live_list")}
        </p>
      </header>
      <ManagerAttendanceBoard />
    </div>
  );
}
