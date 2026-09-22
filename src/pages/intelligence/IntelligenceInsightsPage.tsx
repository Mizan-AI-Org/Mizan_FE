import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart2, Clock, Loader2, Package, Sparkles, Users } from "lucide-react";
import { api } from "@/lib/api";
import { IntelligenceShell } from "@/pages/intelligence/IntelligenceShell";
import { useLanguage } from "@/hooks/use-language";
import { localizedCopy } from "@/lib/domain-copy";
import { cn } from "@/lib/utils";

const REPORT_HUB = [
  {
    to: "/dashboard/reports/sales/daily",
    titleKey: "reporting.sections.daily.title",
    descKey: "reporting.sections.daily.description",
    icon: BarChart2,
    accent: "from-emerald-500/15 to-emerald-500/5",
  },
  {
    to: "/dashboard/reports/attendance",
    titleKey: "reporting.sections.attendance.title",
    descKey: "reporting.sections.attendance.description",
    icon: Users,
    accent: "from-sky-500/15 to-sky-500/5",
  },
  {
    to: "/dashboard/reports/inventory",
    titleKey: "reporting.sections.inventory.title",
    descKey: "reporting.sections.inventory.description",
    icon: Package,
    accent: "from-amber-500/15 to-amber-500/5",
  },
  {
    to: "/dashboard/reports/labor-attendance",
    titleKey: "reporting.sections.laborAttendance.title",
    descKey: "reporting.sections.laborAttendance.description",
    icon: Clock,
    accent: "from-violet-500/15 to-violet-500/5",
  },
] as const;

export default function IntelligenceInsightsPage() {
  const { t } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ["domain-world", "intelligence"],
    queryFn: () => api.getDomainWorld("intelligence"),
    staleTime: 30_000,
  });

  return (
    <IntelligenceShell
      title={t("nav.intelligence.insights")}
      description={t("intelligence.insights.description")}
      askPrompt={t("intelligence.insights.ask")}
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          {(data?.kpis?.length ?? 0) > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {(data?.kpis || []).map((kpi) => (
                <div
                  key={kpi.label_key || kpi.label}
                  className="rounded-xl border bg-card px-4 py-4 shadow-xs"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {localizedCopy(t, kpi.label_key, kpi.label)}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums">{kpi.value}</p>
                </div>
              ))}
            </div>
          ) : null}

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("intelligence.explore")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {REPORT_HUB.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border bg-gradient-to-br p-5 transition-shadow hover:shadow-md",
                    item.accent,
                  )}
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background/80 shadow-sm">
                      <item.icon className="h-5 w-5 text-foreground" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 font-semibold">
                        {t(item.titleKey)}
                        <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{t(item.descKey)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-ai/30 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">{t("intelligence.live_signals")}</h2>
            </div>
            {(data?.observations?.length ?? 0) > 0 ? (
              <ul className="space-y-3">
                {(data?.observations || []).map((row) => {
                  const text = localizedCopy(t, row.message_key, row.text, row.message_params);
                  return (
                  <li
                    key={row.message_key || row.text}
                    className="rounded-lg border border-border/60 bg-background/60 px-4 py-3 text-sm leading-relaxed"
                  >
                    {row.href ? (
                      <Link to={row.href} className="font-medium hover:text-primary hover:underline">
                        {text}
                      </Link>
                    ) : (
                      text
                    )}
                  </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("intelligence.signals_empty_before")}{" "}
                <Link to="/dashboard/intelligence/recommendations" className="font-medium text-primary underline-offset-2 hover:underline">
                  {t("nav.intelligence.recommendations")}
                </Link>{" "}
                {t("intelligence.signals_empty_after")}
              </p>
            )}
          </section>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboard/intelligence/forecasts"
              className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted/50"
            >
              {t("intelligence.view_forecasts")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/dashboard/intelligence/reports"
              className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted/50"
            >
              {t("intelligence.generate_reports")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </IntelligenceShell>
  );
}
