import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import EnhancedScheduleView from "@/components/schedule/EnhancedScheduleView";
import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";
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
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("schedule.page_title")}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-xs font-medium leading-tight">
              {t("schedule.card_total_staff")}
            </CardTitle>
            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg font-bold leading-none tabular-nums">
              {statsLoading ? "…" : stats?.total_staff || 0}
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug mt-1">
              {t("schedule.active_team_members")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-xs font-medium leading-tight">
              {t("schedule.card_scheduled_shifts")}
            </CardTitle>
            <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg font-bold leading-none tabular-nums">
              {statsLoading ? "…" : stats?.scheduled_shifts || 0}
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug mt-1">
              {t("common.this_week")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <EnhancedScheduleView />
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffSchedulingPage;
