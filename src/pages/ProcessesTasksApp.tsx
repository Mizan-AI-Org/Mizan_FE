"use client";

import React, { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, ListChecks } from "lucide-react";
import TaskManagementBoard from "./TaskManagementBoard";
import TaskTemplates from "./TaskTemplates";
import { useLanguage } from "@/hooks/use-language";
import { MizanPageShell } from "@/components/os/MizanPageShell";
import { cn } from "@/lib/utils";

/** Portal target for process actions (New / Import / Pre-Built) - shown on Live Board and Templates. */
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
  const { pathname } = useLocation();
  const underTeam = pathname.includes("/employees/");
  const eyebrow = underTeam ? t("nav.employees") : t("nav.operations");

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
    <MizanPageShell
      eyebrow={eyebrow}
      title={t("processes_tasks.title")}
      description={t("processes_tasks.subtitle")}
      actions={
        <div
          id={PROCESSES_TASKS_HEADER_ACTIONS_ID}
          className="flex flex-wrap items-center justify-end gap-2 shrink-0"
        />
      }
      hero
    >
      <Tabs value={activeTab} onValueChange={selectTab} className="w-full">
        <TabsList className="max-w-md">
          <TabsTrigger value="board" className="inline-flex items-center gap-2">
            <ListChecks className="h-4 w-4 shrink-0" />
            {t("processes_tasks.tabs.live_board")}
          </TabsTrigger>
          <TabsTrigger value="templates" className="inline-flex items-center gap-2">
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
          className={cn("mt-6 focus-visible:outline-none", activeTab !== "templates" && "hidden")}
        >
          <TaskTemplates />
        </TabsContent>
      </Tabs>
    </MizanPageShell>
  );
}
