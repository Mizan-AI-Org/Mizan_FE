"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Layers,
    ListChecks
} from "lucide-react";
import TaskManagementBoard from "./TaskManagementBoard";
import TaskTemplates from "./TaskTemplates";
import { useLanguage } from "@/hooks/use-language";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";
import { cn } from "@/lib/utils";

/** Portal target for process actions (New / Import / Pre-Built) — shown on Live Board and Templates. */
export const PROCESSES_TASKS_HEADER_ACTIONS_ID = "processes-tasks-header-actions";

export default function ProcessesTasksApp() {
    const [searchParams] = useSearchParams();
    const tabParam = searchParams.get("tab");
    const [activeTab, setActiveTab] = useState(
        tabParam === "templates" ? "templates" : "board",
    );
    const { t } = useLanguage();

    useEffect(() => {
        if (tabParam === "templates" || tabParam === "board") {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    return (
        <div className={`${PAGE_SHELL_PADDED} space-y-5`}>
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {t("processes_tasks.title")}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl">
                        {t("processes_tasks.subtitle")}
                    </p>
                </div>
                <div
                    id={PROCESSES_TASKS_HEADER_ACTIONS_ID}
                    className="flex flex-wrap items-center justify-start lg:justify-end gap-2 shrink-0"
                />
            </header>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <TabsList className="h-auto w-full sm:w-auto inline-flex justify-start gap-1 bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
                        <TabsTrigger
                            value="board"
                            className="flex-1 sm:flex-none data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-semibold transition-all"
                        >
                            <ListChecks className="w-4 h-4 mr-2 shrink-0" />
                            {t("processes_tasks.tabs.live_board")}
                        </TabsTrigger>
                        <TabsTrigger
                            value="templates"
                            className="flex-1 sm:flex-none data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-semibold transition-all"
                        >
                            <Layers className="w-4 h-4 mr-2 shrink-0" />
                            {t("processes_tasks.tabs.templates")}
                        </TabsTrigger>
                    </TabsList>
                    {activeTab === "board" && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-right max-w-sm">
                            {t("live_board.tab_hint")}
                        </p>
                    )}
                </div>

                <TabsContent value="board" className="mt-0 focus-visible:outline-none">
                    <TaskManagementBoard onOpenTemplates={() => setActiveTab("templates")} />
                </TabsContent>

                {/* forceMount keeps New/Import/Pre-Built actions available on Live Board */}
                <TabsContent
                    value="templates"
                    forceMount
                    className={cn("mt-0 focus-visible:outline-none", activeTab !== "templates" && "hidden")}
                >
                    <TaskTemplates />
                </TabsContent>
            </Tabs>
        </div>
    );
}
