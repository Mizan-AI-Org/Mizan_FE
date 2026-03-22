import React, { useState } from "react";
import { NavigateFunction } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import type { AuthContextType } from "@/contexts/AuthContext.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Calendar,
  ClipboardCheck,
  Heart,
  AlertCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  ChevronRight,
  DollarSign,
  ArrowRight,
  Users,
  FileText,
  GripVertical,
  X,
  Activity,
  ShieldAlert,
  Package,
  ListTodo,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const DASHBOARD_WIDGET_IDS = [
  "insights",
  "staffing",
  "sales_or_tasks",
  "operations",
  "wellbeing",
  "live_attendance",
  "compliance_risk",
  "inventory_delivery",
  "task_execution",
  "take_orders",
] as const;
export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

/** Icons for the Add widget dialog (one per dashboard widget id). */
export const WIDGET_ADD_ICONS: Record<DashboardWidgetId, LucideIcon> = {
  insights: Sparkles,
  staffing: Users,
  sales_or_tasks: DollarSign,
  operations: Calendar,
  wellbeing: Heart,
  live_attendance: Activity,
  compliance_risk: ShieldAlert,
  inventory_delivery: Package,
  task_execution: ListTodo,
  take_orders: ShoppingCart,
};

/** i18n keys for one-line descriptions in the Add widget dialog. */
export const WIDGET_ADD_DESC_KEYS: Record<DashboardWidgetId, string> = {
  insights: "dashboard.widget_add.insights",
  staffing: "dashboard.widget_add.staffing",
  sales_or_tasks: "dashboard.widget_add.sales_or_tasks",
  operations: "dashboard.widget_add.operations",
  wellbeing: "dashboard.widget_add.wellbeing",
  live_attendance: "dashboard.widget_add.live_attendance",
  compliance_risk: "dashboard.widget_add.compliance_risk",
  inventory_delivery: "dashboard.widget_add.inventory_delivery",
  task_execution: "dashboard.widget_add.task_execution",
  take_orders: "dashboard.widget_add.take_orders",
};

/** System default: five core cards only. Optional widgets are added via Customize dashboard. */
export const DEFAULT_DASHBOARD_WIDGET_ORDER: DashboardWidgetId[] = [
  "insights",
  "staffing",
  "sales_or_tasks",
  "operations",
  "wellbeing",
];

function isDashboardWidgetId(v: string): v is DashboardWidgetId {
  return (DASHBOARD_WIDGET_IDS as readonly string[]).includes(v);
}

export function parseStoredWidgetOrder(raw: string | null): DashboardWidgetId[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { order?: unknown };
    if (!Array.isArray(parsed.order)) return null;
    const out: DashboardWidgetId[] = [];
    const seen = new Set<string>();
    for (const x of parsed.order) {
      if (typeof x !== "string" || !isDashboardWidgetId(x) || seen.has(x)) continue;
      seen.add(x);
      out.push(x);
    }
    for (const id of DEFAULT_DASHBOARD_WIDGET_ORDER) {
      if (!seen.has(id)) out.push(id);
    }
    return out.length ? out : [...DEFAULT_DASHBOARD_WIDGET_ORDER];
  } catch {
    return null;
  }
}

export function getActionRoute(actionUrl: string | undefined): string {
  if (!actionUrl) return "/dashboard/attendance";
  if (actionUrl === "/dashboard/staff-scheduling") return "/dashboard/scheduling";
  return actionUrl;
}

type InsightItem = {
  id?: string;
  level?: string;
  action_url?: string;
  summary?: string;
  recommended_action?: string;
};

type TaskDueItem = {
  label?: string;
  status?: string;
};

/** Staffing card with compact default height; expand for OT / late / names. */
function StaffingCoverageCard({
  cardBase,
  cardHeaderBase,
  t,
  attendance,
  isLoading,
  noShowsCount,
  noShowsLabelKey,
  noShowsDescKey,
}: {
  cardBase: string;
  cardHeaderBase: string;
  t: (key: string) => string;
  attendance: Record<string, unknown> | undefined;
  isLoading: boolean;
  noShowsCount: number;
  noShowsLabelKey: string;
  noShowsDescKey: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const late = (attendance?.late_staff_today as unknown[])?.length || 0;
  const otNamesLen = (attendance?.ot_risk_staff as unknown[])?.length || 0;
  const otRisk = Number(attendance?.ot_risk) || 0;
  const hasMore =
    otRisk > 0 ||
    late > 0 ||
    (otNamesLen > 0 && otRisk > 0);

  return (
    <Card className={cardBase}>
      <CardHeader className={`${cardHeaderBase} pb-2 pt-5`}>
        <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
          {t("dashboard.staffing.title")}
        </CardTitle>
        <Users className="w-4 h-4 text-slate-300 dark:text-slate-600" />
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 px-5 pb-4 pt-1">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-3xl">
              {isLoading ? "…" : (attendance?.shift_gaps as number) || 0}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {t("dashboard.staffing.uncovered")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-3xl">
              {isLoading ? "…" : noShowsCount}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {t(noShowsLabelKey)}
            </div>
          </div>
        </div>

        <div className="space-y-2.5 pt-0.5">
          <div className="flex items-start gap-3">
            <AlertCircle
              className={`w-4 h-4 mt-0.5 shrink-0 ${noShowsCount > 0 ? "text-red-500" : "text-slate-300 dark:text-slate-600"
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
                {isLoading ? "…" : (attendance?.shift_gaps as number) || 0}
              </span>{" "}
              {t("dashboard.staffing.need_coverage")}
            </p>
          </div>
          {(!hasMore || expanded) && (
            <div className="flex items-start gap-3">
              <TrendingUp
                className={`w-4 h-4 mt-0.5 shrink-0 ${otRisk > 0 ? "text-amber-500" : "text-slate-300 dark:text-slate-600"
                  }`}
              />
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">
                  {isLoading ? "…" : otRisk}
                </span>{" "}
                {t("dashboard.staffing.ot_risk")}
              </p>
            </div>
          )}
          {expanded && late > 0 && (
            <div className="flex items-start gap-3 border-t border-slate-100 pt-2 dark:border-slate-800">
              <Clock
                className={`w-4 h-4 mt-0.5 shrink-0 ${late > 0 ? "text-amber-500" : "text-slate-300 dark:text-slate-600"
                  }`}
              />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {(attendance?.late_staff_today as unknown[]).length} {t("dashboard.staffing.late_staff")}
                </p>
                <ul className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 space-y-0.5">
                  {(attendance?.late_staff_today as { name: string; reason?: string }[]).slice(0, 3).map((m, i: number) => (
                    <li key={i}>
                      {m.name}
                      {m.reason === "missed_clock_in" ? " (no clock-in)" : " (late)"}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {expanded && otNamesLen > 0 && otRisk > 0 && (
            <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {(attendance?.ot_risk_staff as { staff_name?: string }[]).slice(0, 3).map((s) => s.staff_name || s).join(", ")}
                {(otNamesLen > 3) && " …"}
              </p>
            </div>
          )}
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-auto pt-2 text-left text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            {expanded ? t("common.show_less") : t("common.show_more")}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function TakeOrdersDashboardCard({
  cardBase,
  cardHeaderBase,
  t,
  navigate,
}: {
  cardBase: string;
  cardHeaderBase: string;
  t: (key: string) => string;
  navigate: NavigateFunction;
}) {
  const { accessToken } = useAuth() as AuthContextType;
  const { data, isLoading } = useQuery({
    queryKey: ["staff-captured-orders", "active", accessToken],
    queryFn: () => api.listStaffCapturedOrders({ active: true }),
    enabled: !!accessToken,
    staleTime: 30_000,
  });
  const count = Array.isArray(data) ? data.length : 0;
  return (
    <Card
      className={`${cardBase} cursor-pointer hover:shadow-md transition-shadow flex flex-col`}
      onClick={() => navigate("/dashboard/take-orders")}
    >
      <CardHeader className={cardHeaderBase}>
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
            {t("dashboard.take_orders.title")}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 pt-2 pb-6 px-6">
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-3 py-2">
          <div className="text-2xl font-black text-slate-900 dark:text-white">{isLoading ? "…" : count}</div>
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{t("dashboard.take_orders.captured_today")}</div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate("/dashboard/take-orders");
          }}
          className="mt-auto flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          {t("dashboard.take_orders.open")}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </CardContent>
    </Card>
  );
}

export type DashboardWidgetBundleProps = {
  t: (key: string) => string;
  navigate: NavigateFunction;
  cardBase: string;
  cardHeaderBase: string;
  summary: Record<string, unknown> | null | undefined;
  isLoading: boolean;
  showAllInsights: boolean;
  setShowAllInsights: React.Dispatch<React.SetStateAction<boolean>>;
  criticalCount: number;
  insights: InsightItem[];
  insightsVisible: InsightItem[];
  attentionNow: number;
  noShowsCount: number;
  noShowsLabelKey: string;
  noShowsDescKey: string;
  todaySales: { connected?: boolean; currency?: string; total_sales?: number; order_count?: number; avg_ticket?: number } | undefined;
  prepList: { ingredient_prep_list?: unknown[]; forecast_portions?: unknown[] } | undefined;
  salesLoading: boolean;
  prepLoading: boolean;
  hasRole: (roles: string[]) => boolean;
};

export function SortableDashboardWidget({
  id,
  editMode,
  colClassName,
  onRemove,
  children,
}: {
  id: DashboardWidgetId;
  editMode: boolean;
  colClassName: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !editMode,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        colClassName,
        "flex h-full min-h-0 flex-col",
        editMode && "ring-2 ring-dashed ring-emerald-500/35 rounded-2xl",
        isDragging && "opacity-90 shadow-lg",
      )}
    >
      {editMode && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-300 dark:hover:bg-slate-800 cursor-grab active:cursor-grabbing"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-slate-600 shadow-sm hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900/95 dark:hover:bg-red-950/40"
            aria-label="Remove widget"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          editMode && "pointer-events-none [&_button]:pointer-events-auto [&_a]:pointer-events-auto",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function DashboardWidgetById({
  id,
  props,
}: {
  id: DashboardWidgetId;
  props: DashboardWidgetBundleProps;
}) {
  const {
    t,
    navigate,
    cardBase,
    cardHeaderBase,
    summary,
    isLoading,
    showAllInsights,
    setShowAllInsights,
    criticalCount,
    insights,
    insightsVisible,
    attentionNow,
    noShowsCount,
    noShowsLabelKey,
    noShowsDescKey,
    todaySales,
    prepList,
    salesLoading,
    prepLoading,
    hasRole,
  } = props;

  const attendance = summary?.attendance as Record<string, unknown> | undefined;
  const operations = summary?.operations as Record<string, unknown> | undefined;
  const wellbeing = summary?.wellbeing as Record<string, unknown> | undefined;

  switch (id) {
    case "insights":
      return (
        <Card
          className={`${cardBase} relative overflow-hidden ${criticalCount > 0 ? "border-red-200 dark:border-red-900/40" : ""
            }`}
        >
          <div
            className={`absolute inset-0 pointer-events-none ${criticalCount > 0
                ? "bg-gradient-to-br from-red-500/12 via-transparent to-transparent"
                : "bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent"
              }`}
          ></div>
          <CardHeader className="pb-1.5 px-6 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${criticalCount > 0
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
                  className={`border-none text-[10px] font-bold h-5 px-2 ${attentionNow > 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"
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
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 px-5 pb-4 pt-2">
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
                  <div className={cn("space-y-2", showAllInsights && "max-h-[220px] overflow-y-auto overflow-x-hidden pr-1")}>
                    {insightsVisible.map((it, idx) => {
                      const level = String(it.level || "").toUpperCase();
                      const dot =
                        level === "CRITICAL"
                          ? "bg-red-500"
                          : level === "OPERATIONAL"
                            ? "bg-amber-500"
                            : level === "PERFORMANCE"
                              ? "bg-blue-500"
                              : level === "RESOLVED"
                                ? "bg-slate-400 dark:bg-slate-500"
                                : "bg-emerald-500";

                      const levelPill =
                        level === "CRITICAL"
                          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                          : level === "OPERATIONAL"
                            ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
                            : level === "PERFORMANCE"
                              ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200"
                              : level === "RESOLVED"
                                ? "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
                                : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200";

                      const containerExtra =
                        level === "CRITICAL"
                          ? "bg-red-50/40 dark:bg-red-950/10"
                          : "";

                      return (
                        <button
                          key={it.id || idx}
                          type="button"
                          onClick={() => navigate(getActionRoute(it.action_url))}
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
                                  {level === "CRITICAL" ? "Action" : level === "RESOLVED" ? "Resolved" : "Recommendation"}: {it.recommended_action}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">{t("dashboard.insights.none")}</div>
                )}
              </>
            ) : insightsVisible.length > 0 ? (
              <div className={cn("space-y-2", showAllInsights && "max-h-[220px] overflow-y-auto overflow-x-hidden pr-1")}>
                {insightsVisible.map((it, idx) => {
                  const level = String(it.level || "").toUpperCase();
                  const dot =
                    level === "CRITICAL"
                      ? "bg-red-500"
                      : level === "OPERATIONAL"
                        ? "bg-amber-500"
                        : level === "PERFORMANCE"
                          ? "bg-blue-500"
                          : level === "RESOLVED"
                            ? "bg-slate-400 dark:bg-slate-500"
                            : "bg-emerald-500";

                  const levelPill =
                    level === "CRITICAL"
                      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                      : level === "OPERATIONAL"
                        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
                        : level === "PERFORMANCE"
                          ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200"
                          : level === "RESOLVED"
                            ? "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200";

                  return (
                    <button
                      key={it.id || idx}
                      type="button"
                      onClick={() => navigate(getActionRoute(it.action_url))}
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
                              {level === "CRITICAL" ? "Action" : level === "RESOLVED" ? "Resolved" : "Recommendation"}: {it.recommended_action}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
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
            {insights.length > 2 && (
              <button
                type="button"
                onClick={() => setShowAllInsights((v) => !v)}
                className="mt-auto border-t border-slate-100 pt-2.5 text-left text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:border-slate-800 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                {showAllInsights ? t("common.show_less") : t("common.show_more")}
              </button>
            )}
          </CardContent>
        </Card>
      );

    case "staffing":
      return (
        <StaffingCoverageCard
          cardBase={cardBase}
          cardHeaderBase={cardHeaderBase}
          t={t}
          attendance={attendance}
          isLoading={isLoading}
          noShowsCount={noShowsCount}
          noShowsLabelKey={noShowsLabelKey}
          noShowsDescKey={noShowsDescKey}
        />
      );

    case "sales_or_tasks":
      if (hasRole(["SUPER_ADMIN", "ADMIN", "MANAGER"])) {
        return (
          <Card className={`${cardBase} cursor-pointer hover:shadow-md transition-shadow flex flex-col`} onClick={() => navigate("/dashboard/sales-and-prep")}>
            <CardHeader className={cardHeaderBase}>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {t("dashboard.sales.title") || "Sales Analysis"}
                </CardTitle>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-slate-500 border-none px-0 text-[10px] font-bold h-4">
                  {todaySales?.connected ? "LIVE" : "POS"}
                </Badge>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 px-6 pb-6 pt-2 min-h-0">
              {salesLoading || prepLoading ? (
                <div className="text-sm text-slate-400">{t("dashboard.sales.loading") || "Loading…"}</div>
              ) : !todaySales?.connected ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">{t("dashboard.sales.connect_pos") || "Connect your POS in Settings to see today's sales."}</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">{t("dashboard.sales.total") || "Revenue"}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{todaySales?.currency || ""} {(todaySales?.total_sales ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">{t("dashboard.sales.orders") || "Orders"}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{todaySales?.order_count ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">{t("dashboard.sales.avg_ticket") || "Avg ticket"}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{todaySales?.currency || ""} {(todaySales?.avg_ticket ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">{t("dashboard.prep.title") || "Recommended Prep List"}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {(prepList?.ingredient_prep_list?.length ?? prepList?.forecast_portions?.length ?? 0) || 0} items
                    </span>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); navigate("/dashboard/sales-and-prep"); }}
                className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline mt-auto pt-4"
              >
                {t("dashboard.sales.see_more") || "See more"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </CardContent>
          </Card>
        );
      }
      return (
        <Card className={cardBase}>
          <CardHeader className={cardHeaderBase}>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {t("dashboard.tasks.title")}
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-slate-500 border-none px-0 text-[10px] font-bold h-4">{isLoading ? "..." : (summary?.tasks_due as unknown[])?.length || 0} TODAY</Badge>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col space-y-4 px-6 pb-6 pt-2">
            {isLoading ? (
              <div className="text-sm text-slate-400">{t("dashboard.tasks.loading")}</div>
            ) : (summary?.tasks_due as TaskDueItem[])?.length > 0 ? (
              (summary?.tasks_due as TaskDueItem[]).slice(0, 4).map((task: TaskDueItem, i: number) => (
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
      );

    case "operations":
      return (
        <Card className={cardBase}>
          <CardHeader className={cardHeaderBase}>
            <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {t("dashboard.operations.title")}
            </CardTitle>
            <Calendar className="w-4 h-4 text-slate-300 dark:text-slate-600" />
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col space-y-4 pt-2 pb-6 px-6">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  {isLoading ? "…" : (operations?.completion_rate as number) || 0}%
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {t("dashboard.operations.completion_today")}
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-none text-[10px] font-bold h-5 px-2 text-slate-600 dark:text-slate-300"
              >
                {isLoading ? "…" : (operations?.avg_rating as number) || 0} AVG
              </Badge>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-3">
                <FileText
                  className={`w-4 h-4 mt-0.5 shrink-0 ${((operations?.negative_reviews as number) || 0) > 0 ? "text-red-500" : "text-slate-300 dark:text-slate-600"
                    }`}
                />
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {isLoading ? "…" : (operations?.negative_reviews as number) || 0}
                  </span>{" "}
                  {t("dashboard.operations.negative_reviews_24h")}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {t("dashboard.operations.avg_rating")}{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {isLoading ? "…" : (operations?.avg_rating as number) || 0}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );

    case "wellbeing":
      return (
        <Card className={cardBase}>
          <CardHeader className={cardHeaderBase}>
            <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {t("dashboard.wellbeing.title")}
            </CardTitle>
            <Heart className="w-4 h-4 text-slate-300 dark:text-slate-600" />
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col space-y-4 pt-2 pb-6 px-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
              <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold truncate">
                {isLoading
                  ? t("dashboard.wellbeing.loading")
                  : ((wellbeing?.risk_staff as { name?: string }[])?.length || 0) > 0
                    ? `${(wellbeing?.risk_staff as { name: string }[])[0].name} ${t("dashboard.wellbeing.flagged")}`
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
                    <span className="font-semibold text-slate-900 dark:text-white">{isLoading ? "…" : (wellbeing?.swap_requests as number) || 0}</span>{" "}
                    {t("dashboard.wellbeing.swap_requests")}
                  </p>
                </div>
                {((wellbeing?.swap_requests as number) || 0) > 0 && (
                  <Badge variant="outline" className="border-none text-[10px] font-bold h-5 px-2 text-amber-600 dark:text-amber-400">
                    NEW
                  </Badge>
                )}
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-slate-900 dark:text-white">{isLoading ? "…" : (wellbeing?.new_hires as number) || 0}</span>{" "}
                  {t("dashboard.wellbeing.new_hires_7d")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );

    case "live_attendance": {
      const present = (attendance?.present_count as number) ?? 0;
      const active = (attendance?.active_shifts as number) ?? 0;
      return (
        <Card className={cardBase}>
          <CardHeader className={cardHeaderBase}>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-500" />
              <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {t("dashboard.live_attendance.title")}
              </CardTitle>
            </div>
            <Badge variant="outline" className="border-emerald-200/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold h-5 px-2">
              LIVE
            </Badge>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col space-y-4 pt-2 pb-6 px-6">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("dashboard.live_attendance.subtitle")}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  {isLoading ? "…" : present}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {t("dashboard.live_attendance.present")}
                </div>
              </div>
              <div>
                <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  {isLoading ? "…" : active}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {t("dashboard.live_attendance.active_shifts")}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/dashboard/attendance")}
              className="mt-auto flex items-center gap-1 text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
            >
              {t("dashboard.live_attendance.view")}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </CardContent>
        </Card>
      );
    }

    case "compliance_risk": {
      const az = summary?.analytics as Record<string, number> | undefined;
      const safetyOpen = az?.safety_alerts_open ?? 0;
      const incOpen = az?.incidents_open ?? 0;
      const missingGeo = az?.missing_geo_clock_ins ?? 0;
      const risk = safetyOpen + incOpen + missingGeo;
      return (
        <Card className={cardBase}>
          <CardHeader className={cardHeaderBase}>
            <div className="flex items-center gap-2">
              <ShieldAlert className={`w-4 h-4 ${risk > 0 ? "text-amber-500" : "text-slate-400"}`} />
              <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {t("dashboard.compliance_risk.title")}
              </CardTitle>
            </div>
            <Badge variant="outline" className="border-none text-[10px] font-bold h-5 px-2 text-slate-500">
              {isLoading ? "…" : risk}
            </Badge>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 pt-2 pb-6 px-6">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("dashboard.compliance_risk.subtitle")}</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{t("dashboard.compliance_risk.safety")}</span>
                <span className={`font-semibold ${safetyOpen > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
                  {isLoading ? "…" : safetyOpen}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{t("dashboard.compliance_risk.incidents")}</span>
                <span className={`font-semibold ${incOpen > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
                  {isLoading ? "…" : incOpen}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{t("dashboard.compliance_risk.missing_geo")}</span>
                <span className={`font-semibold ${missingGeo > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
                  {isLoading ? "…" : missingGeo}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/dashboard/analytics")}
              className="mt-auto flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:underline"
            >
              {t("dashboard.compliance_risk.open")}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </CardContent>
        </Card>
      );
    }

    case "inventory_delivery": {
      const nextDel = operations?.next_delivery as { supplier?: string; date?: string } | undefined;
      const supplier = nextDel?.supplier && nextDel.supplier !== "None" ? nextDel.supplier : null;
      const dStr = nextDel?.date && nextDel.date !== "None" ? nextDel.date : null;
      return (
        <Card className={cardBase}>
          <CardHeader className={cardHeaderBase}>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-violet-500" />
              <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {t("dashboard.inventory_delivery.title")}
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-slate-500 border-none px-0 text-[10px] font-bold h-4">
              PO
            </Badge>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 pt-2 pb-6 px-6">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("dashboard.inventory_delivery.subtitle")}</p>
            {isLoading ? (
              <div className="text-sm text-slate-400">{t("dashboard.status.updating")}</div>
            ) : supplier && dStr ? (
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-3 py-2">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{supplier}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{dStr}</div>
              </div>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-400">{t("dashboard.inventory_delivery.none")}</p>
            )}
            {hasRole(["SUPER_ADMIN", "ADMIN", "MANAGER"]) && (
              <button
                type="button"
                onClick={() => navigate("/dashboard/inventory")}
                className="mt-auto flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
              >
                {t("dashboard.inventory_delivery.view")}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </CardContent>
        </Card>
      );
    }

    case "task_execution": {
      const az = summary?.analytics as Record<string, number> | undefined;
      const total = az?.tasks_total_today ?? 0;
      const done = az?.tasks_completed_today ?? 0;
      const open = az?.tasks_open_today ?? 0;
      const urgent = az?.urgent_tasks_open ?? 0;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return (
        <Card className={cardBase}>
          <CardHeader className={cardHeaderBase}>
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-orange-500" />
              <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {t("dashboard.task_execution.title")}
              </CardTitle>
            </div>
            <Badge variant="outline" className="border-none text-[10px] font-bold h-5 px-2 text-slate-600 dark:text-slate-300">
              {isLoading ? "…" : `${pct}%`}
            </Badge>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 pt-2 pb-6 px-6">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("dashboard.task_execution.subtitle")}</p>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-emerald-500 transition-all duration-500"
                style={{ width: `${isLoading ? 0 : pct}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{isLoading ? "…" : done}</div>
                <div className="text-[10px] text-slate-500">{t("dashboard.task_execution.done")}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{isLoading ? "…" : open}</div>
                <div className="text-[10px] text-slate-500">{t("dashboard.task_execution.open")}</div>
              </div>
              <div>
                <div className={`text-lg font-bold ${urgent > 0 ? "text-red-500" : "text-slate-900 dark:text-white"}`}>
                  {isLoading ? "…" : urgent}
                </div>
                <div className="text-[10px] text-slate-500">{t("dashboard.task_execution.urgent")}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/dashboard/processes-tasks-app")}
              className="mt-auto flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline"
            >
              {t("dashboard.task_execution.open_board")}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </CardContent>
        </Card>
      );
    }

    case "take_orders":
      return (
        <TakeOrdersDashboardCard
          cardBase={cardBase}
          cardHeaderBase={cardHeaderBase}
          t={t}
          navigate={navigate}
        />
      );

    default:
      return null;
  }
}
