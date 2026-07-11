import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import EnhancedScheduleView from "@/components/schedule/EnhancedScheduleView";
import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";
import { useLanguage } from "@/hooks/use-language";

const StaffSchedulingPage: React.FC = () => {
  const { t } = useLanguage();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["restaurant-stats"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/analytics/restaurant-stats/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) {
        return { total_staff: 0, scheduled_shifts: 0 };
      }
      return await response.json();
    },
  });

  return (
    <div className={`${PAGE_SHELL_PADDED} space-y-6`}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t("schedule.page_title")}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("schedule.card_total_staff")}
            </CardTitle>
            <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold tabular-nums">
              {statsLoading ? "…" : stats?.total_staff || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("schedule.active_team_members")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("schedule.card_scheduled_shifts")}
            </CardTitle>
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold tabular-nums">
              {statsLoading ? "…" : stats?.scheduled_shifts || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("common.this_week")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <EnhancedScheduleView />
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffSchedulingPage;
