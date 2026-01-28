"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Layers,
    ListChecks
} from "lucide-react";
import TaskManagementBoard from "./TaskManagementBoard";
import Processes from "./Processes";
import TaskTemplates from "./TaskTemplates";
import { useLanguage } from "@/hooks/use-language";

export default function ProcessesTasksApp() {
    const [activeTab, setActiveTab] = useState("board");
    const { t } = useLanguage();

    return (
        <div className="min-h-screen p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <header className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                        {t("processes_tasks.title")}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        {t("processes_tasks.subtitle")}
                    </p>
                </header>

                {/* Tabbed Interface */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full grid grid-cols-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl mb-6">
                        <TabsTrigger
                            value="board"
                            className="flex-1 data-[state=active]:bg-teal-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm font-semibold transition-all"
                        >
                            <ListChecks className="w-4 h-4 mr-2" />
                            {t("processes_tasks.tabs.live_board")}
                        </TabsTrigger>
                        <TabsTrigger
                            value="templates"
                            className="flex-1 data-[state=active]:bg-teal-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm font-semibold transition-all"
                        >
                            <Layers className="w-4 h-4 mr-2" />
                            {t("processes_tasks.tabs.templates")}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="board" className="mt-0">
                        <TaskManagementBoard />
                    </TabsContent>

                    <TabsContent value="templates" className="mt-0">
                        <TaskTemplates />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
