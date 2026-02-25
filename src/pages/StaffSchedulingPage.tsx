import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, CheckSquare, BarChart } from "lucide-react";
import EnhancedScheduleView from "@/components/schedule/EnhancedScheduleView";
import TaskManagementBoard from "@/components/schedule/TaskManagementBoard";
import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";


const StaffSchedulingPage: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>("schedule");

  // Fetch restaurant stats (backend: GET /api/analytics/restaurant-stats/)
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["restaurant-stats"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/analytics/restaurant-stats/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) return {
        total_staff: 0,
        scheduled_shifts: 0,
        open_tasks: 0,
        completed_tasks: 0,
      };
      return await response.json();
    },
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("schedule.page_title")}</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("schedule.card_total_staff")}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.total_staff || 0}</div>
            <p className="text-xs text-muted-foreground">{t("schedule.active_team_members")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("schedule.card_scheduled_shifts")}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.scheduled_shifts || 0}</div>
            <p className="text-xs text-muted-foreground">{t("common.this_week")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("schedule.card_open_tasks")}</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.open_tasks || 0}</div>
            <p className="text-xs text-muted-foreground">{t("schedule.tasks_to_complete")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("schedule.card_completed_tasks")}</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.completed_tasks || 0}</div>
            <p className="text-xs text-muted-foreground">{t("schedule.last_7_days")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedule">
            <Calendar className="h-4 w-4 mr-2" /> {t("schedule.tab_staff_scheduling")}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <CheckSquare className="h-4 w-4 mr-2" /> {t("schedule.tab_task_management")}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <EnhancedScheduleView />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("schedule.task_management_title")}</CardTitle>
              <CardDescription>
                {t("schedule.task_management_description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <TaskManagementBoard />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffSchedulingPage;