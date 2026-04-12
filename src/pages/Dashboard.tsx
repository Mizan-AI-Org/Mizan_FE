import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  SortableDashboardWidget,
  getActionRoute,
  WIDGET_ADD_ICONS,
  WIDGET_ADD_DESC_KEYS,
  DASHBOARD_WIDGET_CATEGORY_ORDER,
  DASHBOARD_WIDGET_CATEGORY_KEYS,
  getWidgetCategory,
} from "@/pages/dashboard/DashboardWidgets";

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
  const { user, hasRole, accessToken } = useAuth() as AuthContextType;
  const { t } = useLanguage();
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

  const cardBase =
    "border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 hover:shadow-md transition-all duration-300 rounded-2xl flex h-full min-h-[200px] flex-col";
  const cardHeaderBase = "flex flex-row items-center justify-between pb-2 space-y-0 px-6 pt-6";

  const insights = (summary?.insights?.items || []) as InsightItem[];
  const insightsVisible = showAllInsights ? insights.slice(0, 8) : insights.slice(0, 2);
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

  const widgetStorageKey = user?.id ? `mizan-dashboard-widget-order:${user.id}` : null;
  const [customizeMode, setCustomizeMode] = useState(false);
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<DashboardWidgetSlotId[]>(() => [...DEFAULT_DASHBOARD_WIDGET_ORDER]);
  const [serverLayoutReady, setServerLayoutReady] = useState(false);
  const skipNextPersist = useRef(true);
  const ignoreNextServerPatch = useRef(false);

  useEffect(() => {
    if (!canCustomizeDashboard || !widgetStorageKey) return;
    const parsed = parseStoredWidgetOrder(localStorage.getItem(widgetStorageKey));
    if (parsed) setWidgetOrder(parsed);
    skipNextPersist.current = false;
  }, [canCustomizeDashboard, widgetStorageKey]);

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
          ignoreNextServerPatch.current = true;
          skipNextPersist.current = true;
          setWidgetOrder(data.order as DashboardWidgetSlotId[]);
          if (widgetStorageKey) {
            localStorage.setItem(widgetStorageKey, JSON.stringify({ order: data.order }));
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
  }, [canCustomizeDashboard, accessToken, widgetStorageKey]);

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
    () => (DASHBOARD_WIDGET_IDS as readonly DashboardWidgetId[]).filter((id) => !widgetOrder.includes(id)),
    [widgetOrder],
  );

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
        default:
          return id;
      }
    },
    [customWidgetsById, hasRole, t],
  );

  const displayOrder = canCustomizeDashboard ? widgetOrder : DEFAULT_DASHBOARD_WIDGET_ORDER;

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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1419] p-4 md:p-6 lg:p-7 pb-40 font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors duration-300">
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
                  {customizeMode && hiddenWidgets.length > 0 && (
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
                      variant="ghost"
                      size="sm"
                      onClick={() => setWidgetOrder([...DEFAULT_DASHBOARD_WIDGET_ORDER])}
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
                            onRemove={() => setWidgetOrder((o) => o.filter((x) => x !== wid))}
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

      {/* Quick Actions Dock (floating, always visible) */}
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
