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
  ChevronDown,
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
  Check,
  Loader2,
  // Icons used by the new category-bucketed widgets:
  Flame,
  Wrench,
  Briefcase,
  Wallet,
  Layers,
  ShoppingBag,
  // Staff messages widget
  Send,
  CheckCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EscalateStaffRequestModal } from "@/components/staff/EscalateStaffRequestModal";

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
  "incidents",
  // Category-bucketed widgets backed by /api/dashboard/category-tasks/.
  // Each one renders the top-N pressing tasks for one Miya-curated lane.
  "urgent_top",
  "human_resources",
  "finance",
  "maintenance",
  // Procurement asks ("buy 6 bottles of vodka") — separate from Finance
  // (paying invoices) and Inventory (stock observations) so the manager
  // who told Miya "we need to purchase X" sees the request next to
  // other open POs instead of buried in the generic inbox.
  "purchase_orders",
  // Catch-all lane for anything Miya couldn't slot into a named lane —
  // general / miscellaneous requests still get a home on the dashboard.
  "miscellaneous",
  // Admin → Staff WhatsApp messaging surface. Composer + delivery /
  // read receipts feed; routes through the same NotificationService
  // as Miya's `inform_staff` tool so a structured-form send and a
  // free-text Miya chat send share one log.
  "staff_messages",
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
  incidents: ShieldAlert,
  urgent_top: Flame,
  human_resources: Briefcase,
  finance: Wallet,
  maintenance: Wrench,
  purchase_orders: ShoppingBag,
  miscellaneous: Layers,
  staff_messages: Send,
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
  incidents: "dashboard.widget_add.incidents",
  urgent_top: "dashboard.widget_add.urgent_top",
  human_resources: "dashboard.widget_add.human_resources",
  finance: "dashboard.widget_add.finance",
  maintenance: "dashboard.widget_add.maintenance",
  purchase_orders: "dashboard.widget_add.purchase_orders",
  miscellaneous: "dashboard.widget_add.miscellaneous",
  staff_messages: "dashboard.widget_add.staff_messages",
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
  incidents: "general",
  urgent_top: "general",
  human_resources: "general",
  finance: "general",
  maintenance: "general",
  purchase_orders: "general",
  miscellaneous: "general",
  staff_messages: "general",
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

/**
 * System default widget layout.
 *
 * The first row is the manager's "what needs me right now" board:
 * Clock-in (people stuff), Urgent TOP 5 (everything pressing), and the
 * three category lanes Miya routes new work into (Human Resources,
 * Meetings & Reminders, Finance, Maintenance). Below that we keep the
 * legacy operational cards (Insights / Tasks & demands / Staffing /
 * Sales / Operations / Wellbeing) so existing customers don't lose
 * anything they were looking at yesterday.
 *
 * Optional / vertical-specific widgets (retail, hospitality, jobsite,
 * etc.) are still added via "Customize dashboard". The merge logic in
 * `mergeNewDefaultWidgets` ensures users who already have a saved
 * layout get the new category cards appended on next load (unless they
 * explicitly dismissed them via the × control).
 */
export const DEFAULT_DASHBOARD_WIDGET_ORDER: DashboardWidgetId[] = [
  "clock_ins",
  "urgent_top",
  "human_resources",
  "meetings_reminders",
  "finance",
  "maintenance",
  "purchase_orders",
  "miscellaneous",
  // Admin → Staff WhatsApp composer + delivery / read receipts feed.
  // Goes high in the default order because it's a verb-y "I want to
  // do something now" widget, sitting next to the inbox lanes that
  // surface the work to communicate about.
  "staff_messages",
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

/** Lean shape of a single staff request as it lands in the dashboard
 * widget. The full ``StaffRequest`` object has many more fields (audio,
 * comments, voice transcription) — we only need what we render. */
type InboxItem = {
  id: string;
  subject?: string | null;
  description?: string | null;
  category?: string | null;
  priority?: string | null;
  status?: string | null;
  staff_name?: string | null;
  staff_display_name?: string | null;
  created_at?: string | null;
};

/** Compact pill colours per StaffRequest.category. Matches the inbox
 * page's chip palette so the dashboard preview and the full inbox use
 * the same visual vocabulary. */
function inboxCategoryClass(category: string | null | undefined): {
  bg: string;
  text: string;
  border: string;
} {
  const c = String(category || "").toUpperCase();
  switch (c) {
    case "HR":
      return {
        bg: "bg-violet-50 dark:bg-violet-950/30",
        text: "text-violet-700 dark:text-violet-300",
        border: "border-violet-200 dark:border-violet-900/50",
      };
    case "FINANCE":
    case "PAYROLL":
      return {
        bg: "bg-emerald-50 dark:bg-emerald-950/30",
        text: "text-emerald-700 dark:text-emerald-300",
        border: "border-emerald-200 dark:border-emerald-900/50",
      };
    case "MAINTENANCE":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/30",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-200 dark:border-amber-900/50",
      };
    case "DOCUMENT":
      return {
        bg: "bg-sky-50 dark:bg-sky-950/30",
        text: "text-sky-700 dark:text-sky-300",
        border: "border-sky-200 dark:border-sky-900/50",
      };
    case "SCHEDULING":
      return {
        bg: "bg-indigo-50 dark:bg-indigo-950/30",
        text: "text-indigo-700 dark:text-indigo-300",
        border: "border-indigo-200 dark:border-indigo-900/50",
      };
    case "INVENTORY":
      return {
        bg: "bg-orange-50 dark:bg-orange-950/30",
        text: "text-orange-700 dark:text-orange-300",
        border: "border-orange-200 dark:border-orange-900/50",
      };
    case "RESERVATIONS":
      return {
        bg: "bg-pink-50 dark:bg-pink-950/30",
        text: "text-pink-700 dark:text-pink-300",
        border: "border-pink-200 dark:border-pink-900/50",
      };
    case "OPERATIONS":
      return {
        bg: "bg-teal-50 dark:bg-teal-950/30",
        text: "text-teal-700 dark:text-teal-300",
        border: "border-teal-200 dark:border-teal-900/50",
      };
    default:
      return {
        bg: "bg-slate-50 dark:bg-slate-800/40",
        text: "text-slate-600 dark:text-slate-300",
        border: "border-slate-200 dark:border-slate-700",
      };
  }
}

/** Short label for a category chip — lowercase looks calmer in a dense
 * list. We keep "HR" uppercase because everyone reads it that way. */
function inboxCategoryLabel(category: string | null | undefined): string {
  const c = String(category || "").toUpperCase();
  if (!c || c === "OTHER") return "Misc";
  if (c === "HR") return "HR";
  return c.charAt(0) + c.slice(1).toLowerCase();
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

  // Latest 5 actionable inquiries across **all** categories. We pull
  // PENDING + ESCALATED on the server (where the lean serializer skips
  // comments / voice / transcription) and trim to 5 client-side. Sort
  // is created_at DESC so newest land on top — matches what a manager
  // expects from a "team inbox" preview.
  const listQuery = useQuery<{ items: InboxItem[]; pending: number; escalated: number }>({
    queryKey: ["staff-requests-inbox-widget", "all", accessToken],
    enabled: !!accessToken,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 6000),
    refetchOnMount: "always",
    queryFn: async () => {
      // Pull pending + escalated in two cheap calls. The list endpoint
      // doesn't accept multiple statuses, but pending is by far the
      // common case so we cap escalated at ~5 and merge.
      const fetchPage = async (statusKey: "PENDING" | "ESCALATED") => {
        const qs = new URLSearchParams();
        qs.set("status", statusKey);
        qs.set("page_size", "10");
        const r = await fetch(`${API_BASE}/staff/requests/?${qs.toString()}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        });
        if (!r.ok) throw new Error(`staff-requests:${statusKey}`);
        const json = await r.json();
        if (Array.isArray(json)) return json as InboxItem[];
        if (Array.isArray(json?.results)) return json.results as InboxItem[];
        if (Array.isArray(json?.requests)) return json.requests as InboxItem[];
        return [] as InboxItem[];
      };
      const [pendingRows, escalatedRows] = await Promise.all([
        fetchPage("PENDING"),
        fetchPage("ESCALATED"),
      ]);
      const merged = [...escalatedRows, ...pendingRows];
      // Stable sort by created_at desc; items with no timestamp sink.
      merged.sort((a, b) => {
        const ta = a.created_at ? Date.parse(a.created_at) : 0;
        const tb = b.created_at ? Date.parse(b.created_at) : 0;
        return tb - ta;
      });
      const items = merged.slice(0, 5);
      return {
        items,
        pending: pendingRows.length,
        escalated: escalatedRows.length,
      };
    },
  });

  const items = listQuery.data?.items ?? [];
  const pendingCount = listQuery.data?.pending ?? 0;
  const escalatedCount = listQuery.data?.escalated ?? 0;
  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;

  const goInbox = React.useCallback(() => {
    navigate("/dashboard/staff-requests");
  }, [navigate]);

  return (
    <Card
      className={cn(cardBase, "flex flex-col cursor-pointer")}
      role="button"
      tabIndex={0}
      onClick={goInbox}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goInbox();
        }
      }}
    >
      <CardHeader className={cardHeaderBase}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/12 text-violet-600 dark:text-violet-400">
            <Inbox className="h-4 w-4" aria-hidden />
          </div>
          <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {t("dashboard.staff_inbox.title")}
          </CardTitle>
        </div>
        {/* Header right: tiny pending / escalated chips. Mirrors the
            CategoryTasksCard "in progress / done" affordance. */}
        <div className="flex items-center gap-1 shrink-0">
          {pendingCount > 0 ? (
            <span className="inline-flex h-5 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
              <span>{t("dashboard.staff_inbox.pending_label")}</span>
              <span className="tabular-nums">{pendingCount}</span>
            </span>
          ) : null}
          {escalatedCount > 0 ? (
            <span className="inline-flex h-5 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 text-[10px] font-semibold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              <span>{t("dashboard.staff_inbox.escalated_label")}</span>
              <span className="tabular-nums">{escalatedCount}</span>
            </span>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col pt-1 pb-3 px-5">
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-slate-400">
              {t("dashboard.category_tasks.loading")}
            </div>
          ) : isError ? (
            <div className="py-6 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("dashboard.category_tasks.error")}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-3 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  listQuery.refetch();
                }}
              >
                {t("dashboard.category_tasks.retry")}
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/60 text-slate-400">
                <Inbox className="h-5 w-5" aria-hidden />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("dashboard.staff_inbox.empty")}
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {items.map((it) => {
                const cat = inboxCategoryClass(it.category);
                const subject =
                  (it.subject || it.description || "").trim() ||
                  t("dashboard.staff_inbox.fallback_title");
                const who =
                  (it.staff_display_name || it.staff_name || "").trim();
                const isUrgent = String(it.priority || "").toUpperCase() === "URGENT";
                return (
                  <li
                    key={it.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-[13px] font-medium text-slate-900 dark:text-white"
                        title={subject}
                      >
                        {subject}
                      </div>
                      {who ? (
                        <div className="truncate text-[10.5px] text-slate-500 dark:text-slate-400">
                          {who}
                        </div>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        cat.bg,
                        cat.text,
                        cat.border,
                      )}
                      title={String(it.category || "OTHER")}
                    >
                      {inboxCategoryLabel(it.category)}
                    </span>
                    {isUrgent ? (
                      <span
                        className="shrink-0 inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                        aria-label={t("dashboard.category_tasks.pill_urgent")}
                      >
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                        {t("dashboard.category_tasks.pill_urgent")}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer "More v" — keeps the visual consistency with the new
            category widgets. Whole card is also clickable. */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goInbox();
          }}
          className="mt-1 flex w-full items-center justify-center gap-1 rounded-md py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          aria-label={t("dashboard.category_tasks.more")}
        >
          {t("dashboard.category_tasks.more")}
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
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

/**
 * Visual definition for one row's status pill — colors + i18n label key.
 * Centralised here so every widget uses the same vocabulary and no row
 * is missing a status indicator.
 */
type PillVisual = { dot: string; text: string; bg: string; label: string };

/** Granular pill descriptors keyed by ``DashboardTaskPillStatus``. */
const PILL_VISUALS: Record<NonNullable<DashboardTaskDemandItem["pill_status"]>, PillVisual> = {
  // Final-state buckets first (cool / muted) so they read as "done".
  DONE: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50",
    label: "done",
  },
  PAID: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50",
    label: "paid",
  },
  CANCELLED: {
    dot: "bg-slate-400",
    text: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700",
    label: "cancelled",
  },
  VOIDED: {
    dot: "bg-slate-400",
    text: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700",
    label: "voided",
  },
  // Active / progress states.
  IN_PROGRESS: {
    dot: "bg-sky-500",
    text: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900/50",
    label: "in_progress",
  },
  ASSIGNED: {
    dot: "bg-indigo-500",
    text: "text-indigo-700 dark:text-indigo-300",
    bg: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50",
    label: "assigned",
  },
  // Holding patterns — manager has touched the row but it's not moving on its own.
  WAITING_ON: {
    dot: "bg-violet-500",
    text: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-900/50",
    label: "waiting_on",
  },
  ESCALATED: {
    dot: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-300",
    bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/50",
    label: "escalated",
  },
  // Time-pressure / "needs eyes" states (warm hues).
  OVERDUE: {
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50",
    label: "overdue",
  },
  DUE_SOON: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50",
    label: "due_soon",
  },
  // Default lanes.
  NEW: {
    dot: "bg-cyan-500",
    text: "text-cyan-700 dark:text-cyan-300",
    bg: "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-900/50",
    label: "new",
  },
  PENDING: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50",
    label: "pending",
  },
  OPEN: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50",
    label: "open",
  },
  DRAFT: {
    dot: "bg-slate-400",
    text: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700",
    label: "draft",
  },
};

/**
 * Resolve the visual pill for a row. Prefers the granular ``pill_status``
 * the backend now emits, but falls back to the coarse ``status`` field
 * (and finally a priority-aware default) so older API responses still
 * render a status — every row should ALWAYS show a status pill, never a
 * blank space.
 */
function statusPillClass(
  status: DashboardTaskDemandItem["status"],
  priority: DashboardTaskDemandItem["priority"],
  pillStatus?: DashboardTaskDemandItem["pill_status"],
): PillVisual {
  if (pillStatus && PILL_VISUALS[pillStatus]) return PILL_VISUALS[pillStatus];
  if (status === "COMPLETED") return PILL_VISUALS.DONE;
  if (status === "IN_PROGRESS") return PILL_VISUALS.IN_PROGRESS;
  if (status === "CANCELLED") return PILL_VISUALS.CANCELLED;
  if (priority === "URGENT") return PILL_VISUALS.OVERDUE;
  return PILL_VISUALS.PENDING;
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

  // Reassign target — set when the manager clicks "Reassign" in the
  // row dropdown. Holds the row's id + display title + (if present)
  // the request category so the escalate modal can highlight the
  // right department tag chips. ``null`` means the modal is closed.
  const [reassignTarget, setReassignTarget] = useState<{
    id: string;
    title: string;
    category?: string;
  } | null>(null);

  const reassignMutation = useMutation({
    mutationFn: ({
      id,
      assigneeId,
    }: {
      id: string;
      assigneeId: string;
    }) => api.updateDashboardTaskAssignee(id, assigneeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard", "tasks-demands", 5] });
      // Category-bucketed widgets surface the same rows by category
      // and need to redraw the assignee chip after a reassign — bust
      // them all via predicate match on the queryKey shape.
      qc.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === "dashboard" &&
          q.queryKey[1] === "category-tasks",
      });
      qc.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      toast.success(
        t("dashboard.tasks_demands.reassign_success") ||
          "Task reassigned.",
      );
      setReassignTarget(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to reassign";
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
                const pill = statusPillClass(row.status, row.priority, row.pill_status);
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
                          {/* Reassign — opens the same picker the
                              staff inbox uses so the manager can
                              hand the row off to anyone in the
                              tenant. We pass the row's id + title
                              + category so the modal can pre-rank
                              the department tags relevant to it
                              (e.g. PURCHASE_ORDER → PURCHASES). */}
                          <DropdownMenuItem
                            onClick={() =>
                              setReassignTarget({
                                id: row.id,
                                title: row.title,
                                category: (row as { category?: string })
                                  .category,
                              })
                            }
                          >
                            {t("dashboard.tasks_demands.reassign")}
                          </DropdownMenuItem>
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

      {/* Reassign picker — same modal the staff inbox uses, opened
          when the manager picks "Reassign" from a row's action
          menu. Mounted at the card level so it survives the row
          re-rendering after the mutation invalidates the query. */}
      <EscalateStaffRequestModal
        mode="reassign"
        open={reassignTarget !== null}
        onOpenChange={(o) => {
          if (!o) setReassignTarget(null);
        }}
        isPending={reassignMutation.isPending}
        category={reassignTarget?.category}
        onConfirm={(assigneeId) => {
          if (!reassignTarget) return;
          reassignMutation.mutate({ id: reassignTarget.id, assigneeId });
        }}
      />
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
 * Whole card is clickable and routes to the Staff app's Attendance tab
 * (``/dashboard/staff-app?tab=attendance``) which renders the full
 * "Live Attendance List" with per-staff shift / clock-in / status rows.
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
    // Deep-link straight to the "Live Attendance List" tab inside the
    // Staff app — that's where the manager can scan the full table of
    // shifts, clock-ins and statuses for every staff member.
    navigate("/dashboard/staff-app?tab=attendance");
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

/** -------------------------------------------------------------------------
 * Reported Incidents widget
 * -------------------------------------------------------------------------
 * Shows the 5 most recent incidents reported by staff (safety, maintenance,
 * service, customer, etc.). Tapping the card — or the "View all" link —
 * sends the manager to the Reported Incidents tab on /dashboard/analytics.
 *
 * Data source: /api/staff/safety-concerns/ (the same endpoint the analytics
 * page uses). We sort by created_at desc client-side and slice to 5 so that
 * a server with no ordering still works correctly. Refresh every 60 s so a
 * fresh report shows up promptly without hammering the API.
 * ----------------------------------------------------------------------- */
type RecentIncidentItem = {
  id: string;
  title: string | null;
  incident_type: string | null;
  severity: string | null;
  status: string | null;
  location: string | null;
  created_at: string | null;
};

function severityClass(sev: string | null): string {
  const s = String(sev || "").toUpperCase();
  if (s === "CRITICAL" || s === "URGENT")
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300";
  if (s === "HIGH")
    return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-300";
  if (s === "LOW")
    return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300";
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300";
}

function statusClass(st: string | null): string {
  const s = String(st || "").toUpperCase();
  if (s === "RESOLVED" || s === "CLOSED")
    return "text-emerald-600 dark:text-emerald-400";
  if (s === "INVESTIGATING") return "text-sky-600 dark:text-sky-400";
  return "text-amber-600 dark:text-amber-400";
}

function formatIncidentRelative(iso: string | null, t: (k: string) => string): string {
  if (!iso) return "";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return t("dashboard.incidents.just_now") || "just now";
  if (diffMin < 60) return `${diffMin}m`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "";
  }
}

function RecentIncidentsCard({
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
  const { data, isLoading, isError, refetch, isFetching } = useQuery<unknown>({
    queryKey: ["dashboard", "recent-incidents", 5],
    queryFn: async () => {
      const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("accessToken") ||
        "";
      const res = await fetch(`${API_BASE}/staff/safety-concerns/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch incidents");
      return res.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });

  const items: RecentIncidentItem[] = useMemo(() => {
    const isRecord = (v: unknown): v is Record<string, unknown> =>
      typeof v === "object" && v !== null;
    const rawList: unknown = Array.isArray(data)
      ? data
      : isRecord(data) && Array.isArray((data as { results?: unknown }).results)
        ? (data as { results: unknown[] }).results
        : [];
    const arr = (Array.isArray(rawList) ? rawList : []).map((x) =>
      isRecord(x) ? x : ({} as Record<string, unknown>),
    );
    const mapped: RecentIncidentItem[] = arr.map((x) => ({
      id: String(x.id ?? ""),
      title: typeof x.title === "string" ? x.title : null,
      incident_type:
        typeof x.incident_type === "string" ? x.incident_type : null,
      severity: typeof x.severity === "string" ? x.severity : null,
      status: typeof x.status === "string" ? x.status : null,
      location: typeof x.location === "string" ? x.location : null,
      created_at: typeof x.created_at === "string" ? x.created_at : null,
    }));
    mapped.sort((a, b) => {
      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bt - at;
    });
    return mapped.slice(0, 5);
  }, [data]);

  const openCount = useMemo(
    () =>
      items.filter((i) => {
        const s = String(i.status || "").toUpperCase();
        return s === "OPEN" || s === "INVESTIGATING";
      }).length,
    [items],
  );

  const goToIncidents = React.useCallback(() => {
    navigate("/dashboard/analytics?tab=incidents");
  }, [navigate]);

  return (
    <Card
      className={cn(cardBase, "flex flex-col cursor-pointer")}
      onClick={goToIncidents}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToIncidents();
        }
      }}
    >
      <CardHeader className={cardHeaderBase}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/12 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="h-4 w-4" aria-hidden />
          </div>
          <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {t("dashboard.incidents.title")}
          </CardTitle>
        </div>
        {items.length > 0 ? (
          <span
            className={cn(
              "shrink-0 text-[10px] font-semibold rounded-full border px-2 py-0.5",
              openCount > 0
                ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300",
            )}
          >
            {openCount > 0
              ? (t("dashboard.incidents.open_count") || "{n} open").replace(
                  "{n}",
                  String(openCount),
                )
              : t("dashboard.incidents.all_clear") || "All clear"}
          </span>
        ) : null}
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col pt-1 pb-4 px-5">
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-slate-400">
              {t("dashboard.incidents.loading") || "Loading…"}
            </div>
          ) : isError ? (
            <div className="py-6 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("dashboard.incidents.error") || "Couldn't load incidents."}
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
                {t("dashboard.incidents.retry") || "Retry"}
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/60 text-slate-400">
                <ShieldAlert className="h-5 w-5" aria-hidden />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("dashboard.incidents.empty") ||
                  "No incidents reported yet."}
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {items.map((inc) => {
                const ts = formatIncidentRelative(inc.created_at, t);
                const heading =
                  inc.title ||
                  inc.incident_type ||
                  t("dashboard.incidents.untitled") ||
                  "Reported incident";
                return (
                  <li
                    key={inc.id}
                    className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <AlertTriangle
                      className={cn(
                        "h-3.5 w-3.5 mt-1 shrink-0",
                        String(inc.severity || "").toUpperCase() === "CRITICAL"
                          ? "text-red-500"
                          : String(inc.severity || "").toUpperCase() === "HIGH"
                            ? "text-orange-500"
                            : "text-amber-500",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-[13px] font-medium text-slate-900 dark:text-white"
                        title={heading}
                      >
                        {heading}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {inc.severity ? (
                          <span
                            className={cn(
                              "rounded-full border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide",
                              severityClass(inc.severity),
                            )}
                          >
                            {inc.severity}
                          </span>
                        ) : null}
                        {inc.status ? (
                          <span
                            className={cn(
                              "font-semibold uppercase tracking-wide text-[10px]",
                              statusClass(inc.status),
                            )}
                          >
                            {inc.status}
                          </span>
                        ) : null}
                        {inc.location ? (
                          <span className="inline-flex items-center gap-0.5 truncate max-w-[10rem]">
                            <MapPin className="h-2.5 w-2.5" aria-hidden />
                            {inc.location}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                      {ts}
                    </span>
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
            goToIncidents();
          }}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline self-start"
        >
          {t("dashboard.incidents.view_all") || "View all incidents"}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </CardContent>
    </Card>
  );
}

/* -----------------------------------------------------------------------
 * Category-bucketed task cards (Urgent TOP 5 / Human Resources / Finance
 * / Maintenance).
 *
 * One generic component reads from /api/dashboard/category-tasks/?bucket=…
 * and renders the dashboard mockup: header with a colored icon + title,
 * an "in progress / done" filter chip pair, a list of rows
 * (title + assignee + status pill), and a "More v" affordance that
 * deep-links to the relevant page.
 *
 * Miya pre-classifies every incoming task or staff request into a
 * category (HR, FINANCE, MAINTENANCE, MEETING, …) on ingest, so the
 * widgets are pure indexed reads — no LLM round-trip on the dashboard
 * polling path.
 * ---------------------------------------------------------------------*/

type CategoryWidgetTone =
  // Each tone gives us coordinated icon-bg / accent / link colors so all
  // cards share the same shape and only the hue differs. Keeps the
  // dashboard visually calm even with five list-style cards stacked.
  // ``slate`` is reserved for the catch-all miscellaneous lane — neutral
  // so it doesn't compete with the named categories visually.
  | "rose"
  | "violet"
  | "emerald"
  | "amber"
  | "sky"
  | "slate";

const CATEGORY_TONE: Record<CategoryWidgetTone, {
  iconBg: string;
  iconText: string;
  link: string;
}> = {
  rose: {
    iconBg: "bg-rose-500/12",
    iconText: "text-rose-600 dark:text-rose-400",
    link: "text-rose-600 dark:text-rose-400",
  },
  violet: {
    iconBg: "bg-violet-500/12",
    iconText: "text-violet-600 dark:text-violet-400",
    link: "text-violet-600 dark:text-violet-400",
  },
  emerald: {
    iconBg: "bg-emerald-500/12",
    iconText: "text-emerald-600 dark:text-emerald-400",
    link: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    iconBg: "bg-amber-500/12",
    iconText: "text-amber-600 dark:text-amber-400",
    link: "text-amber-600 dark:text-amber-400",
  },
  sky: {
    iconBg: "bg-sky-500/12",
    iconText: "text-sky-600 dark:text-sky-400",
    link: "text-sky-600 dark:text-sky-400",
  },
  slate: {
    iconBg: "bg-slate-500/12",
    iconText: "text-slate-600 dark:text-slate-300",
    link: "text-slate-600 dark:text-slate-300",
  },
};

type CategoryTasksFilter = "open" | "in_progress" | "done";

// MIME-style drag payload type so we can roundtrip a row's identity
// across HTML5 ``DataTransfer``. We deliberately use a custom MIME so
// other native drops (text, URLs, files dragged from the OS) don't
// accidentally trigger our drop-handler — Chrome / Safari only fire
// ``dragenter`` / ``drop`` on a target that has a matching MIME or
// when ``preventDefault`` is called on dragover.
const ROW_DRAG_MIME = "application/x-mizan-dashboard-row";

interface RowDragPayload {
  id: string;
  kind: import("@/lib/types").DashboardTaskDemandItem["kind"];
  sourceBucket: import("@/lib/types").CategoryTaskBucket;
  /** Title is included so we can render a meaningful toast on success
   *  without re-fetching the row. */
  title: string;
}

// ---------------------------------------------------------------------------
// Global drag session store
// ---------------------------------------------------------------------------
// HTML5 DataTransfer won't let us *read* the payload during ``dragover``
// (only the list of types), so sibling widgets have no way to know which
// bucket a drag came from until the user drops. That led to a confusing
// UX where the source card also lit up as a drop target the moment the
// cursor re-entered it, and sibling cards stayed inert until hovered.
//
// We fix that with a tiny module-level pub/sub that every CategoryTasksCard
// subscribes to via ``useSyncExternalStore``. When a row drag starts we
// publish ``{ active: true, sourceBucket, title }``; every card re-renders
// and can now tell if it's a valid drop target (different bucket) and
// surface a clear "drop here" affordance *before* the user hovers.
//
// This is a render-time concern (styling), never a source of truth for the
// drop operation itself — the actual payload still rides on DataTransfer
// so OS-level cross-window drags remain possible.
interface DragSessionState {
  active: boolean;
  sourceBucket: import("@/lib/types").CategoryTaskBucket | null;
  title: string;
  itemId: string;
}

const _emptyDragSession: DragSessionState = {
  active: false,
  sourceBucket: null,
  title: "",
  itemId: "",
};

let _dragSession: DragSessionState = _emptyDragSession;
const _dragListeners = new Set<() => void>();

function _publishDragSession(next: DragSessionState) {
  _dragSession = next;
  _dragListeners.forEach((fn) => {
    try { fn(); } catch { /* listener errors don't abort others */ }
  });
}

function _subscribeDragSession(cb: () => void) {
  _dragListeners.add(cb);
  return () => { _dragListeners.delete(cb); };
}

function _getDragSession() {
  return _dragSession;
}

function useDragSession(): DragSessionState {
  return React.useSyncExternalStore(
    _subscribeDragSession,
    _getDragSession,
    _getDragSession,
  );
}

// Build a floating "chip" element as the drag image so the cursor carries
// a branded preview of the row instead of a full-width opaque clone of the
// <li>. The element is appended to the body, handed to ``setDragImage``,
// then removed on the next tick (the browser has already snapshotted it
// at that point — GIF-like, the snapshot doesn't track DOM changes).
function buildDragImage(title: string): HTMLElement {
  const chip = document.createElement("div");
  chip.textContent = title;
  // Inline styles (not a class) so we don't depend on Tailwind being
  // computed for a transient, detached element. These deliberately mirror
  // the primary/emerald palette used throughout the dashboard.
  Object.assign(chip.style, {
    position: "fixed",
    top: "-9999px",
    left: "-9999px",
    padding: "6px 12px",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "white",
    fontSize: "13px",
    fontWeight: "600",
    fontFamily:
      "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    boxShadow:
      "0 10px 25px -5px rgba(16, 185, 129, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    whiteSpace: "nowrap",
    maxWidth: "260px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    pointerEvents: "none",
  } as CSSStyleDeclaration);
  document.body.appendChild(chip);
  return chip;
}

function CategoryTasksCard({
  cardBase,
  cardHeaderBase,
  t,
  navigate,
  bucket,
  titleKey,
  icon: Icon,
  tone,
  /**
   * URL the "More" footer + whole-card click navigate to. Should be a
   * deep-link to the page where the manager can see the full list for
   * this bucket (e.g. /dashboard/staff-requests?category=HR).
   */
  moreHref,
}: {
  cardBase: string;
  cardHeaderBase: string;
  t: (key: string) => string;
  navigate: NavigateFunction;
  bucket: import("@/lib/types").CategoryTaskBucket;
  titleKey: string;
  icon: LucideIcon;
  tone: CategoryWidgetTone;
  moreHref: string;
}) {
  const [filter, setFilter] = useState<CategoryTasksFilter>("open");
  // Track whether a row from *another* widget is hovering this card
  // so we can highlight the drop zone. We don't highlight on
  // self-drops (same source/target bucket) because that would be a
  // no-op move and the visual change would be misleading. We also
  // track a per-row "dragging" id so the source widget can fade the
  // row that's leaving.
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null);
  // Brief success pulse after a successful incoming drop so the manager
  // sees the landing confirmed visually on top of the toast.
  const [justReceivedDrop, setJustReceivedDrop] = useState(false);
  // Global drag session (sibling-aware): tells this card whether *any*
  // drag is in progress and which bucket it came from. Used to light up
  // every valid drop target at once — not just the one under the cursor.
  const dragSession = useDragSession();
  const isValidDropTarget =
    dragSession.active && dragSession.sourceBucket !== bucket;
  const isSourceBucket =
    dragSession.active && dragSession.sourceBucket === bucket;
  const qc = useQueryClient();
  const queryKey = useMemo(
    () => ["dashboard", "category-tasks", bucket, 5] as const,
    [bucket],
  );
  const { data, isLoading, isError, refetch, isFetching } = useQuery<
    import("@/lib/types").CategoryTasksResponse
  >({
    queryKey,
    queryFn: () => api.getDashboardCategoryTasks(bucket, 5),
    // Match the existing tasks_demands cadence — dashboards cluster
    // multiple of these widgets, so we keep them in sync.
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 6000),
    refetchOnMount: "always",
  });

  // Inline status flip — every row in the widget can be marked
  // pending / in progress / done / cancelled (or paid / voided for an
  // invoice) directly from the card so the manager doesn't have to
  // open the inbox detail page just to close a ticket. The unified
  // backend endpoint figures out which model owns the row id and
  // applies the correct transition.
  const statusMutation = useMutation({
    mutationFn: ({
      id,
      nextStatus,
    }: {
      id: string;
      nextStatus: DashboardTaskDemandItem["status"];
    }) => api.updateDashboardTaskStatus(id, nextStatus),
    onSuccess: () => {
      // Bust the bucket query and the global tasks-demands feed so
      // every widget that surfaces this row picks up the new status
      // on the next render — no stale "Pending" pill.
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["dashboard", "tasks-demands", 5] });
      qc.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : "Couldn't update status. Try again.";
      toast.error(msg);
    },
  });

  // Drag-and-drop "move row to this bucket" mutation. Triggered when
  // a row from a *different* widget is dropped here. We invalidate
  // every category bucket query (not just source + target) because
  // a category move can ripple — e.g. an URGENT bump leaves the row
  // in its original category widget too, so every card needs to
  // refresh its "urgent" count.
  const bucketMutation = useMutation({
    mutationFn: ({ id }: { id: string; payload: RowDragPayload }) =>
      api.updateDashboardTaskBucket(id, bucket),
    onSuccess: (_data, variables) => {
      // Invalidate all category-tasks queries regardless of bucket so
      // both the source AND target widgets pick up the move on the
      // next tick. ``predicate`` lets us match the variable-arity
      // queryKey shape ["dashboard", "category-tasks", <bucket>, 5].
      qc.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === "dashboard" &&
          q.queryKey[1] === "category-tasks",
      });
      qc.invalidateQueries({ queryKey: ["dashboard", "tasks-demands", 5] });
      qc.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      // Confirmation toast — the row's title is in the payload so we
      // can render something specific ("Moved 'Pay butchers invoice'
      // to Finance") rather than a generic "Saved".
      toast.success(
        t("dashboard.category_tasks.bucket_move_success").replace(
          "{title}",
          variables.payload.title || t("dashboard.category_tasks.this_item"),
        ),
      );
      // Flash a soft emerald pulse on the receiving card so the manager
      // sees the row land even if the toast stack is out of view.
      setJustReceivedDrop(true);
      window.setTimeout(() => setJustReceivedDrop(false), 900);
    },
    onError: (err: unknown) => {
      // The backend returns user-readable messages for the rejection
      // cases (invoice can't move, custom-category task, etc.) — we
      // surface those verbatim so the manager understands why.
      const msg =
        err instanceof Error
          ? err.message
          : t("dashboard.category_tasks.bucket_move_error");
      toast.error(msg);
    },
  });

  // Centralised drop-handler for the card. We pull the payload out of
  // ``DataTransfer``, validate it's actually one of our rows, and
  // short-circuit on a same-bucket drop so we don't fire a useless
  // PATCH when the user just dropped the row back where it came from.
  const onDropRow = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDropTarget(false);
      const raw = e.dataTransfer.getData(ROW_DRAG_MIME);
      if (!raw) return;
      let payload: RowDragPayload | null = null;
      try {
        payload = JSON.parse(raw) as RowDragPayload;
      } catch {
        return;
      }
      if (!payload?.id) return;
      if (payload.sourceBucket === bucket) {
        // No-op: dropped on the same widget the drag started in.
        return;
      }
      bucketMutation.mutate({ id: payload.id, payload });
    },
    [bucket, bucketMutation],
  );

  const onDragOverRow = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // ``preventDefault`` is required to make this element a valid
      // drop target — without it, ``drop`` never fires.
      const types = e.dataTransfer.types;
      if (!types || !Array.from(types).includes(ROW_DRAG_MIME)) return;
      // Self-drop guard: if the drag originated in THIS bucket, do NOT
      // render the "drop here" affordance — releasing here would be a
      // no-op and the ring would lie about the outcome. We still call
      // preventDefault so the drop event fires and the handler can
      // silently no-op (vs the browser bouncing back to origin), but
      // we keep the visual state unchanged.
      const sourceBucket = _getDragSession().sourceBucket;
      if (sourceBucket === bucket) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "none";
        return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!isDropTarget) setIsDropTarget(true);
    },
    [isDropTarget, bucket],
  );

  const onDragLeaveRow = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // ``dragleave`` fires for child enter/exit too. Only reset when
      // the cursor actually leaves the card boundary (relatedTarget
      // is null or outside the card).
      const related = e.relatedTarget as Node | null;
      if (related && e.currentTarget.contains(related)) return;
      setIsDropTarget(false);
    },
    [],
  );

  const toneClasses = CATEGORY_TONE[tone];
  const items: DashboardTaskDemandItem[] = useMemo(() => {
    if (!data) return [];
    if (filter === "done") return data.completed ?? [];
    if (filter === "in_progress") {
      return (data.items ?? []).filter((it) => it.status === "IN_PROGRESS");
    }
    return data.items ?? [];
  }, [data, filter]);

  const counts = data?.counts ?? { open: 0, in_progress: 0, completed: 0 };

  const goMore = React.useCallback(() => {
    navigate(moreHref);
  }, [navigate, moreHref]);

  return (
    <Card
      className={cn(
        cardBase,
        "flex flex-col cursor-pointer transition-all relative",
        // Tier 1 — global "a drag is in progress and you can drop me
        // here" affordance. Shows as soon as any row starts dragging
        // from a different bucket, before the user hovers this card.
        // A soft dashed emerald border signals receptivity without
        // yelling. We don't apply this to the source bucket (that
        // would be misleading — dropping back yourself is a no-op).
        isValidDropTarget &&
          !isDropTarget &&
          "ring-2 ring-dashed ring-emerald-300/70 dark:ring-emerald-500/50 ring-offset-1 ring-offset-background",
        // Tier 2 — cursor is currently over this card, so it's the
        // row's live destination. Solid ring + lift so the manager
        // knows releasing here commits the move.
        isDropTarget &&
          "ring-2 ring-primary/70 ring-offset-2 ring-offset-background shadow-xl scale-[1.015] bg-emerald-50/40 dark:bg-emerald-950/20",
        // Source-bucket affordance — a gentle dim so the manager sees
        // "this is where the row is leaving from". Deliberately not a
        // drop-target ring.
        isSourceBucket && "opacity-70",
        // Success pulse after a successful incoming drop.
        justReceivedDrop &&
          "ring-2 ring-emerald-500/80 ring-offset-2 ring-offset-background shadow-lg",
        bucketMutation.isPending && "opacity-90",
      )}
      role="button"
      tabIndex={0}
      onClick={goMore}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goMore();
        }
      }}
      onDrop={onDropRow}
      onDragOver={onDragOverRow}
      onDragEnter={onDragOverRow}
      onDragLeave={onDragLeaveRow}
      aria-dropeffect={isDropTarget ? "move" : undefined}
    >
      {/* "Drop to move to <Category>" pill — shown only on the live
          drop-target card. Gives the manager a direct-manipulation
          confirmation of what will happen on release so they don't
          have to guess based on which card has the stronger ring. */}
      {isDropTarget ? (
        <div
          className="pointer-events-none absolute left-1/2 -top-3 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-1 duration-150"
          aria-hidden
        >
          <span>↓</span>
          <span>
            {(
              t("dashboard.category_tasks.drop_here_hint") ||
              "Drop to move to {bucket}"
            ).replace("{bucket}", t(titleKey))}
          </span>
        </div>
      ) : null}
      <CardHeader className={cardHeaderBase}>
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              toneClasses.iconBg,
              toneClasses.iconText,
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {t(titleKey)}
          </CardTitle>
        </div>
        {/* Filter chip pair on the top-right matches the mockup's
            "+ in progress" / "Done" affordance on the URGENT card.
            We render it on every card for consistency and so managers
            can flip lanes on any widget without scrolling. */}
        <div className="flex items-center gap-1 shrink-0">
          <CategoryFilterChip
            active={filter === "in_progress"}
            count={counts.in_progress}
            onClick={(e) => {
              e.stopPropagation();
              setFilter((cur) => (cur === "in_progress" ? "open" : "in_progress"));
            }}
            label={t("dashboard.category_tasks.filter_in_progress")}
            tone="sky"
          />
          <CategoryFilterChip
            active={filter === "done"}
            count={counts.completed}
            onClick={(e) => {
              e.stopPropagation();
              setFilter((cur) => (cur === "done" ? "open" : "done"));
            }}
            label={t("dashboard.category_tasks.filter_done")}
            tone="emerald"
          />
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col pt-1 pb-3 px-5">
        {/* Status strip — at-a-glance counts so the manager doesn't have
            to skim every row to spot trouble. Rendered only when there's
            something to call out (overdue / waiting / escalated / new);
            otherwise the area collapses and the list gets the full
            vertical space. */}
        {!isLoading && !isError ? (
          <CategoryStatusStrip counts={counts} filter={filter} t={t} />
        ) : null}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-slate-400">
              {t("dashboard.category_tasks.loading")}
            </div>
          ) : isError ? (
            <div className="py-6 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("dashboard.category_tasks.error")}
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
                {t("dashboard.category_tasks.retry")}
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/60 text-slate-400">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t(
                  filter === "done"
                    ? "dashboard.category_tasks.empty_done"
                    : "dashboard.category_tasks.empty_open",
                )}
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {items.map((it) => (
                <CategoryTaskRow
                  key={it.id}
                  item={it}
                  t={t}
                  sourceBucket={bucket}
                  isDragging={draggingRowId === it.id}
                  onDragStateChange={setDraggingRowId}
                  onStatusChange={(nextStatus) =>
                    statusMutation.mutate({ id: it.id, nextStatus })
                  }
                  isPendingId={
                    statusMutation.isPending && statusMutation.variables?.id === it.id
                      ? statusMutation.variables.id
                      : null
                  }
                />
              ))}
            </ul>
          )}
        </div>

        {/* Footer "More v" — centered chevron-down that mirrors the
            mockup. Clicking it (or anywhere on the card) deep-links to
            the full list view for this bucket. */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goMore();
          }}
          className={cn(
            "mt-1 flex w-full items-center justify-center gap-1 rounded-md py-1 text-[11px] font-medium transition-colors",
            "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
          )}
          aria-label={t("dashboard.category_tasks.more")}
        >
          {t("dashboard.category_tasks.more")}
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </button>
      </CardContent>
    </Card>
  );
}

/**
 * Compact status strip rendered just under the card header. Surfaces the
 * granular sub-counts the API returns (overdue / waiting / escalated /
 * new) plus the totals for the currently-active filter so the manager
 * can size up the bucket in one glance — no need to scroll the list to
 * see "are there bills that already slipped?" or "how many escalations
 * landed today?". The whole strip collapses to nothing when there are
 * no rows to call out, keeping the card visually quiet on a calm day.
 */
function CategoryStatusStrip({
  counts,
  filter,
  t,
}: {
  counts: import("@/lib/types").CategoryTasksResponse["counts"];
  filter: CategoryTasksFilter;
  t: (key: string) => string;
}) {
  // ``counts`` may come from older deployments without the granular
  // breakdown — coerce missing fields to 0 so we never render NaN.
  const overdue = counts.overdue ?? 0;
  const waitingOn = counts.waiting_on ?? 0;
  const escalated = counts.escalated ?? 0;
  const fresh = counts.new ?? 0;
  const total =
    filter === "done"
      ? counts.completed
      : filter === "in_progress"
      ? counts.in_progress
      : counts.open;

  const hasBreakdown = overdue + waitingOn + escalated + fresh > 0;

  // Nothing useful to show — return null so the card's vertical space
  // collapses cleanly to the list.
  if (total === 0 && !hasBreakdown) return null;

  const totalLabelKey =
    filter === "done"
      ? "dashboard.category_tasks.strip_total_done"
      : filter === "in_progress"
      ? "dashboard.category_tasks.strip_total_in_progress"
      : "dashboard.category_tasks.strip_total_open";

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10.5px]">
      {/* Total chip — neutral so the colored signal chips (overdue / new)
          pop against it. */}
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
        <span className="tabular-nums">{total}</span>
        <span className="text-slate-500 dark:text-slate-400 font-medium">
          {t(totalLabelKey)}
        </span>
      </span>
      {overdue > 0 ? (
        <CategoryStatusChip
          label={t("dashboard.category_tasks.strip_overdue")}
          count={overdue}
          tone="red"
        />
      ) : null}
      {escalated > 0 ? (
        <CategoryStatusChip
          label={t("dashboard.category_tasks.strip_escalated")}
          count={escalated}
          tone="orange"
        />
      ) : null}
      {waitingOn > 0 ? (
        <CategoryStatusChip
          label={t("dashboard.category_tasks.strip_waiting")}
          count={waitingOn}
          tone="violet"
        />
      ) : null}
      {fresh > 0 ? (
        <CategoryStatusChip
          label={t("dashboard.category_tasks.strip_new")}
          count={fresh}
          tone="cyan"
        />
      ) : null}
    </div>
  );
}

function CategoryStatusChip({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "red" | "orange" | "violet" | "cyan";
}) {
  const cls = {
    red:
      "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
    orange:
      "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300",
    violet:
      "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300",
    cyan:
      "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
        cls,
      )}
    >
      <span className="tabular-nums">{count}</span>
      <span>{label}</span>
    </span>
  );
}

/** Header filter chip ("+ in progress" / "Done"). When inactive we show
 * the count next to the label as a faint tabular number; when active we
 * tint the chip in the bucket-appropriate hue. */
function CategoryFilterChip({
  active,
  count,
  onClick,
  label,
  tone,
}: {
  active: boolean;
  count: number;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  label: string;
  tone: "sky" | "emerald";
}) {
  const activeCls =
    tone === "sky"
      ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300"
      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300";
  const idleCls =
    "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400 dark:hover:bg-slate-800/60";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-5 inline-flex items-center gap-1 rounded-full border px-2 text-[10px] font-semibold whitespace-nowrap transition-colors",
        active ? activeCls : idleCls,
      )}
      aria-pressed={active}
    >
      <span className="leading-none">{label}</span>
      {count > 0 ? (
        <span className="tabular-nums opacity-70">{count}</span>
      ) : null}
    </button>
  );
}

/** Task row used by every category widget. Renders, in order:
 *
 *   • Title (truncated, hover-tooltipped with the full string)
 *   • Optional ``ai_summary`` line (Miya's one-line gist of the request)
 *   • A meta strip: assignee chip · "•" · age label ("12m ago", "yesterday", …)
 *   • A small URGENT chip when ``priority === "URGENT"`` AND the row's pill
 *     isn't already red (so we don't double-stamp OVERDUE rows)
 *   • The granular status pill on the right — ALWAYS rendered, even when
 *     the backend's ``pill_status`` field is missing (we fall back to the
 *     coarse ``status`` so older responses still get a status indicator).
 */
function CategoryTaskRow({
  item,
  t,
  onStatusChange,
  isPendingId,
  sourceBucket,
  isDragging,
  onDragStateChange,
}: {
  item: DashboardTaskDemandItem;
  t: (key: string) => string;
  /**
   * Apply a status flip to this row. The parent ``CategoryTasksCard``
   * owns the mutation so it can invalidate the bucket query on success.
   * Optional so the row can also be used in read-only contexts (e.g.
   * future preview surfaces) without a backing mutation.
   */
  onStatusChange?: (nextStatus: DashboardTaskDemandItem["status"]) => void;
  /**
   * Row id currently being mutated (or ``null``). Drives the spinner
   * on the quick-complete button so the manager sees feedback the moment
   * they tap.
   */
  isPendingId?: string | null;
  /**
   * Bucket the row currently belongs to. Travels in the drag payload
   * so the drop target can short-circuit a same-bucket drop without
   * a server round-trip. Optional so the row stays usable from
   * read-only contexts that don't participate in DnD.
   */
  sourceBucket?: import("@/lib/types").CategoryTaskBucket;
  /** True while *this specific* row is being dragged — drives the
   *  fade-out / dashed border so the user can see what's leaving. */
  isDragging?: boolean;
  /** Setter the parent uses to track which row is currently in the
   *  air. Called with the row id on dragstart and ``null`` on
   *  dragend. Optional for read-only contexts. */
  onDragStateChange?: (id: string | null) => void;
}) {
  const pill = statusPillClass(item.status, item.priority, item.pill_status);
  const assigneeLabel = item.assignee?.name?.trim()
    ? item.assignee.name.split(" ")[0]
    : t("dashboard.category_tasks.unassigned");
  const initials = item.assignee?.initials || "—";
  // Don't stack a redundant URGENT chip on top of OVERDUE — they convey
  // the same "this needs attention now" signal and the pill is already red.
  const showUrgentBadge =
    item.priority === "URGENT" &&
    item.pill_status !== "OVERDUE" &&
    item.pill_status !== "DUE_SOON" &&
    item.status !== "COMPLETED" &&
    item.status !== "CANCELLED";

  // Terminal rows (already done / cancelled) drop the action affordances
  // — flipping a closed ticket back to PENDING from a glance widget is a
  // footgun. Managers can still re-open from the inbox detail page.
  const isTerminal =
    item.status === "COMPLETED" || item.status === "CANCELLED";
  const isInvoice = item.kind === "invoice";
  const canEdit = !isTerminal && !!onStatusChange;
  const isPending = !!isPendingId && isPendingId === item.id;

  // The quick-complete primary verb depends on the source kind so the
  // button reads truthfully — invoices get "Mark paid", everything
  // else gets "Mark done".
  const quickCompleteLabel = isInvoice
    ? t("dashboard.category_tasks.action_mark_paid")
    : t("dashboard.category_tasks.action_mark_done");

  // Stop card-level navigation when the row's controls are tapped —
  // the parent card is itself a button that deep-links to the bucket
  // page on click. Without this, every status flip would also yank
  // the manager off the dashboard.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  // Drag-and-drop wiring. We disable drag for terminal rows (already
  // done / cancelled) so a closed ticket can't be silently revived
  // in another bucket, and for invoices because the BE rejects any
  // cross-bucket move on those — letting the manager drag them would
  // just produce an error toast on every drop.
  const draggable = !isTerminal && !isInvoice && !!sourceBucket;
  const onRowDragStart = React.useCallback(
    (e: React.DragEvent<HTMLLIElement>) => {
      if (!draggable || !sourceBucket) return;
      const payload = {
        id: item.id,
        kind: item.kind,
        sourceBucket,
        title: item.title,
      };
      e.dataTransfer.setData(ROW_DRAG_MIME, JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "move";
      // Replace the browser's default full-row drag image (an opaque
      // clone of the <li>) with a compact branded chip that follows
      // the cursor. Makes the drag feel like a proper UI gesture
      // instead of "I'm yanking a whole row across the screen".
      try {
        const ghost = buildDragImage(item.title || "Moving…");
        // Offset (14, 14) puts the chip just below-right of the
        // cursor so it doesn't cover the cursor hotspot.
        e.dataTransfer.setDragImage(ghost, 14, 14);
        // setDragImage snapshots the element at this instant —
        // remove the DOM node on the next tick to keep the page
        // clean.
        window.setTimeout(() => ghost.remove(), 0);
      } catch {
        // Safari/older-browser fallback: silently keep the default
        // drag image. Functionality is unchanged.
      }
      // Publish the drag session so *every* CategoryTasksCard can
      // light up as a valid drop target at once, not just the one
      // the user eventually hovers over.
      _publishDragSession({
        active: true,
        sourceBucket,
        title: item.title || "",
        itemId: item.id,
      });
      onDragStateChange?.(item.id);
    },
    [draggable, sourceBucket, item.id, item.kind, item.title, onDragStateChange],
  );
  const onRowDragEnd = React.useCallback(() => {
    // Always clear the global session on drag end — even on a failed
    // drop (user released outside any card) so sibling affordances
    // collapse back to idle state.
    _publishDragSession(_emptyDragSession);
    onDragStateChange?.(null);
  }, [onDragStateChange]);

  return (
    <li
      className={cn(
        "group/row flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-all",
        // Subtle "you can drag this" affordance: a grab cursor on
        // hover so the manager realises the rows are interactive
        // even before they grab one.
        draggable && "cursor-grab active:cursor-grabbing",
        // Source-row ghost while dragging — a stronger fade plus a
        // dashed emerald outline and a "Moving…" watermark via
        // ``italic``. Makes it unambiguous that this row is the one
        // being carried, so the manager isn't confused by the chip
        // that also floats with the cursor.
        isDragging &&
          "opacity-35 border border-dashed border-emerald-400/70 bg-emerald-50/40 dark:bg-emerald-950/20 italic",
      )}
      draggable={draggable}
      onDragStart={onRowDragStart}
      onDragEnd={onRowDragEnd}
      aria-grabbed={isDragging || undefined}
      aria-label={
        draggable
          ? t("dashboard.category_tasks.row_draggable_aria").replace(
              "{title}",
              item.title,
            )
          : undefined
      }
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="truncate text-[13px] font-medium text-slate-900 dark:text-white"
            title={item.title}
          >
            {item.title}
          </div>
          {showUrgentBadge ? (
            <span
              className="shrink-0 inline-flex items-center rounded-sm border border-red-200 bg-red-50 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
              title={t("dashboard.category_tasks.priority_urgent")}
            >
              {t("dashboard.category_tasks.priority_urgent_short")}
            </span>
          ) : null}
        </div>
        {item.ai_summary ? (
          <div className="truncate text-[10.5px] text-emerald-700 dark:text-emerald-300">
            {item.ai_summary}
          </div>
        ) : null}
        {/* Meta line: assignee · age. Always present so every row has a
            consistent visual rhythm and the manager can scan-read the
            list. The assignee chip moves into here from the right side
            (which used to fight with the status pill on narrow widths). */}
        <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-slate-500 dark:text-slate-400">
          <span
            className="inline-flex shrink-0 items-center gap-1"
            title={item.assignee?.name || ""}
          >
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-semibold text-slate-600 dark:text-slate-200">
              {initials.slice(0, 2)}
            </span>
            <span className="truncate max-w-[7rem]">{assigneeLabel}</span>
          </span>
          {item.age_label ? (
            <>
              <span aria-hidden className="text-slate-300 dark:text-slate-600">·</span>
              <span className="tabular-nums whitespace-nowrap">{item.age_label}</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Quick-complete button — ALWAYS visible for non-terminal rows
          (not hover-only) so the affordance is discoverable. This was
          the user's primary complaint: "no clear action or button to
          update the status". One tap → COMPLETED, with a spinner while
          the mutation flies. Disabled state when another row in this
          card is currently mutating to avoid race conditions. */}
      {canEdit ? (
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            onStatusChange?.("COMPLETED");
          }}
          disabled={isPending}
          aria-label={quickCompleteLabel}
          title={quickCompleteLabel}
          className={cn(
            "shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-md border transition-all",
            "border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700",
            "dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:border-emerald-700/60 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300",
            "disabled:opacity-50 disabled:cursor-wait",
          )}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
      ) : null}

      {/* Status pill — clickable when editable so the manager has a
          second discoverable entry point ("the colored chip is the
          status; tap it to change") on top of the explicit menu. */}
      {canEdit ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={stop}
              aria-label={t("dashboard.category_tasks.row_actions")}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600",
                pill.bg,
                pill.text,
              )}
              title={t("dashboard.category_tasks.click_pill_to_change")}
            >
              <span className={cn("inline-block h-1.5 w-1.5 rounded-full", pill.dot)} />
              {t(`dashboard.category_tasks.pill_${pill.label}`)}
              <ChevronDown className="h-3 w-3 opacity-60" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={stop} className="w-48">
            {isInvoice ? (
              <>
                {/* Invoices have their own state machine — only mark
                    paid / mark voided are meaningful. PENDING /
                    IN_PROGRESS would be misleading verbs for a bill. */}
                <DropdownMenuItem
                  onClick={() => onStatusChange?.("COMPLETED")}
                  disabled={isPending}
                >
                  {t("dashboard.category_tasks.action_mark_paid")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onStatusChange?.("CANCELLED")}
                  disabled={isPending}
                >
                  {t("dashboard.category_tasks.action_mark_voided")}
                </DropdownMenuItem>
              </>
            ) : (
              <>
                {item.status !== "PENDING" ? (
                  <DropdownMenuItem
                    onClick={() => onStatusChange?.("PENDING")}
                    disabled={isPending}
                  >
                    {t("dashboard.category_tasks.action_mark_pending")}
                  </DropdownMenuItem>
                ) : null}
                {item.status !== "IN_PROGRESS" ? (
                  <DropdownMenuItem
                    onClick={() => onStatusChange?.("IN_PROGRESS")}
                    disabled={isPending}
                  >
                    {t("dashboard.category_tasks.action_mark_in_progress")}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onClick={() => onStatusChange?.("COMPLETED")}
                  disabled={isPending}
                >
                  {t("dashboard.category_tasks.action_mark_done")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onStatusChange?.("CANCELLED")}
                  disabled={isPending}
                  className="text-red-600 focus:text-red-700 dark:text-red-400 dark:focus:text-red-300"
                >
                  {t("dashboard.category_tasks.action_mark_cancelled")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        // Read-only pill for terminal rows — same shape, no chevron.
        <span
          className={cn(
            "shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
            pill.bg,
            pill.text,
          )}
          title={t(`dashboard.category_tasks.pill_${pill.label}`)}
        >
          <span className={cn("inline-block h-1.5 w-1.5 rounded-full", pill.dot)} />
          {t(`dashboard.category_tasks.pill_${pill.label}`)}
        </span>
      )}
    </li>
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

// --------------------------------------------------------------------------
// Staff Messages — admin-to-staff WhatsApp messaging from the dashboard.
//
// Two surfaces in one card:
//
// 1. A compact composer at the top: recipient combobox, message body,
//    optional priority bump, and a row of one-tap templates Miya
//    surfaces ("Urgent call-in", "Shift reminder", …). Goes through
//    POST /api/dashboard/staff-messages/send/, which dispatches
//    via the same NotificationService Miya's ``inform_staff`` tool
//    uses, so a structured form send and a free-text Miya chat send
//    land in the same NotificationLog feed.
//
// 2. A scrollable feed of recent outbound WhatsApp messages with
//    SENT / DELIVERED / READ / FAILED pills. The pills are kept in
//    sync by the WhatsApp webhook (statuses events) so the manager
//    sees ✓ → ✓✓ → ✓✓-blue evolve in near real time on a 30s poll.
// --------------------------------------------------------------------------

const STAFF_MESSAGE_STATUS_PILL: Record<
  import("@/lib/types").StaffMessageStatus,
  { bg: string; text: string; dot: string; labelKey: string }
> = {
  PENDING: {
    bg: "bg-slate-100 dark:bg-slate-800/60",
    text: "text-slate-600 dark:text-slate-300",
    dot: "bg-slate-400",
    labelKey: "dashboard.staff_messages.status_pending",
  },
  SENT: {
    bg: "bg-slate-100 dark:bg-slate-800/60",
    text: "text-slate-600 dark:text-slate-300",
    dot: "bg-slate-500",
    labelKey: "dashboard.staff_messages.status_sent",
  },
  DELIVERED: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    labelKey: "dashboard.staff_messages.status_delivered",
  },
  READ: {
    bg: "bg-sky-50 dark:bg-sky-950/30",
    text: "text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
    labelKey: "dashboard.staff_messages.status_read",
  },
  FAILED: {
    bg: "bg-rose-50 dark:bg-rose-950/30",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    labelKey: "dashboard.staff_messages.status_failed",
  },
};

function StaffMessagesCard({
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

  const recentQuery = useQuery({
    queryKey: ["dashboard", "staff-messages", "recent", 10] as const,
    queryFn: () => api.getStaffMessagesRecent(10),
    // 30 s poll mirrors the other operational widgets — also gives
    // the WhatsApp webhook a quick window to flip ✓ → ✓✓ → blue.
    refetchInterval: 30_000,
    staleTime: 15_000,
    refetchOnMount: "always",
  });

  // Staff list for the recipient combobox. We hit the same endpoint
  // the escalate modal uses (with all_branches=1) so a manager at HQ
  // can ping anyone in the tenant, not just their managed_locations
  // subset.
  const staffQuery = useQuery({
    queryKey: ["dashboard", "staff-messages", "staff-list"] as const,
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/staff/?page_size=500&all_branches=1`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
          },
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Failed to load team");
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data?.results || [];
      return rows as Array<{
        id: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        phone?: string;
        role?: string;
      }>;
    },
    staleTime: 60_000,
  });

  const [recipientId, setRecipientId] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [priority, setPriority] = useState<"NORMAL" | "URGENT">("NORMAL");
  const [recipientOpen, setRecipientOpen] = useState<boolean>(false);
  const [recipientSearch, setRecipientSearch] = useState<string>("");

  const filteredStaff = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    const all = staffQuery.data ?? [];
    if (!q) return all.slice(0, 100);
    return all
      .filter((s) => {
        const name = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
        const email = (s.email || "").toLowerCase();
        const phone = (s.phone || "").toLowerCase();
        const role = (s.role || "").toLowerCase();
        return (
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          role.includes(q)
        );
      })
      .slice(0, 100);
  }, [staffQuery.data, recipientSearch]);

  const selectedStaff = useMemo(
    () => (staffQuery.data ?? []).find((s) => s.id === recipientId) || null,
    [staffQuery.data, recipientId],
  );

  const sendMutation = useMutation({
    mutationFn: () =>
      api.sendStaffMessage({
        recipient_user_id: recipientId,
        body: body.trim(),
        priority,
      }),
    onSuccess: (resp) => {
      if (resp.success && resp.whatsapp_sent > 0) {
        toast.success(
          t("dashboard.staff_messages.send_success") ||
            "Message sent on WhatsApp.",
        );
      } else if (resp.whatsapp_failed) {
        // Prefer the concrete reason from Meta / the phone normalizer
        // over the generic "Check the number" line. The backend parses
        // WhatsApp Cloud API error envelopes into `failure_reason` so
        // the manager sees something actionable (e.g. "Recipient phone
        // number is not a WhatsApp user", "Invalid parameter", etc.).
        const reason = (resp.failure_reason || "").trim();
        const base =
          t("dashboard.staff_messages.send_no_whatsapp") ||
          "Saved, but WhatsApp delivery failed.";
        toast.warning(reason ? `${base} ${reason}` : base);
      } else {
        toast.success(
          t("dashboard.staff_messages.send_queued") || "Message queued.",
        );
      }
      setBody("");
      setPriority("NORMAL");
      qc.invalidateQueries({
        queryKey: ["dashboard", "staff-messages", "recent", 10],
      });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : t("dashboard.staff_messages.send_error") ||
            "Couldn't send the message.";
      toast.error(msg);
    },
  });

  const templates = recentQuery.data?.templates ?? [];
  const items = recentQuery.data?.items ?? [];

  const canSend =
    !!recipientId && body.trim().length > 0 && !sendMutation.isPending;

  const onPickTemplate = (tpl: import("@/lib/types").StaffMessageTemplate) => {
    setBody(tpl.body);
    if (tpl.priority === "URGENT") setPriority("URGENT");
  };

  return (
    <Card className={cn(cardBase, "flex flex-col")}>
      <CardHeader className={cardHeaderBase}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
            <Send className="h-4 w-4" aria-hidden />
          </div>
          <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {t("dashboard.staff_messages.title")}
          </CardTitle>
        </div>
        <Badge
          variant="outline"
          className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/60 text-[10px] font-semibold px-2 h-5"
        >
          {t("dashboard.staff_messages.via_whatsapp")}
        </Badge>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 px-5 pb-4 pt-1">
        {/* Composer ----------------------------------------------------- */}
        <div className="space-y-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-3">
          {/* Recipient combobox + priority pill on one line */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setRecipientOpen((o) => !o)}
                className={cn(
                  "w-full inline-flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                  "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900",
                  "hover:border-emerald-300 dark:hover:border-emerald-700",
                )}
              >
                <span className="truncate">
                  {selectedStaff
                    ? `${selectedStaff.first_name || ""} ${selectedStaff.last_name || ""}`.trim() ||
                      selectedStaff.email ||
                      selectedStaff.phone
                    : t("dashboard.staff_messages.recipient_placeholder")}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-slate-400 transition-transform",
                    recipientOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {recipientOpen ? (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                    <input
                      type="text"
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      placeholder={
                        t(
                          "dashboard.staff_messages.recipient_search_placeholder",
                        ) || "Search staff…"
                      }
                      className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto py-1">
                    {staffQuery.isLoading ? (
                      <div className="py-3 text-center text-[11px] text-slate-400">
                        {t("dashboard.staff_messages.loading_staff")}
                      </div>
                    ) : filteredStaff.length === 0 ? (
                      <div className="py-3 text-center text-[11px] text-slate-400">
                        {t("dashboard.staff_messages.no_staff_match")}
                      </div>
                    ) : (
                      filteredStaff.map((s) => {
                        const fullName =
                          `${s.first_name || ""} ${s.last_name || ""}`.trim() ||
                          s.email ||
                          s.phone ||
                          s.id;
                        const hasPhone = !!(s.phone && s.phone.length > 4);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setRecipientId(s.id);
                              setRecipientOpen(false);
                              setRecipientSearch("");
                            }}
                            className={cn(
                              "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[12px] transition-colors",
                              "hover:bg-slate-100 dark:hover:bg-slate-800",
                              recipientId === s.id &&
                                "bg-emerald-50 dark:bg-emerald-950/30",
                            )}
                          >
                            <span className="min-w-0 flex flex-col">
                              <span className="truncate font-medium text-slate-900 dark:text-white">
                                {fullName}
                              </span>
                              <span className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                                {s.role || ""}
                                {hasPhone ? ` · ${s.phone}` : ""}
                              </span>
                            </span>
                            {!hasPhone ? (
                              <span
                                className="shrink-0 text-[9px] font-bold text-amber-600 dark:text-amber-400"
                                title={t(
                                  "dashboard.staff_messages.no_phone_warning",
                                )}
                              >
                                {t(
                                  "dashboard.staff_messages.no_phone_short",
                                )}
                              </span>
                            ) : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() =>
                setPriority((p) => (p === "URGENT" ? "NORMAL" : "URGENT"))
              }
              className={cn(
                "shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors",
                priority === "URGENT"
                  ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                  : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
              )}
              title={t("dashboard.staff_messages.priority_toggle_hint")}
            >
              <Flame className="h-3 w-3" aria-hidden />
              {priority === "URGENT"
                ? t("dashboard.staff_messages.priority_urgent")
                : t("dashboard.staff_messages.priority_normal")}
            </button>
          </div>

          {/* Body textarea */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("dashboard.staff_messages.body_placeholder")}
            rows={2}
            maxLength={2000}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-[12px] resize-none focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />

          {/* Templates + Send */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {templates.slice(0, 3).map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onPickTemplate(tpl)}
                className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300 transition-colors"
                title={tpl.body}
              >
                {tpl.label}
              </button>
            ))}
            <Button
              type="button"
              size="sm"
              disabled={!canSend}
              onClick={() => sendMutation.mutate()}
              className="ml-auto h-7 gap-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-3 text-[11px]"
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <Send className="h-3 w-3" aria-hidden />
              )}
              {t("dashboard.staff_messages.send")}
            </Button>
          </div>
        </div>

        {/* Recent feed -------------------------------------------------- */}
        <div className="flex-1 min-h-0 -mx-1 overflow-y-auto px-1">
          {recentQuery.isLoading ? (
            <div className="py-6 text-center text-[12px] text-slate-400">
              {t("dashboard.staff_messages.loading")}
            </div>
          ) : items.length === 0 ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/60 text-slate-400">
                <MessageSquare className="h-4 w-4" aria-hidden />
              </div>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">
                {t("dashboard.staff_messages.empty")}
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {items.map((it) => {
                const pill =
                  STAFF_MESSAGE_STATUS_PILL[it.status] ||
                  STAFF_MESSAGE_STATUS_PILL.SENT;
                // Pick the right tick icon: failed → x; read → ✓✓; delivered → ✓✓; sent → ✓.
                const TickIcon =
                  it.status === "FAILED"
                    ? XCircle
                    : it.status === "READ"
                      ? CheckCheck
                      : it.status === "DELIVERED"
                        ? CheckCheck
                        : Check;
                return (
                  <li
                    key={it.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    title={it.error_message || it.preview}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-[12.5px] font-medium text-slate-900 dark:text-white">
                          {it.recipient.name}
                        </span>
                        {it.priority === "URGENT" ? (
                          <span className="shrink-0 inline-flex items-center rounded-sm border border-rose-200 bg-rose-50 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                            {t("dashboard.staff_messages.priority_urgent_short")}
                          </span>
                        ) : null}
                      </div>
                      <div className="truncate text-[10.5px] text-slate-500 dark:text-slate-400">
                        {it.preview}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        pill.bg,
                        pill.text,
                      )}
                    >
                      <TickIcon className="h-3 w-3" aria-hidden />
                      {t(pill.labelKey)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
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

  if (builtinId === "staff_messages") {
    return (
      <StaffMessagesCard
        cardBase={cardBase}
        cardHeaderBase={cardHeaderBase}
        t={t}
        navigate={navigate}
      />
    );
  }

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

    case "incidents":
      return (
        <RecentIncidentsCard cardBase={cardBase} cardHeaderBase={cardHeaderBase} t={t} navigate={navigate} />
      );

    case "urgent_top":
      return (
        <CategoryTasksCard
          cardBase={cardBase}
          cardHeaderBase={cardHeaderBase}
          t={t}
          navigate={navigate}
          bucket="urgent"
          titleKey="dashboard.urgent_top.title"
          icon={Flame}
          tone="rose"
          moreHref="/dashboard/staff-requests?priority=URGENT"
        />
      );

    case "human_resources":
      return (
        <CategoryTasksCard
          cardBase={cardBase}
          cardHeaderBase={cardHeaderBase}
          t={t}
          navigate={navigate}
          bucket="human_resources"
          titleKey="dashboard.human_resources.title"
          icon={Briefcase}
          tone="violet"
          // HR widget aggregates HR + DOCUMENT (see BUCKET_TO_CATEGORIES
          // on the backend); pass both so the inbox shows every row the
          // widget counted instead of hiding DOCUMENT rows behind an
          // HR-only chip.
          moreHref="/dashboard/staff-requests?category=HR,DOCUMENT"
        />
      );

    case "finance":
      return (
        <CategoryTasksCard
          cardBase={cardBase}
          cardHeaderBase={cardHeaderBase}
          t={t}
          navigate={navigate}
          bucket="finance"
          titleKey="dashboard.finance.title"
          icon={Wallet}
          tone="emerald"
          // Finance widget aggregates FINANCE + PAYROLL (see
          // BUCKET_TO_CATEGORIES on the backend). Deep-linking to a single
          // category hid payslip rows here, so we pass both.
          moreHref="/dashboard/staff-requests?category=FINANCE,PAYROLL"
        />
      );

    case "maintenance":
      return (
        <CategoryTasksCard
          cardBase={cardBase}
          cardHeaderBase={cardHeaderBase}
          t={t}
          navigate={navigate}
          bucket="maintenance"
          titleKey="dashboard.maintenance.title"
          icon={Wrench}
          tone="amber"
          moreHref="/dashboard/staff-requests?category=MAINTENANCE"
        />
      );

    case "purchase_orders":
      return (
        <CategoryTasksCard
          cardBase={cardBase}
          cardHeaderBase={cardHeaderBase}
          t={t}
          navigate={navigate}
          bucket="purchase_orders"
          titleKey="dashboard.purchase_orders.title"
          icon={ShoppingBag}
          tone="sky"
          moreHref="/dashboard/staff-requests?category=PURCHASE_ORDER"
        />
      );

    case "miscellaneous":
      return (
        <CategoryTasksCard
          cardBase={cardBase}
          cardHeaderBase={cardHeaderBase}
          t={t}
          navigate={navigate}
          bucket="miscellaneous"
          titleKey="dashboard.miscellaneous.title"
          icon={Layers}
          tone="slate"
          moreHref="/dashboard/staff-requests?category=OTHER"
        />
      );

    default:
      return null;
  }
}
