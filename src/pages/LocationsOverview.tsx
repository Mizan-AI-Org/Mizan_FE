import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  DollarSign,
  MapPinOff,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import {
  formatPortfolioMoney,
  translateTopConcern,
} from "@/lib/locations-i18n";
import {
  useLocationsPortfolio,
  type LocationPortfolioRow,
  type LocationStatus,
  type LocationMetrics,
} from "@/hooks/use-locations-portfolio";

/**
 * Multi-location command center for owners, admins, and super-admins.
 */
export default function LocationsOverview() {
  const { t, language } = useLanguage();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useLocationsPortfolio();
  const navigate = useNavigate();

  const sortedLocations = useMemo(() => {
    if (!data?.locations) return [];
    const severity: Record<LocationStatus, number> = {
      red: 0,
      amber: 1,
      green: 2,
    };
    return [...data.locations].sort((a, b) => {
      if (severity[a.status] !== severity[b.status]) {
        return severity[a.status] - severity[b.status];
      }
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return a.name.localeCompare(b.name, language);
    });
  }, [data?.locations, language]);

  return (
    <div className={`${PAGE_SHELL_PADDED} space-y-6`}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("app.locations_overview")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("locations_overview.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {data?.generated_at && (
            <span className="text-xs text-muted-foreground">
              {t("locations_overview.updated", {
                time: new Date(data.generated_at).toLocaleTimeString(language),
              })}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={cn("mr-2 h-3.5 w-3.5", isFetching && "animate-spin")}
            />
            {t("common.refresh")}
          </Button>
        </div>
      </header>

      {isError && !isLoading && (
        <Card>
          <CardContent className="flex items-start gap-3 p-4 text-sm text-red-600">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <div className="font-medium">{t("locations_overview.error.load")}</div>
              {error instanceof Error && error.message && (
                <div className="text-xs text-red-600/80 break-words">
                  {error.message}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {data?.degraded && !isLoading && (
        <Card>
          <CardContent className="flex items-start gap-3 p-4 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <div className="font-medium">{t("locations_overview.degraded")}</div>
              {data.error && (
                <div className="text-xs text-amber-700/80 dark:text-amber-400/80 break-words">
                  {data.error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <PortfolioSkeleton />
      ) : data ? (
        <>
          <KpiStrip totals={data.totals} language={language} t={t} />
          {sortedLocations.length === 0 ? (
            <EmptyState t={t} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {sortedLocations.map((loc) => (
                <BranchCard
                  key={loc.id}
                  loc={loc}
                  language={language}
                  t={t}
                  onOpen={() =>
                    navigate(
                      `/dashboard/locations-overview/${encodeURIComponent(loc.id)}`,
                    )
                  }
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

type TFn = (key: string, options?: Record<string, string | number>) => string;

function KpiStrip({
  totals,
  language,
  t,
}: {
  totals: LocationMetrics;
  language: string;
  t: TFn;
}) {
  const coverageLabel =
    totals.coverage_pct === null
      ? t("locations_overview.kpi.in", { count: totals.clocked_in_now })
      : `${totals.clocked_in_now}/${totals.scheduled_today} · ${totals.coverage_pct}%`;

  const noShowCount = totals.no_shows_today + totals.potential_no_shows;
  const noShowLabel =
    totals.potential_no_shows > 0
      ? t("locations_overview.kpi.no_shows_pending", {
          count: totals.no_shows_today,
          pending: totals.potential_no_shows,
        })
      : String(totals.no_shows_today);

  const cashSubtitle =
    totals.flagged_cash_sessions > 0
      ? t("locations_overview.kpi.cash_flagged", {
          count: totals.flagged_cash_sessions,
          amount: formatPortfolioMoney(totals.cash_variance_today, language),
        })
      : totals.cash_variance_today !== 0
        ? formatPortfolioMoney(totals.cash_variance_today, language)
        : t("locations_overview.kpi.no_variance");

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <KpiTile
        icon={<Users className="h-4 w-4" />}
        label={t("locations_overview.kpi.clocked_in")}
        value={coverageLabel}
        tone={
          totals.coverage_pct !== null && totals.coverage_pct < 50
            ? "red"
            : totals.coverage_pct !== null && totals.coverage_pct < 80
              ? "amber"
              : "neutral"
        }
      />
      <KpiTile
        icon={<DollarSign className="h-4 w-4" />}
        label={t("locations_overview.kpi.labor")}
        value={formatPortfolioMoney(totals.labor_cost_today, language)}
        subtitle={t("locations_overview.kpi.labor_hint")}
      />
      <KpiTile
        icon={<Clock className="h-4 w-4" />}
        label={t("locations_overview.kpi.no_shows")}
        value={String(noShowCount)}
        subtitle={noShowLabel}
        tone={totals.no_shows_today > 0 ? "red" : noShowCount > 0 ? "amber" : "neutral"}
      />
      <KpiTile
        icon={<MapPinOff className="h-4 w-4" />}
        label={t("locations_overview.kpi.mismatches")}
        value={String(totals.location_mismatches_today)}
        subtitle={t("locations_overview.kpi.mismatches_hint")}
        tone={totals.location_mismatches_today > 0 ? "red" : "neutral"}
      />
      <KpiTile
        icon={<Wallet className="h-4 w-4" />}
        label={t("locations_overview.kpi.cash")}
        value={String(totals.open_cash_sessions + totals.flagged_cash_sessions)}
        subtitle={cashSubtitle}
        tone={totals.flagged_cash_sessions > 0 ? "red" : "neutral"}
      />
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
  subtitle,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  tone?: "neutral" | "amber" | "red";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span
            className={cn(
              tone === "red" && "text-red-600",
              tone === "amber" && "text-amber-600",
            )}
          >
            {icon}
          </span>
        </div>
        <div
          className={cn(
            "mt-1 text-2xl font-semibold tracking-tight",
            tone === "red" && "text-red-600",
            tone === "amber" && "text-amber-600",
          )}
        >
          {value}
        </div>
        {subtitle && (
          <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );
}

function BranchCard({
  loc,
  onOpen,
  language,
  t,
}: {
  loc: LocationPortfolioRow;
  onOpen: () => void;
  language: string;
  t: TFn;
}) {
  const m = loc.metrics;
  const coverage = m.coverage_pct;
  return (
    <Card
      className="cursor-pointer transition hover:border-foreground/20 hover:shadow-sm"
      onClick={onOpen}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <StatusDot status={loc.status} t={t} />
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                {loc.name}
                {loc.is_primary && (
                  <Badge variant="outline" className="text-[10px]">
                    {t("settings.locations.primary_badge")}
                  </Badge>
                )}
              </div>
              <div
                className={cn(
                  "mt-0.5 text-xs",
                  loc.status === "red" && "text-red-600",
                  loc.status === "amber" && "text-amber-600",
                  loc.status === "green" && "text-muted-foreground",
                )}
              >
                {translateTopConcern(t, loc)}
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("locations_overview.coverage")}</span>
            <span>
              {m.clocked_in_now}/{m.scheduled_today || 0}
              {coverage !== null && ` · ${coverage}%`}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                coverage === null || coverage >= 80
                  ? "bg-emerald-500"
                  : coverage >= 50
                    ? "bg-amber-500"
                    : "bg-red-500",
              )}
              style={{
                width:
                  coverage === null ? "0%" : `${Math.min(100, coverage)}%`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
          <MiniStat
            icon={<DollarSign className="h-3 w-3" />}
            label={t("locations_overview.stat.labor")}
            value={formatPortfolioMoney(m.labor_cost_today, language)}
          />
          <MiniStat
            icon={<Clock className="h-3 w-3" />}
            label={t("locations_overview.stat.no_shows")}
            value={String(m.no_shows_today + m.potential_no_shows)}
            tone={
              m.no_shows_today > 0
                ? "red"
                : m.potential_no_shows > 0
                  ? "amber"
                  : "neutral"
            }
          />
          <MiniStat
            icon={<Wallet className="h-3 w-3" />}
            label={t("locations_overview.stat.cash")}
            value={
              m.flagged_cash_sessions > 0
                ? `${m.flagged_cash_sessions} ⚠`
                : String(m.open_cash_sessions)
            }
            tone={m.flagged_cash_sessions > 0 ? "red" : "neutral"}
          />
          <MiniStat
            icon={<MapPinOff className="h-3 w-3" />}
            label={t("locations_overview.stat.mismatches")}
            value={String(m.location_mismatches_today)}
            tone={m.location_mismatches_today > 0 ? "red" : "neutral"}
          />
          <MiniStat
            icon={<Users className="h-3 w-3" />}
            label={t("locations_overview.stat.gaps")}
            value={String(m.shift_gaps_today)}
            tone={m.shift_gaps_today > 0 ? "amber" : "neutral"}
          />
          <MiniStat
            icon={<ClipboardCheck className="h-3 w-3" />}
            label={t("locations_overview.stat.checklists")}
            value={
              m.checklist_completion_pct === null
                ? "—"
                : `${m.checklist_completion_pct}%`
            }
            tone={
              m.checklist_completion_pct !== null &&
              m.checklist_completion_pct < 60
                ? "amber"
                : "neutral"
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "neutral" | "amber" | "red";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          "font-medium",
          tone === "red" && "text-red-600",
          tone === "amber" && "text-amber-600",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function StatusDot({ status, t }: { status: LocationStatus; t: TFn }) {
  const color =
    status === "red"
      ? "bg-red-500"
      : status === "amber"
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <span
      className={cn(
        "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
        color,
        status === "red" && "animate-pulse",
      )}
      aria-label={t("locations_overview.status_aria", { status })}
    />
  );
}

function EmptyState({ t }: { t: TFn }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
        <Building2 className="h-8 w-8 text-muted-foreground" />
        <div className="text-sm font-medium">{t("locations_overview.empty_title")}</div>
        <div className="text-xs text-muted-foreground">
          {t("locations_overview.empty_hint")}
        </div>
      </CardContent>
    </Card>
  );
}

function PortfolioSkeleton() {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-7 w-20" />
              <Skeleton className="mt-2 h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-1.5 w-full" />
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((__, j) => (
                  <Skeleton key={j} className="h-8" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
