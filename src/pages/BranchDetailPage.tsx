import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  ClipboardCheck,
  Clock,
  DollarSign,
  ExternalLink,
  MapPin,
  MapPinOff,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";
import { cn } from "@/lib/utils";
import MoveStaffBranchDialog from "@/components/staff/MoveStaffBranchDialog";
import { useBusinessLocations } from "@/hooks/use-business-locations";
import { useLanguage } from "@/hooks/use-language";
import { useLocationDetail } from "@/hooks/use-location-detail";
import type {
  BranchStaffMember,
  BranchUpcoming,
  CashSessionToday,
  ClockEventToday,
  ShiftToday,
} from "@/hooks/use-location-detail";
import type {
  LocationMetrics,
  LocationStatus,
} from "@/hooks/use-locations-portfolio";
import {
  formatPortfolioMoney,
  translateTopConcern,
} from "@/lib/locations-i18n";

/**
 * Full branch hub - opened from Locations Overview.
 * Tabs: Today · Staff · Performance · More
 */
export default function BranchDetailPage() {
  const { t, language } = useLanguage();
  const { locationId } = useParams<{ locationId: string }>();
  const { data, isLoading, isError, refetch, isFetching } =
    useLocationDetail(locationId);
  const { data: tenantLocations = [] } = useBusinessLocations();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedById, setSelectedById] = useState<
    Record<string, BranchStaffMember>
  >({});
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTargets, setMoveTargets] = useState<BranchStaffMember[]>([]);

  const reportLinks = useMemo(() => {
    if (!locationId) return [];
    const q = `?location=${encodeURIComponent(locationId)}`;
    return [
      {
        label: t("locations_overview.branch.link_labor"),
        href: `/dashboard/reports/labor-attendance${q}`,
      },
      {
        label: t("locations_overview.branch.link_timesheets"),
        href: `/dashboard/timesheets${q}`,
      },
      {
        label: t("locations_overview.branch.link_staff"),
        href: `/dashboard/staff-app`,
      },
      {
        label: t("locations_overview.branch.link_schedule"),
        href: `/dashboard/scheduling${q}`,
      },
    ];
  }, [locationId, t]);

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectedById({});
  };

  const toggleStaff = (member: BranchStaffMember) => {
    setSelectedIds((prev) => {
      if (prev.includes(member.id)) {
        setSelectedById((map) => {
          const next = { ...map };
          delete next[member.id];
          return next;
        });
        return prev.filter((id) => id !== member.id);
      }
      setSelectedById((map) => ({ ...map, [member.id]: member }));
      return [...prev, member.id];
    });
  };

  const openMove = (members: BranchStaffMember[]) => {
    if (!members.length) return;
    setMoveTargets(
      members.map((m) => ({
        ...m,
        primary_location: locationId,
        primary_location_data: data
          ? { id: data.location.id, name: data.location.name }
          : undefined,
      })),
    );
    setMoveOpen(true);
  };

  return (
    <div className={`${PAGE_SHELL_PADDED} space-y-6`}>
      {isLoading ? (
        <BranchSkeleton />
      ) : isError || !data ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-4 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4" />
            {t("locations_overview.branch.error")}
          </CardContent>
        </Card>
      ) : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <StatusDot status={data.location.status} />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {data.location.name}
                  </h1>
                  {data.location.is_primary && (
                    <Badge variant="outline">
                      {t("settings.locations.primary_badge")}
                    </Badge>
                  )}
                  {!data.location.is_active && (
                    <Badge variant="destructive">
                      {t("locations_overview.branch.inactive")}
                    </Badge>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-1 text-sm",
                    data.location.status === "red" && "text-red-600",
                    data.location.status === "amber" && "text-amber-600",
                    data.location.status === "green" && "text-muted-foreground",
                  )}
                >
                  {translateTopConcern(t, data.location)}
                </p>
                {data.location.address ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {data.location.address}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {t("locations_overview.updated", {
                  time: new Date(data.generated_at).toLocaleTimeString(language),
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw
                  className={cn(
                    "mr-2 h-3.5 w-3.5",
                    isFetching && "animate-spin",
                  )}
                />
                {t("common.refresh")}
              </Button>
            </div>
          </header>

          <KpiStrip
            metrics={data.location.metrics}
            staffTotal={data.staff_summary?.total ?? 0}
            language={language}
            t={t}
          />

          <Tabs defaultValue="today" className="space-y-4">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
              <TabsTrigger value="today">
                {t("locations_overview.branch.tab_today")}
              </TabsTrigger>
              <TabsTrigger value="staff">
                {t("locations_overview.branch.tab_staff")}
                {data.staff_summary?.total ? (
                  <span className="ml-1.5 text-muted-foreground">
                    ({data.staff_summary.total})
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="performance">
                {t("locations_overview.branch.tab_performance")}
              </TabsTrigger>
              <TabsTrigger value="more">
                {t("locations_overview.branch.tab_more")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <ShiftsCard shifts={data.shifts_today} t={t} />
                <ClockEventsCard events={data.clock_events_today} t={t} />
              </div>
              <CashSessionsCard sessions={data.cash_sessions_today} />
              <UpcomingCoverageCard upcoming={data.upcoming} language={language} />
            </TabsContent>

            <TabsContent value="staff" className="space-y-4">
              {selectedIds.length > 0 ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                    {t("locations_overview.branch.selected", {
                      count: selectedIds.length,
                    })}
                  </span>
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() =>
                      openMove(
                        selectedIds
                          .map((id) => selectedById[id])
                          .filter(Boolean) as BranchStaffMember[],
                      )
                    }
                  >
                    <ArrowRightLeft className="mr-1.5 h-4 w-4" />
                    {t("locations_overview.branch.move")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelection}>
                    {t("locations_overview.branch.clear")}
                  </Button>
                </div>
              ) : null}

              <StaffRosterCard
                staff={data.staff || []}
                summary={data.staff_summary}
                selectedIds={selectedIds}
                onToggle={toggleStaff}
                onMoveOne={(m) => openMove([m])}
                onSelectAll={(list) => {
                  setSelectedIds(list.map((s) => s.id));
                  setSelectedById(
                    Object.fromEntries(list.map((s) => [s.id, s])),
                  );
                }}
                t={t}
              />
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <PerformanceSection performance={data.performance} />
            </TabsContent>

            <TabsContent value="more" className="space-y-4">
              <BranchProfileCard location={data.location} />
              <ReportLinksCard links={reportLinks} />
            </TabsContent>
          </Tabs>

          <MoveStaffBranchDialog
            open={moveOpen}
            onOpenChange={(open) => {
              setMoveOpen(open);
              if (!open) setMoveTargets([]);
            }}
            staff={moveTargets}
            locations={tenantLocations}
            onMoved={() => {
              clearSelection();
              refetch();
            }}
          />
        </>
      )}
    </div>
  );
}

/* ----------------------------- KPI strip ------------------------------ */

function KpiStrip({
  metrics,
  staffTotal,
  language,
  t,
}: {
  metrics: LocationMetrics;
  staffTotal: number;
  language: string;
  t: (key: string, options?: Record<string, string | number>) => string;
}) {
  const coverageLabel =
    metrics.coverage_pct === null
      ? t("locations_overview.kpi.in", { count: metrics.clocked_in_now })
      : `${metrics.clocked_in_now}/${metrics.scheduled_today} · ${metrics.coverage_pct}%`;

  const noShowSubtitle =
    metrics.potential_no_shows > 0
      ? t("locations_overview.kpi.no_shows_pending", {
          count: metrics.no_shows_today,
          pending: metrics.potential_no_shows,
        })
      : String(metrics.no_shows_today);

  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
      <Tile
        icon={<Users className="h-4 w-4" />}
        label={t("locations_overview.branch.team")}
        value={String(staffTotal)}
        subtitle={t("locations_overview.kpi.clocked_in") + `: ${metrics.clocked_in_now}`}
      />
      <Tile
        icon={<Users className="h-4 w-4" />}
        label={t("locations_overview.coverage")}
        value={coverageLabel}
        tone={
          metrics.coverage_pct !== null && metrics.coverage_pct < 50
            ? "red"
            : metrics.coverage_pct !== null && metrics.coverage_pct < 80
              ? "amber"
              : "neutral"
        }
      />
      <Tile
        icon={<DollarSign className="h-4 w-4" />}
        label={t("locations_overview.branch.labor_today")}
        value={formatPortfolioMoney(metrics.labor_cost_today, language)}
      />
      <Tile
        icon={<Clock className="h-4 w-4" />}
        label={t("locations_overview.kpi.no_shows")}
        value={String(metrics.no_shows_today + metrics.potential_no_shows)}
        subtitle={noShowSubtitle}
        tone={
          metrics.no_shows_today > 0
            ? "red"
            : metrics.potential_no_shows > 0
              ? "amber"
              : "neutral"
        }
      />
      <Tile
        icon={<MapPinOff className="h-4 w-4" />}
        label={t("locations_overview.stat.mismatches")}
        value={String(metrics.location_mismatches_today)}
        tone={metrics.location_mismatches_today > 0 ? "red" : "neutral"}
      />
      <Tile
        icon={<AlertTriangle className="h-4 w-4" />}
        label="Unfilled shifts"
        value={String(metrics.shift_gaps_today)}
        subtitle="Today"
        tone={metrics.shift_gaps_today > 0 ? "amber" : "neutral"}
      />
      <Tile
        icon={<ArrowRightLeft className="h-4 w-4" />}
        label="Pending swaps"
        value={String(metrics.pending_swap_requests)}
        subtitle="Awaiting approval"
        tone={metrics.pending_swap_requests > 0 ? "amber" : "neutral"}
      />
      <Tile
        icon={<Wallet className="h-4 w-4" />}
        label="Cash variance"
        value={formatPortfolioMoney(metrics.cash_variance_today, language)}
        subtitle="Today, all sessions"
        tone={metrics.cash_variance_today !== 0 ? "red" : "neutral"}
      />
      <Tile
        icon={<Wallet className="h-4 w-4" />}
        label={t("locations_overview.stat.cash")}
        value={String(
          metrics.open_cash_sessions + metrics.flagged_cash_sessions,
        )}
        subtitle={
          metrics.flagged_cash_sessions > 0
            ? t("locations_overview.kpi.flagged_count", {
                count: metrics.flagged_cash_sessions,
              })
            : t("locations_overview.kpi.no_variance")
        }
        tone={metrics.flagged_cash_sessions > 0 ? "red" : "neutral"}
      />
      <Tile
        icon={<ClipboardCheck className="h-4 w-4" />}
        label={t("locations_overview.stat.checklists")}
        value={
          metrics.checklist_completion_pct === null
            ? "-"
            : `${metrics.checklist_completion_pct}%`
        }
        subtitle={
          metrics.checklists_total > 0
            ? `${metrics.checklists_completed}/${metrics.checklists_total}`
            : t("locations_overview.branch.none_scheduled")
        }
        tone={
          metrics.checklist_completion_pct !== null &&
          metrics.checklist_completion_pct < 60
            ? "amber"
            : "neutral"
        }
      />
    </div>
  );
}

function Tile({
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
            "mt-1 text-xl font-semibold tracking-tight",
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

/* ------------------------------ Staff tab ----------------------------- */

function StaffRosterCard({
  staff,
  summary,
  selectedIds,
  onToggle,
  onMoveOne,
  onSelectAll,
  t,
}: {
  staff: BranchStaffMember[];
  summary?: {
    total: number;
    home: number;
    clocked_in_now: number;
    roles?: { role: string; count: number }[];
  };
  selectedIds: string[];
  onToggle: (m: BranchStaffMember) => void;
  onMoveOne: (m: BranchStaffMember) => void;
  onSelectAll: (list: BranchStaffMember[]) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const allSelected =
    staff.length > 0 && staff.every((s) => selectedIds.includes(s.id));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold tracking-tight">
              Branch team
            </div>
            <div className="text-xs text-muted-foreground">
              {summary
                ? `${summary.home} home · ${summary.total - summary.home} also allowed · ${summary.clocked_in_now} in now`
                : `${staff.length} people`}
            </div>
          </div>
          {staff.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (allSelected) {
                  onSelectAll([]);
                } else {
                  onSelectAll(staff);
                }
              }}
            >
              {allSelected ? "Deselect all" : "Select all"}
            </Button>
          ) : null}
        </div>

        {summary?.roles?.length ? (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {summary.roles.map((r) => (
              <Badge key={r.role} variant="outline" className="text-[10px] font-normal">
                {r.role} · {r.count}
              </Badge>
            ))}
          </div>
        ) : null}

        {staff.length === 0 ? (
          <EmptyRow
            text={t("locations_overview.branch.empty_staff")}
            hint={t("locations_overview.branch.empty_staff_hint")}
          />
        ) : (
          <ul className="divide-y divide-border">
            {staff.map((m) => {
              const selected = selectedIds.includes(m.id);
              return (
                <li
                  key={m.id}
                  className={cn(
                    "flex items-center gap-3 py-3",
                    selected && "bg-emerald-50/50 dark:bg-emerald-950/20",
                  )}
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => onToggle(m)}
                    aria-label={`Select ${m.first_name}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-sm">
                        {m.first_name} {m.last_name}
                      </span>
                      {m.clocked_in ? (
                        <Badge className="bg-emerald-100 text-[10px] text-emerald-700 hover:bg-emerald-100">
                          In now
                        </Badge>
                      ) : null}
                      {!m.is_home ? (
                        <Badge variant="outline" className="text-[10px]">
                          Guest access
                        </Badge>
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {m.role_display || m.role}
                      {m.phone ? ` · ${m.phone}` : m.email ? ` · ${m.email}` : ""}
                      {m.hourly_rate != null ? ` · ${formatMoney(m.hourly_rate)}/h` : ""}
                      {m.last_seen
                        ? ` · last seen ${formatDay(m.last_seen)}`
                        : ""}
                    </div>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <div className="text-sm font-medium tabular-nums">
                      {(m.hours_7d ?? 0) > 0 ? `${m.hours_7d}h` : "0h"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      7d
                      {(m.labor_cost_7d ?? 0) > 0
                        ? ` · ${formatMoney(m.labor_cost_7d ?? 0)}`
                        : ""}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => onMoveOne(m)}
                    title="Move to another branch"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* --------------------------- Performance tab -------------------------- */

function PerformanceSection({
  performance,
}: {
  performance: LocationDetail["performance"] | undefined;
}) {
  if (!performance) {
    return <EmptyRow text="Performance data unavailable." />;
  }

  const s30 = performance.summary;
  const s7 = performance.last_7_days;
  const chartData = (performance.daily || []).map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));

  const activeDays = chartData.filter(
    (d) => d.scheduled > 0 || d.hours_worked > 0 || d.labor_cost > 0,
  ).length;
  const avgLabor = activeDays > 0 ? s30.labor_cost / activeDays : 0;
  const avgHours = activeDays > 0 ? s30.hours_worked / activeDays : 0;
  const busiest = chartData.reduce<
    (typeof chartData)[number] | null
  >((best, d) => (d.labor_cost > (best?.labor_cost ?? 0) ? d : best), null);
  const attendanceDelta =
    s7.attendance_pct !== null && s30.attendance_pct !== null
      ? s7.attendance_pct - s30.attendance_pct
      : null;

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Tile
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="Attendance (30d)"
          value={
            s30.attendance_pct === null ? "-" : `${s30.attendance_pct}%`
          }
          subtitle={`${s30.completed_shifts}/${s30.scheduled_shifts} shifts`}
        />
        <Tile
          icon={<Clock className="h-4 w-4" />}
          label="No-shows (30d)"
          value={String(s30.no_shows)}
          tone={s30.no_shows > 0 ? "red" : "neutral"}
          subtitle={`Last 7 days: ${s7.no_shows}`}
        />
        <Tile
          icon={<DollarSign className="h-4 w-4" />}
          label="Labor cost (30d)"
          value={formatMoney(s30.labor_cost)}
          subtitle={`${s30.hours_worked}h worked`}
        />
        <Tile
          icon={<MapPinOff className="h-4 w-4" />}
          label="Mismatches (30d)"
          value={String(s30.mismatches)}
          tone={s30.mismatches > 0 ? "red" : "neutral"}
          subtitle={`Last 7 days: ${s7.mismatches}`}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Tile
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="Attendance (7d)"
          value={s7.attendance_pct === null ? "-" : `${s7.attendance_pct}%`}
          subtitle={
            attendanceDelta === null
              ? `${s7.completed_shifts}/${s7.scheduled_shifts} shifts`
              : `${s7.completed_shifts}/${s7.scheduled_shifts} shifts · ${
                  attendanceDelta >= 0 ? "+" : ""
                }${attendanceDelta}pt vs 30d`
          }
          tone={
            attendanceDelta !== null && attendanceDelta < 0 ? "amber" : "neutral"
          }
        />
        <Tile
          icon={<DollarSign className="h-4 w-4" />}
          label="Labor (7d)"
          value={formatMoney(s7.labor_cost)}
          subtitle={`${s7.hours_worked}h`}
        />
        <Tile
          icon={<Users className="h-4 w-4" />}
          label="Shifts scheduled (7d)"
          value={String(s7.scheduled_shifts)}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Tile
          icon={<DollarSign className="h-4 w-4" />}
          label="Avg labor / active day"
          value={formatMoney(avgLabor)}
          subtitle={`${activeDays} active days in window`}
        />
        <Tile
          icon={<Clock className="h-4 w-4" />}
          label="Avg hours / active day"
          value={`${Math.round(avgHours * 10) / 10}h`}
        />
        <Tile
          icon={<DollarSign className="h-4 w-4" />}
          label="Busiest day"
          value={busiest && busiest.labor_cost > 0 ? busiest.label : "-"}
          subtitle={
            busiest && busiest.labor_cost > 0
              ? `${formatMoney(busiest.labor_cost)} · ${busiest.hours_worked}h`
              : "No labor recorded"
          }
        />
        <Tile
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="Completed shifts (30d)"
          value={String(s30.completed_shifts)}
          subtitle={`of ${s30.scheduled_shifts} scheduled`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <SectionHeader
              title="Labor"
              subtitle="Last 30 days · cost and hours"
            />
            {chartData.length === 0 ? (
              <EmptyRow text="No activity in this window." />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis yAxisId="cost" tick={{ fontSize: 10 }} width={44} />
                    <YAxis
                      yAxisId="hours"
                      orientation="right"
                      tick={{ fontSize: 10 }}
                      width={32}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === "labor_cost") return [formatMoney(value), "Labor"];
                        if (name === "hours_worked") return [`${value}h`, "Hours"];
                        return [value, name];
                      }}
                    />
                    <Bar
                      yAxisId="cost"
                      dataKey="labor_cost"
                      fill="#10b981"
                      radius={[3, 3, 0, 0]}
                      name="labor_cost"
                    />
                    <Line
                      yAxisId="hours"
                      type="monotone"
                      dataKey="hours_worked"
                      stroke="#0ea5e9"
                      strokeWidth={1.5}
                      dot={false}
                      name="hours_worked"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <SectionHeader
              title="Attendance"
              subtitle="Last 30 days · scheduled vs completed"
            />
            {chartData.length === 0 ? (
              <EmptyRow text="No activity in this window." />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis tick={{ fontSize: 10 }} width={32} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === "scheduled") return [value, "Scheduled"];
                        if (name === "completed") return [value, "Completed"];
                        if (name === "no_shows") return [value, "No-shows"];
                        if (name === "mismatches") return [value, "Mismatches"];
                        return [value, name];
                      }}
                    />
                    <Bar
                      dataKey="scheduled"
                      fill="#94a3b8"
                      fillOpacity={0.45}
                      radius={[3, 3, 0, 0]}
                      name="scheduled"
                    />
                    <Bar
                      dataKey="completed"
                      fill="#10b981"
                      radius={[3, 3, 0, 0]}
                      name="completed"
                    />
                    <Bar
                      dataKey="no_shows"
                      fill="#ef4444"
                      radius={[3, 3, 0, 0]}
                      name="no_shows"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Local alias so PerformanceSection can reference LocationDetail without circular import issues
type LocationDetail = NonNullable<
  ReturnType<typeof useLocationDetail>["data"]
>;

/* --------------------------- Branch info tab -------------------------- */

function BranchProfileCard({
  location,
}: {
  location: NonNullable<LocationDetail>["location"];
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <SectionHeader title="Branch profile" />
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <InfoRow label="Name" value={location.name} />
          <InfoRow
            label="Status"
            value={location.is_active ? "Active" : "Inactive"}
          />
          <InfoRow
            label="Address"
            value={location.address || "Not set"}
          />
          <InfoRow
            label="Timezone"
            value={location.timezone || "Workspace default"}
          />
          <InfoRow
            label="Geofence"
            value={
              location.geofence_enabled
                ? `On · ${location.radius_m ?? "-"}m radius`
                : "Off"
            }
          />
          <InfoRow
            label="Coordinates"
            value={
              location.latitude != null && location.longitude != null
                ? `${location.latitude}, ${location.longitude}`
                : "Not set"
            }
          />
        </dl>
        {location.latitude != null && location.longitude != null ? (
          <Button asChild variant="outline" size="sm">
            <a
              href={`https://maps.google.com/?q=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              <MapPin className="mr-1.5 h-3.5 w-3.5" />
              Open in Maps
            </a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

/* ------------------------- Today's shifts card ------------------------- */

function ShiftsCard({
  shifts,
  t,
}: {
  shifts: ShiftToday[];
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <SectionHeader
          title="Today's shifts"
          subtitle={`${shifts.length} scheduled`}
        />
        {shifts.length === 0 ? (
          <EmptyRow
            text={t("locations_overview.branch.empty_shifts")}
            hint={t("locations_overview.branch.empty_shifts_hint")}
          />
        ) : (
          <ul className="divide-y divide-border">
            {shifts.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{s.staff_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.role || "-"}
                    {s.start_time && (
                      <>
                        {" · "}
                        {formatTime(s.start_time)}
                        {s.end_time && ` - ${formatTime(s.end_time)}`}
                      </>
                    )}
                  </div>
                </div>
                <ShiftStatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ShiftStatusBadge({ status }: { status: string }) {
  const variant =
    status === "NO_SHOW"
      ? "destructive"
      : status === "COMPLETED" || status === "IN_PROGRESS"
        ? "default"
        : "secondary";
  return (
    <Badge variant={variant} className="shrink-0 text-[10px]">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function ClockEventsCard({
  events,
  t,
}: {
  events: ClockEventToday[];
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const mismatchCount = events.filter((e) => e.location_mismatch).length;
  return (
    <Card>
      <CardContent className="p-4">
        <SectionHeader
          title="Today's clock activity"
          subtitle={
            mismatchCount > 0
              ? `${events.length} events · ${mismatchCount} mismatch`
              : `${events.length} events`
          }
          subtitleTone={mismatchCount > 0 ? "red" : "neutral"}
        />
        {events.length === 0 ? (
          <EmptyRow
            text={t("locations_overview.branch.empty_clocks")}
            hint={t("locations_overview.branch.empty_clocks_hint")}
          />
        ) : (
          <ul className="divide-y divide-border">
            {events.map((ev) => (
              <li
                key={ev.id}
                className={cn(
                  "flex items-center justify-between gap-3 py-2 text-sm",
                  ev.location_mismatch && "rounded-md bg-red-50 px-2 dark:bg-red-950/30",
                )}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{ev.staff_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(ev.event_type || "").toLowerCase()} ·{" "}
                    {formatTime(ev.timestamp)}
                  </div>
                </div>
                {ev.location_mismatch && (
                  <Badge variant="destructive" className="shrink-0 text-[10px]">
                    Wrong branch
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CashSessionsCard({ sessions }: { sessions: CashSessionToday[] }) {
  if (sessions.length === 0) return null;
  return (
    <Card>
      <CardContent className="p-4">
        <SectionHeader
          title="Cash sessions"
          subtitle={`${sessions.length} today`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">Staff</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Opening</th>
                <th className="py-2 pr-4 font-medium">Expected</th>
                <th className="py-2 pr-4 font-medium">Counted</th>
                <th className="py-2 pr-4 font-medium">Variance</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((cs) => (
                <tr key={cs.id} className="border-t border-border">
                  <td className="py-2 pr-4">{cs.staff_name}</td>
                  <td className="py-2 pr-4">
                    <Badge
                      variant={
                        cs.status === "FLAGGED" ? "destructive" : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {cs.status}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4">
                    {cs.opening_float !== null
                      ? formatMoney(cs.opening_float)
                      : "-"}
                  </td>
                  <td className="py-2 pr-4">
                    {cs.expected_cash !== null
                      ? formatMoney(cs.expected_cash)
                      : "-"}
                  </td>
                  <td className="py-2 pr-4">
                    {cs.counted_cash !== null
                      ? formatMoney(cs.counted_cash)
                      : "-"}
                  </td>
                  <td
                    className={cn(
                      "py-2 pr-4 font-medium",
                      cs.variance !== null &&
                        cs.variance !== 0 &&
                        "text-red-600",
                    )}
                  >
                    {cs.variance !== null ? formatMoney(cs.variance) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function UpcomingCoverageCard({
  upcoming,
  language,
}: {
  upcoming: BranchUpcoming | undefined;
  language: string;
}) {
  if (!upcoming || upcoming.daily.length === 0) return null;
  const max = Math.max(1, ...upcoming.daily.map((d) => d.scheduled));
  return (
    <Card>
      <CardContent className="p-4">
        <SectionHeader
          title={`Next ${upcoming.window_days} days`}
          subtitle={
            upcoming.total_unassigned > 0
              ? `${upcoming.total_scheduled} shifts scheduled · ${upcoming.total_unassigned} unassigned`
              : `${upcoming.total_scheduled} shifts scheduled`
          }
          subtitleTone={upcoming.total_unassigned > 0 ? "red" : "neutral"}
        />
        {upcoming.total_scheduled === 0 ? (
          <EmptyRow
            text="Nothing scheduled yet for the coming week."
            hint="Open the schedule to plan shifts for this branch."
          />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
            {upcoming.daily.map((d) => {
              const date = new Date(`${d.date}T00:00:00`);
              const hole = d.scheduled === 0 || d.unassigned > 0;
              return (
                <li
                  key={d.date}
                  className={cn(
                    "rounded-lg border border-border p-2.5",
                    hole && "border-amber-500/40 bg-amber-500/5",
                  )}
                >
                  <div className="text-xs text-muted-foreground">
                    {date.toLocaleDateString(language, {
                      weekday: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="mt-1 text-lg font-semibold tracking-tight">
                    {d.scheduled}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {d.scheduled === 0
                      ? "No shifts"
                      : `${d.staff} staff${d.unassigned > 0 ? ` · ${d.unassigned} open` : ""}`}
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-muted">
                    <div
                      className="h-1 rounded-full bg-emerald-500"
                      style={{ width: `${Math.round((d.scheduled / max) * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ReportLinksCard({
  links,
}: {
  links: { label: string; href: string }[];
}) {
  if (links.length === 0) return null;
  return (
    <Card>
      <CardContent className="p-4">
        <SectionHeader
          title="Open related pages"
          subtitle="Filtered to this branch where supported"
        />
        <div className="grid gap-2 md:grid-cols-2">
          {links.map((l) => (
            <Button
              key={l.href}
              variant="outline"
              asChild
              className="justify-between"
            >
              <Link to={l.href}>
                <span>{l.label}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ Helpers ------------------------------- */

function SectionHeader({
  title,
  subtitle,
  subtitleTone = "neutral",
}: {
  title: string;
  subtitle?: string;
  subtitleTone?: "neutral" | "red";
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="text-sm font-semibold tracking-tight">{title}</div>
      {subtitle && (
        <div
          className={cn(
            "text-xs text-muted-foreground",
            subtitleTone === "red" && "text-red-600",
          )}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

function EmptyRow({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
      <p>{text}</p>
      {hint ? <p className="mt-2 text-[11px] leading-relaxed">{hint}</p> : null}
    </div>
  );
}

function StatusDot({ status }: { status: LocationStatus }) {
  const color =
    status === "red"
      ? "bg-red-500"
      : status === "amber"
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <span
      className={cn(
        "mt-2 h-3 w-3 shrink-0 rounded-full",
        color,
        status === "red" && "animate-pulse",
      )}
      aria-label={`status ${status}`}
    />
  );
}

function BranchSkeleton() {
  return (
    <>
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-6 w-20" />
              <Skeleton className="mt-2 h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-10 w-80" />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((__, j) => (
                <Skeleton key={j} className="h-6 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function formatMoney(amount: number): string {
  const abs = Math.abs(amount);
  const rounded = abs >= 100 ? Math.round(abs) : Math.round(abs * 100) / 100;
  const sign = amount < 0 ? "−" : "";
  return `${sign}${rounded.toLocaleString()} MAD`;
}

function formatDay(iso: string): string {
  try {
    const d = new Date(iso);
    if (d.toDateString() === new Date().toDateString()) return formatTime(iso);
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
