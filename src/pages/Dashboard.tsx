import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useAuth } from "../hooks/use-auth";
import { AuthContextType } from "../contexts/AuthContext.types";
import {
  BarChart3,
  Users,
  FileText,
  Settings,
  ClipboardCheck,
  LayoutGrid,
  Plus,
  Sparkles,
  Sliders,
  Building2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { DashboardSkeleton } from "@/components/skeletons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  DashboardWidgetById,
  DashboardWidgetId,
  DashboardWidgetSlotId,
  DashboardCustomWidgetDef,
  DASHBOARD_WIDGET_IDS,
  DEFAULT_DASHBOARD_WIDGET_ORDER,
  parseStoredWidgetOrder,
  mergeNewDefaultWidgets,
  markDefaultAsDismissed,
  clearDismissedDefaults,
  SortableDashboardWidget,
  getActionRoute,
  WIDGET_ADD_ICONS,
  WIDGET_ADD_DESC_KEYS,
  DASHBOARD_WIDGET_CATEGORY_ORDER,
  DASHBOARD_WIDGET_CATEGORY_KEYS,
  getWidgetCategory,
} from "@/pages/dashboard/DashboardWidgets";
import { ManageDashboardCategoriesDialog } from "@/pages/dashboard/ManageDashboardCategoriesDialog";
import { useDashboardCategories } from "@/hooks/use-dashboard-categories";
import { usePermissions } from "@/hooks/use-permissions";
import { UserAvatarMenu } from "@/components/layout/UserAvatarMenu";

type InsightItem = {
  id?: string;
  level?: string;
  action_url?: string;
  summary?: string;
  recommended_action?: string;
};

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
  /** RBAC app id — also filtered by usePermissions().canApp */
  appId?: string;
};

const apps: AppItem[] = [
  {
    name: "LOCATIONS OVERVIEW",
    href: "/dashboard/locations-overview",
    icon: Building2,
    gradient: "bg-sky-500",
    description: "Live status across every branch",
    nameKey: "app.locations_overview",
    descKey: "app.locations_overview.desc",
    roles: ["SUPER_ADMIN", "ADMIN", "OWNER", "MANAGER"],
    appId: "locations_overview",
  },
  {
    name: "PROCESSES & TASKS",
    href: "/dashboard/processes-tasks-app",
    icon: ClipboardCheck,
    gradient: "bg-teal-500",
    description: "Create and manage processes and tasks",
    nameKey: "app.tasks",
    descKey: "app.tasks.desc",
    roles: ["SUPER_ADMIN", "ADMIN"],
    appId: "tasks",
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
    appId: "staff",
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
    appId: "checklists",
  },
  {
    name: "STAFF SCHEDULING",
    href: "/dashboard/scheduling",
    icon: FileText,
    gradient: "bg-emerald-500",
    description: "Build the weekly schedule and assign shifts",
    nameKey: "app.scheduling",
    descKey: "app.scheduling.desc",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
    appId: "scheduling",
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
    appId: "settings",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, hasRole, accessToken } = useAuth() as AuthContextType;
  const { t } = useLanguage();
  const { canApp, canWidget } = usePermissions();
  const [showAllInsights, setShowAllInsights] = useState(false);

  const { data: todaySales, isLoading: salesLoading, isError: salesError } = useQuery({
    queryKey: ["pos-sales-today", accessToken],
    queryFn: () => api.getTodaySales(accessToken!),
    enabled: !!accessToken && hasRole(["SUPER_ADMIN", "ADMIN", "MANAGER"]),
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const { data: prepList, isLoading: prepLoading, isError: prepError } = useQuery({
    queryKey: ["pos-prep-list", accessToken],
    queryFn: () => api.getPrepList(accessToken!),
    enabled: !!accessToken && hasRole(["SUPER_ADMIN", "ADMIN", "MANAGER"]),
    refetchInterval: 300000,
  });

  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.getDashboardSummary(),
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.greeting.morning");
    if (hour < 17) return t("dashboard.greeting.afternoon");
    return t("dashboard.greeting.evening");
  }, []);

  const noShowsPeriod = (() => {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  })();
  const noShowsCount = (() => {
    if (isLoading || !summary?.attendance) return 0;
    const a = summary.attendance as { morning_no_shows?: number; afternoon_no_shows?: number; evening_no_shows?: number; no_shows?: number };
    switch (noShowsPeriod) {
      case "morning": return a.morning_no_shows ?? a.no_shows ?? 0;
      case "afternoon": return a.afternoon_no_shows ?? 0;
      case "evening": return a.evening_no_shows ?? 0;
      default: return a.no_shows ?? 0;
    }
  })();
  const noShowsLabelKey = `dashboard.staffing.${noShowsPeriod}_no_shows` as const;
  const noShowsDescKey = `dashboard.staffing.no_shows_${noShowsPeriod}` as const;

  // Premium card surface: soft inner ring + layered elevation
  // shadow so cards visually float over the page, plus a gentle lift
  // on hover to invite interaction without feeling "noisy".
  //
  //  - `ring-1 ring-slate-900/5` gives a crisp edge that stays
  //    readable on off-white dashboard backgrounds (stronger than a
  //    pale 1px border alone).
  //  - Two-layer shadow (ambient + contact) is the same recipe
  //    modern design systems (Linear, Stripe, Notion) use for depth
  //    without a heavy drop shadow.
  //  - Hover lifts by 1px and intensifies the shadow; `ease-out`
  //    keeps the motion crisp instead of lazy.
  const cardBase =
    "relative border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 rounded-2xl ring-1 ring-slate-900/[0.03] dark:ring-white/[0.04] shadow-[0_1px_2px_0_rgb(15_23_42_/_0.04),0_2px_8px_-2px_rgb(15_23_42_/_0.06)] transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300/70 dark:hover:border-slate-700 hover:shadow-[0_12px_32px_-12px_rgb(15_23_42_/_0.18),0_4px_12px_-4px_rgb(15_23_42_/_0.08)] flex h-full min-h-[200px] flex-col";
  const cardHeaderBase = "flex flex-row items-center justify-between pb-2 space-y-0 px-6 pt-6";

  const insights = (summary?.insights?.items || []) as InsightItem[];
  // Widget: top 5 always. Full ranked list lives on /dashboard/operational-issues.
  const insightsVisible = insights.slice(0, 5);
  const criticalCount = Number(summary?.insights?.counts?.CRITICAL || 0);
  const operationalCount = Number(summary?.insights?.counts?.OPERATIONAL || 0);
  const attentionNow = criticalCount + operationalCount;
  const prevCriticalRef = useRef<number>(0);

  const canCustomizeDashboard = hasRole(["SUPER_ADMIN", "ADMIN", "MANAGER", "OWNER"]);

  const { data: customWidgetsPayload } = useQuery({
    queryKey: ["dashboard-custom-widgets", accessToken],
    queryFn: () => api.getDashboardCustomWidgets(),
    enabled: !!accessToken && canCustomizeDashboard,
  });
  const customWidgetsById = useMemo(() => {
    const m: Record<string, DashboardCustomWidgetDef> = {};
    for (const w of customWidgetsPayload?.widgets ?? []) {
      m[w.slot_id] = w;
    }
    return m;
  }, [customWidgetsPayload]);

  const categoriesQuery = useDashboardCategories(!!accessToken);
  const managerCategories = useMemo(
    () =>
      [...(categoriesQuery.data ?? [])].sort(
        (a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name),
      ),
    [categoriesQuery.data],
  );

  const widgetStorageKey = user?.id ? `mizan-dashboard-widget-order:${user.id}` : null;
  const appsPaneStorageKey = user?.id ? `mizan-apps-pane-collapsed:${user.id}` : "mizan-apps-pane-collapsed";
  const [appsPaneCollapsed, setAppsPaneCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = window.localStorage.getItem(appsPaneStorageKey);
      // Default to collapsed when nothing has been stored yet.
      return stored === null ? true : stored === "1";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(appsPaneStorageKey, appsPaneCollapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [appsPaneCollapsed, appsPaneStorageKey]);
  const [customizeMode, setCustomizeMode] = useState(false);
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<DashboardWidgetSlotId[]>(() => [...DEFAULT_DASHBOARD_WIDGET_ORDER]);
  const [serverLayoutReady, setServerLayoutReady] = useState(false);
  const skipNextPersist = useRef(true);
  const ignoreNextServerPatch = useRef(false);

  useEffect(() => {
    if (!canCustomizeDashboard || !widgetStorageKey) return;
    const parsed = parseStoredWidgetOrder(localStorage.getItem(widgetStorageKey));
    // Merge any newly-shipped default widgets into the cached order so
    // they show up immediately on the next paint (before the server
    // response arrives). The merge is pure — it won't re-add anything
    // the user has explicitly dismissed, and it deliberately does NOT
    // mutate the dismissed-defaults set so the server-side merge below
    // still gets a fair chance to add missing defaults.
    if (parsed) {
      const { order: merged } = mergeNewDefaultWidgets(parsed, user?.id);
      setWidgetOrder(merged);
    }
    skipNextPersist.current = false;
  }, [canCustomizeDashboard, widgetStorageKey, user?.id]);

  useEffect(() => {
    if (!canCustomizeDashboard || !accessToken) {
      setServerLayoutReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getDashboardWidgetOrder();
        if (cancelled) return;
        if (data?.order && Array.isArray(data.order) && data.order.length > 0) {
          const { order: merged, changed } = mergeNewDefaultWidgets(
            data.order as DashboardWidgetSlotId[],
            user?.id,
          );
          ignoreNextServerPatch.current = !changed;
          skipNextPersist.current = true;
          setWidgetOrder(merged);
          if (widgetStorageKey) {
            localStorage.setItem(widgetStorageKey, JSON.stringify({ order: merged }));
          }
          queueMicrotask(() => {
            skipNextPersist.current = false;
            setTimeout(() => {
              ignoreNextServerPatch.current = false;
            }, 80);
          });
        }
      } catch {
        /* offline or older backend */
      } finally {
        if (!cancelled) setServerLayoutReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canCustomizeDashboard, accessToken, widgetStorageKey, user?.id]);

  useEffect(() => {
    if (!canCustomizeDashboard || !widgetStorageKey || skipNextPersist.current) return;
    localStorage.setItem(widgetStorageKey, JSON.stringify({ order: widgetOrder }));
  }, [widgetOrder, canCustomizeDashboard, widgetStorageKey]);

  useEffect(() => {
    if (!canCustomizeDashboard || !accessToken || !serverLayoutReady) return;
    if (ignoreNextServerPatch.current) return;
    const t = setTimeout(() => {
      api.patchDashboardWidgetOrder({ order: widgetOrder }).catch(() => {});
    }, 900);
    return () => clearTimeout(t);
  }, [widgetOrder, canCustomizeDashboard, accessToken, serverLayoutReady]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setWidgetOrder((items) => {
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  }, []);

  const hiddenWidgets = useMemo(
    () =>
      (DASHBOARD_WIDGET_IDS as readonly DashboardWidgetId[])
        .filter((id) => !widgetOrder.includes(id))
        .filter((id) => canWidget(id)),
    [widgetOrder, canWidget],
  );

  const hiddenCustomWidgetsByCategory = useMemo(() => {
    const byCat: Record<string, DashboardCustomWidgetDef[]> = {};
    const uncategorized: DashboardCustomWidgetDef[] = [];
    for (const w of customWidgetsPayload?.widgets ?? []) {
      if (widgetOrder.includes(w.slot_id)) continue;
      if (w.category_id) {
        (byCat[w.category_id] ||= []).push(w);
      } else {
        uncategorized.push(w);
      }
    }
    return { byCat, uncategorized };
  }, [customWidgetsPayload, widgetOrder]);

  const widgetBundle = useMemo(
    () => ({
      t,
      navigate,
      cardBase,
      cardHeaderBase,
      summary: summary as Record<string, unknown>,
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
    }),
    [
      t,
      navigate,
      cardBase,
      cardHeaderBase,
      summary,
      isLoading,
      showAllInsights,
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
      setShowAllInsights,
      customWidgetsById,
    ],
  );

  const widgetLabel = useCallback(
    (id: string) => {
      if (id.startsWith("custom:")) {
        return customWidgetsById[id]?.title ?? id;
      }
      switch (id as DashboardWidgetId) {
        case "insights":
          return t("dashboard.insights.title");
        case "staffing":
          return t("dashboard.staffing.title");
        case "sales_or_tasks":
          return hasRole(["SUPER_ADMIN", "ADMIN", "MANAGER"])
            ? t("dashboard.sales.title")
            : t("dashboard.tasks.title");
        case "operations":
          return t("dashboard.operations.title");
        case "wellbeing":
          return t("dashboard.wellbeing.title");
        case "live_attendance":
          return t("dashboard.live_attendance.title");
        case "compliance_risk":
          return t("dashboard.compliance_risk.title");
        case "inventory_delivery":
          return t("dashboard.inventory_delivery.title");
        case "task_execution":
          return t("dashboard.task_execution.title");
        case "take_orders":
          return t("dashboard.take_orders.title");
        case "reservations":
          return t("dashboard.reservations.title");
        case "retail_store_ops":
          return t("dashboard.retail_store_ops.title");
        case "jobsite_crew":
          return t("dashboard.jobsite_crew.title");
        case "ops_reports":
          return t("dashboard.ops_reports.title");
        case "staff_inbox":
          return t("dashboard.staff_inbox.title");
        case "tasks_demands":
          return t("dashboard.tasks_demands.title");
        case "meetings_reminders":
          return t("dashboard.meetings_reminders.title");
        case "clock_ins":
          return t("dashboard.clock_ins.title");
        default:
          return id;
      }
    },
    [customWidgetsById, hasRole, t],
  );

  const rawDisplayOrder = canCustomizeDashboard ? widgetOrder : DEFAULT_DASHBOARD_WIDGET_ORDER;
  // Hide built-in widgets the current user no longer has permission for.
  // Custom widgets (slot_id starts with "custom-") are not gated here.
  const displayOrder = rawDisplayOrder.filter((id) => {
    if (typeof id === "string" && id.startsWith("custom-")) return true;
    return canWidget(id as string);
  });

  useEffect(() => {
    if (isLoading) return;

    // Trigger an alert when critical insights appear or increase.
    if (criticalCount > 0 && criticalCount > (prevCriticalRef.current || 0)) {
      const topCritical = insights.find((x) => String(x?.level || "").toUpperCase() === "CRITICAL");
      const description = topCritical?.recommended_action
        ? String(topCritical.recommended_action)
        : t("dashboard.open_insights");

      toast(t("dashboard.critical_issue"), {
        description,
        action: topCritical?.action_url
          ? {
            label: t("common.open"),
            onClick: () => navigate(getActionRoute(topCritical?.action_url)),
          }
          : undefined,
      });
    }

    prevCriticalRef.current = criticalCount;
  }, [criticalCount, isLoading, insights, navigate, t]);

  return (
    <div
      className={cn(
        "min-h-screen bg-slate-50 dark:bg-[#0f1419] p-4 md:p-6 lg:p-7 pb-32 lg:pb-10 font-sans antialiased text-slate-900 dark:text-slate-100 transition-[padding] duration-300",
        appsPaneCollapsed ? "lg:pl-24" : "lg:pl-72",
      )}
    >
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Section */}
        <header className="mb-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {greeting}, {user?.first_name || ""}
            </h1>
            <div className="flex items-center gap-2">
              {canCustomizeDashboard && (
                <>
                  {customizeMode && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setAddWidgetOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      {t("dashboard.customize.add_widget")}
                    </Button>
                  )}
                  {customizeMode && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setManageOpen(true)}
                    >
                      <Sliders className="h-4 w-4" />
                      {t("dashboard.customize.manage")}
                    </Button>
                  )}
                  {customizeMode && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        clearDismissedDefaults(user?.id);
                        setWidgetOrder([...DEFAULT_DASHBOARD_WIDGET_ORDER]);
                      }}
                    >
                      {t("dashboard.customize.reset")}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={customizeMode ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setCustomizeMode((v) => !v)}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    {customizeMode ? t("dashboard.customize.done") : t("dashboard.customize.edit")}
                  </Button>
                </>
              )}
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mt-1">
            {isLoading
              ? t("dashboard.status.updating")
              : attentionNow > 0
                ? t("dashboard.status.attention_now")
                : t("dashboard.status.all_clear")}
          </p>
          {canCustomizeDashboard && customizeMode && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              {t("dashboard.customize.hint")}
            </p>
          )}
        </header>

        {isLoading ? (
          <DashboardSkeleton statCount={3} contentCards={2} />
        ) : (
          <>
            <ManageDashboardCategoriesDialog
              open={manageOpen}
              onOpenChange={setManageOpen}
              t={t}
              canEdit={canCustomizeDashboard}
            />
            <Dialog open={addWidgetOpen} onOpenChange={setAddWidgetOpen}>
              <DialogContent className="z-[3100] max-w-lg sm:max-w-3xl border-slate-200/80 bg-gradient-to-b from-white to-slate-50/90 dark:from-slate-900 dark:to-slate-950 dark:border-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold tracking-tight">{t("dashboard.customize.add_widget_title")}</DialogTitle>
                  <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
                    {t("dashboard.customize.add_widget_subtitle")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 pt-2 max-h-[min(70vh,560px)] overflow-y-auto pr-1">
                  {DASHBOARD_WIDGET_CATEGORY_ORDER.map((catId) => {
                    const inCategory = hiddenWidgets.filter((wid) => getWidgetCategory(wid) === catId);
                    if (inCategory.length === 0) return null;
                    return (
                      <section key={catId} className="space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
                          {t(DASHBOARD_WIDGET_CATEGORY_KEYS[catId])}
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {inCategory.map((wid) => {
                            const Icon = WIDGET_ADD_ICONS[wid];
                            const descKey = WIDGET_ADD_DESC_KEYS[wid];
                            return (
                              <button
                                key={wid}
                                type="button"
                                onClick={() => {
                                  setWidgetOrder((o) => (o.includes(wid) ? o : [...o, wid]));
                                  setAddWidgetOpen(false);
                                }}
                                className={cn(
                                  "group flex gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-sm transition-all",
                                  "hover:border-emerald-300 hover:shadow-md hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-900/80",
                                  "dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                                )}
                              >
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:from-emerald-500/20 dark:to-teal-500/10 dark:text-emerald-400">
                                  <Icon className="h-6 w-6" aria-hidden />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-slate-900 dark:text-white leading-snug">{widgetLabel(wid)}</div>
                                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t(descKey)}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}

                  {/* Manager-created categories: tenant-wide, shown after built-in sections. */}
                  {managerCategories.map((cat) => {
                    const tiles = hiddenCustomWidgetsByCategory.byCat[cat.id] ?? [];
                    if (tiles.length === 0) return null;
                    return (
                      <section key={`mgr-${cat.id}`} className="space-y-2">
                        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300 px-0.5">
                          <Sparkles className="h-3.5 w-3.5" aria-hidden />
                          {cat.name}
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {tiles.map((w) => (
                            <button
                              key={w.slot_id}
                              type="button"
                              onClick={() => {
                                setWidgetOrder((o) => (o.includes(w.slot_id) ? o : [...o, w.slot_id]));
                                setAddWidgetOpen(false);
                              }}
                              className={cn(
                                "group flex gap-3 rounded-2xl border border-violet-200/70 bg-white p-4 text-left shadow-sm transition-all",
                                "hover:border-violet-300 hover:shadow-md hover:bg-violet-50/40 dark:border-violet-900/50 dark:bg-slate-900/80",
                                "dark:hover:border-violet-700 dark:hover:bg-violet-950/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40",
                              )}
                            >
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 text-violet-600 dark:from-violet-500/20 dark:to-fuchsia-500/10 dark:text-violet-300">
                                <Sparkles className="h-6 w-6" aria-hidden />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-slate-900 dark:text-white leading-snug">{w.title}</div>
                                {w.subtitle && (
                                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{w.subtitle}</p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </section>
                    );
                  })}

                  {hiddenCustomWidgetsByCategory.uncategorized.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
                        {t("dashboard.widget_categories.uncategorized")}
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {hiddenCustomWidgetsByCategory.uncategorized.map((w) => (
                          <button
                            key={w.slot_id}
                            type="button"
                            onClick={() => {
                              setWidgetOrder((o) => (o.includes(w.slot_id) ? o : [...o, w.slot_id]));
                              setAddWidgetOpen(false);
                            }}
                            className={cn(
                              "group flex gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-sm transition-all",
                              "hover:border-emerald-300 hover:shadow-md hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-900/80",
                              "dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                            )}
                          >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:from-emerald-500/20 dark:to-teal-500/10 dark:text-emerald-400">
                              <Sparkles className="h-6 w-6" aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-900 dark:text-white leading-snug">{w.title}</div>
                              {w.subtitle && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{w.subtitle}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {hiddenWidgets.length === 0 &&
                    hiddenCustomWidgetsByCategory.uncategorized.length === 0 &&
                    managerCategories.every(
                      (c) => (hiddenCustomWidgetsByCategory.byCat[c.id] ?? []).length === 0,
                    ) && (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
                        {t("dashboard.customize.nothing_to_add")}
                      </div>
                    )}

                  {canCustomizeDashboard && (
                    <div className="border-t border-slate-200/70 pt-3 text-center dark:border-slate-800">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-emerald-700 dark:text-emerald-400"
                        onClick={() => {
                          setAddWidgetOpen(false);
                          setManageOpen(true);
                        }}
                      >
                        <Sliders className="h-4 w-4" />
                        {t("dashboard.customize.manage_open")}
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {canCustomizeDashboard ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch auto-rows-[minmax(200px,auto)]">
                    {displayOrder.length === 0 ? (
                      <div className="lg:col-span-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 px-6 py-12 text-center">
                        <p className="text-sm text-slate-600 dark:text-slate-400">{t("dashboard.customize.empty")}</p>
                        {hiddenWidgets.length > 0 && (
                          <Button type="button" variant="outline" className="mt-4 gap-1.5" onClick={() => setAddWidgetOpen(true)}>
                            <Plus className="h-4 w-4" />
                            {t("dashboard.customize.add_widget")}
                          </Button>
                        )}
                      </div>
                    ) : (
                      displayOrder.map((wid, index) => {
                        const colSpan = index === 0 && wid === "insights" ? "lg:col-span-2" : "lg:col-span-1";
                        const node = <DashboardWidgetById id={wid} props={widgetBundle} />;
                        return (
                          <SortableDashboardWidget
                            key={wid}
                            id={wid}
                            editMode={customizeMode}
                            colClassName={cn("relative", colSpan)}
                            onRemove={() => {
                              markDefaultAsDismissed(user?.id, wid);
                              setWidgetOrder((o) => o.filter((x) => x !== wid));
                            }}
                          >
                            {node}
                          </SortableDashboardWidget>
                        );
                      })
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch auto-rows-[minmax(200px,auto)]">
                {displayOrder.map((wid, index) => {
                  const colSpan = index === 0 && wid === "insights" ? "lg:col-span-2" : "lg:col-span-1";
                  return (
                    <div key={wid} className={cn("relative flex min-h-0 flex-col", colSpan)}>
                      <DashboardWidgetById id={wid} props={widgetBundle} />
                    </div>
                  );
                })}
              </div>
            )}

          </>
        )}

      </div>

      {/* Quick Actions Mobile Dock (horizontal, < lg only) */}
      <div className="lg:hidden fixed bottom-3 left-3 right-3 z-30">
        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/70 backdrop-blur shadow-lg px-2 py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            {apps
              .filter((app) => !app.roles || hasRole(app.roles))
              .filter((app) => !app.appId || canApp(app.appId))
              .map((app) => {
                const label = app.nameKey ? t(app.nameKey) : app.name;
                return (
                  <button
                    key={`m-${app.name}`}
                    type="button"
                    onClick={() => navigate(app.href)}
                    title={label}
                    aria-label={label}
                    className="shrink-0 inline-flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm shadow-black/10", app.gradient)}>
                      <app.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-[10px] font-medium text-slate-700 dark:text-slate-300 max-w-[72px] truncate">
                      {label}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* Quick Actions Side Pane (collapsible, left, vertical, lg+ only) */}
      <aside
        className={cn(
          "hidden lg:flex fixed left-0 z-30 flex-col",
          "top-[68px] bottom-3 ml-3",
          "rounded-2xl border border-slate-200/70 dark:border-slate-800/80",
          "bg-gradient-to-b from-white/95 via-white/90 to-slate-50/95 dark:from-slate-900/90 dark:via-slate-900/85 dark:to-slate-950/90",
          "backdrop-blur-xl shadow-[0_10px_40px_-15px_rgba(15,23,42,0.25)] dark:shadow-[0_10px_40px_-15px_rgba(0,0,0,0.55)]",
          "transition-[width] duration-300 ease-out",
          appsPaneCollapsed ? "w-[72px]" : "w-64",
        )}
        aria-label={t("dashboard.quick_actions.title")}
      >
        {/* Header */}
        <div
          className={cn(
            "relative flex items-center gap-2 px-3 pt-4 pb-3",
            appsPaneCollapsed ? "justify-center" : "justify-between",
          )}
        >
          {!appsPaneCollapsed && (
            <div className="min-w-0 flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/30">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold tracking-tight text-slate-900 dark:text-white truncate leading-tight">
                  {t("dashboard.quick_actions.title")}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold truncate">
                  {t("dashboard.quick_actions.subtitle")}
                </div>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setAppsPaneCollapsed((v) => !v)}
            className={cn(
              "shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg",
              "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
              "hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all",
            )}
            aria-label={appsPaneCollapsed ? t("dashboard.quick_actions.expand") : t("dashboard.quick_actions.collapse")}
            aria-expanded={!appsPaneCollapsed}
            title={appsPaneCollapsed ? t("dashboard.quick_actions.expand") : t("dashboard.quick_actions.collapse")}
          >
            {appsPaneCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="mx-3 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />

        {/* Apps */}
        <nav
          className={cn(
            "flex-1 overflow-y-auto py-3 space-y-1",
            appsPaneCollapsed ? "px-2" : "px-2",
          )}
        >
          {apps
            .filter((app) => !app.roles || hasRole(app.roles))
            .filter((app) => !app.appId || canApp(app.appId))
            .map((app) => {
              const label = app.nameKey ? t(app.nameKey) : app.name;
              const desc = app.descKey ? t(app.descKey) : app.description;
              const isActive = pathname === app.href || pathname.startsWith(app.href + "/");
              return (
                <button
                  key={app.name}
                  type="button"
                  onClick={() => navigate(app.href)}
                  title={appsPaneCollapsed ? label : undefined}
                  aria-label={label}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative w-full flex items-center gap-3 rounded-xl transition-all duration-200",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                    appsPaneCollapsed ? "justify-center px-2 py-2" : "px-2.5 py-2",
                    isActive
                      ? "bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800/80 dark:to-slate-800/40 shadow-sm"
                      : "hover:bg-slate-100/70 dark:hover:bg-slate-800/50",
                  )}
                >
                  {/* Active indicator bar */}
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300",
                      isActive
                        ? "h-7 bg-gradient-to-b from-emerald-500 to-teal-500 opacity-100"
                        : "h-0 opacity-0",
                    )}
                    aria-hidden
                  />
                  <div
                    className={cn(
                      "relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      "shadow-md shadow-black/10 ring-1 ring-white/10",
                      "transition-transform duration-200 group-hover:scale-[1.06] group-active:scale-95",
                      app.gradient,
                    )}
                  >
                    <app.icon className="w-5 h-5 text-white drop-shadow-sm" />
                    {/* Subtle inner gloss */}
                    <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-white/25 to-transparent" aria-hidden />
                  </div>
                  {!appsPaneCollapsed && (
                    <div className="min-w-0 text-left leading-tight">
                      <div
                        className={cn(
                          "text-[13px] font-semibold tracking-tight truncate transition-colors",
                          isActive
                            ? "text-slate-900 dark:text-white"
                            : "text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white",
                        )}
                      >
                        {label}
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                        {desc}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
        </nav>

        {/* Footer — user avatar / account menu */}
        <div
          className={cn(
            "mt-auto px-2 pb-3 pt-2",
            "border-t border-slate-100 dark:border-slate-800/70",
          )}
        >
          <UserAvatarMenu
            variant={appsPaneCollapsed ? "icon" : "row"}
            align="start"
            side="right"
            className={appsPaneCollapsed ? "mx-auto" : ""}
          />
        </div>
      </aside>
    </div>
  );
}
