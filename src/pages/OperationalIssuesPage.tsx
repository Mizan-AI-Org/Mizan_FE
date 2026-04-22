/**
 * Operational Issues page — the full brain view.
 *
 * Fetches the dashboard summary (already cached to 55s on the backend)
 * and renders the complete list of operational insights ranked from
 * urgent to low, grouped by severity level. Each row links to the
 * action target that resolves the issue.
 *
 * Why this page shares `/api/dashboard/summary/`:
 * The summary endpoint already runs the full insight generation
 * pipeline once per minute per tenant and caches the result. Wiring
 * a second endpoint would either double the compute cost or risk
 * the two views showing different snapshots to the same manager.
 * Summary emits `insights.items_all` (full ranked list) + `total`
 * just for this page.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Filter,
  RefreshCw,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

type InsightItem = {
  id?: string;
  level?: string;
  category?: string;
  urgency?: number;
  summary?: string;
  recommended_action?: string;
  action_url?: string;
  impacted?: {
    staff?: { id: string; name: string }[];
    shift_id?: string;
    count?: number;
  };
};

/** Same routing conventions the dashboard widget uses. Keeps links
 * consistent: a "no-show" insight opens the attendance page from
 * both the card and this page. */
function getActionRoute(actionUrl?: string): string {
  if (!actionUrl) return "/dashboard/attendance";
  if (actionUrl === "/dashboard/staff-scheduling") return "/dashboard/scheduling";
  return actionUrl;
}

const LEVEL_ORDER = [
  "CRITICAL",
  "OPERATIONAL",
  "PERFORMANCE",
  "PREVENTIVE",
] as const;

type Level = (typeof LEVEL_ORDER)[number] | "OTHER";

function normalizeLevel(raw: string | undefined): Level {
  const up = String(raw || "").toUpperCase();
  if ((LEVEL_ORDER as readonly string[]).includes(up)) return up as Level;
  return "OTHER";
}

function levelStyle(level: Level): {
  pill: string;
  dot: string;
  strip: string;
  icon: JSX.Element;
  titleKey: string;
  subtitleKey: string;
} {
  switch (level) {
    case "CRITICAL":
      return {
        pill: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300",
        dot: "bg-red-500",
        strip: "bg-red-500",
        icon: <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />,
        titleKey: "operational_issues.group.critical_title",
        subtitleKey: "operational_issues.group.critical_subtitle",
      };
    case "OPERATIONAL":
      return {
        pill: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200",
        dot: "bg-amber-500",
        strip: "bg-amber-500",
        icon: <Activity className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
        titleKey: "operational_issues.group.operational_title",
        subtitleKey: "operational_issues.group.operational_subtitle",
      };
    case "PERFORMANCE":
      return {
        pill: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200",
        dot: "bg-blue-500",
        strip: "bg-blue-500",
        icon: <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
        titleKey: "operational_issues.group.performance_title",
        subtitleKey: "operational_issues.group.performance_subtitle",
      };
    case "PREVENTIVE":
      return {
        pill: "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200",
        dot: "bg-violet-500",
        strip: "bg-violet-500",
        icon: <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />,
        titleKey: "operational_issues.group.preventive_title",
        subtitleKey: "operational_issues.group.preventive_subtitle",
      };
    default:
      return {
        pill: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
        dot: "bg-slate-400 dark:bg-slate-500",
        strip: "bg-slate-400",
        icon: <Sparkles className="h-4 w-4 text-slate-500" />,
        titleKey: "operational_issues.group.other_title",
        subtitleKey: "operational_issues.group.other_subtitle",
      };
  }
}

type FilterValue = "ALL" | Level;

export default function OperationalIssuesPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const [query, setQuery] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.getDashboardSummary(),
    // Page is a "full list" surface — 60 s refresh keeps it lively
    // without hammering the same cache key the dashboard widgets
    // already hit.
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const insights: InsightItem[] = useMemo(() => {
    const summary = data as unknown as {
      insights?: { items_all?: InsightItem[]; items?: InsightItem[] };
    } | undefined;
    // Fall back to `items` for older backends that haven't shipped
    // `items_all` yet — keeps the page working during rolling deploys.
    return summary?.insights?.items_all ?? summary?.insights?.items ?? [];
  }, [data]);

  const counts = useMemo(() => {
    const map: Record<Level, number> = {
      CRITICAL: 0,
      OPERATIONAL: 0,
      PERFORMANCE: 0,
      PREVENTIVE: 0,
      OTHER: 0,
    };
    for (const it of insights) {
      map[normalizeLevel(it.level)]++;
    }
    return map;
  }, [insights]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return insights.filter((it) => {
      if (filter !== "ALL" && normalizeLevel(it.level) !== filter) return false;
      if (!q) return true;
      const hay = `${it.summary ?? ""} ${it.recommended_action ?? ""} ${it.category ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [insights, filter, query]);

  const grouped = useMemo(() => {
    const map = new Map<Level, InsightItem[]>();
    for (const it of filtered) {
      const lvl = normalizeLevel(it.level);
      if (!map.has(lvl)) map.set(lvl, []);
      map.get(lvl)!.push(it);
    }
    // Preserve urgency order inside each group (backend already sorted).
    const ordered: Array<[Level, InsightItem[]]> = [];
    for (const lvl of LEVEL_ORDER) {
      if (map.has(lvl)) ordered.push([lvl, map.get(lvl)!]);
    }
    if (map.has("OTHER")) ordered.push(["OTHER", map.get("OTHER")!]);
    return ordered;
  }, [filtered]);

  const totalIssues = insights.length;
  const criticalCount = counts.CRITICAL;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Widened max-w-7xl so the ranked list + stat strip breathe on
          desktop; the layout shell already provides the top-level
          "Back to Dashboard" pill, so no in-page back affordance. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                criticalCount > 0
                  ? "bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              )}
            >
              {criticalCount > 0 ? (
                <AlertTriangle className="h-5 w-5" aria-hidden />
              ) : (
                <Sparkles className="h-5 w-5" aria-hidden />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                {t("operational_issues.title")}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("operational_issues.subtitle")}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="shrink-0"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5 mr-1.5", isFetching && "animate-spin")}
              aria-hidden
            />
            {t("operational_issues.refresh")}
          </Button>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <StatCard
            label={t("operational_issues.stat.total")}
            value={totalIssues}
            tone="slate"
            icon={<Activity className="h-4 w-4" aria-hidden />}
          />
          <StatCard
            label={t("operational_issues.stat.critical")}
            value={counts.CRITICAL}
            tone="red"
            icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
          />
          <StatCard
            label={t("operational_issues.stat.operational")}
            value={counts.OPERATIONAL}
            tone="amber"
            icon={<Activity className="h-4 w-4" aria-hidden />}
          />
          <StatCard
            label={t("operational_issues.stat.performance")}
            value={counts.PERFORMANCE}
            tone="blue"
            icon={<Sparkles className="h-4 w-4" aria-hidden />}
          />
          <StatCard
            label={t("operational_issues.stat.preventive")}
            value={counts.PREVENTIVE}
            tone="violet"
            icon={<Sparkles className="h-4 w-4" aria-hidden />}
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center sm:justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterValue)}>
            <TabsList className="h-9">
              <TabsTrigger value="ALL" className="text-xs">
                {t("operational_issues.filter.all")}
                {totalIssues > 0 && (
                  <span className="ml-1.5 text-[10px] font-bold text-slate-400 tabular-nums">
                    {totalIssues}
                  </span>
                )}
              </TabsTrigger>
              {LEVEL_ORDER.map((lvl) => (
                <TabsTrigger key={lvl} value={lvl} className="text-xs">
                  {t(`operational_issues.level.${lvl.toLowerCase()}`)}
                  {counts[lvl] > 0 && (
                    <span className="ml-1.5 text-[10px] font-bold text-slate-400 tabular-nums">
                      {counts[lvl]}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="relative sm:w-64">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("operational_issues.search_placeholder")}
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>

        {/* Body */}
        {isLoading ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
              {t("operational_issues.loading")}
            </CardContent>
          </Card>
        ) : isError ? (
          <Card>
            <CardContent className="py-10 flex flex-col items-center gap-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t("operational_issues.error")}
              </p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                {t("operational_issues.retry")}
              </Button>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <CardContent className="py-14 flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {query || filter !== "ALL"
                    ? t("operational_issues.empty_filtered_title")
                    : t("operational_issues.empty_title")}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md">
                  {query || filter !== "ALL"
                    ? t("operational_issues.empty_filtered_body")
                    : t("operational_issues.empty_body")}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.map(([level, items]) => {
              const style = levelStyle(level);
              return (
                <section key={level} className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-6 w-6 rounded-lg flex items-center justify-center",
                        style.pill,
                      )}
                    >
                      {style.icon}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                        {t(style.titleKey)}{" "}
                        <span className="text-slate-400 font-semibold">
                          · {items.length}
                        </span>
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t(style.subtitleKey)}
                      </p>
                    </div>
                  </div>

                  <Card className="overflow-hidden">
                    <ol className="divide-y divide-slate-100 dark:divide-slate-800">
                      {items.map((it, idx) => (
                        <li key={it.id || `${level}-${idx}`}>
                          <button
                            type="button"
                            onClick={() => navigate(getActionRoute(it.action_url))}
                            className="group relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500/30"
                          >
                            <div
                              className={cn(
                                "absolute left-0 top-0 bottom-0 w-1",
                                style.strip,
                                idx === 0 && level === "CRITICAL" ? "" : "opacity-50",
                              )}
                              aria-hidden
                            />
                            <div
                              className={cn(
                                "shrink-0 mt-0.5 h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-black tabular-nums border",
                                level === "CRITICAL"
                                  ? "border-red-300 bg-red-100 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                                  : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
                              )}
                              aria-label={`${t("operational_issues.rank")} ${idx + 1}`}
                            >
                              {idx + 1}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                                    {it.summary ||
                                      t("operational_issues.item_fallback")}
                                  </p>
                                  {it.recommended_action && (
                                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        {level === "CRITICAL"
                                          ? t("operational_issues.action_prefix")
                                          : t(
                                              "operational_issues.recommendation_prefix",
                                            )}
                                        :
                                      </span>{" "}
                                      {it.recommended_action}
                                    </p>
                                  )}
                                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <Badge
                                      variant="outline"
                                      className={cn("text-[10px] font-bold", style.pill)}
                                    >
                                      {level}
                                    </Badge>
                                    {it.category && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] font-semibold border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
                                      >
                                        {it.category}
                                      </Badge>
                                    )}
                                    {it.impacted?.staff && it.impacted.staff.length > 0 && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] font-semibold border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 truncate max-w-[180px]"
                                        title={it.impacted.staff
                                          .map((s) => s.name)
                                          .join(", ")}
                                      >
                                        {it.impacted.staff[0].name}
                                        {it.impacted.staff.length > 1
                                          ? ` +${it.impacted.staff.length - 1}`
                                          : ""}
                                      </Badge>
                                    )}
                                    {typeof it.urgency === "number" && (
                                      <span className="text-[10px] font-mono text-slate-400">
                                        u:{it.urgency}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="shrink-0 pt-0.5">
                                  <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400" />
                                </div>
                              </div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </Card>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

type StatTone = "slate" | "red" | "amber" | "blue" | "violet";

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: StatTone;
  icon: JSX.Element;
}) {
  const toneClasses: Record<
    StatTone,
    { border: string; text: string; value: string }
  > = {
    slate: {
      border: "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
      text: "text-slate-500 dark:text-slate-400",
      value: "text-slate-900 dark:text-white",
    },
    red: {
      border: "border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20",
      text: "text-red-600 dark:text-red-400",
      value: "text-red-700 dark:text-red-300",
    },
    amber: {
      border: "border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20",
      text: "text-amber-600 dark:text-amber-400",
      value: "text-amber-700 dark:text-amber-300",
    },
    blue: {
      border: "border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20",
      text: "text-blue-600 dark:text-blue-400",
      value: "text-blue-700 dark:text-blue-300",
    },
    violet: {
      border:
        "border-violet-200 dark:border-violet-900/40 bg-violet-50/40 dark:bg-violet-950/20",
      text: "text-violet-600 dark:text-violet-400",
      value: "text-violet-700 dark:text-violet-300",
    },
  };
  const classes = toneClasses[tone];
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 flex items-center gap-3",
        classes.border,
      )}
    >
      <div className={cn("shrink-0", classes.text)}>{icon}</div>
      <div className="min-w-0">
        <div className={cn("text-2xl font-black tabular-nums leading-none", classes.value)}>
          {value}
        </div>
        <div className={cn("mt-1 text-[10px] font-semibold uppercase tracking-wide truncate", classes.text)}>
          {label}
        </div>
      </div>
    </div>
  );
}
