import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { AuthContextType } from "../contexts/AuthContext.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  Users,
  FileText,
  Settings,
  Sparkles,
  Calendar,
  ClipboardCheck,
  Heart,
  AlertCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Badge } from "@/components/ui/badge";
import { LiveDateTime } from "@/components/LiveDateTime";
import { api } from "@/lib/api";
import { toast } from "sonner";

type AppItem = {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  gradient: string;
  description: string;
  roles?: string[];
  comingSoon?: boolean;
  nameKey?: string;
  descKey?: string;
};

const apps: AppItem[] = [
  {
    name: "PROCESSES & TASKS",
    href: "/dashboard/processes-tasks-app",
    icon: ClipboardCheck,
    gradient: "bg-teal-500",
    description: "Create and manage processes and tasks",
    nameKey: "app.tasks",
    descKey: "app.tasks.desc",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    name: "STAFF",
    href: "/dashboard/staff-app",
    icon: Users,
    gradient: "bg-violet-500",
    description: "Add and manage staff",
    nameKey: "app.staff",
    descKey: "app.staff.desc",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  },
  {
    name: "CHECKLISTS & INCIDENCES",
    href: "/dashboard/analytics",
    icon: BarChart3,
    gradient: "bg-blue-500",
    description: "View checklists and incident reports",
    nameKey: "app.analytics",
    descKey: "app.analytics.desc",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    name: "STAFF SCHEDULES",
    href: "/dashboard/shift-reviews",
    icon: FileText,
    gradient: "bg-emerald-500",
    description: "View and filter staff schedules",
    nameKey: "app.shift_reviews",
    descKey: "app.shift_reviews.desc",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  },
  {
    name: "SETTINGS",
    href: "/dashboard/settings",
    icon: Settings,
    gradient: "bg-amber-500",
    description: "Configure your system",
    nameKey: "app.settings",
    descKey: "app.settings.desc",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth() as AuthContextType;
  const { t } = useLanguage();
  const [showAllInsights, setShowAllInsights] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.getDashboardSummary(),
    // Near real-time refresh for operational insights
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
  });

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.greeting.morning");
    if (hour < 17) return t("dashboard.greeting.afternoon");
    return t("dashboard.greeting.evening");
  }, []);

  const cardBase =
    "border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 hover:shadow-md transition-all duration-300 rounded-2xl";
  const cardHeaderBase = "flex flex-row items-center justify-between pb-2 space-y-0 px-6 pt-6";

  const insights = (summary?.insights?.items || []) as any[];
  const insightsVisible = showAllInsights ? insights.slice(0, 5) : insights.slice(0, 3);
  const criticalCount = Number(summary?.insights?.counts?.CRITICAL || 0);
  const operationalCount = Number(summary?.insights?.counts?.OPERATIONAL || 0);
  const attentionNow = criticalCount + operationalCount;
  const prevCriticalRef = useRef<number>(0);

  useEffect(() => {
    if (isLoading) return;

    // Trigger an alert when critical insights appear or increase.
    if (criticalCount > 0 && criticalCount > (prevCriticalRef.current || 0)) {
      const topCritical = insights.find((x) => String(x?.level || "").toUpperCase() === "CRITICAL");
      const description = topCritical?.recommended_action
        ? String(topCritical.recommended_action)
        : "Open the Insights card to review details.";

      toast("Critical issue detected", {
        description,
        action: topCritical?.action_url
          ? {
              label: "Open",
              onClick: () => navigate(String(topCritical.action_url)),
            }
          : undefined,
      });
    }

    prevCriticalRef.current = criticalCount;
  }, [criticalCount, isLoading, insights, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1419] p-4 md:p-6 lg:p-7 pb-28 font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Section */}
        <header className="mb-2">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {greeting}, {user?.first_name || ""}
            </h1>
            <LiveDateTime showTime={false} />
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mt-1">
            {isLoading
              ? t("dashboard.status.updating")
              : attentionNow > 0
                ? t("dashboard.status.attention_now")
                : t("dashboard.status.all_clear")}
          </p>
        </header>

        {/* Attention Now */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* MIZAN AI INSIGHTS (Primary) */}
          <Card
            className={`${cardBase} lg:col-span-2 relative overflow-hidden ${
              criticalCount > 0 ? "border-red-200 dark:border-red-900/40" : ""
            }`}
          >
            <div
              className={`absolute inset-0 pointer-events-none ${
                criticalCount > 0
                  ? "bg-gradient-to-br from-red-500/12 via-transparent to-transparent"
                  : "bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent"
              }`}
            ></div>
            <CardHeader className="pb-2 px-6 pt-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      criticalCount > 0
                        ? "bg-red-500/10 dark:bg-red-500/15"
                        : "bg-emerald-500/10 dark:bg-emerald-500/15"
                    } ${criticalCount > 0 ? "animate-pulse" : ""}`}
                  >
                    {criticalCount > 0 ? (
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <div className="leading-tight">
                    <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                      {t("dashboard.insights.title")}
                    </CardTitle>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {t("dashboard.insights.subtitle")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`border-none text-[10px] font-bold h-5 px-2 ${
                      attentionNow > 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {isLoading ? "…" : attentionNow} {t("dashboard.insights.need_attention")}
                  </Badge>
                  {criticalCount > 0 && (
                    <Badge
                      variant="outline"
                      className="border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300 text-[10px] font-black h-5 px-2"
                    >
                      {criticalCount} CRITICAL
                    </Badge>
                  )}
                  {insights.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllInsights((v) => !v)}
                      className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      {showAllInsights ? t("common.show_less") : t("common.show_more")}
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 px-6 pb-6 pt-3">
              {isLoading ? (
                <div className="text-sm text-slate-400">{t("dashboard.insights.loading")}</div>
              ) : criticalCount > 0 ? (
                <>
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/40 dark:bg-red-950/25">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-red-800 dark:text-red-200">
                          Critical issues need attention
                        </div>
                        <div className="text-[11px] text-red-700/90 dark:text-red-300/80">
                          Review the top item(s) below and take action immediately.
                        </div>
                      </div>
                    </div>
                  </div>
                  {insightsVisible.length > 0 ? (
                    <div className="space-y-2">
                      {insightsVisible.map((it, idx) => {
                        const level = String(it.level || "").toUpperCase();
                        const dot =
                          level === "CRITICAL"
                            ? "bg-red-500"
                            : level === "OPERATIONAL"
                              ? "bg-amber-500"
                              : level === "PERFORMANCE"
                                ? "bg-blue-500"
                                : "bg-emerald-500";

                        const onClick = it.action_url ? () => navigate(String(it.action_url)) : undefined;
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

                        return onClick ? (
                          <button
                            key={it.id || idx}
                            type="button"
                            onClick={onClick}
                            className={`group w-full text-left rounded-xl px-3 py-2 -mx-3 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${containerExtra}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full shrink-0 mt-2 ${dot}`}></div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm text-slate-900 dark:text-white leading-tight font-semibold truncate">
                                    {it.summary || t("dashboard.insights.item_fallback")}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant="outline" className={`text-[10px] font-bold ${levelPill}`}>
                                      {level}
                                    </Badge>
                                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 mt-0.5" />
                                  </div>
                                </div>
                                {it.recommended_action && (
                                  <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug line-clamp-2 mt-0.5">
                                    {level === "CRITICAL" ? "Action" : "Recommendation"}: {it.recommended_action}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        ) : (
                          <div key={it.id || idx} className={`rounded-xl px-3 py-2 -mx-3 ${containerExtra}`}>
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full shrink-0 mt-2 ${dot}`}></div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm text-slate-900 dark:text-white leading-tight font-semibold truncate">
                                    {it.summary || t("dashboard.insights.item_fallback")}
                                  </div>
                                  <Badge variant="outline" className={`text-[10px] font-bold ${levelPill}`}>
                                    {level}
                                  </Badge>
                                </div>
                                {it.recommended_action && (
                                  <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug line-clamp-2 mt-0.5">
                                    {level === "CRITICAL" ? "Action" : "Recommendation"}: {it.recommended_action}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">{t("dashboard.insights.none")}</div>
                  )}
                </>
              ) : insightsVisible.length > 0 ? (
                <div className="space-y-2">
                  {insightsVisible.map((it, idx) => {
                    const level = String(it.level || "").toUpperCase();
                    const dot =
                      level === "CRITICAL"
                        ? "bg-red-500"
                        : level === "OPERATIONAL"
                          ? "bg-amber-500"
                          : level === "PERFORMANCE"
                            ? "bg-blue-500"
                            : "bg-emerald-500";

                    const onClick = it.action_url ? () => navigate(String(it.action_url)) : undefined;
                    const levelPill =
                      level === "CRITICAL"
                        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                        : level === "OPERATIONAL"
                          ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
                          : level === "PERFORMANCE"
                            ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200";

                    return (
                      onClick ? (
                        <button
                          key={it.id || idx}
                          type="button"
                          onClick={onClick}
                          className="group w-full text-left rounded-xl px-3 py-2 -mx-3 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full shrink-0 mt-2 ${dot}`}></div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-sm text-slate-900 dark:text-white leading-tight font-semibold truncate">
                                  {it.summary || t("dashboard.insights.item_fallback")}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge variant="outline" className={`text-[10px] font-bold ${levelPill}`}>
                                    {level}
                                  </Badge>
                                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 mt-0.5" />
                                </div>
                              </div>
                              {it.recommended_action && (
                                <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug line-clamp-2 mt-0.5">
                                  {level === "CRITICAL" ? "Action" : "Recommendation"}: {it.recommended_action}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ) : (
                        <div key={it.id || idx} className="rounded-xl px-3 py-2 -mx-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full shrink-0 mt-2 ${dot}`}></div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-sm text-slate-900 dark:text-white leading-tight font-semibold truncate">
                                  {it.summary || t("dashboard.insights.item_fallback")}
                                </div>
                                <Badge variant="outline" className={`text-[10px] font-bold ${levelPill}`}>
                                  {level}
                                </Badge>
                              </div>
                              {it.recommended_action && (
                                <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug line-clamp-2 mt-0.5">
                                  {level === "CRITICAL" ? "Action" : "Recommendation"}: {it.recommended_action}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></div>
                  <span className="text-sm text-slate-800 dark:text-white leading-tight font-medium">
                    {t("dashboard.insights.none")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Staffing & Coverage */}
          <Card className={cardBase}>
            <CardHeader className={cardHeaderBase}>
              <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {t("dashboard.staffing.title")}
              </CardTitle>
              <Users className="w-4 h-4 text-slate-300 dark:text-slate-600" />
            </CardHeader>
            <CardContent className="space-y-4 pt-2 pb-6 px-6">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    {isLoading ? "…" : summary?.attendance?.shift_gaps || 0}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {t("dashboard.staffing.uncovered")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    {isLoading ? "…" : summary?.attendance?.no_shows || 0}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {t("dashboard.staffing.morning_no_shows")}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      (summary?.attendance?.no_shows || 0) > 0 ? "text-red-500" : "text-slate-300 dark:text-slate-600"
                    }`}
                  />
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {isLoading ? "…" : summary?.attendance?.no_shows || 0}
                    </span>{" "}
                    {t("dashboard.staffing.no_shows_morning")}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {isLoading ? "…" : summary?.attendance?.shift_gaps || 0}
                    </span>{" "}
                    {t("dashboard.staffing.need_coverage")}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      (summary?.attendance?.ot_risk || 0) > 0 ? "text-amber-500" : "text-slate-300 dark:text-slate-600"
                    }`}
                  />
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {isLoading ? "…" : summary?.attendance?.ot_risk || 0}
                    </span>{" "}
                    {t("dashboard.staffing.ot_risk")}
                  </p>
                </div>
                {(summary?.attendance?.late_staff_today?.length || 0) > 0 && (
                  <div className="flex items-start gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Clock
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        (summary?.attendance?.late_staff_today?.length || 0) > 0 ? "text-amber-500" : "text-slate-300 dark:text-slate-600"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {summary.attendance.late_staff_today.length} {t("dashboard.staffing.late_staff")}
                      </p>
                      <ul className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 space-y-0.5">
                        {summary.attendance.late_staff_today.slice(0, 3).map((m: { name: string; reason?: string }, i: number) => (
                          <li key={i}>
                            {m.name}
                            {m.reason === "missed_clock_in" ? " (no clock-in)" : " (late)"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {(summary?.attendance?.ot_risk_staff?.length || 0) > 0 && (summary?.attendance?.ot_risk || 0) > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      {summary.attendance.ot_risk_staff.slice(0, 3).map((s: { staff_name?: string }) => s.staff_name || s).join(", ")}
                      {(summary.attendance.ot_risk_staff.length > 3) && " …"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today at a glance */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Tasks Due Today */}
          <Card className={cardBase}>
            <CardHeader className={cardHeaderBase}>
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {t("dashboard.tasks.title")}
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-slate-500 border-none px-0 text-[10px] font-bold h-4">{isLoading ? "..." : summary?.tasks_due?.length || 0} TODAY</Badge>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6 pt-2">
              {isLoading ? (
                <div className="text-sm text-slate-400">{t("dashboard.tasks.loading")}</div>
              ) : summary?.tasks_due?.length > 0 ? (
                summary.tasks_due.slice(0, 4).map((task: any, i: number) => (
                  <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1 -mx-1 rounded-lg transition-colors">
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate pr-4">{task.label}</span>
                    <span className={`text-[10px] whitespace-nowrap tracking-wider ${task.status === "OVERDUE" ? "text-red-500 font-bold" : "text-slate-500 dark:text-slate-400 font-medium"}`}>{task.status}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500 py-2 text-center">{t("dashboard.tasks.none")}</div>
              )}
            </CardContent>
          </Card>

          {/* Operations */}
          <Card className={cardBase}>
            <CardHeader className={cardHeaderBase}>
              <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {t("dashboard.operations.title")}
              </CardTitle>
              <Calendar className="w-4 h-4 text-slate-300 dark:text-slate-600" />
            </CardHeader>
            <CardContent className="space-y-4 pt-2 pb-6 px-6">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    {isLoading ? "…" : summary?.operations?.completion_rate || 0}%
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {t("dashboard.operations.completion_today")}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-none text-[10px] font-bold h-5 px-2 text-slate-600 dark:text-slate-300"
                >
                  {isLoading ? "…" : summary?.operations?.avg_rating || 0} AVG
                </Badge>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-start gap-3">
                  <FileText
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      (summary?.operations?.negative_reviews || 0) > 0 ? "text-red-500" : "text-slate-300 dark:text-slate-600"
                    }`}
                  />
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {isLoading ? "…" : summary?.operations?.negative_reviews || 0}
                    </span>{" "}
                    {t("dashboard.operations.negative_reviews_24h")}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {t("dashboard.operations.avg_rating")}{" "}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {isLoading ? "…" : summary?.operations?.avg_rating || 0}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Staff Wellbeing */}
          <Card className={cardBase}>
            <CardHeader className={cardHeaderBase}>
              <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {t("dashboard.wellbeing.title")}
              </CardTitle>
              <Heart className="w-4 h-4 text-slate-300 dark:text-slate-600" />
            </CardHeader>
            <CardContent className="space-y-4 pt-2 pb-6 px-6">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold truncate">
                  {isLoading
                    ? t("dashboard.wellbeing.loading")
                    : summary?.wellbeing?.risk_staff?.length > 0
                      ? `${summary.wellbeing.risk_staff[0].name} ${t("dashboard.wellbeing.flagged")}`
                      : t("dashboard.wellbeing.none")}
                </p>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                  {t("dashboard.wellbeing.based_on")}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-slate-900 dark:text-white">{isLoading ? "…" : summary?.wellbeing?.swap_requests || 0}</span>{" "}
                      {t("dashboard.wellbeing.swap_requests")}
                    </p>
                  </div>
                  {(summary?.wellbeing?.swap_requests || 0) > 0 && (
                    <Badge variant="outline" className="border-none text-[10px] font-bold h-5 px-2 text-amber-600 dark:text-amber-400">
                      NEW
                    </Badge>
                  )}
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-white">{isLoading ? "…" : summary?.wellbeing?.new_hires || 0}</span>{" "}
                    {t("dashboard.wellbeing.new_hires_7d")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Quick Actions Dock (fixed, always visible) */}
      <div className="fixed bottom-4 left-4 right-4 z-30">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/70 backdrop-blur shadow-lg">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="text-xs font-bold tracking-tight text-slate-900 dark:text-white">
                  {t("dashboard.quick_actions.title")}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden md:block">
                  {t("dashboard.quick_actions.subtitle")}
              </div>
            </div>

            <div className="px-3 pb-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pr-24 md:pr-28">
                {apps
                  .filter((app) => !app.roles || hasRole(app.roles))
                  .map((app) => (
                    <button
                      key={app.name}
                      type="button"
                      onClick={() => navigate(app.href)}
                      className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors shadow-sm"
                    >
                      <div
                        className={`w-11 h-11 rounded-2xl ${app.gradient} flex items-center justify-center shrink-0 shadow-sm shadow-black/10`}
                      >
                        <app.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0 text-left leading-tight">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight truncate">
                          {app.nameKey ? t(app.nameKey) : app.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                          {app.descKey ? t(app.descKey) : app.description}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
          <div className="h-2"></div>
        </div>
      </div>
    </div>
  );
}
