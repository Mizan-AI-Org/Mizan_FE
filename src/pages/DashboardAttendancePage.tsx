import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  UserX,
  Calendar,
  Loader2,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import { toast } from "sonner";

const cardBase =
  "border border-slate-200/80 dark:border-slate-700/80 shadow-sm bg-white dark:bg-slate-900 rounded-2xl transition-shadow hover:shadow-md";
const cardHeaderBase =
  "flex flex-row items-center justify-between pb-3 space-y-0 px-6 pt-6";

/** Derive insight type and ids from backend insight id (e.g. "missed_clock_in:uuid"). */
function parseInsight(it: { id?: string; impacted?: { shift_id?: string; staff?: { id: string; name: string }[] } }) {
  const id = String(it?.id || "");
  const [type] = id.split(":");
  const shiftId = it?.impacted?.shift_id ?? null;
  const staff = it?.impacted?.staff ?? [];
  return { type, shiftId, staff };
}

export default function DashboardAttendancePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [noShowConfirm, setNoShowConfirm] = useState<{ shiftId: string; staffName: string } | null>(null);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.getDashboardSummary(),
    refetchOnWindowFocus: false,
    retry: false,
  });

  const insights = (summary?.insights?.items || []) as any[];
  const criticalCount = Number(summary?.insights?.counts?.CRITICAL || 0);
  const operationalCount = Number(summary?.insights?.counts?.OPERATIONAL || 0);
  const noShowsPeriod = (() => {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  })();
  const noShowsCount = (() => {
    if (isLoading || !summary?.attendance) return 0;
    const a = summary.attendance as {
      morning_no_shows?: number;
      afternoon_no_shows?: number;
      evening_no_shows?: number;
      no_shows?: number;
    };
    switch (noShowsPeriod) {
      case "morning":
        return a.morning_no_shows ?? a.no_shows ?? 0;
      case "afternoon":
        return a.afternoon_no_shows ?? 0;
      case "evening":
        return a.evening_no_shows ?? 0;
      default:
        return a.no_shows ?? 0;
    }
  })();
  const noShowsLabelKey =
    `dashboard.staffing.${noShowsPeriod}_no_shows` as const;
  const noShowsDescKey =
    `dashboard.staffing.no_shows_${noShowsPeriod}` as const;

  const markNoShowMutation = useMutation({
    mutationFn: (shiftId: string) => api.markShiftNoShow(shiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setNoShowConfirm(null);
      toast.success("Shift marked as no-show");
    },
    onError: (err: Error) => {
      const msg = err.message || "Failed to mark as no-show";
      const friendly = msg.includes("404")
        ? "Shift not found. It may have been updated or removed—refresh the page to see the latest."
        : msg;
      toast.error(friendly);
    },
  });

  /** Map backend action_url to a valid frontend route. "View schedule" should open the schedule, not the same attendance page. */
  const getActionRoute = (actionUrl: string | undefined) => {
    const url = actionUrl || "/dashboard/scheduling";
    if (url === "/dashboard/staff-scheduling") return "/dashboard/scheduling";
    if (url === "/dashboard/attendance") return "/dashboard/scheduling";
    return url;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1419] p-4 md:p-6 lg:p-8 pb-28 font-sans antialiased text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="text-left">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Critical issues & attendance
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {criticalCount + operationalCount > 0
              ? `${criticalCount + operationalCount} item(s) need attention`
              : "All clear right now"}
          </p>
        </header>

        {/* All insights (critical + operational + rest) */}
        <Card
          className={`${cardBase} ${
            criticalCount > 0 ? "border-red-200 dark:border-red-900/40 shadow-red-100/20 dark:shadow-red-950/20" : ""
          }`}
        >
          <CardHeader className={cardHeaderBase}>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              {t("dashboard.insights.title")}
            </CardTitle>
            <Badge variant="secondary" className="text-xs font-medium tabular-nums">
              {insights.length} total
            </Badge>
          </CardHeader>
          <CardContent className="space-y-1 px-6 pb-6 pt-0">
            {isLoading ? (
              <div className="text-sm text-slate-400 py-4">
                {t("dashboard.insights.loading")}
              </div>
            ) : insights.length === 0 ? (
              <div className="text-sm text-slate-500 py-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4">
                {t("dashboard.insights.none")}
              </div>
            ) : (
              <div className="space-y-2">
                {insights.map((it, idx) => {
                  const level = String(it.level || "").toUpperCase();
                  const { type, shiftId, staff } = parseInsight(it);
                  const dot =
                    level === "CRITICAL"
                      ? "bg-red-500"
                      : level === "OPERATIONAL"
                        ? "bg-amber-500"
                        : level === "PERFORMANCE"
                          ? "bg-blue-500"
                          : "bg-emerald-500";
                  const levelPill =
                    level === "CRITICAL"
                      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                      : level === "OPERATIONAL"
                        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
                        : level === "PERFORMANCE"
                          ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200";
                  const containerExtra =
                    level === "CRITICAL"
                      ? "bg-red-50/40 dark:bg-red-950/10"
                      : "";
                  const actionUrl = getActionRoute(it.action_url);
                  const canMarkNoShow = type === "missed_clock_in" && shiftId;
                  const staffName = staff[0]?.name ?? "Staff";

                  return (
                    <div
                      key={it.id || idx}
                      className={`rounded-xl px-3 py-3 -mx-3 ${containerExtra}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${dot}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                              {it.summary || t("dashboard.insights.item_fallback")}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${levelPill}`}
                              >
                                {level}
                              </Badge>
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </div>
                          </div>
                          {it.recommended_action && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-snug">
                              {level === "CRITICAL" ? "Action" : "Recommendation"}:{" "}
                              {it.recommended_action}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            {canMarkNoShow && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs rounded-lg gap-1.5 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30"
                                onClick={() => setNoShowConfirm({ shiftId, staffName })}
                              >
                                <UserX className="w-3.5 h-3.5" />
                                Mark as no-show
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs rounded-lg gap-1.5 border-slate-200 dark:border-slate-600"
                              onClick={() => navigate(actionUrl)}
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              {type === "coverage" || String(it.id || "").startsWith("coverage")
                                ? "Find coverage"
                                : String(it.id || "").startsWith("tasks")
                                  ? "Open tasks"
                                  : String(it.id || "").startsWith("safety")
                                    ? "View incident"
                                    : "View schedule"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={!!noShowConfirm} onOpenChange={(open) => !open && setNoShowConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark as no-show?</AlertDialogTitle>
              <AlertDialogDescription>
                {noShowConfirm
                  ? `This will mark the shift as no-show for ${noShowConfirm.staffName}. You can still message them via Miya to follow up.`
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                type="button"
                className="bg-red-600 hover:bg-red-700"
                onClick={(e) => {
                  e.preventDefault();
                  const { shiftId } = noShowConfirm || {};
                  if (shiftId) markNoShowMutation.mutate(shiftId);
                }}
                disabled={markNoShowMutation.isPending}
              >
                {markNoShowMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Mark no-show"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Staffing & coverage summary */}
        <Card className={cardBase}>
          <CardHeader className={cardHeaderBase}>
            <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500 shrink-0" />
              {t("dashboard.staffing.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-2 pb-6 px-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4 text-center">
                <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                  {isLoading ? "…" : summary?.attendance?.shift_gaps ?? 0}
                </div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  {t("dashboard.staffing.uncovered")}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4 text-center">
                <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                  {isLoading ? "…" : noShowsCount}
                </div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  {t(noShowsLabelKey)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4 text-center">
                <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                  {isLoading ? "…" : summary?.attendance?.ot_risk ?? 0}
                </div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  {t("dashboard.staffing.ot_risk")}
                </div>
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <AlertCircle
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    noShowsCount > 0
                      ? "text-red-500"
                      : "text-slate-300 dark:text-slate-600"
                  }`}
                />
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {isLoading ? "…" : noShowsCount}
                  </span>{" "}
                  {t(noShowsDescKey)}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {isLoading ? "…" : summary?.attendance?.shift_gaps ?? 0}
                  </span>{" "}
                  {t("dashboard.staffing.need_coverage")}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    (summary?.attendance?.ot_risk || 0) > 0
                      ? "text-amber-500"
                      : "text-slate-300 dark:text-slate-600"
                  }`}
                />
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {isLoading ? "…" : summary?.attendance?.ot_risk ?? 0}
                  </span>{" "}
                  {t("dashboard.staffing.ot_risk")}
                </p>
              </div>
            </div>
            {(summary?.attendance?.late_staff_today?.length || 0) > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  {summary.attendance.late_staff_today.length}{" "}
                  {t("dashboard.staffing.late_staff")}
                </p>
                <ul className="text-xs text-slate-600 dark:text-slate-400 mt-2 space-y-1 pl-6">
                  {summary.attendance.late_staff_today.map(
                    (m: { name: string; reason?: string }, i: number) => (
                      <li key={i}>
                        {m.name}
                        {m.reason === "missed_clock_in"
                          ? " (no clock-in)"
                          : " (late)"}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
            <div className="pt-5 flex flex-wrap gap-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="default"
                size="sm"
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 gap-2"
                onClick={() => navigate("/dashboard/scheduling")}
              >
                <Calendar className="w-4 h-4" />
                Find coverage
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg gap-2 border-slate-200 dark:border-slate-600"
                onClick={() => navigate("/dashboard/staff-app")}
              >
                <MessageSquare className="w-4 h-4" />
                Open Staff app
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg border-slate-200 dark:border-slate-600"
                onClick={() => navigate("/dashboard/reports/labor-attendance")}
              >
                Labor & attendance report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
