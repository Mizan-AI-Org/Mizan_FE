"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { BarChart3, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HUB_TABS_TRIGGER } from "@/lib/mizan-ui";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";

type TabKey = "staff" | "categories";

function tabFromParam(value: string | null): TabKey {
  return value === "categories" ? "categories" : "staff";
}

/** Staff completion & category breakdown (used on Live Operations → Progress tab). */
export function OperationsProgressPanel() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>(() => tabFromParam(searchParams.get("tab")));
  const [date, setDate] = useState(() => searchParams.get("date") || "");
  const [days, setDays] = useState(() => Number(searchParams.get("days") || 1) || 1);

  useEffect(() => {
    setActiveTab(tabFromParam(searchParams.get("tab")));
  }, [searchParams]);

  const queryDate = date || undefined;
  const summaryQuery = useQuery({
    queryKey: ["operations-progress", "summary", queryDate, days],
    queryFn: () => api.getOperationsProgressSummary({ date: queryDate, days }),
    staleTime: 30_000,
  });

  const staffQuery = useQuery({
    queryKey: ["operations-progress", "staff", queryDate, days],
    queryFn: () => api.getOperationsProgressByStaff({ date: queryDate, days }),
    staleTime: 30_000,
  });

  const categoryQuery = useQuery({
    queryKey: ["operations-progress", "categories", queryDate, days],
    queryFn: () => api.getOperationsProgressByCategory({ date: queryDate, days }),
    staleTime: 30_000,
  });

  const summary = summaryQuery.data;
  const staff = staffQuery.data?.staff ?? [];
  const categories = categoryQuery.data?.categories ?? [];

  const selectTab = (value: string) => {
    const next = tabFromParam(value);
    setActiveTab(next);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("view", "progress");
        if (next === "staff") p.delete("tab");
        else p.set("tab", next);
        if (date) p.set("date", date);
        else p.delete("date");
        if (days > 1) p.set("days", String(days));
        else p.delete("days");
        return p;
      },
      { replace: true },
    );
  };

  const syncRangeParams = (nextDate: string, nextDays: number) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("view", "progress");
        if (activeTab === "categories") p.set("tab", "categories");
        else p.delete("tab");
        if (nextDate) p.set("date", nextDate);
        else p.delete("date");
        if (nextDays > 1) p.set("days", String(nextDays));
        else p.delete("days");
        return p;
      },
      { replace: true },
    );
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("operations_progress.subtitle")}</p>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground">{t("operations_progress.date")}</label>
          <Input
            type="date"
            className="mt-1 w-[180px]"
            value={date || summary?.date || ""}
            onChange={(e) => {
              setDate(e.target.value);
              syncRangeParams(e.target.value, days);
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={days === 1 ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setDays(1);
              syncRangeParams(date, 1);
            }}
          >
            {t("operations_progress.today")}
          </Button>
          <Button
            type="button"
            variant={days === 7 ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setDays(7);
              syncRangeParams(date, 7);
            }}
          >
            {t("operations_progress.last_7_days")}
          </Button>
        </div>
        {summary ? (
          <div className="ml-auto flex flex-wrap gap-2 text-sm">
            <Badge variant="secondary">
              {t("operations_progress.kpi_tasks")}: {summary.taskCompletionPct}%
            </Badge>
            <Badge variant="outline">
              {t("operations_progress.kpi_checklists")}: {summary.checklistCompletionPct}%
            </Badge>
            {summary.tasksOverdueOpen > 0 ? (
              <Badge variant="destructive">
                {t("operations_progress.kpi_overdue")}: {summary.tasksOverdueOpen}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={selectTab} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/40 p-1.5">
          <TabsTrigger value="staff" className={cn(HUB_TABS_TRIGGER, "gap-2 py-3")}>
            <Users className="h-4 w-4" />
            {t("operations_progress.tab.staff")}
          </TabsTrigger>
          <TabsTrigger value="categories" className={cn(HUB_TABS_TRIGGER, "gap-2 py-3")}>
            <BarChart3 className="h-4 w-4" />
            {t("operations_progress.tab.categories")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-6 focus-visible:outline-none">
          {staffQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("generic.loading")}</p>
          ) : staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("operations_progress.empty_staff")}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t("operations_progress.col.name")}</th>
                    <th className="px-4 py-3">{t("operations_progress.col.tasks_pct")}</th>
                    <th className="px-4 py-3">{t("operations_progress.col.checklists_pct")}</th>
                    <th className="px-4 py-3">{t("operations_progress.col.avg_min")}</th>
                    <th className="px-4 py-3">{t("operations_progress.col.overdue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((row) => (
                    <tr key={row.staffId} className="border-t">
                      <td className="px-4 py-3 font-medium">{row.name}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {row.tasks.completionPct != null ? `${row.tasks.completionPct}%` : "—"}
                        <span className="ml-1 text-muted-foreground">
                          ({row.tasks.completed}/{row.tasks.total || 0})
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {row.checklists.completionPct != null ? `${row.checklists.completionPct}%` : "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {row.tasks.avgCompletionMinutes ?? row.checklists.avgCompletionMinutes ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {row.tasks.overdueOpen > 0 ? (
                          <Badge variant="destructive">{row.tasks.overdueOpen}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-6 space-y-4 focus-visible:outline-none">
          {categoryQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("generic.loading")}</p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("operations_progress.empty_categories")}</p>
          ) : (
            categories.map((cat) => (
              <div key={cat.bucket} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-medium">{t(cat.labelKey)}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {cat.completionPct}% · {cat.completed}/{cat.total}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, cat.completionPct)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("operations_progress.open_count", { count: cat.open })}
                  {cat.onTimePct != null ? ` · ${t("operations_progress.on_time")}: ${cat.onTimePct}%` : ""}
                </p>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
