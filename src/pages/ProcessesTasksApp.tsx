"use client";

import React, { useState } from "react";
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
    const [activeTab, setActiveTab] = useState("board");
    const { t } = useLanguage();

    return (
        <div className={`${PAGE_SHELL_PADDED} space-y-6`}>
            {/* Header — title left, process actions right on both tabs */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {t("processes_tasks.title")}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {t("processes_tasks.subtitle")}
                    </p>
                </div>
                <div
                    id={PROCESSES_TASKS_HEADER_ACTIONS_ID}
                    className="flex flex-wrap items-center justify-start sm:justify-end gap-2 shrink-0"
                />
            </header>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                <TabsList className="w-full grid grid-cols-2 h-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
                    <TabsTrigger
                        value="board"
                        className="flex-1 data-[state=active]:bg-teal-500 data-[state=active]:text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-all"
                    >
                        <ListChecks className="w-4 h-4 mr-2" />
                        {t("processes_tasks.tabs.live_board")}
                    </TabsTrigger>
                    <TabsTrigger
                        value="templates"
                        className="flex-1 data-[state=active]:bg-teal-500 data-[state=active]:text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-all"
                    >
                        <Layers className="w-4 h-4 mr-2" />
                        {t("processes_tasks.tabs.templates")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="board" className="mt-0">
                    <TaskManagementBoard />
                </TabsContent>

                {/* forceMount keeps New/Import/Pre-Built actions available on Live Board */}
                <TabsContent
                    value="templates"
                    forceMount
                    className={cn("mt-0", activeTab !== "templates" && "hidden")}
                >
                    <TaskTemplates />
                </TabsContent>
            </Tabs>
        </div>
    );
}
