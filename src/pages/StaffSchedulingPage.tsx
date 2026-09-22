import React from "react";
import { Calendar, Clock } from "lucide-react";
import EnhancedScheduleView from "@/components/schedule/EnhancedScheduleView";
import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import { MizanPageShell } from "@/components/os/MizanPageShell";
import { MIZAN_GRID_GAP, MIZAN_SURFACE_CARD } from "@/lib/mizan-ui";
import { cn } from "@/lib/utils";
import { unwrapEnvelope } from "@/lib/envelope";

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
      const json = await response.json();
      const payload = unwrapEnvelope<{ total_staff?: number; scheduled_shifts?: number }>(json);
      return {
        total_staff: payload?.total_staff ?? 0,
        scheduled_shifts: payload?.scheduled_shifts ?? 0,
      };
    },
  });

  return (
    <MizanPageShell
      eyebrow={t("nav.employees")}
      title={t("schedule.page_title", { defaultValue: "Staff schedule" })}
      description={t("schedule.page_subtitle", {
        defaultValue: "Plan shifts, view coverage, and keep the floor staffed.",
      })}
      hero
    >
      <section className={cn("grid sm:grid-cols-2", MIZAN_GRID_GAP)}>
        <div className={MIZAN_SURFACE_CARD}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-caption text-muted-foreground">{t("schedule.card_total_staff")}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{statsLoading ? "…" : stats?.total_staff ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("schedule.active_team_members")}</p>
            </div>
            <Calendar className="h-5 w-5 shrink-0 text-primary" />
          </div>
        </div>
        <div className={MIZAN_SURFACE_CARD}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-caption text-muted-foreground">{t("schedule.card_scheduled_shifts")}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {statsLoading ? "…" : stats?.scheduled_shifts ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t("common.this_week")}</p>
            </div>
            <Clock className="h-5 w-5 shrink-0 text-primary" />
          </div>
        </div>
      </section>

      <div className={cn(MIZAN_SURFACE_CARD, "overflow-hidden p-0")}>
        <EnhancedScheduleView />
      </div>
    </MizanPageShell>
  );
};

export default StaffSchedulingPage;
