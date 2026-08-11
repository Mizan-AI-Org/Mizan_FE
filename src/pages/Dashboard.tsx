import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CommandCenter } from "@/components/miya/CommandCenter";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { DashboardSkeleton } from "@/components/skeletons";
import { getActionRoute } from "@/pages/dashboard/DashboardWidgets";

type InsightItem = {
  id?: string;
  level?: string;
  action_url?: string;
  summary?: string;
  recommended_action?: string;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.getDashboardSummary(),
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const insights = (summary?.insights?.items || []) as InsightItem[];
  const criticalCount = Number(summary?.insights?.counts?.CRITICAL || 0);
  const prevCriticalRef = useRef<number>(0);

  useEffect(() => {
    if (isLoading) return;

    if (criticalCount > 0 && criticalCount > (prevCriticalRef.current || 0)) {
      const topCritical = insights.find((x) => String(x?.level || "").toUpperCase() === "CRITICAL");
      const description = topCritical?.recommended_action
        ? String(topCritical.recommended_action)
        : t("dashboard.open_insights");

      toast(t("dashboard.critical_issue"), {
        description,
        action: topCritical?.action_url
          ? {
            label: t("common.open"),
            onClick: () => navigate(getActionRoute(topCritical?.action_url)),
          }
          : undefined,
      });
    }

    prevCriticalRef.current = criticalCount;
  }, [criticalCount, isLoading, insights, navigate, t]);

  return (
    <div className="min-h-screen p-4 pb-24 text-foreground md:p-6 lg:p-8 lg:pb-10">
      <div className="mx-auto max-w-7xl space-y-section">

        {!isLoading ? <CommandCenter /> : null}

        {isLoading ? (
          <DashboardSkeleton statCount={3} contentCards={2} />
        ) : null}

      </div>

    </div>
  );
}
