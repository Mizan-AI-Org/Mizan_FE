import React, { useMemo, useState } from "react";
import { NavigateFunction } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { api, API_BASE } from "@/lib/api";
import type { AuthContextType } from "@/contexts/AuthContext.types";
import type {
  DashboardTaskDemandItem,
  DashboardTasksDemandsResponse,
  DashboardMeetingsRemindersResponse,
  MeetingReminderItem,
  DashboardClockInsResponse,
} from "@/lib/types";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sparkles,
  Calendar,
  ClipboardCheck,
  ClipboardList,
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
  CalendarDays,
  Store,
  HardHat,
  FileBarChart2,
  Inbox,
  BarChart2,
  LayoutGrid,
  MoreHorizontal,
  MessageSquare,
  Mail,
  Sparkle,
  Cog,
  CircleDot,
  Share2,
  Video,
  MapPin,
  ExternalLink,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const DASHBOARD_WIDGET_IDS = [
  "insights",
  "tasks_demands",
  "staffing",
  "sales_or_tasks",
  "operations",
  "wellbeing",
  "live_attendance",
  "compliance_risk",
  "inventory_delivery",
  "task_execution",
  "take_orders",
  "reservations",
  "retail_store_ops",
  "jobsite_crew",
  "ops_reports",
  "staff_inbox",
  "meetings_reminders",
  "clock_ins",
] as const;
export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

/** Icons for the Add widget dialog (one per dashboard widget id). */
export const WIDGET_ADD_ICONS: Record<DashboardWidgetId, LucideIcon> = {
  insights: Sparkles,
  tasks_demands: ListTodo,
  staffing: Users,
  sales_or_tasks: DollarSign,
  operations: Calendar,
  wellbeing: Heart,
  live_attendance: Activity,
  compliance_risk: ShieldAlert,
  inventory_delivery: Package,
  task_execution: ListTodo,
  take_orders: ShoppingCart,
  reservations: CalendarDays,
  retail_store_ops: Store,
  jobsite_crew: HardHat,
  ops_reports: FileBarChart2,
  staff_inbox: Inbox,
  meetings_reminders: CalendarDays,
  clock_ins: Clock,
};

/** i18n keys for one-line descriptions in the Add widget dialog. */
export const WIDGET_ADD_DESC_KEYS: Record<DashboardWidgetId, string> = {
  insights: "dashboard.widget_add.insights",
  tasks_demands: "dashboard.widget_add.tasks_demands",
  staffing: "dashboard.widget_add.staffing",
  sales_or_tasks: "dashboard.widget_add.sales_or_tasks",
  operations: "dashboard.widget_add.operations",
  wellbeing: "dashboard.widget_add.wellbeing",
  live_attendance: "dashboard.widget_add.live_attendance",
  compliance_risk: "dashboard.widget_add.compliance_risk",
  inventory_delivery: "dashboard.widget_add.inventory_delivery",
  task_execution: "dashboard.widget_add.task_execution",
  take_orders: "dashboard.widget_add.take_orders",
  reservations: "dashboard.widget_add.reservations",
  retail_store_ops: "dashboard.widget_add.retail_store_ops",
  jobsite_crew: "dashboard.widget_add.jobsite_crew",
  ops_reports: "dashboard.widget_add.ops_reports",
  staff_inbox: "dashboard.widget_add.staff_inbox",
  meetings_reminders: "dashboard.widget_add.meetings_reminders",
  clock_ins: "dashboard.widget_add.clock_ins",
};

/** Grouping for the Add widget dialog—each id appears in exactly one category. */
export type DashboardWidgetCategoryId = "general" | "retail" | "hospitality" | "construction";

export const DASHBOARD_WIDGET_CATEGORY_ORDER: DashboardWidgetCategoryId[] = [
  "general",
  "retail",
  "hospitality",
  "construction",
];

/** i18n keys for section headings in the Add widget dialog. */
export const DASHBOARD_WIDGET_CATEGORY_KEYS: Record<DashboardWidgetCategoryId, string> = {
  general: "dashboard.widget_categories.general",
  retail: "dashboard.widget_categories.retail",
  hospitality: "dashboard.widget_categories.hospitality",
  construction: "dashboard.widget_categories.construction",
};

const WIDGET_ID_TO_CATEGORY: Record<DashboardWidgetId, DashboardWidgetCategoryId> = {
  insights: "general",
  tasks_demands: "general",
  staffing: "general",
  sales_or_tasks: "general",
  operations: "general",
  wellbeing: "general",
  live_attendance: "general",
  ops_reports: "general",
  staff_inbox: "general",
  meetings_reminders: "general",
  clock_ins: "general",
  retail_store_ops: "retail",
  take_orders: "retail",
  inventory_delivery: "retail",
  reservations: "hospitality",
  jobsite_crew: "construction",
  compliance_risk: "construction",
  task_execution: "construction",
};

export function getWidgetCategory(id: DashboardWidgetId): DashboardWidgetCategoryId {
  return WIDGET_ID_TO_CATEGORY[id];
}

/** System default: six core cards. Optional widgets are added via Customize dashboard. */
export const DEFAULT_DASHBOARD_WIDGET_ORDER: DashboardWidgetId[] = [
  "insights",
  "tasks_demands",
  "staffing",
  "sales_or_tasks",
  "operations",
  "wellbeing",
];

/**
 * Per-user record of "default widget ids the user has explicitly
 * dismissed from their dashboard". Stored in localStorage, keyed by
 * user id. When a new default widget ships (e.g. `tasks_demands`), we
 * append it to the user's saved layout iff its id is NOT in this set —
 * so the only reason a default will NOT appear is that the user
 * removed it themselves via the × in Customize mode.
 *
 * Important: the merge must NOT itself write to this set. Dashboard.tsx
 * runs the merge twice on every page load (once against localStorage,
 * once against the server response); if the merge recorded every
 * default as "handled" on the first pass, the second pass would
 * silently drop any newly-shipped default that the server-side layout
 * still lacks. We only write to this set when the user actively
 * dismisses a default via `markDefaultAsDismissed`.
 */
const DISMISSED_DEFAULTS_KEY_PREFIX = "mizan-dashboard-dismissed-defaults:";

export function dismissedDefaultsStorageKey(userId: string | undefined | null): string | null {
  if (!userId) return null;
  return `${DISMISSED_DEFAULTS_KEY_PREFIX}${userId}`;
}

function readDismissedDefaults(userId: string | undefined | null): Set<string> {
  const key = dismissedDefaultsStorageKey(userId);
  if (!key || typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeDismissedDefaults(userId: string | undefined | null, ids: Iterable<string>): void {
  const key = dismissedDefaultsStorageKey(userId);
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
  } catch {
    /* quota or private mode — best effort only */
  }
}

/**
 * Record that the user has explicitly removed a default widget, so we
 * stop auto-re-adding it on subsequent page loads. No-op for custom
 * (Miya) slot ids — they have their own lifecycle and are never part
 * of the default lane.
 */
export function markDefaultAsDismissed(
  userId: string | undefined | null,
  id: string,
): void {
  if (!(DEFAULT_DASHBOARD_WIDGET_ORDER as readonly string[]).includes(id)) return;
  const current = readDismissedDefaults(userId);
  if (current.has(id)) return;
  current.add(id);
  writeDismissedDefaults(userId, current);
}

/**
 * Clear the dismissed set for the user. Called when they hit "Reset
 * layout" — "reset" means "give me the system defaults back", which
 * implicitly un-dismisses everything.
 */
export function clearDismissedDefaults(userId: string | undefined | null): void {
  writeDismissedDefaults(userId, []);
}

/**
 * Append any default widgets that:
 *   1. exist in DEFAULT_DASHBOARD_WIDGET_ORDER,
 *   2. are NOT already in `order`, and
 *   3. have NOT been explicitly dismissed by the user.
 *
 * Pure read-through — does not write to localStorage, so it is safe to
 * call multiple times per page load (Dashboard.tsx runs it against
 * both the localStorage-cached order and the server-returned order).
 */
export function mergeNewDefaultWidgets(
  order: DashboardWidgetSlotId[],
  userId: string | undefined | null,
): { order: DashboardWidgetSlotId[]; changed: boolean } {
  const dismissed = readDismissedDefaults(userId);
  const existing = new Set<string>(order);
  const additions: DashboardWidgetId[] = [];
  for (const id of DEFAULT_DASHBOARD_WIDGET_ORDER) {
    if (existing.has(id)) continue;
    if (dismissed.has(id)) continue;
    additions.push(id);
  }
  if (additions.length === 0) {
    return { order, changed: false };
  }
  return { order: [...order, ...additions], changed: true };
}

function isDashboardWidgetId(v: string): v is DashboardWidgetId {
  return (DASHBOARD_WIDGET_IDS as readonly string[]).includes(v);
}

/** Miya-created tiles use `custom:<uuid>` in saved layout (matches backend CUSTOM_WIDGET_PREFIX). */
export const CUSTOM_WIDGET_PREFIX = "custom:";

export function isCustomWidgetSlotId(s: string): boolean {
  if (!s.startsWith(CUSTOM_WIDGET_PREFIX)) return false;
  const rest = s.slice(CUSTOM_WIDGET_PREFIX.length);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rest);
}

/** A slot on the dashboard grid: built-in widget id or a Miya custom tile id. */
export type DashboardWidgetSlotId = DashboardWidgetId | (string & {});

export type DashboardCustomWidgetDef = {
  id: string;
  slot_id: string;
  title: string;
  subtitle: string;
  link_url: string;
  icon: string;
  category_id?: string | null;
  created_at?: string | null;
};

export type DashboardManagerCategory = {
  id: string;
  name: string;
  order_index: number;
};

const CUSTOM_WIDGET_ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  "clipboard-check": ClipboardCheck,
  "list-todo": ListTodo,
  calendar: Calendar,
  users: Users,
  package: Package,
  "shopping-cart": ShoppingCart,
  "file-text": FileText,
  "bar-chart-2": BarChart2,
  "clipboard-list": ClipboardList,
  "hard-hat": HardHat,
  store: Store,
  inbox: Inbox,
  activity: Activity,
  "shield-alert": ShieldAlert,
  clock: Clock,
  heart: Heart,
  "calendar-days": CalendarDays,
  "layout-grid": LayoutGrid,
};

export function parseStoredWidgetOrder(raw: string | null): DashboardWidgetSlotId[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { order?: unknown };
    if (!Array.isArray(parsed.order)) return null;
    const out: DashboardWidgetSlotId[] = [];
    const seen = new Set<string>();
    for (const x of parsed.order) {
      if (typeof x !== "string" || seen.has(x)) continue;
      if (!isDashboardWidgetId(x) && !isCustomWidgetSlotId(x)) continue;
      seen.add(x);
      out.push(x);
    }
    // Do not merge DEFAULT_DASHBOARD_WIDGET_ORDER here: the saved list is the user's
    // explicit layout (including removed core cards). Re-adding defaults broke removals.
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
                      {m.reason === "missed_clock_in"
                        ? ` ${t("dashboard.staffing.attendance_suffix_no_clock_in")}`
                        : ` ${t("dashboard.staffing.attendance_suffix_late")}`}
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

function OpsReportsEnterpriseCard({
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
  const shortcuts = [
    { to: "/dashboard/reports/sales/daily", labelKey: "dashboard.ops_reports.link_sales", Icon: BarChart2 },
    { to: "/dashboard/reports/attendance", labelKey: "dashboard.ops_reports.link_attendance", Icon: Users },
    { to: "/dashboard/reports/inventory", labelKey: "dashboard.ops_reports.link_inventory", Icon: Package },
    { to: "/dashboard/reports/labor-attendance", labelKey: "dashboard.ops_reports.link_labor", Icon: Clock },
  ];
  return (
    <Card
      className={`${cardBase} cursor-pointer hover:shadow-md transition-shadow flex flex-col`}
      onClick={() => navigate("/dashboard/reports")}
    >
      <CardHeader className={cardHeaderBase}>
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/12 text-sky-600 dark:text-sky-400">
            <FileBarChart2 className="w-5 h-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {t("dashboard.ops_reports.title")}
            </CardTitle>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-1">
              {t("dashboard.ops_reports.subtitle")}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 pt-0 pb-6 px-6">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {t("dashboard.ops_reports.shortcuts_hint")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {shortcuts.map(({ to, labelKey, Icon }) => (
            <button
              key={to}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(to);
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-200/90 bg-white/80 dark:bg-slate-800/50 dark:border-slate-700 px-2.5 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-sky-300/80 hover:bg-sky-50/50 dark:hover:bg-slate-800 transition-colors"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
              <span className="truncate">{t(labelKey)}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate("/dashboard/reports");
          }}
          className="mt-auto flex items-center gap-1 text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
        >
          {t("dashboard.ops_reports.open")}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </CardContent>
    </Card>
  );
}

function StaffInboxEnterpriseCard({
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
    queryKey: ["staff-requests-counts", "dashboard-widget", accessToken],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/staff/requests/counts/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
      if (!r.ok) throw new Error("counts");
      return r.json();
    },
    enabled: !!accessToken,
    staleTime: 45_000,
  });
  const counts = (data?.counts ?? {}) as Record<string, number>;
  const pending = Number(counts.PENDING ?? 0);
  const escalated = Number(counts.ESCALATED ?? 0);

  return (
    <Card
      className={`${cardBase} cursor-pointer hover:shadow-md transition-shadow flex flex-col`}
      onClick={() => navigate("/dashboard/staff-requests")}
    >
      <CardHeader className={cardHeaderBase}>
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-violet-600 dark:text-violet-400">
            <Inbox className="w-5 h-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {t("dashboard.staff_inbox.title")}
            </CardTitle>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-1">
              {t("dashboard.staff_inbox.subtitle")}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 pt-0 pb-6 px-6">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-3 py-2">
            <div className="text-2xl font-black text-slate-900 dark:text-white">{isLoading ? "…" : pending}</div>
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{t("dashboard.staff_inbox.pending_label")}</div>
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-3 py-2">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{isLoading ? "…" : escalated}</div>
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{t("dashboard.staff_inbox.escalated_label")}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate("/dashboard/staff-requests");
          }}
          className="mt-auto flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
        >
          {t("dashboard.staff_inbox.open")}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </CardContent>
    </Card>
  );
}

function ReservationsDashboardCard({
  cardBase,
  cardHeaderBase,
  t,
  navigate,
  hasRole,
}: {
  cardBase: string;
  cardHeaderBase: string;
  t: (key: string, options?: Record<string, string | number>) => string;
  navigate: NavigateFunction;
  hasRole: (roles: string[]) => boolean;
}) {
  const { accessToken } = useAuth() as AuthContextType;
  const startDate = format(new Date(), "yyyy-MM-dd");
  const endDate = format(addDays(new Date(), 14), "yyyy-MM-dd");
  const canQuery = !!accessToken && hasRole(["SUPER_ADMIN", "ADMIN", "MANAGER"]);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["eatnow-reservations", "dashboard", accessToken, startDate, endDate],
    queryFn: () => api.getEatNowReservations(accessToken!, startDate, endDate),
    enabled: canQuery,
    staleTime: 60_000,
    retry: false,
  });
  const rows = data?.reservations ?? [];
  const preview = rows.slice(0, 5);

  return (
    <Card
      className={`${cardBase} cursor-pointer hover:shadow-md transition-shadow flex flex-col`}
      onClick={() => navigate("/dashboard/reservations")}
    >
      <CardHeader className={cardHeaderBase}>
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {t("dashboard.reservations.title")}
          </CardTitle>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className="text-slate-500 border-none px-0 text-[10px] font-bold h-4">
            {isLoading ? "…" : isError ? "—" : rows.length}
          </Badge>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 pt-2 pb-6 px-6">
        {!canQuery ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">{t("dashboard.reservations.role_only")}</p>
        ) : isLoading ? (
          <div className="text-sm text-slate-400">{t("dashboard.reservations.loading")}</div>
        ) : isError ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">{t("dashboard.reservations.connect_settings")}</p>
        ) : preview.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">{t("dashboard.reservations.empty_range")}</p>
        ) : (
          <>
            <ul className="space-y-2 min-w-0 max-h-[220px] overflow-y-auto pr-0.5">
              {preview.map((r) => (
                <li
                  key={r.id || `${r.start_time}-${r.guest_name}`}
                  className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-2.5 py-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white truncate min-w-0">
                      {r.guest_name || "—"}
                    </span>
                    {r.status ? (
                      <Badge variant="secondary" className="shrink-0 text-[10px] font-normal max-w-[7rem] truncate">
                        {String(r.status)}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="truncate">{r.start_time ? String(r.start_time) : "—"}</span>
                    {r.covers != null ? (
                      <span>
                        {t("dashboard.reservations.covers")} {r.covers}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            {rows.length > preview.length ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t("dashboard.reservations.more_count", { count: rows.length - preview.length })}
              </p>
            ) : null}
          </>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate("/dashboard/reservations");
          }}
          className="mt-auto flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          {t("dashboard.reservations.view_all")}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </CardContent>
    </Card>
  );
}

/* -----------------------------------------------------------------------
 * Tasks & Demands widget
 *
 * Inbox-style list of the most important tasks for today, bucketed into
 * Pending / In progress / Completed tabs. Each row shows the provenance
 * (WhatsApp group, email sender, Miya AI, …) above the title, the AI
 * summary as a tinted subline, the assignee avatar + name, a colored
 * status pill, and a row menu that lets the manager flip status in one
 * click. Data comes from GET /api/dashboard/tasks-demands/ (our new
 * lightweight endpoint) and writes go through PATCH …/<id>/status/.
 * ---------------------------------------------------------------------*/

type TasksDemandsTab = "pending" | "in_progress" | "completed";

function sourceIcon(src: DashboardTaskDemandItem["source"]): LucideIcon {
  switch (src) {
    case "WHATSAPP":
      return MessageSquare;
    case "EMAIL":
      return Mail;
    case "MIYA":
      return Sparkle;
    case "SYSTEM":
      return Cog;
    default:
      return CircleDot;
  }
}

function sourcePrefix(src: DashboardTaskDemandItem["source"]): string {
  switch (src) {
    case "WHATSAPP":
      return "WA";
    case "EMAIL":
      return "Email";
    case "MIYA":
      return "Miya";
    case "SYSTEM":
      return "System";
    default:
      return "Task";
  }
}

function statusPillClass(
  status: DashboardTaskDemandItem["status"],
  priority: DashboardTaskDemandItem["priority"],
): { dot: string; text: string; bg: string; label: string } {
  if (status === "COMPLETED") {
    return {
      dot: "bg-emerald-500",
      text: "text-emerald-700 dark:text-emerald-300",
      bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50",
      label: "done",
    };
  }
  if (status === "IN_PROGRESS") {
    return {
      dot: "bg-sky-500",
      text: "text-sky-700 dark:text-sky-300",
      bg: "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900/50",
      label: "in_progress",
    };
  }
  if (status === "CANCELLED") {
    return {
      dot: "bg-slate-400",
      text: "text-slate-600 dark:text-slate-400",
      bg: "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700",
      label: "cancelled",
    };
  }
  if (priority === "URGENT") {
    return {
      dot: "bg-red-500",
      text: "text-red-700 dark:text-red-300",
      bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50",
      label: "urgent",
    };
  }
  return {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50",
    label: "pending",
  };
}

function TasksDemandsCard({
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
  const qc = useQueryClient();
  const [tab, setTab] = useState<TasksDemandsTab>("pending");

  const { data, isLoading, isError, error, refetch, isFetching } =
    useQuery<DashboardTasksDemandsResponse>({
      queryKey: ["dashboard", "tasks-demands", 5],
      queryFn: () => api.getDashboardTasksDemands(5),
      // Dashboard widget — bounded cost. 60 s refetch matches the other
      // operational cards, with staleTime so tab switches don't re-fetch.
      refetchInterval: 60_000,
      staleTime: 30_000,
      // The global QueryClient default is `retry: 1` which, if the first
      // load hits a transient 401/500 (e.g. backend mid-migration), can
      // leave the widget stuck in the error state for up to 60 s until
      // the next refetchInterval tick. A small backoff-capped retry
      // budget lets the widget recover in seconds without hammering.
      retry: 3,
      retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 8000),
      // Always re-run when the card remounts (e.g. after navigation), so
      // the user doesn't have to wait for the poll interval.
      refetchOnMount: "always",
    });

  const mutation = useMutation({
    mutationFn: ({
      id,
      nextStatus,
    }: {
      id: string;
      nextStatus: DashboardTaskDemandItem["status"];
    }) => api.updateDashboardTaskStatus(id, nextStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard", "tasks-demands", 5] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update task";
      toast.error(msg);
    },
  });

  const counts = data?.counts ?? { pending: 0, in_progress: 0, completed: 0 };
  const rows: DashboardTaskDemandItem[] = useMemo(() => {
    if (!data) return [];
    if (tab === "pending") return data.pending;
    if (tab === "in_progress") return data.in_progress;
    return data.completed;
  }, [data, tab]);

  const tabs: { id: TasksDemandsTab; labelKey: string; count: number }[] = [
    { id: "pending", labelKey: "dashboard.tasks_demands.tab_pending", count: counts.pending },
    {
      id: "in_progress",
      labelKey: "dashboard.tasks_demands.tab_in_progress",
      count: counts.in_progress,
    },
    {
      id: "completed",
      labelKey: "dashboard.tasks_demands.tab_completed",
      count: counts.completed,
    },
  ];

  return (
    <Card className={`${cardBase} flex flex-col`}>
      <CardHeader className={cardHeaderBase}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/12 text-indigo-600 dark:text-indigo-400">
            <ListTodo className="h-4 w-4" aria-hidden />
          </div>
          <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {t("dashboard.tasks_demands.title")}
          </CardTitle>
        </div>
        <Badge
          variant="outline"
          className="border-rose-200 bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/60 text-[10px] font-semibold px-2 h-5"
        >
          {t("dashboard.tasks_demands.priority_badge")}
        </Badge>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col pt-1 pb-4 px-5">
        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-0.5 mb-3">
          {tabs.map((tb) => {
            const active = tab === tb.id;
            return (
              <button
                key={tb.id}
                type="button"
                onClick={() => setTab(tb.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors",
                  active
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
                )}
              >
                <span className="truncate">{t(tb.labelKey)}</span>
                <span
                  className={cn(
                    "inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-bold tabular-nums",
                    active
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                      : "bg-slate-200/70 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300",
                  )}
                >
                  {tb.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Rows */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-slate-400">
              {t("dashboard.tasks_demands.loading")}
            </div>
          ) : isError ? (
            <div className="py-6 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("dashboard.tasks_demands.error")}
              </p>
              {/* Surfaces the actual failure (e.g. "Request failed (500)")
                  so ops can tell a mid-deploy blip apart from a real bug
                  without opening DevTools. */}
              {error instanceof Error && error.message ? (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-full px-2">
                  {error.message}
                </p>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-3 text-xs"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                {t("dashboard.tasks_demands.retry")}
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {t(`dashboard.tasks_demands.empty_${tab}`)}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {rows.map((row) => {
                const pill = statusPillClass(row.status, row.priority);
                const SrcIcon = sourceIcon(row.source);
                // Hide the source chip for generic SYSTEM-sourced rows
                // (e.g. anything coming from the Scheduling kanban). The
                // "Scheduling" label adds noise without giving the manager
                // actionable context; WA / Email / Miya rows still show
                // their provenance because that's where triage matters.
                const showSource =
                  row.source !== "SYSTEM" && Boolean(row.source_label?.trim() || sourcePrefix(row.source));
                const srcLabel = row.source_label?.trim() || sourcePrefix(row.source);
                return (
                  <li
                    key={row.id}
                    className="group rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700/80 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 px-2 py-1.5 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Avatar */}
                      <div className="shrink-0 mt-0.5">
                        {row.assignee ? (
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-[10px] font-bold text-white"
                            aria-label={row.assignee.name}
                            title={row.assignee.name}
                          >
                            {row.assignee.initials}
                          </div>
                        ) : (
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-400"
                            title={t("dashboard.tasks_demands.unassigned")}
                          >
                            ?
                          </div>
                        )}
                      </div>

                      {/* Body */}
                      <div className="min-w-0 flex-1">
                        {showSource ? (
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            <SrcIcon className="h-3 w-3 shrink-0" aria-hidden />
                            <span className="truncate">{srcLabel}</span>
                          </div>
                        ) : null}
                        <div className="text-[13px] font-semibold text-slate-900 dark:text-white leading-snug truncate">
                          {row.title}
                        </div>
                        {row.ai_summary || row.description ? (
                          <div className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400 leading-snug line-clamp-1">
                            {t("dashboard.tasks_demands.ai_prefix")}{" "}
                            {row.ai_summary || row.description}
                          </div>
                        ) : null}
                        {row.assignee ? (
                          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {row.assignee.name}
                          </div>
                        ) : null}
                      </div>

                      {/* Status pill (right-aligned, mirrors row-level
                          hierarchy — status is the primary signal now) */}
                      <span
                        className={cn(
                          "shrink-0 mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                          pill.bg,
                          pill.text,
                        )}
                      >
                        <span
                          className={cn("h-1.5 w-1.5 rounded-full", pill.dot)}
                          aria-hidden
                        />
                        {t(`dashboard.tasks_demands.status_${pill.label}`)}
                      </span>

                      {/* Action menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            aria-label={t("dashboard.tasks_demands.row_actions")}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {row.status !== "PENDING" && (
                            <DropdownMenuItem
                              onClick={() =>
                                mutation.mutate({
                                  id: row.id,
                                  nextStatus: "PENDING",
                                })
                              }
                            >
                              {t("dashboard.tasks_demands.mark_pending")}
                            </DropdownMenuItem>
                          )}
                          {row.status !== "IN_PROGRESS" && (
                            <DropdownMenuItem
                              onClick={() =>
                                mutation.mutate({
                                  id: row.id,
                                  nextStatus: "IN_PROGRESS",
                                })
                              }
                            >
                              {t("dashboard.tasks_demands.mark_in_progress")}
                            </DropdownMenuItem>
                          )}
                          {row.status !== "COMPLETED" && (
                            <DropdownMenuItem
                              onClick={() =>
                                mutation.mutate({
                                  id: row.id,
                                  nextStatus: "COMPLETED",
                                })
                              }
                            >
                              {t("dashboard.tasks_demands.mark_completed")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => navigate("/dashboard/tasks")}
                          >
                            {t("dashboard.tasks_demands.open_board")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate("/dashboard/tasks")}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline self-start"
        >
          {t("dashboard.tasks_demands.open_all")}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </CardContent>
    </Card>
  );
}


// --------------------------------------------------------------------------
// Meetings & Reminders — pulls upcoming events from the tenant's Google
// Calendar. Design mirrors the Tasks & Demands card: row-per-item with a
// right-aligned status pill, a "+" affordance via the per-row action menu,
// and a footer link that opens the full calendar in a new tab. When the
// calendar isn't connected we show a single CTA to finish onboarding.
// --------------------------------------------------------------------------

function pillClassForMeetingStatus(status: MeetingReminderItem["status"]) {
  switch (status) {
    case "URGENT":
      return {
        dot: "bg-rose-500",
        bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50",
        text: "text-rose-700 dark:text-rose-300",
        labelKey: "dashboard.meetings_reminders.status_urgent",
      } as const;
    case "DONE":
      return {
        dot: "bg-emerald-500",
        bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50",
        text: "text-emerald-700 dark:text-emerald-300",
        labelKey: "dashboard.meetings_reminders.status_done",
      } as const;
    default:
      return {
        dot: "bg-amber-500",
        bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50",
        text: "text-amber-700 dark:text-amber-300",
        labelKey: "dashboard.meetings_reminders.status_pending",
      } as const;
  }
}

function formatMeetingTime(
  item: MeetingReminderItem,
  locale: string,
): string {
  // All-day events: show just the weekday + date.
  if (item.all_day) {
    try {
      return new Date(item.start).toLocaleDateString(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return item.start.slice(0, 10);
    }
  }
  // Timed events: "Today 3:30pm" / "Tue 9:00am" style. Compare by local
  // date so tomorrow-morning events don't mis-label as "Today".
  try {
    const start = new Date(item.start);
    const now = new Date();
    const sameDay =
      start.getFullYear() === now.getFullYear() &&
      start.getMonth() === now.getMonth() &&
      start.getDate() === now.getDate();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow =
      start.getFullYear() === tomorrow.getFullYear() &&
      start.getMonth() === tomorrow.getMonth() &&
      start.getDate() === tomorrow.getDate();
    const time = start.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
    });
    if (sameDay) return time;
    if (isTomorrow) {
      return `${start.toLocaleDateString(locale, { weekday: "short" })} ${time}`;
    }
    return `${start.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" })} ${time}`;
  } catch {
    return "";
  }
}

function MeetingsRemindersCard({
  cardBase,
  cardHeaderBase,
  t,
}: {
  cardBase: string;
  cardHeaderBase: string;
  t: (key: string) => string;
  navigate: NavigateFunction;
}) {
  const qc = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const { data, isLoading, isError, refetch, isFetching } =
    useQuery<DashboardMeetingsRemindersResponse>({
      queryKey: ["dashboard", "meetings-reminders", 5],
      queryFn: () => api.getDashboardMeetingsReminders(5),
      // Google Calendar data is comparatively cold — 90 s poll matches
      // the "what's coming up in the next few hours" framing without
      // burning Google quota for idle tabs.
      refetchInterval: 90_000,
      staleTime: 45_000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 6000),
      refetchOnMount: "always",
    });

  const locale =
    typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";

  const calendarLink = data?.calendar_link || "https://calendar.google.com/";
  const items = data?.items ?? [];

  // Kick off Google OAuth in-place. We POST with ``return_to`` set to
  // the current path+search so the callback redirects the browser
  // right back to the dashboard (rather than /onboarding) with
  // ``?gcal=connected`` or ``?gcal=error`` appended. The effect below
  // picks that up and invalidates the cached calendar query.
  const handleConnect = React.useCallback(async () => {
    setConnecting(true);
    try {
      const returnTo =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/dashboard";
      const res = await api.startGoogleCalendarConnect(returnTo);
      if (!res.configured) {
        // Prefer the localized copy so non-English users get a proper
        // translation. The backend `detail` is only used as a last
        // resort and is sanitised server-side to never leak internal
        // env var names to the end user.
        toast.error(
          t("dashboard.meetings_reminders.not_configured") ||
            res.detail ||
            "",
        );
        return;
      }
      if (res.redirect_url) {
        window.location.assign(res.redirect_url);
        return;
      }
      // No redirect_url but configured == true → server indicated the
      // tokens are already present. Just refetch so the widget flips
      // out of the not-connected state.
      await qc.invalidateQueries({
        queryKey: ["dashboard", "meetings-reminders", 5],
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t("dashboard.meetings_reminders.error");
      toast.error(msg);
    } finally {
      setConnecting(false);
    }
  }, [qc, t]);

  // Handle the return from Google's OAuth consent. The backend redirects
  // back to the current page with ``?gcal=connected`` (or ``error``). We:
  //  1. Surface a toast so the user sees the outcome.
  //  2. Invalidate the widget query so fresh events load immediately.
  //  3. Strip the params out of the URL so a refresh / share doesn't
  //     re-trigger the toast.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const gcal = params.get("gcal");
    if (!gcal) return;

    if (gcal === "connected") {
      toast.success(t("dashboard.meetings_reminders.connected_toast"));
      qc.invalidateQueries({
        queryKey: ["dashboard", "meetings-reminders", 5],
      });
    } else {
      const detail = params.get("gcal_detail") || "";
      toast.error(
        detail
          ? `${t("dashboard.meetings_reminders.connect_failed")} (${detail})`
          : t("dashboard.meetings_reminders.connect_failed"),
      );
    }

    params.delete("gcal");
    params.delete("gcal_detail");
    const qs = params.toString();
    const next = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
    window.history.replaceState({}, "", next);
  }, [qc, t]);

  return (
    <Card className={`${cardBase} flex flex-col`}>
      <CardHeader className={cardHeaderBase}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
            <CalendarDays className="h-4 w-4" aria-hidden />
          </div>
          <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {t("dashboard.meetings_reminders.title")}
          </CardTitle>
        </div>
        {/* Share/open-external quick action — matches the mock's top-right
            forward icon. Opens the full agenda in a new tab. */}
        <a
          href={calendarLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label={t("dashboard.meetings_reminders.open_calendar")}
          title={t("dashboard.meetings_reminders.open_calendar")}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <Share2 className="h-4 w-4" aria-hidden />
        </a>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col pt-1 pb-4 px-5">
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-slate-400">
              {t("dashboard.meetings_reminders.loading")}
            </div>
          ) : isError ? (
            <div className="py-6 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("dashboard.meetings_reminders.error")}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-3 text-xs"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                {t("dashboard.meetings_reminders.retry")}
              </Button>
            </div>
          ) : !data?.connected ? (
            // Minimal empty-state CTA. One button. Clicking starts the
            // OAuth flow (`handleConnect` posts return_to = this URL
            // and redirects to Google). If the backend has no OAuth
            // creds configured, `startGoogleCalendarConnect` will toast
            // a clear message — we don't expose env vars or "ask
            // support" hints in the widget itself.
            <div className="py-8 flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                <CalendarDays className="h-6 w-6" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {t("dashboard.meetings_reminders.not_connected_title")}
              </p>
              <Button
                type="button"
                size="sm"
                className="h-8 px-4 text-xs gap-1.5"
                disabled={connecting}
                onClick={(e) => {
                  e.stopPropagation();
                  handleConnect();
                }}
              >
                {connecting
                  ? t("dashboard.meetings_reminders.connecting")
                  : t("dashboard.meetings_reminders.connect_cta")}
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {t("dashboard.meetings_reminders.empty")}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {items.map((ev) => {
                const pill = pillClassForMeetingStatus(ev.status);
                const timeLabel = formatMeetingTime(ev, locale);
                return (
                  <li
                    key={ev.id}
                    className="group rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700/80 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 px-2 py-1.5 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="truncate text-[13px] font-semibold text-slate-900 dark:text-white"
                            title={ev.title}
                          >
                            {ev.title}
                          </span>
                          {ev.hangout_link ? (
                            <Video
                              className="h-3 w-3 shrink-0 text-sky-500"
                              aria-label="Video call"
                            />
                          ) : ev.location ? (
                            <MapPin
                              className="h-3 w-3 shrink-0 text-slate-400"
                              aria-label={ev.location}
                            />
                          ) : null}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span
                            className={cn(
                              "truncate italic",
                              ev.owner_is_me ? "text-slate-700 dark:text-slate-300" : "",
                            )}
                          >
                            {ev.owner_is_me
                              ? t("dashboard.meetings_reminders.owner_me")
                              : ev.owner_label}
                          </span>
                          {timeLabel ? (
                            <>
                              <span className="w-1 h-1 bg-slate-300 rounded-full shrink-0" />
                              <span className="truncate">{timeLabel}</span>
                            </>
                          ) : null}
                          {ev.attendee_count > 0 ? (
                            <>
                              <span className="w-1 h-1 bg-slate-300 rounded-full shrink-0" />
                              <span className="truncate">
                                +{ev.attendee_count}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <span
                        className={cn(
                          "shrink-0 mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                          pill.bg,
                          pill.text,
                        )}
                      >
                        <span
                          className={cn("h-1.5 w-1.5 rounded-full", pill.dot)}
                          aria-hidden
                        />
                        {t(pill.labelKey)}
                      </span>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded p-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            aria-label={t("dashboard.meetings_reminders.row_menu")}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          {ev.html_link ? (
                            <DropdownMenuItem asChild>
                              <a
                                href={ev.html_link}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                                {t("dashboard.meetings_reminders.open_in_gcal")}
                              </a>
                            </DropdownMenuItem>
                          ) : null}
                          {ev.hangout_link ? (
                            <DropdownMenuItem asChild>
                              <a
                                href={ev.hangout_link}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Video className="h-3.5 w-3.5 mr-2" />
                                {t("dashboard.meetings_reminders.join_meeting")}
                              </a>
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              if (!ev.html_link) return;
                              navigator.clipboard?.writeText(ev.html_link).catch(() => {
                                /* clipboard blocked */
                              });
                              toast.success(t("dashboard.meetings_reminders.link_copied"));
                            }}
                            disabled={!ev.html_link}
                          >
                            <Share2 className="h-3.5 w-3.5 mr-2" />
                            {t("dashboard.meetings_reminders.copy_link")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer: "Open in Calendar" CTA to match the mock. Always visible
            when connected so the manager has a one-click bail-out to the
            full calendar UI. */}
        {data?.connected ? (
          <a
            href={calendarLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-3 inline-flex items-center gap-1 self-center text-xs font-semibold italic text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            {t("dashboard.meetings_reminders.open_in_calendar")}
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Clock-ins widget — "who just arrived today".
 *
 * Mirrors the product mock: a compact list of the latest 5 arrivals
 * with a tiny status icon on the right (check = on time, red × = late).
 * Whole card is clickable and routes to ``/dashboard/attendance`` for
 * the full live list and history.
 */
function ClockInsCard({
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
  const { data, isLoading, isError, refetch, isFetching } =
    useQuery<DashboardClockInsResponse>({
      queryKey: ["dashboard", "clock-ins", 5],
      queryFn: () => api.getDashboardClockIns(5),
      // 30 s refetch matches the widget's framing ("just arrived") —
      // a fresh arrival shouldn't lag by more than one poll cycle.
      refetchInterval: 30_000,
      staleTime: 15_000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
      refetchOnMount: "always",
    });

  const locale =
    typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";

  const items = data?.items ?? [];
  const lateToday = data?.counts.late ?? 0;
  const totalToday = data?.counts.total ?? items.length;

  const goToAttendance = React.useCallback(() => {
    navigate("/dashboard/attendance");
  }, [navigate]);

  return (
    <Card
      className={cn(cardBase, "flex flex-col cursor-pointer")}
      onClick={goToAttendance}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToAttendance();
        }
      }}
    >
      <CardHeader className={cardHeaderBase}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/12 text-sky-600 dark:text-sky-400">
            <Clock className="h-4 w-4" aria-hidden />
          </div>
          <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {t("dashboard.clock_ins.title")}
          </CardTitle>
        </div>
        {/* Quick totals pill. Late count is bold & amber so it grabs
            the eye; matches Tasks & Demands "3 pending" affordance. */}
        {totalToday > 0 ? (
          <span
            className={cn(
              "shrink-0 text-[10px] font-semibold rounded-full border px-2 py-0.5",
              lateToday > 0
                ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300",
            )}
          >
            {lateToday > 0
              ? t("dashboard.clock_ins.late_count").replace("{n}", String(lateToday))
              : t("dashboard.clock_ins.all_on_time")}
          </span>
        ) : null}
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col pt-1 pb-4 px-5">
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-slate-400">
              {t("dashboard.clock_ins.loading")}
            </div>
          ) : isError ? (
            <div className="py-6 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("dashboard.clock_ins.error")}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-3 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  refetch();
                }}
                disabled={isFetching}
              >
                {t("dashboard.clock_ins.retry")}
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/60 text-slate-400">
                <Clock className="h-5 w-5" aria-hidden />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("dashboard.clock_ins.empty")}
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {items.map((ev) => {
                const time = formatClockInTime(ev.timestamp, locale);
                const isLate = ev.status === "LATE";
                return (
                  <li
                    key={ev.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-[13px] font-medium text-slate-900 dark:text-white"
                        title={ev.staff.name}
                      >
                        {ev.staff.name || t("dashboard.clock_ins.unknown_staff")}{" "}
                        <span className="font-normal text-slate-500 dark:text-slate-400">
                          {t("dashboard.clock_ins.just_arrived")}
                        </span>
                      </div>
                      {/* Subtitle: role or "X min late". Shown only when
                          we have something meaningful to say — keeps the
                          row feeling dense & scannable like the mock. */}
                      {isLate && typeof ev.lateness_minutes === "number" ? (
                        <div className="text-[11px] text-amber-600 dark:text-amber-400">
                          {t("dashboard.clock_ins.minutes_late").replace(
                            "{n}",
                            String(ev.lateness_minutes),
                          )}
                        </div>
                      ) : ev.location_mismatch ? (
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5" aria-hidden />
                          {t("dashboard.clock_ins.wrong_branch")}
                        </div>
                      ) : null}
                    </div>

                    <span
                      className={cn(
                        "shrink-0 text-[13px] tabular-nums font-medium tracking-tight",
                        isLate
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-600 dark:text-slate-300",
                      )}
                    >
                      {time}
                    </span>

                    {isLate ? (
                      <XCircle
                        className="shrink-0 h-4 w-4 text-amber-500"
                        aria-label={t("dashboard.clock_ins.status_late")}
                      />
                    ) : (
                      <CheckCircle2
                        className="shrink-0 h-4 w-4 text-emerald-500"
                        aria-label={t("dashboard.clock_ins.status_on_time")}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goToAttendance();
          }}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline self-start"
        >
          {t("dashboard.clock_ins.view_all")}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </CardContent>
    </Card>
  );
}

/** Compact "17:02" style time label for a clock-in row. Uses the
 * browser's locale so 12h/24h preference is honored. */
function formatClockInTime(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
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
  /** Map slot_id → definition for Miya-created tiles (`custom:<uuid>`). */
  customWidgetsById: Record<string, DashboardCustomWidgetDef>;
};

export function SortableDashboardWidget({
  id,
  editMode,
  colClassName,
  onRemove,
  children,
}: {
  id: string;
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

function MiyaCustomDashboardWidgetCard({
  def,
  cardBase,
  cardHeaderBase,
  t,
  navigate,
}: {
  def: DashboardCustomWidgetDef;
  cardBase: string;
  cardHeaderBase: string;
  t: (key: string) => string;
  navigate: NavigateFunction;
}) {
  const Icon = CUSTOM_WIDGET_ICONS[def.icon] || Sparkles;
  const link = (def.link_url || "").trim();
  const hasLink = !!link && !link.startsWith("miya:");

  const askMiya = () => {
    try {
      const host = document.querySelector("#lua-shadow-root");
      const btn = host?.shadowRoot?.querySelector?.(
        "button.lua-pop-button, button",
      ) as HTMLButtonElement | null | undefined;
      btn?.click();
    } catch {
      /* Miya widget not mounted — silently no-op */
    }
  };

  const open = () => {
    if (!hasLink) {
      askMiya();
      return;
    }
    if (/^https?:\/\//i.test(link)) {
      window.open(link, "_blank", "noopener,noreferrer");
      return;
    }
    const path = link.startsWith("/") ? link : `/${link}`;
    navigate(path);
  };

  return (
    <Card className={`${cardBase} border-violet-200/60 dark:border-violet-900/35`}>
      <CardHeader className={`${cardHeaderBase} pb-2 pt-5`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 text-violet-600 dark:from-violet-500/20 dark:to-fuchsia-500/10 dark:text-violet-300">
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {def.title}
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold border-violet-300/60 text-violet-700 dark:border-violet-700/50 dark:text-violet-300"
                >
                  {t("dashboard.miya_widget.badge")}
                </Badge>
              </div>
              {def.subtitle ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{def.subtitle}</p>
              ) : null}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col px-5 pb-4 pt-0">
        <Button
          type="button"
          size="sm"
          className="mt-1 w-fit gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
          onClick={open}
        >
          {hasLink
            ? t("dashboard.miya_widget.open")
            : t("dashboard.miya_widget.ask_miya")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        {!hasLink && (
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            {t("dashboard.miya_widget.ask_miya_hint")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardWidgetById({
  id,
  props,
}: {
  id: string;
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
    customWidgetsById,
  } = props;

  if (id.startsWith(CUSTOM_WIDGET_PREFIX)) {
    const def = customWidgetsById[id];
    if (!def) {
      return (
        <Card className={cardBase}>
          <CardContent className="p-5 text-sm text-slate-500 dark:text-slate-400">{t("dashboard.miya_widget.loading")}</CardContent>
        </Card>
      );
    }
    return (
      <MiyaCustomDashboardWidgetCard
        def={def}
        cardBase={cardBase}
        cardHeaderBase={cardHeaderBase}
        t={t}
        navigate={navigate}
      />
    );
  }

  const attendance = summary?.attendance as Record<string, unknown> | undefined;
  const operations = summary?.operations as Record<string, unknown> | undefined;
  const wellbeing = summary?.wellbeing as Record<string, unknown> | undefined;

  const builtinId = id as DashboardWidgetId;
  switch (builtinId) {
    case "insights": {
      // The "brain" widget. Shows the top 5 most important operational
      // issues, ranked by urgency. Whole card is clickable → dedicated
      // operational-issues page with the complete ranked list grouped
      // by severity. Each row also navigates to the specific action.
      const totalIssues = Number(summary?.insights?.total || insights.length);
      const goToAllIssues = () => navigate("/dashboard/operational-issues");
      return (
        <Card
          className={cn(
            cardBase,
            "overflow-hidden cursor-pointer",
            // cardBase already has relative + premium shadows + hover
            // lift; we only override the border tint when there's a
            // critical alert so the card visibly urgent.
            criticalCount > 0 &&
              "border-red-200 dark:border-red-900/40 ring-red-500/10",
          )}
          onClick={goToAllIssues}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              goToAllIssues();
            }
          }}
        >
          <div
            className={cn(
              "absolute inset-0 pointer-events-none",
              criticalCount > 0
                ? "bg-gradient-to-br from-red-500/12 via-transparent to-transparent"
                : "bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent",
            )}
          />
          <CardHeader className="pb-1.5 px-6 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center",
                    criticalCount > 0
                      ? "bg-red-500/10 dark:bg-red-500/15 animate-pulse"
                      : "bg-emerald-500/10 dark:bg-emerald-500/15",
                  )}
                >
                  {criticalCount > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <div className="leading-tight min-w-0">
                  <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                    {t("dashboard.insights.title")}
                  </CardTitle>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                    {t("dashboard.insights.subtitle")}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant="outline"
                  className={cn(
                    "border-none text-[10px] font-bold h-5 px-2",
                    attentionNow > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-slate-500 dark:text-slate-400",
                  )}
                >
                  {isLoading ? "…" : attentionNow} {t("dashboard.insights.need_attention")}
                </Badge>
                {criticalCount > 0 && (
                  <Badge
                    variant="outline"
                    className="border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300 text-[10px] font-black h-5 px-2"
                  >
                    {criticalCount} {t("dashboard.insights.critical_badge")}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 px-5 pb-4 pt-2">
            {isLoading ? (
              <div className="text-sm text-slate-400">
                {t("dashboard.insights.loading")}
              </div>
            ) : insightsVisible.length > 0 ? (
              <>
                {criticalCount > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/40 dark:bg-red-950/25">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-red-800 dark:text-red-200">
                          {t("dashboard.insights.critical_banner_title")}
                        </div>
                        <div className="text-[11px] text-red-700/90 dark:text-red-300/80">
                          {t("dashboard.insights.critical_banner_body")}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <ol className="space-y-1.5">
                  {insightsVisible.map((it, idx) => {
                    const level = String(it.level || "").toUpperCase();
                    const dot =
                      level === "CRITICAL"
                        ? "bg-red-500"
                        : level === "OPERATIONAL"
                          ? "bg-amber-500"
                          : level === "PERFORMANCE"
                            ? "bg-blue-500"
                            : level === "PREVENTIVE"
                              ? "bg-violet-500"
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
                            : level === "PREVENTIVE"
                              ? "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200"
                              : level === "RESOLVED"
                                ? "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
                                : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200";

                    return (
                      <li key={it.id || idx}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(getActionRoute(it.action_url));
                          }}
                          className={cn(
                            "group w-full text-left rounded-xl px-3 py-2 -mx-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30",
                            level === "CRITICAL" && "bg-red-50/40 dark:bg-red-950/10",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {/* Rank pill — makes it obvious the list is
                                priority-ordered. 1 is the single most
                                urgent issue right now. */}
                            <div
                              className={cn(
                                "shrink-0 mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black tabular-nums border",
                                idx === 0 && criticalCount > 0
                                  ? "border-red-300 bg-red-100 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                                  : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
                              )}
                              aria-hidden
                            >
                              {idx + 1}
                            </div>
                            <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", dot)} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-sm text-slate-900 dark:text-white leading-tight font-semibold truncate">
                                  {it.summary || t("dashboard.insights.item_fallback")}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge
                                    variant="outline"
                                    className={cn("text-[10px] font-bold", levelPill)}
                                  >
                                    {level}
                                  </Badge>
                                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 mt-0.5" />
                                </div>
                              </div>
                              {it.recommended_action && (
                                <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug line-clamp-2 mt-0.5">
                                  {level === "CRITICAL"
                                    ? t("dashboard.insights.action_prefix")
                                    : level === "RESOLVED"
                                      ? t("dashboard.insights.resolved_prefix")
                                      : t("dashboard.insights.recommendation_prefix")}
                                  : {it.recommended_action}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-sm text-slate-800 dark:text-white leading-tight font-medium">
                  {t("dashboard.insights.none")}
                </span>
              </div>
            )}

            {/* Always-visible CTA at the bottom. Navigation happens on
                the whole card anyway, but a visible affordance makes
                the "go see everything" flow obvious. */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToAllIssues();
              }}
              className="mt-auto border-t border-slate-100 pt-2.5 flex items-center justify-between text-left text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:border-slate-800 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              <span>
                {totalIssues > 5
                  ? t("dashboard.insights.view_all_count").replace(
                      "{n}",
                      String(totalIssues),
                    )
                  : t("dashboard.insights.view_all")}
              </span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </button>
          </CardContent>
        </Card>
      );
    }

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

    case "operations": {
      // Operations widget — purely operational productivity signals.
      // Replaces the former review-based stats (negative reviews /
      // average rating) that were deprecated when the Shift Reviews
      // feature was removed. The three rows below pull from the
      // `analytics` and `operations.next_delivery` payloads the
      // summary endpoint already emits — zero new backend work.
      const az = summary?.analytics as Record<string, number> | undefined;
      const openTasks = az?.tasks_open_today ?? 0;
      const urgentOpen = az?.urgent_tasks_open ?? 0;
      const nextDel = operations?.next_delivery as
        | { supplier?: string; date?: string }
        | undefined;
      const supplier =
        nextDel?.supplier && nextDel.supplier !== "None" ? nextDel.supplier : null;
      const deliveryDate =
        nextDel?.date && nextDel.date !== "None" ? nextDel.date : null;
      const completion = (operations?.completion_rate as number) || 0;
      return (
        <Card className={cardBase}>
          <CardHeader className={cardHeaderBase}>
            <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {t("dashboard.operations.title")}
            </CardTitle>
            <Calendar className="w-4 h-4 text-slate-300 dark:text-slate-600" />
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col space-y-4 pt-2 pb-6 px-6">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  {isLoading ? "…" : completion}%
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {t("dashboard.operations.completion_today")}
                </div>
              </div>
              {!isLoading && urgentOpen > 0 ? (
                <Badge
                  variant="outline"
                  className="border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300 text-[10px] font-bold h-5 px-2"
                >
                  {urgentOpen} {t("dashboard.operations.urgent")}
                </Badge>
              ) : null}
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-3">
                <ListTodo
                  className={cn(
                    "w-4 h-4 mt-0.5 shrink-0",
                    openTasks > 0
                      ? "text-amber-500"
                      : "text-slate-300 dark:text-slate-600",
                  )}
                />
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {isLoading ? "…" : openTasks}
                  </span>{" "}
                  {t("dashboard.operations.open_tasks")}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Package
                  className={cn(
                    "w-4 h-4 mt-0.5 shrink-0",
                    supplier
                      ? "text-violet-500"
                      : "text-slate-300 dark:text-slate-600",
                  )}
                />
                <p className="text-sm text-slate-700 dark:text-slate-300 min-w-0">
                  {supplier && deliveryDate ? (
                    <>
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                        {supplier}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {" "}
                        · {deliveryDate}
                      </span>
                    </>
                  ) : (
                    t("dashboard.operations.no_delivery")
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

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
      // safetyOpen is HIGH/CRITICAL only; incOpen is all open incidents (superset). Do not sum both.
      const risk = incOpen + missingGeo;
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

    case "reservations":
      return (
        <ReservationsDashboardCard
          cardBase={cardBase}
          cardHeaderBase={cardHeaderBase}
          t={t}
          navigate={navigate}
          hasRole={hasRole}
        />
      );

    case "retail_store_ops": {
      const nextDel = operations?.next_delivery as { supplier?: string; date?: string } | undefined;
      const supplier = nextDel?.supplier && nextDel.supplier !== "None" ? nextDel.supplier : null;
      const dStr = nextDel?.date && nextDel.date !== "None" ? nextDel.date : null;
      const present = (attendance?.present_count as number) ?? 0;
      return (
        <Card
          className={`${cardBase} cursor-pointer hover:shadow-md transition-shadow flex flex-col`}
          onClick={() => navigate("/dashboard/inventory")}
        >
          <CardHeader className={cardHeaderBase}>
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                <Store className="w-5 h-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {t("dashboard.retail_store_ops.title")}
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px] font-bold h-5 px-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                    {t("dashboard.retail_store_ops.badge")}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{t("dashboard.retail_store_ops.subtitle")}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 pt-0 pb-6 px-6">
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-3 py-2">
              <div className="text-2xl font-black text-slate-900 dark:text-white">{isLoading ? "…" : present}</div>
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{t("dashboard.retail_store_ops.kpi_clocked_in")}</div>
            </div>
            {isLoading ? (
              <div className="text-sm text-slate-400">{t("dashboard.status.updating")}</div>
            ) : supplier && dStr ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] dark:bg-emerald-950/20 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{t("dashboard.inventory_delivery.title")}</div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate mt-0.5">{supplier}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{dStr}</div>
              </div>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-400">{t("dashboard.retail_store_ops.empty_hint")}</p>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate("/dashboard/inventory");
              }}
              className="mt-auto flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              {t("dashboard.retail_store_ops.open")}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </CardContent>
        </Card>
      );
    }

    case "jobsite_crew": {
      const active = (attendance?.active_shifts as number) ?? 0;
      const gaps = (attendance?.shift_gaps as number) ?? 0;
      const onSite = (attendance?.present_count as number) ?? 0;
      return (
        <Card
          className={`${cardBase} cursor-pointer hover:shadow-md transition-shadow flex flex-col`}
          onClick={() => navigate("/dashboard/scheduling")}
        >
          <CardHeader className={cardHeaderBase}>
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-400">
                <HardHat className="w-5 h-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {t("dashboard.jobsite_crew.title")}
                </CardTitle>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{t("dashboard.jobsite_crew.subtitle")}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 pt-0 pb-6 px-6">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-2 py-2 text-center sm:text-left">
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums">{isLoading ? "…" : onSite}</div>
                <div className="text-[9px] sm:text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-tight">{t("dashboard.jobsite_crew.kpi_on_site")}</div>
              </div>
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-2 py-2 text-center sm:text-left">
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums">{isLoading ? "…" : active}</div>
                <div className="text-[9px] sm:text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-tight">{t("dashboard.jobsite_crew.active_shifts")}</div>
              </div>
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-2 py-2 text-center sm:text-left">
                <div className={`text-xl sm:text-2xl font-black tabular-nums ${gaps > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
                  {isLoading ? "…" : gaps}
                </div>
                <div className="text-[9px] sm:text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-tight">{t("dashboard.jobsite_crew.open_roles")}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate("/dashboard/scheduling");
              }}
              className="mt-auto flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
            >
              {t("dashboard.jobsite_crew.open")}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </CardContent>
        </Card>
      );
    }

    case "ops_reports":
      return (
        <OpsReportsEnterpriseCard cardBase={cardBase} cardHeaderBase={cardHeaderBase} t={t} navigate={navigate} />
      );

    case "staff_inbox":
      return (
        <StaffInboxEnterpriseCard cardBase={cardBase} cardHeaderBase={cardHeaderBase} t={t} navigate={navigate} />
      );

    case "tasks_demands":
      return (
        <TasksDemandsCard cardBase={cardBase} cardHeaderBase={cardHeaderBase} t={t} navigate={navigate} />
      );

    case "meetings_reminders":
      return (
        <MeetingsRemindersCard cardBase={cardBase} cardHeaderBase={cardHeaderBase} t={t} navigate={navigate} />
      );

    case "clock_ins":
      return (
        <ClockInsCard cardBase={cardBase} cardHeaderBase={cardHeaderBase} t={t} navigate={navigate} />
      );

    default:
      return null;
  }
}
