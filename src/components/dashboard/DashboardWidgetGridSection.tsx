/**
 * Self-contained widget grid section extracted from Dashboard.tsx.
 *
 * Renders the full widget grid with customization, drag-and-drop reordering,
 * add/remove widgets, and persistence. Intended to be mounted inside the
 * Attention page as the "Widgets" section.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Plus,
  Sliders,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { usePermissions } from "@/hooks/use-permissions";
import { useDashboardCategories } from "@/hooks/use-dashboard-categories";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
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
  WIDGET_ADD_ICONS,
  WIDGET_ADD_DESC_KEYS,
  DASHBOARD_WIDGET_CATEGORY_ORDER,
  DASHBOARD_WIDGET_CATEGORY_KEYS,
  getWidgetCategory,
  isCustomWidgetSlotId,
} from "@/pages/dashboard/DashboardWidgets";
import { ManageDashboardCategoriesDialog } from "@/pages/dashboard/ManageDashboardCategoriesDialog";

function SectionChevron({ open }: { open: boolean }) {
  return open ? (
    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
  ) : (
    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
  );
}

export function DashboardWidgetGridSection() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, hasRole, accessToken } = useAuth() as AuthContextType;
  const { canWidget } = usePermissions();

  const { data: todaySales, isLoading: salesLoading } = useQuery({
    queryKey: ["pos-sales-today", accessToken],
    queryFn: () => api.getTodaySales(accessToken!),
    enabled: !!accessToken && hasRole(["SUPER_ADMIN", "ADMIN", "MANAGER"]),
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
  });

  const { data: prepList, isLoading: prepLoading } = useQuery({
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
    refetchOnWindowFocus: true,
  });

  const noShowsPeriod = (() => {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  })();
  const noShowsCount = (() => {
    if (isLoading || !summary?.attendance) return 0;
    const a = summary.attendance as Record<string, number>;
    switch (noShowsPeriod) {
      case "morning": return a.morning_no_shows ?? a.no_shows ?? 0;
      case "afternoon": return a.afternoon_no_shows ?? 0;
      case "evening": return a.evening_no_shows ?? 0;
      default: return a.no_shows ?? 0;
    }
  })();
  const noShowsLabelKey = `dashboard.staffing.${noShowsPeriod}_no_shows`;
  const noShowsDescKey = `dashboard.staffing.no_shows_${noShowsPeriod}`;

  const insights = ((summary as Record<string, unknown>)?.insights as Record<string, unknown>)?.items as Array<Record<string, unknown>> || [];
  const insightsVisible = insights.slice(0, 5);
  const criticalCount = Number(
    ((summary as Record<string, unknown>)?.insights as Record<string, unknown>)?.counts
      ? ((((summary as Record<string, unknown>)?.insights as Record<string, unknown>)?.counts as Record<string, unknown>)?.CRITICAL ?? 0)
      : 0
  );
  const operationalCount = Number(
    ((summary as Record<string, unknown>)?.insights as Record<string, unknown>)?.counts
      ? ((((summary as Record<string, unknown>)?.insights as Record<string, unknown>)?.counts as Record<string, unknown>)?.OPERATIONAL ?? 0)
      : 0
  );
  const attentionNow = criticalCount + operationalCount;
  const [showAllInsights, setShowAllInsights] = useState(false);

  const cardBase =
    "relative border border-slate-200/60 dark:border-slate-800/80 bg-card rounded-2xl ring-1 ring-slate-900/[0.03] dark:ring-white/[0.04] shadow-[0_1px_2px_0_rgb(15_23_42_/_0.04),0_2px_8px_-2px_rgb(15_23_42_/_0.06)] transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300/70 dark:hover:border-slate-700 hover:shadow-[0_12px_32px_-12px_rgb(15_23_42_/_0.18),0_4px_12px_-4px_rgb(15_23_42_/_0.08)] flex h-full min-h-[200px] flex-col";
  const cardHeaderBase = "flex flex-row items-center justify-between pb-2 space-y-0 px-6 pt-6";

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
  const [customizeMode, setCustomizeMode] = useState(false);
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [showWidgets, setShowWidgets] = useState(true);
  const [widgetOrder, setWidgetOrder] = useState<DashboardWidgetSlotId[]>(() => [...DEFAULT_DASHBOARD_WIDGET_ORDER]);
  const [serverLayoutReady, setServerLayoutReady] = useState(false);
  const skipNextPersist = useRef(true);
  const ignoreNextServerPatch = useRef(false);

  useEffect(() => {
    if (!canCustomizeDashboard || !widgetStorageKey) return;
    const parsed = parseStoredWidgetOrder(localStorage.getItem(widgetStorageKey));
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
    return () => { cancelled = true; };
  }, [canCustomizeDashboard, accessToken, widgetStorageKey, user?.id]);

  useEffect(() => {
    if (!canCustomizeDashboard || !widgetStorageKey || skipNextPersist.current) return;
    localStorage.setItem(widgetStorageKey, JSON.stringify({ order: widgetOrder }));
  }, [widgetOrder, canCustomizeDashboard, widgetStorageKey]);

  useEffect(() => {
    if (!canCustomizeDashboard || !accessToken || !serverLayoutReady) return;
    if (ignoreNextServerPatch.current) return;
    const timer = setTimeout(() => {
      api
        .patchDashboardWidgetOrder({ order: widgetOrder })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["staff-inbox-lanes"] });
        })
        .catch(() => {});
    }, 900);
    return () => clearTimeout(timer);
  }, [widgetOrder, canCustomizeDashboard, accessToken, serverLayoutReady, queryClient]);

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

  const widgetLabel = useCallback(
    (id: string) => {
      if (id.startsWith("custom:")) {
        return customWidgetsById[id]?.title ?? id;
      }
      switch (id as DashboardWidgetId) {
        case "insights": return t("dashboard.insights.title");
        case "staffing": return t("dashboard.staffing.title");
        case "sales_or_tasks":
          return hasRole(["SUPER_ADMIN", "ADMIN", "MANAGER"])
            ? t("dashboard.sales.title")
            : t("dashboard.tasks.title");
        case "operations": return t("dashboard.operations.title");
        case "wellbeing": return t("dashboard.wellbeing.title");
        case "live_attendance": return t("dashboard.live_attendance.title");
        case "compliance_risk": return t("dashboard.compliance_risk.title");
        case "inventory_delivery": return t("dashboard.inventory_delivery.title");
        case "task_execution": return t("dashboard.task_execution.title");
        case "take_orders": return t("dashboard.take_orders.title");
        case "reservations": return t("dashboard.reservations.title");
        case "retail_store_ops": return t("dashboard.retail_store_ops.title");
        case "jobsite_crew": return t("dashboard.jobsite_crew.title");
        case "ops_reports": return t("dashboard.ops_reports.title");
        case "staff_inbox": return t("dashboard.staff_inbox.title");
        case "team_travel": return t("dashboard.team_travel.title");
        case "team_medical_service": return t("dashboard.team_medical_service.title");
        case "tasks_demands": return t("dashboard.tasks_demands.title");
        case "meetings_reminders": return t("dashboard.meetings_reminders.title");
        case "clock_ins": return t("dashboard.clock_ins.title");
        case "staff_daily_progress": return t("dashboard.staff_daily_progress.title");
        case "staff_messages": return t("dashboard.staff_messages.title");
        default: return id;
      }
    },
    [customWidgetsById, hasRole, t],
  );

  const rawDisplayOrder = canCustomizeDashboard ? widgetOrder : DEFAULT_DASHBOARD_WIDGET_ORDER;
  const displayOrder = rawDisplayOrder.filter((id) => {
    if (isCustomWidgetSlotId(id)) return true;
    return canWidget(id as string);
  });

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
      t, navigate, cardBase, cardHeaderBase, summary, isLoading,
      showAllInsights, criticalCount, insights, insightsVisible,
      attentionNow, noShowsCount, noShowsLabelKey, noShowsDescKey,
      todaySales, prepList, salesLoading, prepLoading, hasRole,
      customWidgetsById,
    ],
  );

  return (
    <section aria-label={t("nav.attention")} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
        <button
          type="button"
          className="flex items-center gap-2 text-left"
          onClick={() => setShowWidgets((v) => !v)}
          aria-expanded={showWidgets}
        >
          <SectionChevron open={showWidgets} />
          <div>
            <p className="text-caption-label">{t("widgets.page.title")}</p>
            <p className="type-secondary">
              {t("widgets.page.desc")}
            </p>
          </div>
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {!showWidgets ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowWidgets(true)}>
              Show
            </Button>
          ) : null}
          {canCustomizeDashboard && (showWidgets || customizeMode) ? (
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
                variant={customizeMode ? "default" : "ghost"}
                size="sm"
                className="gap-1.5"
                onClick={() => setCustomizeMode((v) => !v)}
              >
                <LayoutGrid className="h-4 w-4" />
                {customizeMode ? t("dashboard.customize.done") : t("dashboard.customize.edit")}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {canCustomizeDashboard && customizeMode ? (
        <p className="-mt-3 text-caption text-primary">{t("dashboard.customize.hint")}</p>
      ) : null}

      {showWidgets || customizeMode ? (
        <div className="space-y-6">
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
                                setWidgetOrder((o) => (o.includes(wid) ? o : [wid, ...o]));
                                setAddWidgetOpen(false);
                              }}
                              className={cn(
                                "group flex gap-3 rounded-2xl border border-slate-200/90 bg-card p-4 text-left shadow-sm transition-all",
                                "hover:border-emerald-300 hover:shadow-md hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-900/80",
                                "dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                              )}
                            >
                              {Icon ? (
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:from-emerald-500/20 dark:to-teal-500/10 dark:text-emerald-400">
                                  <Icon className="h-6 w-6" aria-hidden />
                                </div>
                              ) : null}
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
                              setWidgetOrder((o) =>
                                o.includes(w.slot_id) ? o : [w.slot_id, ...o],
                              );
                              setAddWidgetOpen(false);
                            }}
                            className={cn(
                              "group flex gap-3 rounded-2xl border border-violet-200/70 bg-card p-4 text-left shadow-sm transition-all",
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
                            "group flex gap-3 rounded-2xl border border-slate-200/90 bg-card p-4 text-left shadow-sm transition-all",
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
        </div>
      ) : null}
    </section>
  );
}
