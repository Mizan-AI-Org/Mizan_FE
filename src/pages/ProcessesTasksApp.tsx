"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, ListChecks } from "lucide-react";
import TaskManagementBoard from "./TaskManagementBoard";
import TaskTemplates from "./TaskTemplates";
import { useLanguage } from "@/hooks/use-language";
import { MizanPageShell } from "@/components/os/MizanPageShell";
import { HUB_TABS_TRIGGER } from "@/lib/mizan-ui";
import { cn } from "@/lib/utils";

/** Portal target for New / Import / Pre-Built actions on the All My Processes tab. */
export const PROCESSES_TASKS_HEADER_ACTIONS_ID = "processes-tasks-header-actions";

type ProcessesTab = "board" | "templates";

function tabFromParam(value: string | null): ProcessesTab {
  return value === "templates" ? "templates" : "board";
}

export default function ProcessesTasksApp() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ProcessesTab>(() =>
    tabFromParam(searchParams.get("tab")),
  );
  const { t } = useLanguage();
  useEffect(() => {
    const wantsCreate =
      searchParams.get("create") === "1" || searchParams.get("new") === "1";
    const nextTab = tabFromParam(searchParams.get("tab"));
    if (wantsCreate && nextTab !== "templates") {
      const next = new URLSearchParams(searchParams);
      next.set("tab", "templates");
      setSearchParams(next, { replace: true });
      setActiveTab("templates");
      return;
    }
    setActiveTab(nextTab);
  }, [searchParams, setSearchParams]);

  const selectTab = (value: string) => {
    const next = tabFromParam(value);
    setActiveTab(next);
    const params = new URLSearchParams(searchParams);
    if (next === "templates") params.set("tab", "templates");
    else params.delete("tab");
    setSearchParams(params, { replace: true });
  };

  return (
    <MizanPageShell title={t("processes_tasks.title")} showHeader={false}>
      <Tabs value={activeTab} onValueChange={selectTab} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/40 p-1.5">
          <TabsTrigger
            value="board"
            className={cn(HUB_TABS_TRIGGER, "w-full justify-center gap-2 py-3 text-sm font-semibold sm:text-[15px]")}
          >
            <ListChecks className="h-4 w-4 shrink-0" />
            {t("processes_tasks.tabs.live_board")}
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className={cn(HUB_TABS_TRIGGER, "w-full justify-center gap-2 py-3 text-sm font-semibold sm:text-[15px]")}
          >
            <Layers className="h-4 w-4 shrink-0" />
            {t("processes_tasks.tabs.templates")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-6 focus-visible:outline-none">
          <TaskManagementBoard onOpenTemplates={() => selectTab("templates")} />
        </TabsContent>

        <TabsContent
          value="templates"
          forceMount
          className={cn("mt-6 space-y-4 focus-visible:outline-none", activeTab !== "templates" && "hidden")}
        >
          <div
            id={PROCESSES_TASKS_HEADER_ACTIONS_ID}
            className="flex flex-wrap items-center justify-start gap-2 sm:justify-end"
          />
          <TaskTemplates />
        </TabsContent>
      </Tabs>
    </MizanPageShell>
  );
}
