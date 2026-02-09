import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";

const cardBase =
  "border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl";
const cardHeaderBase =
  "flex flex-row items-center justify-between pb-2 space-y-0 px-6 pt-6";

export default function DashboardAttendancePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.getDashboardSummary(),
    refetchOnWindowFocus: false,
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1419] p-4 md:p-6 lg:p-7 pb-28 font-sans antialiased text-slate-900 dark:text-slate-100">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full"
              onClick={() => navigate("/dashboard")}
              aria-label={t("common.back_to_dashboard")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Critical issues & attendance
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                {criticalCount + operationalCount > 0
                  ? `${criticalCount + operationalCount} item(s) need attention`
                  : "All clear right now"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="shrink-0"
          >
            {t("common.back_to_dashboard")}
          </Button>
        </header>

        {/* All insights (critical + operational + rest) */}
        <Card
          className={`${cardBase} ${
            criticalCount > 0 ? "border-red-200 dark:border-red-900/40" : ""
          }`}
        >
          <CardHeader className={cardHeaderBase}>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              {t("dashboard.insights.title")}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {insights.length} total
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2 px-6 pb-6 pt-0">
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
                  const onClick = it.action_url
                    ? () => navigate(String(it.action_url))
                    : undefined;
                  return onClick ? (
                    <button
                      key={it.id || idx}
                      type="button"
                      onClick={onClick}
                      className={`group w-full text-left rounded-xl px-3 py-3 -mx-3 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${containerExtra}`}
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
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                            </div>
                          </div>
                          {it.recommended_action && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-snug">
                              {level === "CRITICAL" ? "Action" : "Recommendation"}:{" "}
                              {it.recommended_action}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ) : (
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
                              {it.summary ||
                                t("dashboard.insights.item_fallback")}
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${levelPill}`}
                            >
                              {level}
                            </Badge>
                          </div>
                          {it.recommended_action && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-snug">
                              {level === "CRITICAL"
                                ? "Action"
                                : "Recommendation"}:{" "}
                              {it.recommended_action}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staffing & coverage summary */}
        <Card className={cardBase}>
          <CardHeader className={cardHeaderBase}>
            <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              {t("dashboard.staffing.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2 pb-6 px-6">
            <div className="flex flex-wrap gap-6">
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {isLoading ? "…" : summary?.attendance?.shift_gaps ?? 0}
                </div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t("dashboard.staffing.uncovered")}
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {isLoading ? "…" : noShowsCount}
                </div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t(noShowsLabelKey)}
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {isLoading ? "…" : summary?.attendance?.ot_risk ?? 0}
                </div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t("dashboard.staffing.ot_risk")}
                </div>
              </div>
            </div>
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
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
            <div className="pt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard/staff-app")}
              >
                Open Staff app
              </Button>
              <Button
                variant="outline"
                size="sm"
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
